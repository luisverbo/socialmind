'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ShieldCheck, Plus, Minus, RefreshCw, Search } from 'lucide-react'

interface CompanyRow {
  id: string
  name: string
  email: string
  plan: string
  credits_balance: number
  credits_limit: number
}

export default function AdminCreditsPanel() {
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CompanyRow | null>(null)
  const [amount, setAmount] = useState(100)
  const [newLimit, setNewLimit] = useState(100)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('companies')
      .select('id, name, email, plan, credits_balance, credits_limit')
      .order('name')
    setCompanies(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function selectCompany(c: CompanyRow) {
    setSelected(c)
    setAmount(100)
    setNewLimit(c.credits_limit)
    setFeedback(null)
  }

  async function addCredits(delta: number) {
    if (!selected) return
    setSaving(true)
    setFeedback(null)
    const newBalance = Math.max(0, selected.credits_balance + delta)
    const { error } = await supabase
      .from('companies')
      .update({ credits_balance: newBalance })
      .eq('id', selected.id)
    if (error) {
      setFeedback({ type: 'err', msg: error.message })
    } else {
      const updated = { ...selected, credits_balance: newBalance }
      setSelected(updated)
      setCompanies(prev => prev.map(c => c.id === selected.id ? updated : c))
      setFeedback({ type: 'ok', msg: `Saldo atualizado: ${newBalance} créditos` })
    }
    setSaving(false)
  }

  async function setLimit() {
    if (!selected) return
    setSaving(true)
    setFeedback(null)
    const { error } = await supabase
      .from('companies')
      .update({ credits_limit: newLimit })
      .eq('id', selected.id)
    if (error) {
      setFeedback({ type: 'err', msg: error.message })
    } else {
      const updated = { ...selected, credits_limit: newLimit }
      setSelected(updated)
      setCompanies(prev => prev.map(c => c.id === selected.id ? updated : c))
      setFeedback({ type: 'ok', msg: `Limite atualizado: ${newLimit} créditos/mês` })
    }
    setSaving(false)
  }

  async function setInfinite() {
    if (!selected) return
    setSaving(true)
    setFeedback(null)
    const { error } = await supabase
      .from('companies')
      .update({ credits_balance: 9999, credits_limit: 9999 })
      .eq('id', selected.id)
    if (error) {
      setFeedback({ type: 'err', msg: error.message })
    } else {
      const updated = { ...selected, credits_balance: 9999, credits_limit: 9999 }
      setSelected(updated)
      setCompanies(prev => prev.map(c => c.id === selected.id ? updated : c))
      setFeedback({ type: 'ok', msg: '9999 créditos (modo ilimitado) aplicado!' })
    }
    setSaving(false)
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-[#6C3FE8]" />
        <span className="text-sm font-semibold text-[#1A1A2E]">Painel Admin — Créditos</span>
        <button onClick={load} className="ml-auto text-gray-400 hover:text-[#6C3FE8] transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar empresa ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C3FE8]/30 bg-gray-50"
        />
      </div>

      {/* Company list */}
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden max-h-56 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhuma empresa encontrada</p>
        ) : filtered.map(c => (
          <button
            key={c.id}
            onClick={() => selectCompany(c)}
            className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
              selected?.id === c.id ? 'bg-[#F8F7FF]' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div>
              <p className="text-sm font-medium text-[#1A1A2E]">{c.name}</p>
              <p className="text-xs text-gray-400">{c.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#6C3FE8]">{c.credits_balance}</p>
              <p className="text-xs text-gray-400">/ {c.credits_limit}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Edit panel */}
      {selected && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Editando: {selected.name}
          </p>

          {/* Add / remove credits */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Adicionar / remover saldo</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAmount(a => Math.max(1, a - 50))}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={e => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 text-center border border-gray-200 rounded-lg py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FE8]/30"
              />
              <button
                onClick={() => setAmount(a => a + 50)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Plus size={14} />
              </button>
              <button
                disabled={saving}
                onClick={() => addCredits(amount)}
                className="flex-1 py-1.5 text-sm font-medium rounded-lg bg-[#6C3FE8] text-white hover:bg-[#5B35C7] disabled:opacity-50 transition-colors"
              >
                + Adicionar
              </button>
              <button
                disabled={saving}
                onClick={() => addCredits(-amount)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                - Remover
              </button>
            </div>
          </div>

          {/* Set limit */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Alterar limite mensal</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={newLimit}
                onChange={e => setNewLimit(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-28 text-center border border-gray-200 rounded-lg py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FE8]/30"
              />
              <button
                disabled={saving}
                onClick={setLimit}
                className="px-4 py-1.5 text-sm font-medium rounded-lg border border-[#6C3FE8] text-[#6C3FE8] hover:bg-[#F8F7FF] disabled:opacity-50 transition-colors"
              >
                Salvar limite
              </button>
              <button
                disabled={saving}
                onClick={setInfinite}
                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-[#6C3FE8] to-[#E84393] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                ∞ Ilimitado
              </button>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <p className={`text-xs rounded-lg px-3 py-2 ${
              feedback.type === 'ok'
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {feedback.msg}
            </p>
          )}

          {/* Current balance info */}
          <div className="flex items-center gap-4 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            <span>Saldo atual: <strong className="text-[#6C3FE8]">{selected.credits_balance}</strong></span>
            <span>Limite: <strong className="text-gray-600">{selected.credits_limit}</strong></span>
            <span>Plano: <strong className="text-gray-600">{selected.plan}</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}
