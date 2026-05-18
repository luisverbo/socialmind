'use client'

import { useState } from 'react'
import type { StepProps } from '@/types/onboarding'
import { Building2, Mail, Phone, Sparkles } from 'lucide-react'

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter', posts: '12 posts/mês', price: 'Grátis para começar' },
  { value: 'pro',     label: 'Pro',     posts: '30 posts/mês', price: 'Mais popular' },
  { value: 'agency',  label: 'Agency',  posts: '90 posts/mês', price: 'Para agências' },
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
      <label className="form-label">
        {label} {opts?.required !== false && <span className="text-[#6C3FE8]">*</span>}
      </label>
      {opts?.hint && <p className="form-hint">{opts.hint}</p>}
      {opts?.textarea ? (
        <textarea
          value={state[key] as string}
          onChange={e => updateState({ [key]: e.target.value })}
          placeholder={placeholder}
          rows={3}
          className={`textarea-field ${errors[key] ? 'border-red-400' : ''}`}
        />
      ) : (
        <input
          type="text"
          value={state[key] as string}
          onChange={e => updateState({ [key]: e.target.value })}
          placeholder={placeholder}
          className={`input-field ${errors[key] ? 'border-red-400' : ''}`}
        />
      )}
      {errors[key] && <p className="form-error">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[#6C3FE8] text-sm font-medium mb-2">
          <Building2 size={16} />
          <span>Etapa 1 de 5</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Sobre o seu negócio</h1>
        <p className="text-gray-400 text-sm mt-1">Vamos conhecer sua empresa para personalizar tudo.</p>
      </div>

      {/* Conta */}
      <div className="card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dados da conta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Nome da empresa <span className="text-[#6C3FE8]">*</span></label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={state.name}
                onChange={e => updateState({ name: e.target.value })}
                placeholder="Minha Empresa Ltda."
                className={`input-field pl-9 ${errors.name ? 'border-red-400' : ''}`}
              />
            </div>
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>
          <div>
            <label className="form-label">Telefone / WhatsApp</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={state.phone}
                onChange={e => updateState({ phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="input-field pl-9"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="form-label">E-mail <span className="text-[#6C3FE8]">*</span></label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={state.email}
              onChange={e => updateState({ email: e.target.value })}
              placeholder="contato@minhaempresa.com"
              className={`input-field pl-9 ${errors.email ? 'border-red-400' : ''}`}
            />
          </div>
          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>
      </div>

      {/* Plano */}
      <div className="card p-6 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plano</h2>
        <div className="grid grid-cols-3 gap-3">
          {PLAN_OPTIONS.map(plan => (
            <button
              key={plan.value}
              type="button"
              onClick={() => updateState({ plan: plan.value })}
              className={`relative p-4 rounded-xl border text-left transition-all ${
                state.plan === plan.value
                  ? 'bg-[#F8F7FF] border-[#6C3FE8] shadow-brand-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.value === 'pro' && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 gradient-bg text-white text-xs px-2 py-0.5 rounded-full font-medium">Popular</span>
              )}
              <p className={`font-bold text-sm ${state.plan === plan.value ? 'text-[#6C3FE8]' : 'text-[#1A1A2E]'}`}>{plan.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{plan.posts}</p>
              <p className="text-xs text-gray-300 mt-1">{plan.price}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sobre o negócio */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#6C3FE8]" />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sobre o negócio</h2>
        </div>
        <p className="text-xs text-gray-400">Essas informações serão usadas pela IA para criar conteúdos personalizados.</p>

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
        className="btn-primary w-full py-4"
      >
        {loading ? (
          <><div className="w-4 h-4 spinner" /> Salvando...</>
        ) : 'Próxima etapa →'}
      </button>
    </div>
  )
}
