'use client'

import { useState } from 'react'
import type { StepProps } from '@/types/onboarding'
import { Building2, Mail, Phone, Sparkles } from 'lucide-react'

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter', posts: '12 posts/mês', price: 'Grátis para começar', color: 'indigo' },
  { value: 'pro',     label: 'Pro',     posts: '30 posts/mês', price: 'Mais popular',       color: 'purple' },
  { value: 'agency',  label: 'Agency',  posts: '90 posts/mês', price: 'Para agências',      color: 'pink' },
] as const

interface FieldError { [key: string]: string }

export default function Step1Business({ state, updateState, onNext, loading }: StepProps) {
  const [errors, setErrors] = useState<FieldError>({})

  const validate = () => {
    const e: FieldError = {}
    if (!state.name.trim())         e.name         = 'Nome da empresa é obrigatório'
    if (!state.email.trim())        e.email        = 'E-mail é obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) e.email = 'E-mail inválido'
    if (!state.businessName.trim()) e.businessName = 'Nome do negócio é obrigatório'
    if (!state.niche.trim())        e.niche        = 'Nicho é obrigatório'
    if (!state.whatSells.trim())    e.whatSells    = 'Descreva o que você vende'
    if (!state.targetAudience.trim()) e.targetAudience = 'Defina seu público-alvo'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = async () => {
    if (validate()) await onNext()
  }

  const field = (
    label: string,
    key: keyof typeof state,
    placeholder: string,
    opts?: { textarea?: boolean; required?: boolean; hint?: string }
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label} {opts?.required !== false && <span className="text-indigo-400">*</span>}
      </label>
      {opts?.hint && <p className="text-xs text-gray-500 mb-2">{opts.hint}</p>}
      {opts?.textarea ? (
        <textarea
          value={state[key] as string}
          onChange={e => updateState({ [key]: e.target.value })}
          placeholder={placeholder}
          rows={3}
          className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${errors[key] ? 'border-red-500' : 'border-gray-700 focus:border-indigo-500'}`}
        />
      ) : (
        <input
          type="text"
          value={state[key] as string}
          onChange={e => updateState({ [key]: e.target.value })}
          placeholder={placeholder}
          className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${errors[key] ? 'border-red-500' : 'border-gray-700 focus:border-indigo-500'}`}
        />
      )}
      {errors[key] && <p className="text-red-400 text-xs mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-2">
          <Building2 size={16} />
          <span>Etapa 1 de 5</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Sobre o seu negócio</h1>
        <p className="text-gray-400 text-sm mt-1">Vamos conhecer sua empresa para personalizar tudo.</p>
      </div>

      {/* Conta */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Dados da conta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Nome da empresa <span className="text-indigo-400">*</span>
            </label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={state.name}
                onChange={e => updateState({ name: e.target.value })}
                placeholder="Minha Empresa Ltda."
                className={`w-full bg-gray-800 border rounded-xl pl-9 pr-4 py-3 text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${errors.name ? 'border-red-500' : 'border-gray-700 focus:border-indigo-500'}`}
              />
            </div>
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Telefone / WhatsApp
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={state.phone}
                onChange={e => updateState({ phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            E-mail <span className="text-indigo-400">*</span>
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              value={state.email}
              onChange={e => updateState({ email: e.target.value })}
              placeholder="contato@minhaempresa.com"
              className={`w-full bg-gray-800 border rounded-xl pl-9 pr-4 py-3 text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${errors.email ? 'border-red-500' : 'border-gray-700 focus:border-indigo-500'}`}
            />
          </div>
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
        </div>
      </div>

      {/* Plano */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Plano</h2>
        <div className="grid grid-cols-3 gap-3">
          {PLAN_OPTIONS.map(plan => (
            <button
              key={plan.value}
              type="button"
              onClick={() => updateState({ plan: plan.value })}
              className={`relative p-4 rounded-xl border text-left transition-all ${
                state.plan === plan.value
                  ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              {plan.value === 'pro' && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">Popular</span>
              )}
              <p className={`font-bold text-sm ${state.plan === plan.value ? 'text-indigo-300' : 'text-gray-200'}`}>{plan.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{plan.posts}</p>
              <p className="text-xs text-gray-500 mt-1">{plan.price}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sobre o negócio */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Sobre o negócio</h2>
        </div>
        <p className="text-xs text-gray-500">Essas informações serão usadas pela IA para criar conteúdos personalizados.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Nome do negócio / marca', 'businessName', 'ex: Studio Beleza da Ana')}
          {field('Nicho / segmento', 'niche', 'ex: clínica estética, restaurante, loja de roupas')}
        </div>
        {field('Cidade', 'city', 'ex: São Paulo - SP', { required: false })}
        {field('O que você vende?', 'whatSells', 'Descreva seus produtos ou serviços principais...', { textarea: true })}
        {field('Para quem você vende? (Público-alvo)', 'targetAudience', 'ex: mulheres de 25 a 45 anos, interessadas em estética e bem-estar...', { textarea: true })}
        {field('Principais diferenciais', 'differentials', 'O que torna seu negócio especial? O que te diferencia da concorrência?', { textarea: true, required: false })}
      </div>

      <button
        onClick={handleNext}
        disabled={loading}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Salvando...
          </>
        ) : (
          <>Próxima etapa →</>
        )}
      </button>
    </div>
  )
}
