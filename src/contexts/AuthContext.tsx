'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { COMPANY_ID_KEY } from '@/hooks/useCompany'

interface Company {
  id: string
  name: string
  email: string | null
  plan: string
  posts_limit: number
  posts_used_this_month: number
  role: string
  user_id: string | null
  active: boolean
}

interface AuthContextValue {
  user: User | null
  company: Company | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  company: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCompany = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) {
      setCompany(data)
      // Store company_id in localStorage for backward compat
      if (typeof window !== 'undefined') {
        localStorage.setItem(COMPANY_ID_KEY, data.id)
      }
    }
    return data
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchCompany(session.user.id)
      }
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchCompany(session.user.id)
      } else {
        setCompany(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchCompany])

  const signOut = async () => {
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem(COMPANY_ID_KEY)
    }
    setUser(null)
    setCompany(null)
  }

  return (
    <AuthContext.Provider value={{ user, company, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
