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
  educational: 'text-blue-600 bg-blue-50 border-blue-200',
  motivational: 'text-orange-600 bg-orange-50 border-orange-200',
  promotional: 'text-green-600 bg-green-50 border-green-200',
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
    await supabase.from('posts').delete().eq('schedule_id', id).in('status', ['draft', 'waiting'])
    await supabase.from('post_schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
    setConfirmDelete(null)
    setDeleting(null)
    onRefreshCompany()
  }

  const formatTime = (time: string) => time.slice(0, 5)

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
      <div className="w-5 h-5 spinner" />
      Carregando...
    </div>
  )

  if (schedules.length === 0) return (
    <div className="text-center py-20">
      <div className="w-14 h-14 bg-[#F8F7FF] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#6C3FE8]/15">
        <Clock size={26} className="text-[#6C3FE8]/60" />
      </div>
      <p className="font-medium text-gray-600">Nenhum agendamento criado</p>
      <p className="text-sm text-gray-400 mt-1">Crie um agendamento para começar a publicar automaticamente.</p>
      <button
        onClick={onNew}
        className="btn-primary mt-4 mx-auto px-4 py-2 text-sm"
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
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
        <div className="space-y-3">
          {items.map(s => {
            const theme = s.content_themes
            const isDeleting = deleting === s.id
            const isToggling = toggling === s.id

            return (
              <div key={s.id} className={`card p-5 transition-all ${s.status === 'paused' ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                        s.type === 'recurring'
                          ? 'bg-[#F8F7FF] border-[#6C3FE8]/30 text-[#6C3FE8]'
                          : 'bg-purple-50 border-purple-200 text-purple-600'
                      }`}>
                        {s.type === 'recurring' ? '🔁 Recorrente' : '📅 Pontual'}
                      </span>

                      <span className={`text-xs px-2 py-0.5 rounded-md border ${
                        s.status === 'active'
                          ? 'bg-green-50 border-green-200 text-green-600'
                          : 'bg-gray-100 border-gray-200 text-gray-400'
                      }`}>
                        {s.status === 'active' ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
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
                          ? 'bg-amber-50 border-amber-200 text-amber-600'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}>
                        {s.publish_mode === 'automatic' ? '⚡ Auto' : '👁️ Revisão'}
                      </span>
                    </div>

                    {theme && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500">{theme.theme_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md border ${TONE_COLOR[theme.tone] ?? 'text-gray-400 bg-gray-50 border-gray-200'}`}>
                          {TONE_LABEL[theme.tone] ?? theme.tone}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleStatus(s.id, s.status)}
                      disabled={isToggling || isDeleting}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
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
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => deleteSchedule(s.id)}
                          disabled={isDeleting}
                          className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded-lg transition-all font-medium"
                        >
                          {isDeleting ? '...' : 'Confirmar'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(s.id)}
                        disabled={isDeleting}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
