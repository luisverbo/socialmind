'use client'

import { Activity } from 'lucide-react'
import type { AppNotification } from '@/hooks/useNotifications'

const TYPE_CONFIG = {
  post_published: { icon: '✅', label: 'Post publicado',       color: 'text-green-600' },
  post_ready:     { icon: '🔔', label: 'Post aguarda aprovação', color: 'text-amber-600' },
  post_failed:    { icon: '❌', label: 'Falha na publicação',   color: 'text-red-500'  },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)   return 'agora'
  if (m < 60)  return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)   return `há ${d} dia${d > 1 ? 's' : ''}`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 items-start animate-pulse py-2">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-1.5 pt-0.5">
        <div className="h-3 bg-gray-100 rounded w-48" />
        <div className="h-2.5 bg-gray-100 rounded w-20" />
      </div>
    </div>
  )
}

interface Props {
  notifications: AppNotification[]
  loading: boolean
}

export default function ActivityFeed({ notifications, loading }: Props) {
  const items = notifications.slice(0, 10)

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-[#6C3FE8]" />
        <h2 className="text-sm font-semibold text-[#1A1A2E]">Atividade recente</h2>
      </div>

      {loading ? (
        <div className="space-y-1">
          {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-2">
            <Activity size={16} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Nenhuma atividade ainda</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {items.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] ?? { icon: '⚙️', label: n.type, color: 'text-gray-500' }
            return (
              <div key={n.id} className="relative">
                {/* Vertical line connector */}
                {i < items.length - 1 && (
                  <div className="absolute left-[15px] top-9 bottom-0 w-px bg-gray-100" />
                )}
                <div className={`flex gap-3 items-start py-2 rounded-xl px-2 transition-colors ${!n.read ? 'bg-[#F8F7FF]' : ''}`}>
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 text-sm shadow-sm">
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.message}</p>
                  </div>
                  <span className="text-xs text-gray-300 flex-shrink-0 pt-0.5">{timeAgo(n.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
