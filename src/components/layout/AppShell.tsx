'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Images, Camera,
  Settings, BarChart3, Zap, Instagram,
} from 'lucide-react'
import { useCompany } from '@/hooks/useCompany'
import { useState, useEffect } from 'react'

const NAV_MAIN = [
  { href: '/',           icon: LayoutDashboard, label: 'Dashboard',   exact: true  },
  { href: '/scheduling', icon: CalendarDays,    label: 'Agendamento', exact: false },
  { href: '/posts',      icon: Images,          label: 'Posts',       exact: false },
  { href: '/media',      icon: Camera,          label: 'Mídia',       exact: false },
]

const NAV_BOTTOM = [
  { href: '/settings', icon: Settings,   label: 'Configurações', exact: false },
  { href: '/reports',  icon: BarChart3,  label: 'Relatórios',    exact: false, soon: true },
]

const MOBILE_NAV = [
  { href: '/',           icon: LayoutDashboard, label: 'Home',      exact: true  },
  { href: '/scheduling', icon: CalendarDays,    label: 'Agenda',    exact: false },
  { href: '/posts',      icon: Images,          label: 'Posts',     exact: false },
  { href: '/media',      icon: Camera,          label: 'Mídia',     exact: false },
  { href: '/settings',   icon: Settings,        label: 'Config',    exact: false },
]

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { company } = useCompany()
  const [hasInstagram, setHasInstagram] = useState(true)
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('socialmind_company_id') : null

  useEffect(() => {
    if (!companyId) return
    fetch(`/api/instagram/status?company_id=${companyId}`)
      .then(r => r.json())
      .then(d => setHasInstagram(d.connected ?? false))
      .catch(() => {})
  }, [companyId])

  const creditsUsed = company ? (company.credits_limit ?? 100) - (company.credits_balance ?? 0) : 0
  const pct      = company ? Math.min(100, (creditsUsed / (company.credits_limit ?? 100)) * 100) : 0
  const barColor = pct >= 90 ? '#EF4444' : undefined

  return (
    <div className="min-h-screen bg-[#F8F7FF] flex">

      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 px-4 py-6 fixed h-full z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold text-gradient">SocialMind</span>
        </Link>

        {/* Main nav */}
        <nav className="flex-1 space-y-0.5">
          {NAV_MAIN.map(item => {
            const active = isActive(pathname, item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[#F8F7FF] text-[#6C3FE8] border border-[#6C3FE8]/12'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <item.icon size={16} strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            )
          })}

          <div className="pt-4 pb-2">
            <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider px-3 mb-1">Conta</p>
          </div>

          {NAV_BOTTOM.map(item => {
            const active = isActive(pathname, item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  item.soon ? 'opacity-40 cursor-default pointer-events-none' : ''
                } ${
                  active
                    ? 'bg-[#F8F7FF] text-[#6C3FE8] border border-[#6C3FE8]/12'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <item.icon size={16} strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
                {item.soon && (
                  <span className="ml-auto text-[10px] font-semibold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
                    Em breve
                  </span>
                )}
              </Link>
            )
          })}

          {/* Instagram connect prompt */}
          {!hasInstagram && (
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-all mt-2"
            >
              <Instagram size={16} strokeWidth={2} />
              Conectar Instagram
            </Link>
          )}
        </nav>

        {/* Credits bar */}
        {company && (
          <div className="mt-4 pt-4 border-t border-gray-100 px-1">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400 font-medium capitalize">{company.plan}</span>
              <span className={pct >= 90 ? 'text-red-500 font-semibold' : 'text-gray-400'}>
                {company.credits_balance ?? 0}/{company.credits_limit ?? 100}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: barColor ?? 'linear-gradient(90deg, #6C3FE8, #E84393)' }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">créditos disponíveis</p>
          </div>
        )}
      </aside>

      {/* ── Mobile top bar ────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
            <Zap size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm text-gradient">SocialMind</span>
        </div>
        {company && (
          <span className="text-xs text-gray-400">{company.credits_balance ?? 0} créditos</span>
        )}
      </div>

      {/* ── Mobile bottom nav ─────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-100 flex safe-bottom">
        {MOBILE_NAV.map(item => {
          const active = isActive(pathname, item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active ? 'text-[#6C3FE8]' : 'text-gray-400'
              }`}
            >
              <item.icon size={19} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* ── Content ───────────────────────────────────── */}
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
