'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/types/scheduling'
import { STATUS_CONFIG } from '@/types/scheduling'

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTH_NAMES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function WeeklyCalendar({ companyId, onNewSchedule }: { companyId: string; onNewSchedule: () => void }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const weekDays = getWeekDays(weekStart)
  const weekEnd = new Date(weekDays[6])
  weekEnd.setHours(23, 59, 59, 999)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, post_schedules(scheduled_time, type, day_of_week, content_themes(theme_name))')
      .eq('company_id', companyId)
      .gte('scheduled_for', weekStart.toISOString())
      .lte('scheduled_for', weekEnd.toISOString())
      .order('scheduled_for')
    setPosts(data ?? [])
    setLoading(false)
  }, [companyId, weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const today = new Date()

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }
  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }
  const goToday = () => setWeekStart(getWeekStart(new Date()))

  const weekLabel = () => {
    const s = weekDays[0]
    const e = weekDays[6]
    if (s.getMonth() === e.getMonth())
      return `${s.getDate()} - ${e.getDate()} de ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`
    return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} - ${e.getDate()} ${MONTH_NAMES[e.getMonth()]} ${e.getFullYear()}`
  }

  const totalPosts = posts.length

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200 transition-all">
            <ChevronLeft size={18} />
          </button>
          <button onClick={nextWeek} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200 transition-all">
            <ChevronRight size={18} />
          </button>
          <span className="text-sm font-medium text-gray-200 ml-1">{weekLabel()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{totalPosts} post{totalPosts !== 1 ? 's' : ''}</span>
          <button onClick={goToday} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-all border border-gray-700">
            Hoje
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-800">
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today)
            return (
              <div
                key={i}
                className={`px-2 py-3 text-center border-r border-gray-800 last:border-r-0 ${isToday ? 'bg-indigo-600/10' : ''}`}
              >
                <p className={`text-xs font-medium ${isToday ? 'text-indigo-400' : 'text-gray-500'}`}>{DAY_NAMES[i]}</p>
                <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-indigo-300' : 'text-gray-300'}`}>{day.getDate()}</p>
              </div>
            )
          })}
        </div>

        {/* Day columns */}
        <div className="grid grid-cols-7 min-h-[320px]">
          {weekDays.map((day, i) => {
            const dayPosts = posts.filter(p => p.scheduled_for && isSameDay(new Date(p.scheduled_for), day))
            const isToday = isSameDay(day, today)
            return (
              <div
                key={i}
                className={`border-r border-gray-800 last:border-r-0 p-1.5 min-h-[320px] ${isToday ? 'bg-indigo-600/5' : ''}`}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-16">
                    <div className="w-4 h-4 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      {dayPosts.map(post => {
                        const cfg = STATUS_CONFIG[post.status]
                        const theme = (post.post_schedules as { content_themes?: { theme_name: string } | null } | null)?.content_themes
                        return (
                          <div
                            key={post.id}
                            className={`p-1.5 rounded-lg border text-xs ${cfg.badge} cursor-pointer hover:opacity-80 transition-opacity`}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                              <span className="font-medium truncate">
                                {post.scheduled_for ? formatTime(post.scheduled_for) : '--:--'}
                              </span>
                            </div>
                            {theme && (
                              <p className="text-gray-400 truncate text-[10px] leading-tight">{theme.theme_name}</p>
                            )}
                            <p className={`text-[10px] font-medium mt-0.5 ${cfg.badge.split(' ').find(c => c.startsWith('text-'))}`}>
                              {cfg.label}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {dayPosts.length === 0 && (
                      <button
                        onClick={onNewSchedule}
                        className="w-full h-12 flex items-center justify-center text-gray-700 hover:text-gray-500 hover:bg-gray-800/50 rounded-lg transition-all group mt-1"
                      >
                        <Plus size={14} className="group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="text-xs text-gray-500">{cfg.label}</span>
          </div>
        ))}
      </div>

      {totalPosts === 0 && !loading && (
        <div className="mt-6 text-center py-12 text-gray-600">
          <CalendarDays size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum post agendado nesta semana.</p>
          <button onClick={onNewSchedule} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
            Criar agendamento →
          </button>
        </div>
      )}
    </div>
  )
}
