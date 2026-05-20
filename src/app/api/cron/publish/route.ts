import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { publishToInstagram } from '@/lib/instagram/publish'

export const runtime  = 'nodejs'
export const maxDuration = 300 // 5 min for batch

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const now = new Date().toISOString()

  // Find approved posts that are due:
  // 1. Posts with a scheduled_for that has passed
  // 2. Posts with no scheduled_for (publish immediately)
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, company_id, scheduled_for')
    .eq('status', 'approved')
    .or(`scheduled_for.lte.${now},scheduled_for.is.null`)
    .limit(20)

  if (error) {
    console.error('[cron/publish] Query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ published: 0, message: 'Nenhum post para publicar' })
  }

  const results: { post_id: string; status: 'ok' | 'error'; detail?: string }[] = []

  for (const post of posts) {
    try {
      const igPostId = await publishToInstagram(post.id)
      results.push({ post_id: post.id, status: 'ok', detail: igPostId })
      console.log(`[cron/publish] ✓ Post ${post.id} → IG ${igPostId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ post_id: post.id, status: 'error', detail: msg })
      console.error(`[cron/publish] ✗ Post ${post.id}: ${msg}`)
    }
  }

  const published = results.filter(r => r.status === 'ok').length
  const failed    = results.filter(r => r.status === 'error').length

  return NextResponse.json({ published, failed, results })
}
