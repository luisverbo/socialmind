'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Eye,
  CreditCard,
  UserX,
  UserCheck,
  LogIn,
  Search,
  Instagram,
  X,
  Check,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Company {
  id: string
  name: string
  email: string | null
  plan: 'starter' | 'pro' | 'agency'
  active: boolean
  created_at: string
  credits_used_this_month: number
  credits_limit: number
  user_id: string | null
}

interface ModalState {
  open: boolean
  company: Company | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_OPTS: Array<Company['plan'] | ''> = ['', 'starter', 'pro', 'agency']

const PLAN_LIMITS: Record<string, number> = {
  starter: 10,
  pro: 30,
  agency: 90,
}

const PLAN_PRICES: Record<string, string> = {
  starter: 'R$97/mês',
  pro: 'R$197/mês',
  agency: 'R$397/mês',
}

const PLAN_POSTS: Record<string, number> = {
  starter: 10,
  pro: 30,
  agency: 90,
}

const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-purple-100 text-purple-700',
  pro: 'bg-blue-100 text-blue-700',
  agency: 'bg-indigo-100 text-indigo-700',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

// ── Change Plan Modal ─────────────────────────────────────────────────────────

function ChangePlanModal({
  modal,
  onClose,
  onSaved,
}: {
  modal: ModalState
  onClose: () => void
  onSaved: (id: string, plan: string, limit: number) => void
}) {
  const [selected, setSelected] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (modal.company) setSelected(modal.company.plan)
  }, [modal.company])

  if (!modal.open || !modal.company) return null

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const limit = PLAN_LIMITS[selected] ?? 10
    await supabase
      .from('companies')
      .update({ plan: selected, credits_limit: limit })
      .eq('id', modal.company!.id)
    onSaved(modal.company!.id, selected, limit)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Alterar Plano</h2>
            <p className="text-sm text-gray-500 mt-0.5">{modal.company.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Plan cards */}
        <div className="space-y-3">
          {(['starter', 'pro', 'agency'] as const).map(plan => (
            <button
              key={plan}
              onClick={() => setSelected(plan)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                selected === plan
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selected === plan
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-gray-300'
                  }`}
                >
                  {selected === plan && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 capitalize">{plan}</span>
                    {plan === 'pro' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        Popular
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{PLAN_POSTS[plan]} posts/mês</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-700">{PLAN_PRICES[plan]}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#6C3FE8] to-[#E84393] hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Alterar Plano'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminClientsPage() {
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [instagramIds, setInstagramIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState<ModalState>({ open: false, company: null })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [{ data: cos }, { data: tokens }] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, email, plan, active, created_at, credits_used_this_month, credits_limit, user_id')
          .order('created_at', { ascending: false }),
        supabase.from('instagram_tokens').select('company_id'),
      ])
      setCompanies((cos ?? []) as Company[])
      setInstagramIds(new Set((tokens ?? []).map((t: { company_id: string }) => t.company_id)))
      setLoading(false)
    }
    load()
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = companies.filter(c => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    const matchPlan = !planFilter || c.plan === planFilter
    const matchStatus =
      !statusFilter ||
      (statusFilter === 'active' ? c.active !== false : c.active === false)
    return matchSearch && matchPlan && matchStatus
  })

  const handleToggleActive = async (company: Company) => {
    const newActive = !company.active
    // Optimistic update
    setCompanies(prev =>
      prev.map(c => (c.id === company.id ? { ...c, active: newActive } : c))
    )
    const supabase = createClient()
    const { error } = await supabase
      .from('companies')
      .update({ active: newActive })
      .eq('id', company.id)
    if (error) {
      // Revert on error
      setCompanies(prev =>
        prev.map(c => (c.id === company.id ? { ...c, active: company.active } : c))
      )
      showToast('Erro ao atualizar status')
    } else {
      showToast(newActive ? `${company.name} reativado` : `${company.name} suspenso`)
    }
  }

  const handleImpersonate = (companyId: string) => {
    localStorage.setItem('socialmind_company_id', companyId)
    localStorage.setItem('socialmind_impersonating', 'true')
    router.push('/')
  }

  const handlePlanSaved = (id: string, plan: string, limit: number) => {
    setCompanies(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, plan: plan as Company['plan'], credits_limit: limit }
          : c
      )
    )
    showToast('Plano alterado com sucesso')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
          <Check size={14} className="text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <span className="text-sm text-gray-500">{companies.length} empresas cadastradas</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors shadow-sm"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-purple-500 transition-colors shadow-sm"
        >
          {PLAN_OPTS.map(p => (
            <option key={p} value={p}>
              {p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Todos os planos'}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-purple-500 transition-colors shadow-sm"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="suspended">Suspensos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3.5 font-medium">Empresa</th>
                <th className="text-left px-4 py-3.5 font-medium">E-mail</th>
                <th className="text-left px-4 py-3.5 font-medium">Plano</th>
                <th className="text-left px-4 py-3.5 font-medium">Instagram</th>
                <th className="text-left px-4 py-3.5 font-medium">Créditos</th>
                <th className="text-left px-4 py-3.5 font-medium">Cadastro</th>
                <th className="text-left px-4 py-3.5 font-medium">Status</th>
                <th className="text-left px-4 py-3.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => {
                const creditsOver = c.credits_used_this_month >= c.credits_limit * 0.8
                const isActive = c.active !== false
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    {/* Empresa */}
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </td>

                    {/* E-mail */}
                    <td className="px-4 py-4">
                      <span className="text-gray-500 text-sm">{c.email ?? '—'}</span>
                    </td>

                    {/* Plano */}
                    <td className="px-4 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                          PLAN_BADGE[c.plan] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {c.plan}
                      </span>
                    </td>

                    {/* Instagram */}
                    <td className="px-4 py-4">
                      {instagramIds.has(c.id) ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <Instagram size={13} className="fill-green-500 text-green-500" />
                          <span className="text-xs font-medium">✓ Conectado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Instagram size={13} />
                          <span className="text-xs">✗ Sem conexão</span>
                        </div>
                      )}
                    </td>

                    {/* Créditos */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span
                          className={`text-xs font-medium ${
                            creditsOver ? 'text-amber-600' : 'text-gray-700'
                          }`}
                        >
                          {c.credits_used_this_month}/{c.credits_limit}
                        </span>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              creditsOver ? 'bg-amber-400' : 'bg-purple-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                (c.credits_used_this_month / Math.max(c.credits_limit, 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Cadastro */}
                    <td className="px-4 py-4">
                      <span className="text-gray-500 text-xs">{formatDate(c.created_at)}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {isActive ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        {/* Ver detalhes */}
                        <Link
                          href={`/admin/clients/${c.id}`}
                          title="Ver detalhes"
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <Eye size={15} />
                        </Link>

                        {/* Alterar plano */}
                        <button
                          title="Alterar plano"
                          onClick={() => setModal({ open: true, company: c })}
                          className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors"
                        >
                          <CreditCard size={15} />
                        </button>

                        {/* Suspender / Ativar */}
                        <button
                          title={isActive ? 'Suspender' : 'Ativar'}
                          onClick={() => handleToggleActive(c)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isActive
                              ? 'text-red-400 hover:bg-red-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                        >
                          {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>

                        {/* Entrar como cliente */}
                        <button
                          title="Entrar como cliente"
                          onClick={() => handleImpersonate(c.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          <LogIn size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-16 text-center text-gray-400 text-sm"
                  >
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Change Plan Modal */}
      <ChangePlanModal
        modal={modal}
        onClose={() => setModal({ open: false, company: null })}
        onSaved={handlePlanSaved}
      />
    </div>
  )
}
