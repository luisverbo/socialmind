'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Zap,
  BarChart3,
  Instagram,
  Clock,
  Bell,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string
  name: string
  email: string
  plan: string
  active: boolean
  created_at: string
  credits_used_this_month: number
  credits_limit: number
  updated_at: string
}

interface Post {
  id: string
  created_at: string
  company_id: string
  status: string
}

interface DashboardData {
  companies: Company[]
  posts: Post[]
  instagramCompanyIds: Set<string>   // company_ids that have an instagram token
  expiringTokenCompanyIds: Set<string>  // tokens expiring in <30 days
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAN_PRICE: Record<string, number> = {
  starter: 97,
  pro: 197,
  agency: 397,
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function formatBRLShort(value: number): string {
  if (value >= 1000) {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value)
  }
  return formatBRL(value)
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  iconClassName: string
}

function MetricCard({ label, value, icon: Icon, iconClassName }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <Icon className={`w-5 h-5 mb-3 ${iconClassName}`} />
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}

interface AlertCardProps {
  title: string
  icon: React.ElementType
  count: number
  companies: Company[]
  colorScheme: {
    border: string
    bg: string
    badge: string
    badgeText: string
    link: string
    linkHover: string
  }
}

function AlertCard({ title, icon: Icon, count, companies, colorScheme }: AlertCardProps) {
  const first3 = companies.slice(0, 3)
  return (
    <div className={`bg-white border ${colorScheme.border} rounded-2xl p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colorScheme.link}`} />
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorScheme.badge} ${colorScheme.badgeText}`}>
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-gray-400 text-xs">Nenhuma empresa nesta categoria</p>
      ) : (
        <ul className="space-y-1.5">
          {first3.map(c => (
            <li key={c.id}>
              <Link
                href={`/admin/clients/${c.id}`}
                className={`text-xs font-medium ${colorScheme.link} ${colorScheme.linkHover} transition-colors`}
              >
                {c.name}
              </Link>
            </li>
          ))}
          {count > 3 && (
            <li>
              <Link
                href="/admin/clients"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Ver todos ({count}) →
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-blue-50 text-blue-700',
  pro: 'bg-purple-50 text-purple-700',
  agency: 'bg-pink-50 text-pink-700',
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const [{ data: companies }, { data: posts }, { data: tokens }] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, email, plan, active, created_at, credits_used_this_month, credits_limit, updated_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('posts')
          .select('id, created_at, company_id, status'),
        supabase
          .from('instagram_tokens')
          .select('company_id, token_expires_at'),
      ])

      const instagramCompanyIds = new Set((tokens ?? []).map(t => t.company_id))
      const expiringTokenCompanyIds = new Set(
        (tokens ?? []).filter(t => t.token_expires_at && t.token_expires_at <= soon).map(t => t.company_id)
      )

      setData({
        companies: (companies ?? []) as Company[],
        posts: (posts ?? []) as Post[],
        instagramCompanyIds,
        expiringTokenCompanyIds,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const companies = data?.companies ?? []
  const posts = data?.posts ?? []
  const instagramCompanyIds = data?.instagramCompanyIds ?? new Set<string>()
  const expiringTokenCompanyIds = data?.expiringTokenCompanyIds ?? new Set<string>()

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const totalClients = companies.length
  const activeClients = companies.filter(c => c.active !== false).length
  const totalPosts = posts.length
  const postsThisMonth = posts.filter(p => p.created_at >= startOfMonth).length

  // MRR
  const planCounts: Record<string, number> = {}
  companies.forEach(c => { planCounts[c.plan] = (planCounts[c.plan] ?? 0) + 1 })
  const mrr = Object.entries(planCounts).reduce((acc, [plan, count]) => acc + (PLAN_PRICE[plan] ?? 0) * count, 0)

  // IA cost
  const aiCost = postsThisMonth * 0.02

  // Taxa de publicação
  const publishedPosts = posts.filter(p => p.status === 'approved' || p.status === 'published').length
  const publishRate = totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0

  // ── Alert computations ───────────────────────────────────────────────────────

  // 1. Sem Instagram — no token registered
  const noInstagram = companies.filter(c => !instagramCompanyIds.has(c.id))

  // 2. Inativos >7 dias — companies with NO post in last 7 days
  const recentlyActiveIds = new Set(
    posts.filter(p => p.created_at >= sevenDaysAgo).map(p => p.company_id)
  )
  const inactiveCompanies = companies.filter(c => !recentlyActiveIds.has(c.id))

  // 3. Limite 80%+
  const nearLimit = companies.filter(
    c => c.credits_limit > 0 && c.credits_used_this_month >= c.credits_limit * 0.8
  )

  // 4. Tokens expirando em <30 dias
  const expiringTokens = companies.filter(c => expiringTokenCompanyIds.has(c.id))

  // ── Plan distribution + recent signups ───────────────────────────────────────

  const planBreakdown = Object.entries(planCounts)
  const recentSignups = companies.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da plataforma</p>
      </div>

      {/* Row 1: 4 metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Clientes"  value={totalClients}    icon={Users}      iconClassName="text-purple-500" />
        <MetricCard label="Clientes Ativos" value={activeClients}   icon={TrendingUp} iconClassName="text-green-500" />
        <MetricCard label="Posts Total"     value={totalPosts}      icon={FileText}   iconClassName="text-blue-500" />
        <MetricCard label="Posts este mês"  value={postsThisMonth}  icon={Bell}       iconClassName="text-pink-500" />
      </div>

      {/* Row 2: 3 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="MRR Estimado"
          value={`R$ ${formatBRLShort(mrr)}`}
          icon={DollarSign}
          iconClassName="text-violet-500"
        />
        <MetricCard
          label="Custo IA este mês"
          value={`R$ ${formatBRL(aiCost)}`}
          icon={Zap}
          iconClassName="text-amber-500"
        />
        <MetricCard
          label="Taxa de Publicação"
          value={`${publishRate}%`}
          icon={BarChart3}
          iconClassName="text-indigo-500"
        />
      </div>

      {/* Alerts section — full width */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-gray-900">⚠️ Alertas Importantes</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AlertCard
            title="Sem Instagram"
            icon={Instagram}
            count={noInstagram.length}
            companies={noInstagram}
            colorScheme={{
              border: 'border-blue-100',
              bg: 'bg-blue-50',
              badge: 'bg-blue-100',
              badgeText: 'text-blue-700',
              link: 'text-blue-600',
              linkHover: 'hover:text-blue-800',
            }}
          />
          <AlertCard
            title="Inativos >7 dias"
            icon={Clock}
            count={inactiveCompanies.length}
            companies={inactiveCompanies}
            colorScheme={{
              border: 'border-amber-100',
              bg: 'bg-amber-50',
              badge: 'bg-amber-100',
              badgeText: 'text-amber-700',
              link: 'text-amber-600',
              linkHover: 'hover:text-amber-800',
            }}
          />
          <AlertCard
            title="Limite 80%+"
            icon={AlertTriangle}
            count={nearLimit.length}
            companies={nearLimit}
            colorScheme={{
              border: 'border-red-100',
              bg: 'bg-red-50',
              badge: 'bg-red-100',
              badgeText: 'text-red-700',
              link: 'text-red-600',
              linkHover: 'hover:text-red-800',
            }}
          />
          <AlertCard
            title="Tokens expirando"
            icon={Zap}
            count={expiringTokens.length}
            companies={expiringTokens}
            colorScheme={{
              border: 'border-orange-100',
              bg: 'bg-orange-50',
              badge: 'bg-orange-100',
              badgeText: 'text-orange-700',
              link: 'text-orange-600',
              linkHover: 'hover:text-orange-800',
            }}
          />
        </div>
      </div>

      {/* Plan distribution + Recent signups */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Plan distribution */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Distribuição de Planos</h2>
          <div className="space-y-3">
            {planBreakdown.map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{plan}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(count / (totalClients || 1)) * 100}%`,
                        background: 'linear-gradient(90deg, #6C3FE8, #E84393)',
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
            {planBreakdown.length === 0 && (
              <p className="text-gray-400 text-sm">Sem dados</p>
            )}
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Cadastros Recentes</h2>
            <Link
              href="/admin/clients"
              className="text-xs text-purple-600 hover:text-purple-800 transition-colors font-medium"
            >
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-200">
                  <th className="text-left pb-3 font-medium">Empresa</th>
                  <th className="text-left pb-3 font-medium">Plano</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                  <th className="text-left pb-3 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentSignups.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-3">
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="font-medium text-gray-900 hover:text-purple-700 transition-colors"
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs text-gray-400 truncate max-w-[120px]">{c.email ?? '—'}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${PLAN_BADGE[c.plan] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {c.plan}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          c.active !== false
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {c.active !== false ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
                {recentSignups.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400 text-sm">
                      Nenhum cadastro ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
