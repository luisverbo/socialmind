import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchUnsplashPhoto } from '@/lib/unsplash'
import type { UnsplashCredit, Template, RenderProfile } from '@/lib/carousel/types'

export const runtime    = 'nodejs'
export const maxDuration = 300

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  // Validate internal secret
  const secret = req.headers.get('x-worker-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { job_id } = await req.json()
  if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

  const supabase = adminClient()

  // Mark job as processing
  const { data: job, error: jobErr } = await supabase
    .from('generation_jobs')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', job_id)
    .eq('status', 'pending') // only pick up pending jobs (idempotent)
    .select('id, post_id, company_id, params')
    .single()

  if (jobErr || !job) {
    // Already processing or not found — skip silently
    return NextResponse.json({ skipped: true })
  }

  const p = job.params as {
    theme:        string
    tone:         'educational' | 'motivational' | 'promotional' | 'journalistic' | 'engagement'
    slidesCount:  number
    publishMode:  'automatic' | 'review'
    useImages:    boolean
    scheduledFor: string | null
    template?:    Template
  }

  try {
    // ── Fetch context ──────────────────────────────────────────────────────────
    const [{ data: ctx }, { data: media }, { data: company }, { data: igToken }] = await Promise.all([
      supabase.from('company_context').select('*').eq('company_id', job.company_id).single(),
      supabase.from('media_library').select('id, url, category, description').eq('company_id', job.company_id).limit(20),
      supabase.from('companies').select('credits_balance, name').eq('id', job.company_id).single(),
      supabase.from('instagram_tokens').select('instagram_username, profile_picture_url').eq('company_id', job.company_id).maybeSingle(),
    ])

    if (!ctx) throw new Error('Contexto da empresa não encontrado')

    if (company && company.credits_balance < p.slidesCount) {
      throw new Error(`Créditos insuficientes (${company.credits_balance} disponíveis, ${p.slidesCount} necessários)`)
    }

    // ── Generate content with Claude ──────────────────────────────────────────
    const { generateCarouselContent } = await import('@/lib/carousel/generator')
    const carousel = await generateCarouselContent(ctx, media ?? [], p.theme, p.tone, p.slidesCount)

    // ── Assign images to slides (only if user opted in) ────────────────────
    const unsplashCredits: UnsplashCredit[] = []

    if (p.useImages) {
      const mediaByCategory: Record<string, string[]> = {}
      ;(media ?? []).forEach(m => {
        if (!mediaByCategory[m.category]) mediaByCategory[m.category] = []
        mediaByCategory[m.category].push(m.url)
      })

      const pickMedia = (categories: string[]): string | undefined => {
        for (const cat of categories) {
          const urls = mediaByCategory[cat]
          if (urls?.length) return urls[Math.floor(Math.random() * urls.length)]
        }
        return undefined
      }

      // Assign imageUrl for cover and CTA slides
      for (let i = 0; i < carousel.slides.length; i++) {
        const slide   = carousel.slides[i]
        const isFirst = i === 0
        const isLast  = i === carousel.slides.length - 1
        const isSingle = carousel.slides.length === 1  // single image post

        if (!isFirst && !isLast) continue  // only cover + CTA get images

        let imageUrl: string | undefined

        if (isSingle || isFirst) {
          // Single image or cover: use brand/product/structure media or Unsplash keyword
          imageUrl = pickMedia(['brand', 'product', 'structure'])
          if (!imageUrl) {
            const keyword = slide.imageKeyword ?? p.theme
            const photo = await searchUnsplashPhoto(keyword)
            if (photo) {
              imageUrl = photo.url
              unsplashCredits.push({ ...photo, slideIndex: i })
            }
          }
        } else if (isLast) {
          // CTA slide only (multi-slide): use team/brand media or Unsplash portrait
          imageUrl = pickMedia(['team', 'brand'])
          if (!imageUrl) {
            const photo = await searchUnsplashPhoto('professional team business portrait')
            if (photo) {
              imageUrl = photo.url
              unsplashCredits.push({ ...photo, slideIndex: i })
            }
          }
        }

        if (imageUrl) {
          carousel.slides[i] = { ...slide, imageUrl }
        }
      }
    }

    // ── Render slides ─────────────────────────────────────────────────────────
    const { renderAllSlides } = await import('@/lib/carousel/renderer')
    const brandColors = ctx.brand_colors ?? { primary: '#6C3FE8', secondary: '#E84393', accent: '#A855F7' }
    const logoUrl: string | undefined = ctx.logo_url ?? undefined

    // Build profile for editorial template header
    const profile: RenderProfile = {
      companyName:    company?.name ?? ctx.business_name ?? 'SocialMind',
      instagramHandle: igToken?.instagram_username ?? undefined,
      profilePicUrl:   igToken?.profile_picture_url ?? undefined,
    }

    const buffers = await renderAllSlides(carousel.slides, brandColors, logoUrl, p.template ?? 'classic', profile)

    // ── Upload PNGs ───────────────────────────────────────────────────────────
    const postId = job.post_id!
    const imageUrls = await Promise.all(
      buffers.map(async (buf, i) => {
        const path = `slides/${job.company_id}/${postId}/slide-${i + 1}.png`
        await supabase.storage.from('slides').upload(path, buf, { contentType: 'image/png', upsert: true })
        return supabase.storage.from('slides').getPublicUrl(path).data.publicUrl
      })
    )

    // ── Update post ───────────────────────────────────────────────────────────
    const status = p.publishMode === 'review' ? 'waiting' : 'approved'
    await supabase.from('posts').update({
      content:          carousel.slides,
      slides_html:      carousel.slides.map(() => null),
      slides_images:    imageUrls,
      caption:          carousel.caption,
      status,
      template:         p.template ?? 'classic',
      ...(unsplashCredits.length > 0 ? { unsplash_credits: unsplashCredits } : {}),
    }).eq('id', postId)

    // ── Deduct credits ────────────────────────────────────────────────────────
    try {
      await supabase.rpc('deduct_credits', {
        p_company_id: job.company_id,
        p_amount:     carousel.slides.length,
      })
    } catch { /* non-fatal */ }

    // ── Mark job complete ─────────────────────────────────────────────────────
    await supabase.from('generation_jobs').update({
      status:     'completed',
      updated_at: new Date().toISOString(),
    }).eq('id', job_id)

    // ── Notification ──────────────────────────────────────────────────────────
    await supabase.from('notifications').insert({
      company_id: job.company_id,
      type:       'post_ready',
      message:    `Carrossel "${p.theme}" gerado com ${carousel.slides.length} slides.`,
      read:       false,
    })

    console.log(`[worker] ✓ Job ${job_id} concluído — post ${postId}`)
    return NextResponse.json({ success: true, post_id: postId })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[worker] ✗ Job ${job_id}:`, message)

    await supabase.from('generation_jobs').update({
      status:     'failed',
      error:      message,
      updated_at: new Date().toISOString(),
    }).eq('id', job_id)

    // Mark post as failed so UI can show retry
    if (job.post_id) {
      await supabase.from('posts').update({ status: 'failed' }).eq('id', job.post_id)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
