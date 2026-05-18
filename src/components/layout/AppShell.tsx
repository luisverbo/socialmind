'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Settings, Zap } from 'lucide-react'
import { useCompany } from '@/hooks/useCompany'

const NAV = [
  { href: '/scheduling', icon: CalendarDays, label: 'Agendamento' },
  { href: '/settings',   icon: Settings,     label: 'Configurações' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { company } = useCompany()

  const pct = company ? Math.min(100, (company.posts_used_this_month / company.posts_limit) * 100) : 0
  const barColor = pct >= 90 ? 'bg-red-500' : 'bg-gradient-to-r from-[#6C3FE8] to-[#E84393]'

  return (
    <div className="min-h-screen bg-[#F8F7FF] flex">

      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 p-6 fixed h-full z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-brand-sm">
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-gradient">SocialMind</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[#F8F7FF] text-[#6C3FE8] border border-[#6C3FE8]/15'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <item.icon size={17} strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Usage */}
        {company && (
          <div className="mt-auto pt-5 border-t border-gray-100">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 font-medium">Plano {company.plan}</span>
              <span className={pct >= 90 ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                {company.posts_used_this_month}/{company.posts_limit}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">posts este mês</p>
          </div>
        )}
      </aside>

      {/* ── Mobile top bar ────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
            <Zap size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-gradient">SocialMind</span>
        </div>
        {company && (
          <span className="text-xs text-gray-400">{company.posts_used_this_month}/{company.posts_limit} posts</span>
        )}
      </div>

      {/* ── Mobile bottom nav ─────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 flex safe-bottom">
        {NAV.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? 'text-[#6C3FE8]' : 'text-gray-400'
              }`}
            >
              <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* ── Content ───────────────────────────────────── */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
