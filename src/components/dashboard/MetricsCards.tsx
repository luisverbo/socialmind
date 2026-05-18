'use client'

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, CalendarClock, Clock, CheckCircle2 } from 'lucide-react'
import type { DashboardMetrics } from '@/hooks/useDashboard'
import type { Company } from '@/types/scheduling'

function AnimatedNumber({ target, duration = 800 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const start   = performance.now()
    const animate = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1)
      const ease    = 1 - Math.pow(1 - elapsed, 3)
      setValue(Math.round(ease * target))
      if (elapsed < 1) raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return <>{value}</>
}

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-100 rounded w-24" />
        <div className="w-9 h-9 rounded-xl bg-gray-100" />
      </div>
      <div className="h-8 bg-gray-100 rounded w-16" />
      <div className="h-2 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-32" />
    </div>
  )
}

interface Props {
  metrics: DashboardMetrics
  company: Company | null
  loading: boolean
}

export default function MetricsCards({ metrics, company, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const pct    = company ? Math.min(100, Math.round((company.posts_used_this_month / company.posts_limit) * 100)) : 0
  const barCol = pct >= 90 ? '#EF4444' : undefined

  const nextLabel = metrics.nextPost
    ? new Date(metrics.nextPost.scheduled_for).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1 — Posts este mês */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Posts este mês</span>
          <div className="w-9 h-9 rounded-xl bg-[#F8F7FF] flex items-center justify-center">
            <TrendingUp size={16} className="text-[#6C3FE8]" />
          </div>
        </div>
        <p className="text-3xl font-bold text-[#1A1A2E]">
          <AnimatedNumber target={company?.posts_used_this_month ?? 0} />
        </p>
        <div className="space-y-1.5">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${pct}%`,
                background: barCol ?? 'linear-gradient(90deg, #6C3FE8, #E84393)',
              }}
            />
          </div>
          <p className="text-xs text-gray-400">
            {company?.posts_used_this_month ?? 0} de {company?.posts_limit ?? 0} utilizados
          </p>
        </div>
      </div>

      {/* Card 2 — Agendados */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agendados</span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <CalendarClock size={16} className="text-blue-500" />
          </div>
        </div>
        <p className="text-3xl font-bold text-[#1A1A2E]">
          <AnimatedNumber target={metrics.scheduledCount} />
        </p>
        {nextLabel ? (
          <p className="text-xs text-gray-400">
            Próximo: <span className="font-medium text-gray-600">{nextLabel}</span>
          </p>
        ) : (
          <p className="text-xs text-gray-400">Nenhum agendado</p>
        )}
      </div>

      {/* Card 3 — Aguardando aprovação */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Aguardando</span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Clock size={16} className="text-amber-500" />
          </div>
        </div>
        <p className="text-3xl font-bold text-[#1A1A2E]">
          <AnimatedNumber target={metrics.pendingCount} />
        </p>
        {metrics.pendingCount > 0 ? (
          <p className="text-xs text-amber-600 font-medium">Revisão necessária</p>
        ) : (
          <p className="text-xs text-gray-400">Nenhum pendente</p>
        )}
      </div>

      {/* Card 4 — Taxa de sucesso */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Taxa de sucesso</span>
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={16} className="text-green-500" />
          </div>
        </div>
        <p className="text-3xl font-bold text-[#1A1A2E]">
          <AnimatedNumber target={metrics.successRate} />%
        </p>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-1000"
            style={{ width: `${metrics.successRate}%` }}
          />
        </div>
      </div>
    </div>
  )
}
