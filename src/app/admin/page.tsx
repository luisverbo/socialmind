'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, FileText, TrendingUp, AlertTriangle, LogOut, Shield } from 'lucide-react'

interface Stats {
  totalClients: number
  activeClients: number
  totalPosts: number
  postsThisMonth: number
  planBreakdown: Record<string, number>
  recentSignups: Array<{ id: string; name: string; email: string; plan: string; created_at: string; active: boolean }>
  alerts: Array<{ id: string; name: string; email: string; posts_used_this_month: number; posts_limit: number }>
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [{ data: companies }, { data: posts }] = await Promise.all([
        supabase.from('companies').select('id, name, email, plan, created_at, active, posts_used_this_month, posts_limit').order('created_at', { ascending: false }),
        supabase.from('posts').select('id, created_at, company_id'),
      ])

      if (!companies) { setLoading(false); return }

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const postsThisMonth = (posts ?? []).filter(p => p.created_at >= startOfMonth).length

      const planBreakdown: Record<string, number> = {}
      companies.forEach(c => { planBreakdown[c.plan] = (planBreakdown[c.plan] ?? 0) + 1 })

      const alerts = companies.filter(c => c.posts_used_this_month >= c.posts_limit * 0.8)

      setStats({
        totalClients: companies.length,
        activeClients: companies.filter(c => c.active !== false).length,
        totalPosts: posts?.length ?? 0,
        postsThisMonth,
        planBreakdown,
        recentSignups: companies.slice(0, 5),
        alerts,
      })
      setLoading(false)
    }
    load()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F1A]">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">SocialMind Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/clients" className="text-sm text-gray-300 hover:text-white transition-colors">Clientes</Link>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Visão geral da plataforma</p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Clientes', value: stats?.totalClients ?? 0, icon: Users, color: 'text-purple-400' },
            { label: 'Clientes Ativos', value: stats?.activeClients ?? 0, icon: TrendingUp, color: 'text-green-400' },
            { label: 'Posts Total', value: stats?.totalPosts ?? 0, icon: FileText, color: 'text-blue-400' },
            { label: 'Posts este mês', value: stats?.postsThisMonth ?? 0, icon: TrendingUp, color: 'text-pink-400' },
          ].map(m => (
            <div key={m.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <m.icon className={`w-5 h-5 ${m.color} mb-3`} />
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-gray-400 text-sm mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Plan breakdown */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Distribuição de Planos</h2>
            <div className="space-y-3">
              {Object.entries(stats?.planBreakdown ?? {}).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 capitalize">{plan}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(count / (stats?.totalClients || 1)) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {Object.keys(stats?.planBreakdown ?? {}).length === 0 && (
                <p className="text-gray-500 text-sm">Sem dados</p>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="font-semibold">Alertas de Limite</h2>
            </div>
            {stats?.alerts.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum cliente próximo do limite</p>
            ) : (
              <div className="space-y-2">
                {stats?.alerts.map(c => (
                  <Link key={c.id} href={`/admin/clients/${c.id}`} className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </div>
                    <span className="text-xs text-amber-400 font-semibold">{c.posts_used_this_month}/{c.posts_limit}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Cadastros Recentes</h2>
            <Link href="/admin/clients" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Ver todos →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-white/10">
                  <th className="text-left pb-3 font-medium">Empresa</th>
                  <th className="text-left pb-3 font-medium">E-mail</th>
                  <th className="text-left pb-3 font-medium">Plano</th>
                  <th className="text-left pb-3 font-medium">Cadastro</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats?.recentSignups.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/clients/${c.id}`} className="font-medium hover:text-purple-300 transition-colors">{c.name}</Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-400">{c.email ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/20 text-purple-300 capitalize">{c.plan}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400">
                      {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${c.active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {c.active !== false ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
