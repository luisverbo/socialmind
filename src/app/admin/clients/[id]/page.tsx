'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Save,
  UserX,
  UserCheck,
  LogIn,
  Loader2,
  Calendar,
  FileText,
  Bot,
  Settings2,
  LayoutGrid,
  Activity,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Company {
  id: string
  name: string
  email: string | null
  plan: string
  active: boolean
  created_at: string
  credits_used_this_month: number
  credits_limit: number
  user_id: string | null
}

interface Post {
  id: string
  created_at: string
  status: 'draft' | 'waiting' | 'approved' | 'published' | 'failed' | 'rejected'
  content: Array<{ slide: number; title?: string; text?: string }>
}

interface Schedule {
  id: string
  type: string
  status: 'active' | 'paused'
  scheduled_time: string
  day_of_week: string | null
  publish_mode: string
  created_at: string
}

interface CompanyContext {
  id: string
  business_name: string | null
  niche: string | null
  system_prompt: string | null
  tone_of_voice: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLANS = ['starter', 'pro', 'agency'] as const

const PLAN_LIMITS: Record<string, number> = {
  starter: 10,
  pro: 30,
  agency: 90,
}

const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-purple-100 text-purple-700',
  pro: 'bg-blue-100 text-blue-700',
  agency: 'bg-indigo-100 text-indigo-700',
}

const POST_STATUS_CONFIG: Record<
  Post['status'],
  { label: string; badge: string }
