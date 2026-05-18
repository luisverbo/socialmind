'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pause, Play, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PostSchedule } from '@/types/scheduling'
import { DAY_SHORT } from '@/types/scheduling'

interface Props {
  companyId: string
  onNew: () => void
  onRefreshCompany: () => void
}

const TONE_LABEL: Record<string, string> = {
  educational: 'Educativo', motivational: 'Motivacional', promotional: 'Promocional',
}

const TONE_COLOR: Record<string, string> = {
  educational: 'text-blue-400 bg-blue-600/10 border-blue-600/30',
  motivational: 'text-orange-400 bg-orange-600/10 border-orange-600/30',
  promotional: 'text-green-400 bg-green-600/10 border-green-600/30',
}

export default function SchedulesList({ companyId, onNew, onRefreshCompany }: Props) {
  const [schedules, setSchedules] = useState<PostSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('post_schedules')
      .select('*, content_themes(id, theme_name, tone, slides_count)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    setSchedules(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  const toggleStatus = async (id: string, current: 'active' | 'paused') => {
    setToggling(id)
    const next = current === 'active' ? 'paused' : 'active'
    await supabase.from('post_schedules').update({ status: next }).eq('id', id)
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: next } : s))
    setToggling(null)
  }

  const deleteSchedule = async (id: string) => {
    setDeleting(id)
    // Delete related posts first
    await supabase.from('posts').delete().eq('schedule_id', id).in('status', ['draft', 'waiting'])
    await supabase.from('post_schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
    setConfirmDelete(null)
    setDeleting(null)
    onRefreshCompany()
  }

  const formatTime = (time: string) => time.slice(0, 5)

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      Carregando...
    </div>
  )

  if (schedules.length === 0) return (
    <div className="text-center py-20 text-gray-600">
      <Clock size={40} className="mx-auto mb-3 opacity-40" />
      <p className="font-medium text-gray-500">Nenhum agendamento criado</p>
      <p className="text-sm mt-1">Crie um agendamento para começar a publicar automaticamente.</p>
      <button
        onClick={onNew}
        className="mt-4 flex items-center gap-2 mx-auto bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
      >
        <Plus size={15} /> Criar primeiro agendamento
      </button>
    </div>
  )

  const active = schedules.filter(s => s.status === 'active')
  const paused = schedules.filter(s => s.status === 'paused')

  const renderGroup = (items: PostSchedule[], title: string) => {
    if (items.length === 0) return null
    return (
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
        <div className="space-y-3">
          {items.map(s => {
            const theme = s.content_themes
            const isDeleting = deleting === s.id
            const isToggling = toggling === s.id

            return (
              <div key={s.id} className={`bg-gray-900 border rounded-2xl p-5 transition-all ${s.status === 'paused' ? 'border-gray-800 opacity-60' : 'border-gray-800'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Type badge */}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                        s.type === 'recurring'
                          ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                          : 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                      }`}>
                        {s.type === 'recurring' ? '🔁 Recorrente' : '📅 Pontual'}
                      </span>

                      {/* Status */}
                      <span className={`text-xs px-2 py-0.5 rounded-md border ${
                        s.status === 'active'
                          ? 'bg-green-600/10 border-green-600/30 text-green-400'
                          : 'bg-gray-700/50 border-gray-600 text-gray-500'
                      }`}>
                        {s.status === 'active' ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-500" />
                        <span className="font-medium">{formatTime(s.scheduled_time)}</span>
                      </div>
                      {s.type === 'recurring' && s.day_of_week && (
                        <span className="text-gray-400">{DAY_SHORT[s.day_of_week] ?? s.day_of_week}feira</span>
                      )}
                      {s.type === 'one_time' && s.scheduled_date && (
                        <span className="text-gray-400">
                          {new Date(s.scheduled_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-md border ${
                        s.publish_mode === 'automatic'
                          ? 'bg-amber-600/10 border-amber-600/30 text-amber-400'
                          : 'bg-gray-700/30 border-gray-700 text-gray-500'
                      }`}>
                        {s.publish_mode === 'automatic' ? '⚡ Auto' : '👁️ Revisão'}
                      </span>
                    </div>

                    {theme && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-400">{theme.theme_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md border ${TONE_COLOR[theme.tone] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                          {TONE_LABEL[theme.tone] ?? theme.tone}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleStatus(s.id, s.status)}
                      disabled={isToggling || isDeleting}
                      className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-all"
                      title={s.status === 'active' ? 'Pausar' : 'Ativar'}
                    >
                      {isToggling ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : s.status === 'active' ? (
                        <Pause size={15} />
                      ) : (
                        <Play size={15} />
                      )}
                    </button>

                    {confirmDelete === s.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => deleteSchedule(s.id)}
                          disabled={isDeleting}
                          className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded-lg transition-all font-medium"
                        >
                          {isDeleting ? '...' : 'Confirmar'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(s.id)}
                        disabled={isDeleting}
                        className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {renderGroup(active, `Ativos (${active.length})`)}
      {renderGroup(paused, `Pausados (${paused.length})`)}
    </div>
  )
}
