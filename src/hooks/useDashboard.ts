'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useCompany } from './useCompany'
import type { Post, PostSchedule, ContentTheme } from '@/types/scheduling'

export interface DashboardMetrics {
  publishedThisMonth: number
  scheduledCount: number
  pendingCount: number
  successRate: number
  nextPost: { scheduled_for: string; theme?: string } | null
}

export interface DashboardState {
  metrics: DashboardMetrics
  upcomingPosts: (Post & { theme?: string })[]
  pendingPosts: Post[]
  hasInstagram: boolean
  hasContext: boolean
  hasSchedules: boolean
  hasPosts: boolean
  themes: ContentTheme[]
  loading: boolean
  error: string | null
}

const EMPTY_METRICS: DashboardMetrics = {
  publishedThisMonth: 0,
  scheduledCount: 0,
  pendingCount: 0,
  successRate: 0,
  nextPost: null,
}

export function useDashboard() {
  const { companyId, company } = useCompany()
  const [state, setState] = useState<DashboardState>({
    metrics: EMPTY_METRICS,
    upcomingPosts: [],
    pendingPosts: [],
    hasInstagram: false,
    hasContext: false,
    hasSchedules: false,
    hasPosts: false,
    themes: [],
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    if (!companyId) return
    setState(s => ({ ...s, loading: true, error: null }))

    try {
      const firstOfMonth = new Date()
      firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0)
      const now = new Date().toISOString()

      const [
        { count: published },
        { count: scheduled },
        { count: pending },
        { count: failed },
        { data: upcomingRaw },
        { data: pendingPosts },
        { data: igRow },
        { data: ctxRow },
        { data: scheduleRow },
        { count: totalPosts },
        { data: themes },
      ] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('status', 'published')
          .gte('published_at', firstOfMonth.toISOString()),
        supabase.from('posts').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).in('status', ['draft', 'approved'])
          .gte('scheduled_for', now),
        supabase.from('posts').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('status', 'waiting'),
        supabase.from('posts').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('status', 'failed')
          .gte('created_at', firstOfMonth.toISOString()),
        supabase.from('posts').select('*, post_schedules(*, content_themes(theme_name))')
          .eq('company_id', companyId).in('status', ['draft', 'approved'])
          .gte('scheduled_for', now)
          .order('scheduled_for', { ascending: true }).limit(5),
        supabase.from('posts').select('*')
          .eq('company_id', companyId).eq('status', 'waiting')
          .order('created_at', { ascending: false }).limit(6),
        supabase.from('instagram_tokens').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase.from('company_context').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase.from('post_schedules').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase.from('posts').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase.from('content_themes').select('*')
          .eq('company_id', companyId).order('theme_name'),
      ])

      const pubCount  = published ?? 0
      const failCount = failed ?? 0
      const total     = pubCount + failCount
      const rate      = total > 0 ? Math.round((pubCount / total) * 100) : 100

      const typedUpcoming = (upcomingRaw ?? []) as (Post & {
        post_schedules?: { content_themes?: { theme_name: string } | null } | null
      })[]

      const nextPost = typedUpcoming[0]
        ? {
            scheduled_for: typedUpcoming[0].scheduled_for!,
            theme: typedUpcoming[0].post_schedules?.content_themes?.theme_name,
          }
        : null

      setState({
        metrics: {
          publishedThisMonth: pubCount,
          scheduledCount:     scheduled ?? 0,
          pendingCount:       pending ?? 0,
          successRate:        rate,
          nextPost,
        },
        upcomingPosts: typedUpcoming.map(p => ({
          ...p,
          theme: p.post_schedules?.content_themes?.theme_name,
        })),
        pendingPosts: (pendingPosts ?? []) as Post[],
        hasInstagram: (igRow?.length ?? 0) > 0,
        hasContext:   (ctxRow?.length ?? 0) > 0,
        hasSchedules: (scheduleRow?.length ?? 0) > 0,
        hasPosts:     (totalPosts ?? 0) > 0,
        themes:       (themes ?? []) as ContentTheme[],
        loading: false,
        error: null,
      })
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao carregar dados',
      }))
    }
  }, [companyId])

  useEffect(() => { load() }, [load])

  return { ...state, company, companyId, reload: load }
}
