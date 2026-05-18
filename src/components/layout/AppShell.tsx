'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Settings, Bell } from 'lucide-react'
import { useCompany } from '@/hooks/useCompany'

const NAV = [
  { href: '/scheduling', icon: CalendarDays, label: 'Agendamento' },
  { href: '/settings',   icon: Settings,     label: 'Configurações' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { company } = useCompany()

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 p-6 fixed h-full z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div>
            <p className="text-white font-bold leading-tight">SocialMind</p>
            {company && <p className="text-gray-500 text-xs truncate max-w-[130px]">{company.name}</p>}
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  active
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {company && (
          <div className="mt-auto pt-6 border-t border-gray-800">
            <div className="text-xs text-gray-500 mb-1">Plano {company.plan}</div>
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Posts este mês</span>
              <span className={company.posts_used_this_month >= company.posts_limit ? 'text-red-400' : 'text-gray-300'}>
                {company.posts_used_this_month}/{company.posts_limit}
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  company.posts_used_this_month >= company.posts_limit ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }`}
                style={{ width: `${Math.min(100, (company.posts_used_this_month / company.posts_limit) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-black text-xs">S</span>
          </div>
          <span className="text-white font-bold text-sm">SocialMind</span>
        </div>
        <Bell size={18} className="text-gray-400" />
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex">
        {NAV.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? 'text-indigo-400' : 'text-gray-500'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-0">
        {children}
      </main>
    </div>
  )
}
