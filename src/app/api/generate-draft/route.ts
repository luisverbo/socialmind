import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCarouselContent, type WeekPlanItem } from '@/lib/carousel/generator'
import { renderAllSlides } from '@/lib/carousel/renderer'
import { withSemaphore } from '@/lib/carousel/queue'
import type { BrandColors } from '@/lib/carousel/types'

export const runtime = 'nodejs'
export const maxDuration = 90

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const { post_id, custom_topic, batch_angle } = await req.json()
    const batchAngle: WeekPlanItem | undefined = batch_angle ?? undefined
    if (!post_id) {
      return NextResponse.json({ error: 'post_id é obrigatório' }, { status: 400 })
    }

    const supabase = adminClient()

    // Fetch the draft post and its schedule + theme
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('id, company_id, schedule_id, status')
      .eq('id', post_id)
      .single()

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }
    if (post.status !== 'draft') {
      return NextResponse.json({ error: 'Post já foi gerado' }, { status: 400 })
    }

    // Check credits before generating
    const { data: company } = await supabase
      .from('companies')
      .select('credits_balance, credits_limit')
      .eq('id', post.company_id)
      .single()

    // Get schedule info for theme/tone/slides
    let theme = 'Conteúdo geral'
    let tone: 'educational' | 'motivational' | 'promotional' = 'educational'
    let slidesCount = 7
    let publishMode: 'automatic' | 'review' = 'review'

    if (post.schedule_id) {
      const { data: schedule } = await supabase
        .from('post_schedules')
        .select('publish_mode, slides_count, content_themes(theme_name, tone, slides_count)')
        .eq('id', post.schedule_id)
        .single()

      if (schedule) {
        publishMode = schedule.publish_mode ?? 'review'
        // Use schedule.slides_count first (set directly on schedule), fallback to content_theme
        if (schedule.slides_count && schedule.slides_count !== 7) {
          slidesCount = schedule.slides_count
        }
        const ct = schedule.content_themes as unknown as { theme_name: string; tone: string; slides_count: number } | null
        if (ct) {
          theme = ct.theme_name
          tone = ct.tone as typeof tone
          // Only use theme's slides_count if schedule doesn't have one explicitly set
          if (!schedule.slides_count || schedule.slides_count === 7) {
            slidesCount = ct.slides_count ?? 7
          }
        }
      }
    }

    // Run generation inside semaphore
    const postId = await withSemaphore(async () => {
      const { data: ctx, error: ctxErr } = await supabase
        .from('company_context')
        .select('*')
        .eq('company_id', post.company_id)
        .single()

      if (ctxErr || !ctx) throw new Error('Contexto da empresa não encontrado')

      const { data: media } = await supabase
        .from('media_library')
        .select('id, url, category, description')
        .eq('company_id', post.company_id)
        .limit(20)

      const { data: recentPosts } = await supabase
        .from('posts')
        .select('content')
        .eq('company_id', post.company_id)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(5)

      const recentTopics = (recentPosts ?? [])
        .map(p => {
          const slides = Array.isArray(p.content) ? p.content : []
          return (slides[0] as { title?: string })?.title ?? ''
        })
        .filter(Boolean)

      const brandColors: BrandColors = ctx.brand_colors ?? {
        primary: '#6C3FE8',
        secondary: '#E84393',
        accent: '#A855F7',
      }

      const finalTheme = (typeof custom_topic === 'string' && custom_topic.trim()) ? custom_topic.trim() : theme
      const logoUrl: string | undefined = ctx.logo_url ?? undefined

      // Credits check just before generation
      if (company && company.credits_balance < slidesCount) {
        throw new Error(`Créditos insuficientes (${company.credits_balance} disponíveis, ${slidesCount} necessários). Aguarde a renovação ou faça upgrade.`)
      }

      const carousel = await generateCarouselContent(ctx, media ?? [], finalTheme, tone, slidesCount, recentTopics, batchAngle)
      const buffers = await renderAllSlides(carousel.slides, brandColors, logoUrl)

      const status = publishMode === 'review' ? 'waiting' : 'approved'

      await supabase.from('posts').update({
        content: carousel.slides,
        slides_html: carousel.slides.map(() => null),
        slides_images: [],
        caption: carousel.caption,
        status,
      }).eq('id', post_id)

      const imageUrls = await Promise.all(
        buffers.map(async (buf, i) => {
          const path = `slides/${post.company_id}/${post_id}/slide-${i + 1}.png`
          await supabase.storage.from('slides').upload(path, buf, { contentType: 'image/png', upsert: true })
          return supabase.storage.from('slides').getPublicUrl(path).data.publicUrl
        })
      )

      await supabase.from('posts').update({ slides_images: imageUrls }).eq('id', post_id)

      // Deduct credits after successful generation
      try {
        await supabase.rpc('deduct_credits', { p_company_id: post.company_id, p_amount: carousel.slides.length })
      } catch (e) {
        console.error('[generate-draft] deduct_credits falhou (não fatal):', e)
      }

      await supabase.from('notifications').insert({
        company_id: post.company_id,
        type: 'post_ready',
        message: `Carrossel "${theme}" gerado com ${carousel.slides.length} slides.`,
        read: false,
      })

      return post_id
    })

    return NextResponse.json({ success: true, post_id: postId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
