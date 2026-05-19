import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCarouselContent } from '@/lib/carousel/generator'
import { renderAllSlides } from '@/lib/carousel/renderer'
import { withSemaphore } from '@/lib/carousel/queue'
import type { BrandColors } from '@/lib/carousel/types'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min for batch

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

async function generateForPost(
  supabase: ReturnType<typeof adminClient>,
  postId: string,
  companyId: string,
  scheduleId: string | null
) {
  let theme = 'Conteúdo geral'
  let tone: 'educational' | 'motivational' | 'promotional' = 'educational'
  let slidesCount = 7
  let publishMode: 'automatic' | 'review' = 'review'

  if (scheduleId) {
    const { data: schedule } = await supabase
      .from('post_schedules')
      .select('publish_mode, content_themes(theme_name, tone, slides_count)')
      .eq('id', scheduleId)
      .single()

    if (schedule) {
      publishMode = schedule.publish_mode ?? 'review'
      const ct = schedule.content_themes as unknown as { theme_name: string; tone: string; slides_count: number } | null
      if (ct) {
        theme = ct.theme_name
        tone = ct.tone as typeof tone
        slidesCount = ct.slides_count ?? 7
      }
    }
  }

  const { data: ctx, error: ctxErr } = await supabase
    .from('company_context')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (ctxErr || !ctx) throw new Error(`Contexto da empresa não encontrado para ${companyId}`)

  const { data: media } = await supabase
    .from('media_library')
    .select('id, url, category, description')
    .eq('company_id', companyId)
    .limit(20)

  const brandColors: BrandColors = ctx.brand_colors ?? {
    primary: '#6C3FE8',
    secondary: '#E84393',
    accent: '#A855F7',
  }

  // Check monthly limit before generating
  const { data: company } = await supabase
    .from('companies')
    .select('posts_used_this_month, posts_limit')
    .eq('id', companyId)
    .single()

  if (company && company.posts_used_this_month >= company.posts_limit) {
    throw new Error(`Limite mensal de posts atingido para empresa ${companyId}`)
  }

  const carousel = await generateCarouselContent(ctx, media ?? [], theme, tone, slidesCount)
  const buffers = await renderAllSlides(carousel.slides, brandColors)
  const status = publishMode === 'review' ? 'waiting' : 'approved'

  await supabase.from('posts').update({
    content: carousel.slides,
    slides_html: carousel.slides.map(() => null),
    slides_images: [],
    caption: carousel.caption,
    status,
  }).eq('id', postId)

  const imageUrls = await Promise.all(
    buffers.map(async (buf, i) => {
      const path = `slides/${companyId}/${postId}/slide-${i + 1}.png`
      await supabase.storage.from('slides').upload(path, buf, { contentType: 'image/png', upsert: true })
      return supabase.storage.from('slides').getPublicUrl(path).data.publicUrl
    })
  )

  await supabase.from('posts').update({ slides_images: imageUrls }).eq('id', postId)

  // Increment usage counter after successful generation
  try {
    await supabase.rpc('increment_posts_used', { p_company_id: companyId })
  } catch (e) {
    console.error('[cron/generate] increment_posts_used falhou (não fatal):', e)
  }

  await supabase.from('notifications').insert({
    company_id: companyId,
    type: 'post_ready',
    message: `Carrossel "${theme}" gerado automaticamente com ${carousel.slides.length} slides.`,
    read: false,
  })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()

  // Find draft posts scheduled within the next 25 hours (buffer past midnight)
  const now = new Date()
  const cutoff = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, company_id, schedule_id, scheduled_for')
    .eq('status', 'draft')
    .lte('scheduled_for', cutoff.toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[cron/generate] Query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ generated: 0, message: 'Nenhum draft para gerar' })
  }

  const results: { post_id: string; status: 'ok' | 'error'; detail?: string }[] = []

  for (const post of posts) {
    try {
      await withSemaphore(() => generateForPost(supabase, post.id, post.company_id, post.schedule_id))
      results.push({ post_id: post.id, status: 'ok' })
      console.log(`[cron/generate] ✓ Post ${post.id} gerado`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ post_id: post.id, status: 'error', detail: msg })
      console.error(`[cron/generate] ✗ Post ${post.id}: ${msg}`)
    }
  }

  const generated = results.filter(r => r.status === 'ok').length
  const failed    = results.filter(r => r.status === 'error').length

  return NextResponse.json({ generated, failed, results })
}
