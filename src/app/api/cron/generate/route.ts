import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateForPost } from '@/lib/carousel/generate-for-post'
import { withSemaphore } from '@/lib/carousel/queue'

export const runtime    = 'nodejs'
export const maxDuration = 300

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const now    = new Date()
  const isWeeklyRun = now.getDay() === 0 // Sunday

  const results: { post_id: string; status: 'ok' | 'error'; detail?: string }[] = []

  // ── Part 1: Generate existing draft posts (recurring + one_time) ─────────────
  // On Sunday: generate everything due in next 8 days (weekly batch)
  // On other days: generate anything due in next 2 days
  const cutoff = new Date(now.getTime() + (isWeeklyRun ? 8 : 2) * 24 * 60 * 60 * 1000)

  const { data: draftPosts, error: draftErr } = await supabase
    .from('posts')
    .select('id, company_id, schedule_id, scheduled_for')
    .eq('status', 'draft')
    .lte('scheduled_for', cutoff.toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(20)

  if (draftErr) {
    console.error('[cron/generate] Draft query error:', draftErr.message)
  }

  for (const post of draftPosts ?? []) {
    try {
      await withSemaphore(() =>
        generateForPost(supabase, post.id, post.company_id, post.schedule_id, 'cron/generate')
      )
      results.push({ post_id: post.id, status: 'ok' })
      console.log(`[cron/generate] ✓ Draft post ${post.id} gerado`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ post_id: post.id, status: 'error', detail: msg })
      console.error(`[cron/generate] ✗ Draft post ${post.id}: ${msg}`)
    }
  }

  // ── Part 2: Create + generate tomorrow's posts for 'daily' schedules ─────────
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDate = tomorrow.toISOString().split('T')[0]

  const { data: dailySchedules } = await supabase
    .from('post_schedules')
    .select('id, company_id, scheduled_time, theme_id, publish_mode')
    .eq('type', 'daily')
    .eq('status', 'active')

  for (const sched of dailySchedules ?? []) {
    try {
      // Build the scheduled_for timestamp for tomorrow
      const scheduledFor = new Date(`${tomorrowDate}T${sched.scheduled_time}`)

      // Check if a post already exists for this schedule tomorrow
      const { data: existing } = await supabase
        .from('posts')
        .select('id')
        .eq('schedule_id', sched.id)
        .gte('scheduled_for', `${tomorrowDate}T00:00:00`)
        .lte('scheduled_for', `${tomorrowDate}T23:59:59`)
        .limit(1)

      if (existing && existing.length > 0) continue // already created

      // Check company credits
      const { data: company } = await supabase
        .from('companies')
        .select('credits_balance')
        .eq('id', sched.company_id)
        .single()

      if (!company || company.credits_balance < 5) {
        console.log(`[cron/generate] Empresa ${sched.company_id} sem créditos suficientes para daily schedule`)
        continue
      }

      // Create the draft post
      const { data: newPost, error: insertErr } = await supabase
        .from('posts')
        .insert({
          company_id:    sched.company_id,
          schedule_id:   sched.id,
          status:        'draft',
          scheduled_for: scheduledFor.toISOString(),
          content:       [],
          slides_html:   [],
          slides_images: [],
        })
        .select('id')
        .single()

      if (insertErr || !newPost) {
        console.error(`[cron/generate] Erro ao criar draft para daily ${sched.id}: ${insertErr?.message}`)
        continue
      }

      // Generate the post
      await withSemaphore(() =>
        generateForPost(supabase, newPost.id, sched.company_id, sched.id, 'cron/generate-daily')
      )
      results.push({ post_id: newPost.id, status: 'ok' })
      console.log(`[cron/generate] ✓ Daily post ${newPost.id} gerado para ${tomorrowDate}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ post_id: `daily:${sched.id}`, status: 'error', detail: msg })
      console.error(`[cron/generate] ✗ Daily schedule ${sched.id}: ${msg}`)
    }
  }

  // ── Part 3: Monthly credit reset ─────────────────────────────────────────────
  try {
    await supabase.rpc('reset_monthly_credits')
  } catch (e) {
    console.error('[cron/generate] reset_monthly_credits falhou (não fatal):', e)
  }

  const generated = results.filter(r => r.status === 'ok').length
  const failed    = results.filter(r => r.status === 'error').length
  return NextResponse.json({ generated, failed, results })
}
