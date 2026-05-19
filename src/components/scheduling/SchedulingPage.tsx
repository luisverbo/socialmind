'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, CheckSquare, Clock, History, Plus, RefreshCw } from 'lucide-react'
import { useCompany } from '@/hooks/useCompany'
import { supabase } from '@/lib/supabase'
import PostLimitBanner from './PostLimitBanner'
import WeeklyCalendar from './WeeklyCalendar'
import ApprovalQueue from './ApprovalQueue'
import SchedulesList from './SchedulesList'
import PostHistory from './PostHistory'
import NewScheduleModal from './NewScheduleModal'

type Tab = 'calendar' | 'approval' | 'schedules' | 'history'

export default function SchedulingPage() {
  const router = useRouter()
  const { company, companyId, loading, refresh } = useCompany()
  const [tab, setTab] = useState<Tab>('calendar')
  const [showModal, setShowModal] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!loading && !companyId) router.push('/onboarding')
  }, [loading, companyId, router])

  useEffect(() => {
    if (!companyId) return
    supabase
      .from('posts')
      .select('id', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('status', 'waiting')
      .then(({ count }) => setPendingCount(count ?? 0))
  }, [companyId])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-6 h-6 spinner" />
        Carregando...
      </div>
    </div>
  )
  if (!company) return null

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'calendar',  label: 'Calendário',   icon: <CalendarDays size={15} /> },
    { id: 'approval',  label: 'Aprovações',   icon: <CheckSquare  size={15} />, badge: pendingCount },
    { id: 'schedules', label: 'Agendamentos', icon: <Clock        size={15} /> },
    { id: 'history',   label: 'Histórico',    icon: <History      size={15} /> },
  ]

  const canCreate = company.active && company.posts_used_this_month < company.posts_limit

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Agendamento</h1>
          <p className="text-gray-400 text-sm mt-0.5">{company.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="btn-secondary p-2.5 rounded-xl text-gray-400"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={!canCreate}
            className="btn-primary px-4 py-2.5 text-sm"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Novo agendamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Limit banner */}
      <PostLimitBanner company={company} />

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 mb-6 overflow-x-auto scrollbar-hide shadow-card">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              tab === t.id
                ? 'text-white shadow-brand-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            style={tab === t.id ? { background: 'var(--brand-gradient)' } : {}}
          >
            {t.icon}
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.id ? 'bg-white/25 text-white' : 'bg-[#6C3FE8] text-white'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'calendar'  && companyId && <WeeklyCalendar  companyId={companyId} onNewSchedule={() => setShowModal(true)} />}
      {tab === 'approval'  && companyId && <ApprovalQueue   companyId={companyId} onCountChange={setPendingCount} />}
      {tab === 'schedules' && companyId && <SchedulesList   companyId={companyId} onNew={() => setShowModal(true)} onRefreshCompany={refresh} />}
      {tab === 'history'   && companyId && <PostHistory     companyId={companyId} />}

      {showModal && companyId && (
        <NewScheduleModal
          companyId={companyId}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); refresh(); setTab('approval') }}
        />
      )}
    </div>
  )
}
