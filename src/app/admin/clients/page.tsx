'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Search, ChevronRight } from 'lucide-react'

interface Company {
  id: string
  name: string
  email: string | null
  plan: string
  active: boolean
  posts_used_this_month: number
  posts_limit: number
  created_at: string
}

const PLAN_OPTS = ['', 'starter', 'pro', 'agency']

export default function AdminClientsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('companies').select('id, name, email, plan, active, posts_used_this_month, posts_limit, created_at').order('created_at', { ascending: false })
      setCompanies((data ?? []) as Company[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = companies.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
    const matchPlan = !planFilter || c.plan === planFilter
    const matchStatus = !statusFilter || (statusFilter === 'active' ? c.active !== false : c.active === false)
    return matchSearch && matchPlan && matchStatus
  })

  return (
    <div className="text-white space-y-6">
      <h1 className="text-2xl font-bold">Clientes</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all" />
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-all">
            {PLAN_OPTS.map(p => <option key={p} value={p}>{p || 'Todos os planos'}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-all">
            <option value="">Todos</option>
            <option value="active">Ativos</option>
            <option value="suspended">Suspensos</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-white/10 bg-white/3">
                  <th className="text-left px-6 py-4 font-medium">Empresa</th>
                  <th className="text-left px-4 py-4 font-medium">E-mail</th>
                  <th className="text-left px-4 py-4 font-medium">Plano</th>
                  <th className="text-left px-4 py-4 font-medium">Posts</th>
                  <th className="text-left px-4 py-4 font-medium">Cadastro</th>
                  <th className="text-left px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium">{c.name}</td>
                    <td className="px-4 py-4 text-gray-400 text-xs">{c.email ?? '—'}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/20 text-purple-300 capitalize">{c.plan}</span>
                    </td>
                    <td className="px-4 py-4 text-gray-300 text-xs">
                      <span className={c.posts_used_this_month >= c.posts_limit * 0.8 ? 'text-amber-400 font-semibold' : ''}>
                        {c.posts_used_this_month}/{c.posts_limit}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-xs">
                      {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${c.active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {c.active !== false ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/admin/clients/${c.id}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                        Ver <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">Nenhum cliente encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
    </div>
  )
}
