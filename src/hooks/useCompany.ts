'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/client'
import type { Company } from '@/types/scheduling'

export const COMPANY_ID_KEY = 'socialmind_company_id'

export function useCompany() {
  const [company, setCompany] = useState<Company | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCompany = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()
    setCompany(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    const id = localStorage.getItem(COMPANY_ID_KEY)
    if (id) {
      setCompanyId(id)
      fetchCompany(id)
      return
    }

    // Try auth-based lookup if no localStorage
    ;(async () => {
      try {
        const browserClient = createClient()
        const { data: { user } } = await browserClient.auth.getUser()

        if (user) {
          // Fetch company by user_id
          const { data: authCompany } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (authCompany) {
            localStorage.setItem(COMPANY_ID_KEY, authCompany.id)
            setCompanyId(authCompany.id)
            setCompany(authCompany)
            setLoading(false)
            return
          }
        }

        // Fallback: auto-detect first company from DB and persist it
        const { data } = await supabase.from('companies').select('*').limit(1).single()
        if (data) {
          localStorage.setItem(COMPANY_ID_KEY, data.id)
          setCompanyId(data.id)
          setCompany(data)
        }
      } catch {
        // env vars missing or network error — app stays usable
      } finally {
        setLoading(false)
      }
    })()
  }, [fetchCompany])

  const refresh = useCallback(() => {
    if (companyId) fetchCompany(companyId)
  }, [companyId, fetchCompany])

  const postsRemaining = company
    ? Math.max(0, company.posts_limit - company.posts_used_this_month)
    : null

  const canCreatePost = company
    ? company.posts_used_this_month < company.posts_limit
    : false

  return { company, companyId, loading, refresh, postsRemaining, canCreatePost }
}
