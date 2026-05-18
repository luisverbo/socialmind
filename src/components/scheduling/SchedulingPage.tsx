'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, CheckSquare, History, Plus, RefreshCw } from 'lucide-react'
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
    if (!loading && !companyId) {
      router.push('/onboarding')
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Carregando...
        </div>
      </div>
    )
  }

  if (!company) return null

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'calendar',  label: 'Calendário',  icon: <CalendarDays size={16} /> },
    { id: 'approval',  label: 'Aprovações',  icon: <CheckSquare size={16} />, badge: pendingCount },
    { id: 'schedules', label: 'Agendamentos', icon: <Clock size={16} /> },
    { id: 'history',   label: 'Histórico',   icon: <History size={16} /> },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Agendamento</h1>
          <p className="text-gray-400 text-sm mt-1">{company.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-all"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={!company.active || company.posts_used_this_month >= company.posts_limit}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo agendamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Limit banner */}
      <PostLimitBanner company={company} />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              tab === t.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'calendar'  && companyId && <WeeklyCalendar  companyId={companyId} onNewSchedule={() => setShowModal(true)} />}
      {tab === 'approval'  && companyId && <ApprovalQueue   companyId={companyId} onCountChange={setPendingCount} />}
      {tab === 'schedules' && companyId && <SchedulesList   companyId={companyId} onNew={() => setShowModal(true)} onRefreshCompany={refresh} />}
      {tab === 'history'   && companyId && <PostHistory     companyId={companyId} />}

      {/* Modal */}
      {showModal && companyId && (
        <NewScheduleModal
          companyId={companyId}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); refresh() }}
        />
      )}
    </div>
  )
}
