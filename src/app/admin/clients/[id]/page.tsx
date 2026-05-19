'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, UserX, UserCheck, ExternalLink, Loader2 } from 'lucide-react'

const PLANS = ['starter', 'pro', 'agency']
const PLAN_LIMITS: Record<string, number> = { starter: 10, pro: 30, agency: 100 }

interface Company {
  id: string
  name: string
  email: string | null
  plan: string
  active: boolean
  posts_used_this_month: number
  posts_limit: number
  created_at: string
  role: string
  user_id: string | null
}

export default function AdminClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState('')
  const [postsLimit, setPostsLimit] = useState(0)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('companies').select('*').eq('id', clientId).single()
      if (data) {
        setCompany(data as Company)
        setPlan(data.plan)
        setPostsLimit(data.posts_limit)
      }
      setLoading(false)
    }
    load()
  }, [clientId])

  const handleSave = async () => {
    setSaving(true)
    setSuccess('')
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('companies').update({ plan, posts_limit: postsLimit }).eq('id', clientId)
    if (err) { setError(err.message); setSaving(false); return }
    setCompany(c => c ? { ...c, plan, posts_limit: postsLimit } : c)
    setSuccess('Alterações salvas com sucesso!')
    setSaving(false)
  }

  const handleToggleActive = async () => {
    if (!company) return
    const newActive = !(company.active !== false)
    const label = newActive ? 'Reativar' : 'Suspender'
    if (!confirm(`${label} a conta de ${company.name}?`)) return
    const supabase = createClient()
    await supabase.from('companies').update({ active: newActive }).eq('id', clientId)
    setCompany(c => c ? { ...c, active: newActive } : c)
  }

  const handleImpersonate = async () => {
    if (!company?.user_id) { alert('Esta empresa não tem usuário vinculado'); return }
    if (!confirm(`Acessar o painel como "${company.name}"? Você será redirecionado para o app deles.`)) return
    // Store the impersonated company_id in localStorage and go to app
    localStorage.setItem('socialmind_company_id', clientId)
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center py-20 text-white">
        <div className="text-center">
          <p className="text-gray-400">Empresa não encontrada</p>
          <Link href="/admin/clients" className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block">← Voltar</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="text-white space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/clients" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-gray-400 text-sm">{company.email ?? 'Sem e-mail'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${company.active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {company.active !== false ? 'Ativo' : 'Suspenso'}
            </span>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Plano atual', value: company.plan, color: 'text-purple-300' },
            { label: 'Posts este mês', value: `${company.posts_used_this_month}/${company.posts_limit}`, color: company.posts_used_this_month >= company.posts_limit * 0.8 ? 'text-amber-400' : 'text-white' },
            { label: 'Cadastro', value: new Date(company.created_at).toLocaleDateString('pt-BR'), color: 'text-gray-300' },
          ].map(m => (
            <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">{m.label}</p>
              <p className={`font-semibold capitalize ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Edit plan */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Editar Plano</h2>

          {success && <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-400">{success}</div>}
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Plano</label>
              <select value={plan} onChange={e => { setPlan(e.target.value); setPostsLimit(PLAN_LIMITS[e.target.value] ?? postsLimit) }}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-all">
                {PLANS.map(p => <option key={p} value={p} className="bg-gray-900">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Limite de posts/mês</label>
              <input type="number" value={postsLimit} onChange={e => setPostsLimit(Number(e.target.value))} min={1}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-all" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {/* Actions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold mb-4">Ações</h2>

          <button onClick={handleImpersonate}
            className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <ExternalLink size={16} className="text-blue-400" />
              <div className="text-left">
                <p className="text-sm font-medium">Acessar como cliente</p>
                <p className="text-xs text-gray-400">Visualiza o painel com o contexto desta empresa</p>
              </div>
            </div>
          </button>

          <button onClick={handleToggleActive}
            className={`w-full flex items-center justify-between px-5 py-3 rounded-xl border transition-colors ${company.active !== false ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20' : 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20'}`}>
            <div className="flex items-center gap-3">
              {company.active !== false ? <UserX size={16} className="text-red-400" /> : <UserCheck size={16} className="text-green-400" />}
              <div className="text-left">
                <p className={`text-sm font-medium ${company.active !== false ? 'text-red-400' : 'text-green-400'}`}>
                  {company.active !== false ? 'Suspender conta' : 'Reativar conta'}
                </p>
                <p className="text-xs text-gray-400">
                  {company.active !== false ? 'Bloqueia o acesso do cliente' : 'Restaura o acesso do cliente'}
                </p>
              </div>
            </div>
          </button>
        </div>
    </div>
  )
}
