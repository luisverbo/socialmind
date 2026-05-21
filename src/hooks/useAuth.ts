'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Company {
  id: string
  name: string
  email: string | null
  plan: string
  active: boolean
  role: string
  user_id: string | null
  credits_balance: number
  credits_limit: number
  posts_used_this_month: number
  posts_limit: number
}

interface AuthState {
  user: User | null
  company: Company | null
  loading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCompany = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .select('id, name, email, plan, active, role, user_id, credits_balance, credits_limit, posts_used_this_month, posts_limit')
      .eq('user_id', userId)
      .single()
    setCompany(data as Company | null)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchCompany(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchCompany(session.user.id)
      } else {
        setCompany(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchCompany])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    // Clear impersonation state if any
    if (typeof window !== 'undefined') {
      localStorage.removeItem('socialmind_company_id')
      localStorage.removeItem('socialmind_impersonating')
    }
    await supabase.auth.signOut()
  }, [])

  return {
    user,
    company,
    loading,
    isAdmin: company?.role === 'admin',
    signOut,
  }
}
