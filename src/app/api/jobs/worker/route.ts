import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    tone:         'educational' | 'motivational' | 'promotional'
    slidesCount:  number
    publishMode:  'automatic' | 'review'
    scheduledFor: string | null
  }

  try {
    // ── Fetch context ──────────────────────────────────────────────────────────
    const [{ data: ctx }, { data: media }, { data: company }] = await Promise.all([
      supabase.from('company_context').select('*').eq('company_id', job.company_id).single(),
      supabase.from('media_library').select('id, url, category, description').eq('company_id', job.company_id).limit(20),
      supabase.from('companies').select('credits_balance').eq('id', job.company_id).single(),
    ])

    if (!ctx) throw new Error('Contexto da empresa não encontrado')

    if (company && company.credits_balance < p.slidesCount) {
      throw new Error(`Créditos insuficientes (${company.credits_balance} disponíveis, ${p.slidesCount} necessários)`)
    }

    // ── Generate content with Claude ──────────────────────────────────────────
    const { generateCarouselContent } = await import('@/lib/carousel/generator')
    const carousel = await generateCarouselContent(ctx, media ?? [], p.theme, p.tone, p.slidesCount)

    // ── Render slides ─────────────────────────────────────────────────────────
    const { renderAllSlides } = await import('@/lib/carousel/renderer')
    const brandColors = ctx.brand_colors ?? { primary: '#6C3FE8', secondary: '#E84393', accent: '#A855F7' }
    const logoUrl: string | undefined = ctx.logo_url ?? undefined
    const buffers = await renderAllSlides(carousel.slides, brandColors, logoUrl)

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
      content:       carousel.slides,
      slides_html:   carousel.slides.map(() => null),
      slides_images: imageUrls,
      caption:       carousel.caption,
      status,
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
