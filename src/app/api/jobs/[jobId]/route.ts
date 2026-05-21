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

  // ── Self-heal: if job is still pending after 5s, trigger the worker ──────
  // This handles cases where the fire-and-forget in generate-carousel didn't
  // reach the worker (Vercel can suspend the process before fetch completes).
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
    console.log(`[jobs/${params.jobId}] Re-triggered worker for stuck pending job`)
  }

  return NextResponse.json({
    job_id:  job.id,
    post_id: job.post_id,
    status:  job.status,
    error:   job.error,
    elapsed,
  })
}
