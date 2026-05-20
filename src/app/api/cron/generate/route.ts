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

  // ── Part 2: Weekly batch for 'daily' schedules ───────────────────────────────
  // When a daily schedule has < posts_per_day * 2 days of future posts left,
  // generate the next 7-day batch and notify the client.
  const { data: dailySchedules } = await supabase
    .from('post_schedules')
    .select('id, company_id, scheduled_times, posts_per_day, duration_days, last_batch_at, publish_mode')
    .eq('type', 'daily')
    .eq('status', 'active')

  for (const sched of dailySchedules ?? []) {
    try {
      const postsPerDay: number   = sched.posts_per_day ?? 1
      const schedTimes: string[]  = Array.isArray(sched.scheduled_times) && sched.scheduled_times.length > 0
        ? sched.scheduled_times as string[]
        : ['09:00:00']

      // Count how many future pending posts remain for this schedule
      const { count: futureCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('schedule_id', sched.id)
        .in('status', ['draft', 'waiting', 'approved'])
        .gte('scheduled_for', new Date().toISOString())

      // Threshold: generate when < 2 days of posts remain
      const threshold = postsPerDay * 2
      if ((futureCount ?? 0) >= threshold) continue

      // Check company credits (need at least 1 full day's worth)
      const { data: company } = await supabase
        .from('companies')
        .select('credits_balance, credits_limit')
        .eq('id', sched.company_id)
        .single()

      const creditsNeeded = postsPerDay * 5 // min 5 slides
      if (!company || company.credits_balance < creditsNeeded) {
        console.log(`[cron/generate] Empresa ${sched.company_id} sem créditos para batch diário`)
        continue
      }

      // Determine start date for new batch
      const now       = new Date()
      const batchDays = 7

      // Check if schedule has a duration limit
      let daysLeft = batchDays
      if (sched.duration_days) {
        const startedAt = sched.last_batch_at ? new Date(sched.last_batch_at) : now
        const endDate   = new Date(startedAt.getTime() + sched.duration_days * 86400_000)
        const remaining = Math.ceil((endDate.getTime() - now.getTime()) / 86400_000)
        if (remaining <= 0) {
          // Duration expired — pause the schedule
          await supabase.from('post_schedules').update({ status: 'paused' }).eq('id', sched.id)
          continue
        }
        daysLeft = Math.min(batchDays, remaining)
      }

      // Find the last scheduled_for for this schedule to continue from there
      const { data: lastPost } = await supabase
        .from('posts')
        .select('scheduled_for')
        .eq('schedule_id', sched.id)
        .in('status', ['draft', 'waiting', 'approved', 'published'])
        .order('scheduled_for', { ascending: false })
        .limit(1)
        .single()

      const batchStart = lastPost?.scheduled_for
        ? new Date(new Date(lastPost.scheduled_for).getTime() + 86400_000) // day after last post
        : now

      // Create draft posts for the new batch
      const newPosts: Record<string, unknown>[] = []
      for (let d = 0; d < daysLeft; d++) {
        for (const timeStr of schedTimes) {
          const [h, m] = timeStr.replace(':00', '').split(':').map(Number)
          const dt = new Date(batchStart)
          dt.setDate(dt.getDate() + d)
          dt.setHours(h, m, 0, 0)
          if (dt <= now) continue
          newPosts.push({
            company_id:    sched.company_id,
            schedule_id:   sched.id,
            status:        'draft',
            scheduled_for: dt.toISOString(),
            content:       [],
            slides_html:   [],
            slides_images: [],
          })
        }
      }

      if (newPosts.length === 0) continue

      const { data: insertedPosts } = await supabase
        .from('posts')
        .insert(newPosts)
        .select('id, scheduled_for')
        .order('scheduled_for', { ascending: true })

      // Mark batch generated time
      await supabase.from('post_schedules')
        .update({ last_batch_at: new Date().toISOString() })
        .eq('id', sched.id)

      // Generate the first post of the new batch immediately
      const firstPost = insertedPosts?.[0]
      if (firstPost) {
        try {
          await withSemaphore(() =>
            generateForPost(supabase, firstPost.id, sched.company_id, sched.id, 'cron/daily-batch')
          )
          results.push({ post_id: firstPost.id, status: 'ok' })
          console.log(`[cron/generate] ✓ Novo batch diário iniciado: ${insertedPosts?.length} posts para schedule ${sched.id}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          results.push({ post_id: firstPost.id, status: 'error', detail: msg })
        }
      }

      // Notify client that new batch is ready for review
      const modeLabel = sched.publish_mode === 'review' ? 'para aprovação' : 'para publicação'
      await supabase.from('notifications').insert({
        company_id: sched.company_id,
        type:       'post_ready',
        message:    `Nova semana de conteúdo diário gerada (${insertedPosts?.length ?? 0} posts ${modeLabel}). Aprove antes que o conteúdo acabe!`,
        read:       false,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ post_id: `daily-batch:${sched.id}`, status: 'error', detail: msg })
      console.error(`[cron/generate] ✗ Daily batch ${sched.id}: ${msg}`)
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