> = {
  draft: { label: 'Rascunho', badge: 'bg-gray-100 text-gray-600' },
  waiting: { label: 'Aguardando', badge: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Aprovado', badge: 'bg-green-100 text-green-700' },
  published: { label: 'Publicado', badge: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Falhou', badge: 'bg-red-100 text-red-600' },
  rejected: { label: 'Rejeitado', badge: 'bg-gray-100 text-gray-500' },
}

const SCHEDULE_TYPE_LABEL: Record<string, string> = {
  recurring: 'Recorrente',
  one_time: 'Único',
  daily: 'Diário',
}

const DAY_LABEL: Record<string, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

// ── Section Card ──────────────────────────────────────────────────────────────

function Card({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <Icon size={16} className="text-purple-500" />
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value}</span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [context, setContext] = useState<CompanyContext | null>(null)
  const [loading, setLoading] = useState(true)

  // Plan editor state
  const [plan, setPlan] = useState('')
  const [creditsLimit, setCreditsLimit] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const [companyRes, postsRes, schedulesRes, contextRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', clientId).single(),
        supabase
          .from('posts')
          .select('id, created_at, status, content')
          .eq('company_id', clientId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('schedules').select('*').eq('company_id', clientId),
        supabase.from('company_context').select('*').eq('company_id', clientId).maybeSingle(),
      ])

      if (companyRes.data) {
        const c = companyRes.data as Company
        setCompany(c)
        setPlan(c.plan)
        setCreditsLimit(c.credits_limit)
      }
      setPosts((postsRes.data ?? []) as Post[])
      setSchedules((schedulesRes.data ?? []) as Schedule[])
      setContext(contextRes.data as CompanyContext | null)
      setLoading(false)
    }
    load()
  }, [clientId])

  const handleSavePlan = async () => {
    setSaving(true)
    setSaveSuccess('')
    setSaveError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('companies')
      .update({ plan, credits_limit: creditsLimit })
      .eq('id', clientId)
    if (error) {
      setSaveError(error.message)
    } else {
      setCompany((c: Company | null) => (c ? { ...c, plan, credits_limit: creditsLimit } : c))
      setSaveSuccess('Plano atualizado com sucesso!')
      setTimeout(() => setSaveSuccess(''), 3000)
    }
    setSaving(false)
  }

  const handleToggleActive = async () => {
    if (!company) return
    const newActive = !company.active
    const label = newActive ? 'Reativar' : 'Suspender'
    if (!confirm(`${label} a conta de "${company.name}"?`)) return
    const supabase = createClient()
    const { error } = await supabase
      .from('companies')
      .update({ active: newActive })
      .eq('id', clientId)
    if (!error) setCompany((c: Company | null) => (c ? { ...c, active: newActive } : c))
  }

  const handleImpersonate = () => {
    if (!confirm(`Acessar o painel como "${company?.name}"?`)) return
    localStorage.setItem('socialmind_company_id', clientId)
    localStorage.setItem('socialmind_impersonating', 'true')
    router.push('/')
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-gray-500">Empresa não encontrada</p>
          <Link
            href="/admin/clients"
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            ← Voltar aos clientes
          </Link>
        </div>
      </div>
    )
  }

  const isActive = company.active !== false
  const creditsOver = company.credits_used_this_month >= company.credits_limit * 0.8
  const creditsPct = Math.min(
    100,
    (company.credits_used_this_month / Math.max(company.credits_limit, 1)) * 100
  )
  const activeSchedules = schedules.filter(s => s.status === 'active')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          <Link
            href="/admin/clients"
            className="mt-1 p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white border border-transparent hover:border-gray-100 transition-all"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{company.name}</h1>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {isActive ? 'Ativo' : 'Suspenso'}
              </span>
            </div>
            {company.email && (
              <p className="text-gray-500 text-sm mt-0.5">{company.email}</p>
            )}
          </div>

          {/* Impersonate */}
          <button
            onClick={handleImpersonate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#6C3FE8] to-[#E84393] hover:opacity-90 transition-opacity shadow-sm shrink-0"
          >
            <LogIn size={15} />
            Entrar como cliente
          </button>
        </div>

        {/* ── Metric Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Plano */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Plano atual</p>
            <p className="font-semibold text-gray-900 capitalize">{company.plan}</p>
            <span
              className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                PLAN_BADGE[company.plan] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {company.plan}
            </span>
          </div>

          {/* Créditos */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Créditos este mês</p>
            <p
              className={`font-semibold ${
                creditsOver ? 'text-amber-600' : 'text-gray-900'
              }`}
            >
              {company.credits_used_this_month}
              <span className="text-gray-400 font-normal text-sm">
                /{company.credits_limit}
              </span>
            </p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  creditsOver ? 'bg-amber-400' : 'bg-purple-500'
                }`}
                style={{ width: `${creditsPct}%` }}
              />
            </div>
          </div>

          {/* Cadastro */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Cadastro</p>
            <p className="font-semibold text-gray-900">{formatDate(company.created_at)}</p>
          </div>

          {/* Posts */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Posts (últimos 10)</p>
            <p className="font-semibold text-gray-900">{posts.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeSchedules.length} agendamento{activeSchedules.length !== 1 ? 's' : ''} ativo{activeSchedules.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* ── Two-column grid ──────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Informações da Empresa */}
            <Card title="Informações da Empresa" icon={FileText}>
              <InfoRow label="Nome" value={company.name} />
              <InfoRow label="E-mail" value={company.email ?? '—'} />
              <InfoRow
                label="Plano"
                value={
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                      PLAN_BADGE[company.plan] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {company.plan}
                  </span>
                }
              />
              <InfoRow
                label="User ID"
                value={
                  <span className="font-mono text-xs text-gray-500 break-all">
                    {company.user_id ?? '—'}
                  </span>
                }
              />
              <InfoRow
                label="Status"
                value={
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {isActive ? 'Ativo' : 'Suspenso'}
                  </span>
                }
              />
            </Card>

            {/* Contexto da IA */}
            <Card title="Contexto da IA" icon={Bot}>
              {context ? (
                <div className="space-y-3">
                  {context.business_name && (
                    <InfoRow label="Nome do negócio" value={context.business_name} />
                  )}
                  {context.niche && (
                    <InfoRow label="Nicho" value={context.niche} />
                  )}
                  {context.tone_of_voice && (
                    <InfoRow label="Tom de voz" value={context.tone_of_voice} />
                  )}
                  {context.system_prompt && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1.5">System Prompt</p>
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-700 leading-relaxed max-h-36 overflow-y-auto font-mono whitespace-pre-wrap">
                        {context.system_prompt}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  Contexto ainda não configurado
                </p>
              )}
            </Card>

            {/* Gerenciar Plano */}
            <Card title="Gerenciar Plano" icon={Settings2}>
              {saveSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
                  {saveSuccess}
                </div>
              )}
              {saveError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600">
                  {saveError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Plano
                  </label>
                  <select
                    value={plan}
                    onChange={e => {
                      setPlan(e.target.value)
                      setCreditsLimit(PLAN_LIMITS[e.target.value] ?? creditsLimit)
                    }}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {PLANS.map(p => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Limite de créditos/mês
                  </label>
                  <input
                    type="number"
                    value={creditsLimit}
                    onChange={e => setCreditsLimit(Number(e.target.value))}
                    min={1}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <button
                  onClick={handleSavePlan}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#6C3FE8] to-[#E84393] hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {saving ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </Card>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Posts Recentes */}
            <Card title="Posts Recentes" icon={LayoutGrid}>
              {posts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Nenhum post encontrado
                </p>
              ) : (
                <div className="space-y-2">
                  {posts.map(post => {
                    const cfg = POST_STATUS_CONFIG[post.status] ?? {
                      label: post.status,
                      badge: 'bg-gray-100 text-gray-500',
                    }
                    const firstSlide = Array.isArray(post.content) ? post.content[0] : null
                    const title = firstSlide?.title ?? firstSlide?.text ?? 'Sem título'
                    return (
                      <div
                        key={post.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${cfg.badge}`}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-sm text-gray-700 truncate">{title}</span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatDateShort(post.created_at)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Agendamentos */}
            <Card title="Agendamentos" icon={Calendar}>
              {schedules.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Nenhum agendamento encontrado
                </p>
              ) : (
                <div className="space-y-2">
                  {schedules.map(sched => (
                    <div
                      key={sched.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            sched.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {sched.status === 'active' ? 'Ativo' : 'Pausado'}
                        </span>
                        <div>
                          <p className="text-sm text-gray-700 font-medium">
                            {SCHEDULE_TYPE_LABEL[sched.type] ?? sched.type}
                            {sched.day_of_week && (
                              <span className="text-gray-400 font-normal">
                                {' '}— {DAY_LABEL[sched.day_of_week] ?? sched.day_of_week}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">
                            {sched.scheduled_time} ·{' '}
                            {sched.publish_mode === 'automatic' ? 'Automático' : 'Revisão'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatDateShort(sched.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Ações */}
            <Card title="Ações" icon={Activity}>
              <div className="space-y-3">
                {/* Impersonate */}
                <button
                  onClick={handleImpersonate}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#6C3FE8]/5 to-[#E84393]/5 border border-purple-100 hover:from-[#6C3FE8]/10 hover:to-[#E84393]/10 transition-colors text-left"
                >
                  <LogIn size={16} className="text-purple-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Entrar como cliente</p>
                    <p className="text-xs text-gray-500">Visualiza o painel com o contexto desta empresa</p>
                  </div>
                </button>

                {/* Suspend / Reactivate */}
                <button
                  onClick={handleToggleActive}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                    isActive
                      ? 'bg-red-50 border-red-100 hover:bg-red-100'
                      : 'bg-green-50 border-green-100 hover:bg-green-100'
                  }`}
                >
                  {isActive ? (
                    <UserX size={16} className="text-red-500 shrink-0" />
                  ) : (
                    <UserCheck size={16} className="text-green-600 shrink-0" />
                  )}
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isActive ? 'text-red-600' : 'text-green-700'
                      }`}
                    >
                      {isActive ? 'Suspender conta' : 'Reativar conta'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isActive
                        ? 'Bloqueia o acesso do cliente ao painel'
                        : 'Restaura o acesso do cliente ao painel'}
                    </p>
                  </div>
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
