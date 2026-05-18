'use client'

import type { Company } from '@/types/scheduling'
import { AlertTriangle, Zap, ArrowRight } from 'lucide-react'

export default function PostLimitBanner({ company }: { company: Company }) {
  const used = company.posts_used_this_month
  const limit = company.posts_limit
  const remaining = Math.max(0, limit - used)
  const pct = Math.min(100, (used / limit) * 100)
  const isWarning = pct >= 80
  const isExhausted = remaining === 0
  const resetDate = new Date(company.reset_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

  if (!isWarning && !isExhausted) return null

  return (
    <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border mb-6 ${
      isExhausted
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isExhausted ? 'bg-red-100' : 'bg-amber-100'
      }`}>
        {isExhausted
          ? <AlertTriangle size={18} className="text-red-500" />
          : <Zap size={18} className="text-amber-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isExhausted ? 'text-red-700' : 'text-amber-700'}`}>
          {isExhausted
            ? 'Limite de posts atingido'
            : `Apenas ${remaining} post${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`}
        </p>
        <p className={`text-xs mt-0.5 ${isExhausted ? 'text-red-500' : 'text-amber-600'}`}>
          {isExhausted
            ? `Plano ${company.plan} • Renova em ${resetDate}`
            : `${used} de ${limit} usados • Renova em ${resetDate}`}
        </p>
      </div>
      {isExhausted && (
        <button className="btn-primary px-4 py-2 text-sm flex-shrink-0 flex items-center gap-1.5">
          Upgrade <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}
