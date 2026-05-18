'use client'

import { useEffect } from 'react'
import { X, Bell, CheckCheck, AlertCircle, CheckCircle2, Zap } from 'lucide-react'
import type { AppNotification } from '@/hooks/useNotifications'

const TYPE_CONFIG = {
  post_published: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  post_ready:     { icon: Bell,         color: 'text-amber-500', bg: 'bg-amber-50' },
  post_failed:    { icon: AlertCircle,  color: 'text-red-500',   bg: 'bg-red-50'   },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)  return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

interface Props {
  open: boolean
  onClose: () => void
  notifications: AppNotification[]
  unreadCount: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

export default function NotificationsDrawer({
  open, onClose, notifications, unreadCount, onMarkRead, onMarkAllRead,
}: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 z-50 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Bell size={14} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1A1A2E]">Notificações</h2>
              {unreadCount > 0 && (
                <p className="text-xs text-[#6C3FE8]">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#6C3FE8] transition-colors font-medium"
              >
                <CheckCheck size={13} />
                Marcar todas
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X size={15} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                <Bell size={22} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Nenhuma notificação ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] ?? { icon: Zap, color: 'text-gray-400', bg: 'bg-gray-50' }
                const Icon = cfg.icon
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.read && onMarkRead(n.id)}
                    className={`w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-[#F8F7FF]' : ''}`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${!n.read ? 'text-[#1A1A2E]' : 'text-gray-500'}`}>
                        {n.type === 'post_published' ? 'Post publicado' : n.type === 'post_ready' ? 'Post pronto para revisão' : 'Falha na publicação'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-300 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full gradient-bg flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
