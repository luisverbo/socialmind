'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCompany } from '@/hooks/useCompany'
import InstagramConnect from './InstagramConnect'
import RecentPublications from './RecentPublications'
import BrandSettings from './BrandSettings'
import BusinessSettings from './BusinessSettings'
import { Settings, BarChart3, Zap } from 'lucide-react'
import type { Company } from '@/types/scheduling'

export default function SettingsPage() {
  const { companyId, company, loading: companyLoading } = useCompany()
  const [monthStats, setMonthStats] = useState<{ published: number; failed: number } | null>(null)

  useEffect(() => {
    if (!companyId) return
    const firstOfMonth = new Date()
    firstOfMonth.setDate(1)
    firstOfMonth.setHours(0, 0, 0, 0)

    Promise.all([
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'published')
        .gte('published_at', firstOfMonth.toISOString()),
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'failed')
        .gte('created_at', firstOfMonth.toISOString()),
    ]).then(([pub, fail]) => {
      setMonthStats({ published: pub.count ?? 0, failed: fail.count ?? 0 })
    })
  }, [companyId])

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 spinner" />
      </div>
    )
  }

  const pct = company
    ? Math.min(100, Math.round((company.posts_used_this_month / company.posts_limit) * 100))
    : 0

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F8F7FF] border border-[#6C3FE8]/15 flex items-center justify-center">
          <Settings size={18} className="text-[#6C3FE8]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1A1A2E]">Configurações</h1>
          <p className="text-xs text-gray-400">Gerencie sua conta e integrações</p>
        </div>
      </div>

      {/* Business info */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sobre o negócio</h2>
        <BusinessSettings />
      </section>

      {/* Brand identity */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Marca</h2>
        <BrandSettings />
      </section>

      {/* Instagram connection */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Integração</h2>
        <InstagramConnect />
      </section>

      {/* Monthly stats */}
      {company && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Este mês</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-[#6C3FE8]">{company.posts_used_this_month}</p>
              <p className="text-xs text-gray-400 mt-1">Posts criados</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{monthStats?.published ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-1">Publicados</p>
            </div>
            <div className="card p-4 text-center">
              <p className={`text-2xl font-bold ${(monthStats?.failed ?? 0) > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                {monthStats?.failed ?? '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Falharam</p>
            </div>
          </div>
        </section>
      )}

      {/* Post limit usage */}
      {company && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-[#1A1A2E]">Uso do plano</span>
            </div>
            <span className={`text-xs font-semibold ${pct >= 90 ? 'text-red-500' : 'text-gray-400'}`}>
              {company.posts_used_this_month} / {company.posts_limit} posts
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pct >= 90 ? 'bg-red-500' : ''}`}
              style={{
                width: `${pct}%`,
                background: pct < 90 ? 'linear-gradient(90deg, #6C3FE8, #E84393)' : undefined,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Plano <strong className="text-[#1A1A2E]">{company.plan.charAt(0).toUpperCase() + company.plan.slice(1)}</strong></span>
            <span>Renova em {new Date(company.reset_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
          </div>
        </div>
      )}

      {/* Recent publications */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Histórico recente</h2>
        <RecentPublications />
      </section>

      {/* App info */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="w-5 h-5 rounded-md gradient-bg flex items-center justify-center">
          <Zap size={11} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-xs text-gray-400">SocialMind — Automação de Instagram com IA</span>
      </div>
    </div>
  )
}
