'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/types/scheduling'
import { STATUS_CONFIG } from '@/types/scheduling'

const DAY_NAMES  = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const MONTH_NAMES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const day  = date.getDay()
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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function WeeklyCalendar({ companyId, onNewSchedule }: { companyId: string; onNewSchedule: () => void }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [posts, setPosts]         = useState<Post[]>([])
  const [loading, setLoading]     = useState(true)

  const weekDays = getWeekDays(weekStart)
  const weekEnd  = new Date(weekDays[6]); weekEnd.setHours(23, 59, 59, 999)

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

  const weekLabel = () => {
    const s = weekDays[0], e = weekDays[6]
    if (s.getMonth() === e.getMonth())
      return `${s.getDate()}–${e.getDate()} de ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`
    return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()]} ${e.getFullYear()}`
  }

  const go = (dir: -1 | 1) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + dir * 7); setWeekStart(d)
  }

  return (
    <div>
      {/* Nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-gray-700 transition-all border border-transparent hover:border-gray-200">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => go(1)} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-gray-700 transition-all border border-transparent hover:border-gray-200">
            <ChevronRight size={18} />
          </button>
          <span className="text-sm font-semibold text-[#1A1A2E] ml-2">{weekLabel()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{posts.length} post{posts.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="btn-secondary px-3 py-1.5 text-xs rounded-lg"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today)
            return (
              <div key={i} className={`py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-[#F8F7FF]' : ''}`}>
                <p className={`text-xs font-medium ${isToday ? 'text-[#6C3FE8]' : 'text-gray-400'}`}>{DAY_NAMES[i]}</p>
                <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 text-sm font-bold ${
                  isToday ? 'gradient-bg text-white' : 'text-gray-700'
                }`}>{day.getDate()}</div>
              </div>
            )
          })}
        </div>

        {/* Day columns */}
        <div className="grid grid-cols-7 min-h-[300px]">
          {weekDays.map((day, i) => {
            const dayPosts = posts.filter(p => p.scheduled_for && isSameDay(new Date(p.scheduled_for), day))
            const isToday  = isSameDay(day, today)
            return (
              <div key={i} className={`border-r border-gray-100 last:border-r-0 p-1.5 ${isToday ? 'bg-[#F8F7FF]/60' : ''}`}>
                {loading ? (
                  <div className="flex justify-center pt-4"><div className="w-4 h-4 spinner" /></div>
                ) : (
                  <>
                    <div className="space-y-1">
                      {dayPosts.map(post => {
                        const cfg   = STATUS_CONFIG[post.status]
                        const theme = (post.post_schedules as { content_themes?: { theme_name: string } | null } | null)?.content_themes

                        // Get title from first slide (cover), fallback to theme name
                        const slides = Array.isArray(post.content) ? post.content : []
                        const postTitle = (slides[0] as { title?: string } | undefined)?.title
                          || theme?.theme_name
                          || null

                        return (
                          <div key={post.id} className={`p-1.5 rounded-lg border text-xs cursor-pointer hover:shadow-sm transition-all ${cfg.badge}`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                              <span className="font-semibold truncate">{post.scheduled_for ? fmtTime(post.scheduled_for) : '--:--'}</span>
                            </div>
                            {postTitle && (
                              <p className="truncate text-[10px] font-medium leading-tight mt-0.5 opacity-90">
                                {postTitle}
                              </p>
                            )}
                            <p className="text-[10px] mt-0.5 opacity-60">{cfg.label}</p>
                          </div>
                        )
                      })}
                    </div>

                    {dayPosts.length === 0 && (
                      <button
                        onClick={onNewSchedule}
                        className="w-full h-10 flex items-center justify-center text-gray-300 hover:text-[#6C3FE8] hover:bg-purple-50 rounded-lg transition-all group mt-1"
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
      <div className="flex flex-wrap gap-4 mt-4 px-1">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="text-xs text-gray-400">{cfg.label}</span>
          </div>
        ))}
      </div>

      {posts.length === 0 && !loading && (
        <div className="mt-8 text-center py-14">
          <div className="w-14 h-14 bg-[#F8F7FF] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#6C3FE8]/15">
            <CalendarDays size={26} className="text-[#6C3FE8]/60" />
          </div>
          <p className="text-gray-500 font-medium text-sm">Nenhum post agendado nesta semana</p>
          <button onClick={onNewSchedule} className="mt-3 text-[#6C3FE8] hover:text-[#5830cc] text-sm font-medium transition-colors">
            Criar agendamento →
          </button>
        </div>
      )}
    </div>
  )
}
