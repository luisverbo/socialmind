import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime    = 'nodejs'
export const maxDuration = 30  // fast: just creates job + fires worker

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company_id, schedule_id, theme, tone, slides_count, publish_mode, use_images, scheduled_for, template } = body

    if (!company_id || !theme || !tone || !slides_count) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: company_id, theme, tone, slides_count' },
        { status: 400 }
      )
    }

    const supabase = adminClient()

    // ── 1. Create placeholder post record ──────────────────────────────────────
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .insert({
        company_id:    company_id,
        schedule_id:   schedule_id ?? null,
        status:        'draft',         // will become 'waiting'/'approved' when done
        content:       [],
        slides_html:   [],
        slides_images: [],
        ...(scheduled_for ? { scheduled_for } : {}),
      })
      .select('id')
      .single()

    if (postErr || !post) {
      throw new Error(`Erro ao criar post: ${postErr?.message}`)
    }

    // ── 2. Create generation job ───────────────────────────────────────────────
    const params = {
      theme,
      tone,
      slidesCount:  Number(slides_count),
      publishMode:  publish_mode ?? 'review',
      useImages:    use_images === true,
      scheduledFor: scheduled_for ?? null,
      template:     (template as string) ?? 'classic',
    }

    const { data: job, error: jobErr } = await supabase
      .from('generation_jobs')
      .insert({
        post_id:    post.id,
        company_id: company_id,
        status:     'pending',
        params,
      })
      .select('id')
      .single()

    if (jobErr || !job) {
      throw new Error(`Erro ao criar job: ${jobErr?.message}`)
    }

    // ── 3. Fire worker (non-blocking) ─────────────────────────────────────────
    const workerUrl = new URL('/api/jobs/worker', req.url).toString()
    fetch(workerUrl, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-worker-secret': process.env.CRON_SECRET ?? '',
      },
      body: JSON.stringify({ job_id: job.id }),
    }).catch(e => console.warn('[generate-carousel] worker fire error:', e))

    // ── 4. Return immediately ─────────────────────────────────────────────────
    console.log(`[generate-carousel] Job ${job.id} criado para post ${post.id}`)
    return NextResponse.json({ success: true, job_id: job.id, post_id: post.id })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[generate-carousel]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
