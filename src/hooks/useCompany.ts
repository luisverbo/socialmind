'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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
    // Fallback: auto-detect first company from DB and persist it
    supabase.from('companies').select('*').limit(1).single().then(({ data }) => {
      if (data) {
        localStorage.setItem(COMPANY_ID_KEY, data.id)
        setCompanyId(data.id)
        setCompany(data)
      }
      setLoading(false)
    })
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
