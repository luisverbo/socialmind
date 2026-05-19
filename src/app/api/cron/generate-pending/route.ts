import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateForPost } from '@/lib/carousel/generate-for-post'
import { withSemaphore } from '@/lib/carousel/queue'

export const runtime     = 'nodejs'
export const maxDuration = 300

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

// GET /api/cron/generate-pending
// Finds ALL draft posts with no generated content and generates them.
// Useful for backfilling schedules created before immediate generation was added.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, company_id, schedule_id, scheduled_for')
    .eq('status', 'draft')
    .order('scheduled_for', { ascending: true })
    .limit(20)

  if (error) {
    console.error('[generate-pending] Query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ generated: 0, message: 'Nenhum draft pendente' })
  }

  const results: { post_id: string; status: 'ok' | 'error'; detail?: string }[] = []

  for (const post of posts) {
    try {
      await withSemaphore(() =>
        generateForPost(supabase, post.id, post.company_id, post.schedule_id, 'generate-pending')
      )
      results.push({ post_id: post.id, status: 'ok' })
      console.log(`[generate-pending] ✓ Post ${post.id} gerado`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ post_id: post.id, status: 'error', detail: msg })
      console.error(`[generate-pending] ✗ Post ${post.id}: ${msg}`)
    }
  }

  const generated = results.filter(r => r.status === 'ok').length
  const failed    = results.filter(r => r.status === 'error').length

  return NextResponse.json({ generated, failed, results })
}
