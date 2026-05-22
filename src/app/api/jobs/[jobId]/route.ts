import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const supabase = adminClient()

  const { data: job, error } = await supabase
    .from('generation_jobs')
    .select('id, post_id, status, error, created_at')
    .eq('id', params.jobId)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
  }

  const elapsed = Math.round((Date.now() - new Date(job.created_at).getTime()) / 1000)

  // ── Self-heal #1: pending job after 5s → re-trigger worker ──────────────
  if (job.status === 'pending' && elapsed >= 5) {
    const workerUrl = new URL('/api/jobs/worker', req.url).toString()
    fetch(workerUrl, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-worker-secret': process.env.CRON_SECRET ?? '',
      },
      body: JSON.stringify({ job_id: job.id }),
    }).catch(() => {})
    console.log(`[jobs/${params.jobId}] Re-triggered worker for stuck pending job (${elapsed}s)`)
  }

  // ── Self-heal #2: processing job stuck > 90s → check if post is done ────
  // Vercel functions can time out mid-execution, leaving the job in 'processing'
  // forever even though the post was actually created. Detect this and recover.
  if (job.status === 'processing' && elapsed >= 90 && job.post_id) {
    const { data: post } = await supabase
      .from('posts')
      .select('id, status, slides_images')
      .eq('id', job.post_id)
      .single()

    if (post && Array.isArray(post.slides_images) && post.slides_images.length > 0) {
      // Post exists and has images → worker completed but didn't update the job
      await supabase.from('generation_jobs').update({
        status:     'completed',
        updated_at: new Date().toISOString(),
      }).eq('id', job.id)

      console.log(`[jobs/${params.jobId}] Auto-recovered stuck processing job — post already done`)

      return NextResponse.json({
        job_id:  job.id,
        post_id: job.post_id,
        status:  'completed',
        error:   null,
        elapsed,
      })
    }

    // Post not done yet → re-trigger worker (idempotent: worker ignores non-pending jobs,
    // BUT we reset to pending first so it can be picked up again)
    if (elapsed >= 120) {
      await supabase.from('generation_jobs').update({
        status:     'pending',
        updated_at: new Date().toISOString(),
      }).eq('id', job.id)

      const workerUrl = new URL('/api/jobs/worker', req.url).toString()
      fetch(workerUrl, {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-worker-secret': process.env.CRON_SECRET ?? '',
        },
        body: JSON.stringify({ job_id: job.id }),
      }).catch(() => {})

      console.log(`[jobs/${params.jobId}] Reset and re-triggered stalled processing job (${elapsed}s)`)

      return NextResponse.json({
        job_id:  job.id,
        post_id: job.post_id,
        status:  'pending',
        error:   null,
        elapsed,
        retrying: true,
      })
    }
  }

  return NextResponse.json({
    job_id:  job.id,
    post_id: job.post_id,
    status:  job.status,
    error:   job.error,
    elapsed,
  })
}
