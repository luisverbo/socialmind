'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useCompany } from './useCompany'

export interface AppNotification {
  id: string
  company_id: string
  type: 'post_ready' | 'post_published' | 'post_failed'
  message: string
  read: boolean
  created_at: string
}

export function useNotifications() {
  const { companyId } = useCompany()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data ?? []) as AppNotification[])
    setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load])

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return
    const channel = supabase
      .channel(`notifications:${companyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `company_id=eq.${companyId}` },
        payload => {
          setNotifications(prev => [payload.new as AppNotification, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `company_id=eq.${companyId}` },
        payload => {
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? { ...n, ...(payload.new as AppNotification) } : n)
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [companyId])

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [])

  const markAllRead = useCallback(async () => {
    if (!companyId) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true })
      .eq('company_id', companyId).eq('read', false)
  }, [companyId])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, loading, unreadCount, markRead, markAllRead, reload: load }
}
