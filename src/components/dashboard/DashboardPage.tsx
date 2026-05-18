'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Bell, Sparkles, Instagram } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { useNotifications } from '@/hooks/useNotifications'
import MetricsCards      from './MetricsCards'
import UpcomingPosts     from './UpcomingPosts'
import PendingApproval   from './PendingApproval'
import ActivityFeed      from './ActivityFeed'
import NotificationsDrawer from './NotificationsDrawer'
import GeneratePostModal from './GeneratePostModal'
import EmptyState        from './EmptyState'

export default function DashboardPage() {
  const dash  = useDashboard()
  const notif = useNotifications()
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [igStatus,    setIgStatus]    = useState<{ username?: string; profile_picture_url?: string } | null>(null)
  const [igChecked,   setIgChecked]   = useState(false)

  // Lazily fetch IG profile pic for header
  if (!igChecked && dash.companyId && dash.hasInstagram) {
    setIgChecked(true)
    fetch(`/api/instagram/status?company_id=${dash.companyId}`)
      .then(r => r.json())
      .then(d => { if (d.connected) setIgStatus(d) })
      .catch(() => {})
  }

  const isEmpty = !dash.loading && !dash.hasPosts && !dash.hasSchedules

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F7FF' }}>
      {/* ── Top header ─────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Company info */}
          <div className="flex items-center gap-2 min-w-0">
            <div>
              <p className="text-xs text-gray-400 leading-none">Olá,</p>
              <p className="text-sm font-bold text-[#1A1A2E] truncate max-w-[160px]">
                {dash.company?.name ?? '…'}
              </p>
            </div>
            {igStatus?.profile_picture_url ? (
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                <Image src={igStatus.profile_picture_url} alt="" width={32} height={32} className="object-cover" />
              </div>
            ) : dash.hasInstagram ? (
              <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                <Instagram size={14} className="text-white" />
              </div>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <Bell size={17} className="text-gray-500" />
              {notif.unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full gradient-bg text-white text-[9px] font-bold flex items-center justify-center">
                  {notif.unreadCount > 9 ? '9+' : notif.unreadCount}
                </span>
              )}
            </button>

            {/* Generate CTA */}
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary px-4 py-2 text-sm"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">Gerar post</span>
              <span className="sm:hidden">Gerar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Empty state */}
        {isEmpty ? (
          <EmptyState
            hasContext={dash.hasContext}
            hasInstagram={dash.hasInstagram}
            hasSchedules={dash.hasSchedules}
            hasPosts={dash.hasPosts}
            onGeneratePost={() => setModalOpen(true)}
          />
        ) : (
          <>
            {/* Metrics */}
            <MetricsCards
              metrics={dash.metrics}
              company={dash.company}
              loading={dash.loading}
            />

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UpcomingPosts
                posts={dash.upcomingPosts}
                loading={dash.loading}
                onCancel={dash.reload}
              />
              <PendingApproval
                posts={dash.pendingPosts}
                loading={dash.loading}
                onAction={dash.reload}
              />
            </div>

            {/* Activity */}
            <ActivityFeed
              notifications={notif.notifications}
              loading={notif.loading}
            />
          </>
        )}
      </div>

      {/* ── Overlays ───────────────────────────────────── */}
      <NotificationsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={notif.notifications}
        unreadCount={notif.unreadCount}
        onMarkRead={notif.markRead}
        onMarkAllRead={notif.markAllRead}
      />

      <GeneratePostModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        themes={dash.themes}
      />
    </div>
  )
}
