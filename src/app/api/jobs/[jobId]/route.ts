import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const supabase = adminClient()

  const { data: job, error } = await supabase
    .from('generation_jobs')
    .select('id, post_id, status, error, created_at, updated_at')
    .eq('id', params.jobId)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
  }

  const elapsed = Math.round((Date.now() - new Date(job.created_at).getTime()) / 1000)

  return NextResponse.json({
    job_id:   job.id,
    post_id:  job.post_id,
    status:   job.status,   // pending | processing | completed | failed
    error:    job.error,
    elapsed:  elapsed,      // seconds since job was created
  })
}
