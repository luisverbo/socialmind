'use client'

import type { Company } from '@/types/scheduling'
import { AlertTriangle, Zap } from 'lucide-react'

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
    <div className={`flex items-start gap-3 p-4 rounded-xl border mb-6 ${
      isExhausted
        ? 'bg-red-900/20 border-red-700/50'
        : 'bg-amber-900/20 border-amber-700/50'
    }`}>
      <div className={`flex-shrink-0 mt-0.5 ${isExhausted ? 'text-red-400' : 'text-amber-400'}`}>
        {isExhausted ? <AlertTriangle size={18} /> : <Zap size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isExhausted ? 'text-red-300' : 'text-amber-300'}`}>
          {isExhausted
            ? 'Limite de posts atingido'
            : `Apenas ${remaining} post${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''} este mês`}
        </p>
        <p className={`text-xs mt-0.5 ${isExhausted ? 'text-red-400/70' : 'text-amber-400/70'}`}>
          {isExhausted
            ? `Seu plano ${company.plan} atingiu ${limit} posts. Renova em ${resetDate} ou faça upgrade.`
            : `Você usou ${used} de ${limit} posts. Renova em ${resetDate}.`}
        </p>
      </div>
      {isExhausted && (
        <button className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all">
          Upgrade
        </button>
      )}
    </div>
  )
}
