'use client'

import { useState } from 'react'
import type { StepProps, ContentTheme } from '@/types/onboarding'
import { Sparkles, Plus, Trash2 } from 'lucide-react'

const TONE_OPTIONS = [
  { value: 'educational',   label: 'Educativo',     emoji: '📚', color: 'blue' },
  { value: 'motivational',  label: 'Motivacional',  emoji: '🔥', color: 'orange' },
  { value: 'promotional',   label: 'Promocional',   emoji: '🛍️',  color: 'green' },
  { value: 'journalistic',  label: 'Jornalístico',  emoji: '📰', color: 'slate' },
] as const

const SLIDES_OPTIONS = [5, 7, 10] as const

const SUGGESTED_THEMES = [
  { themeName: 'Dicas e tutoriais', tone: 'educational' as const,  slidesCount: 7 as const },
  { themeName: 'Antes e depois',    tone: 'motivational' as const, slidesCount: 5 as const },
  { themeName: 'Oferta da semana',  tone: 'promotional' as const,  slidesCount: 5 as const },
  { themeName: 'Mitos e verdades',  tone: 'educational' as const,  slidesCount: 7 as const },
  { themeName: 'Depoimentos',       tone: 'motivational' as const, slidesCount: 5 as const },
]

const emptyTheme = (): ContentTheme => ({ themeName: '', tone: 'educational', slidesCount: 7 })

const toneColor = (tone: string) => {
  if (tone === 'educational')  return 'bg-blue-50 border-blue-200 text-blue-600'
  if (tone === 'motivational') return 'bg-orange-50 border-orange-200 text-orange-600'
  if (tone === 'journalistic') return 'bg-slate-50 border-slate-200 text-slate-700'
  return 'bg-green-50 border-green-200 text-green-600'
}

const toneSelected = (tone: string) => {
  if (tone === 'educational')  return 'bg-blue-50 border-blue-400 text-blue-600'
  if (tone === 'motivational') return 'bg-orange-50 border-orange-400 text-orange-600'
  return 'bg-green-50 border-green-400 text-green-600'
}

export default function Step5ContentThemes({ state, updateState, onNext, onBack, loading }: StepProps) {
  const [newTheme, setNewTheme] = useState<ContentTheme>(emptyTheme())
  const [errors, setErrors] = useState<{ [k: string]: string }>({})

  const addTheme = () => {
    if (!newTheme.themeName.trim()) {
      setErrors({ themeName: 'Dê um nome ao tema' })
      return
    }
    setErrors({})
    updateState({ themes: [...state.themes, { ...newTheme }] })
    setNewTheme(emptyTheme())
  }

  const addSuggested = (theme: ContentTheme) => {
    if (state.themes.some(t => t.themeName === theme.themeName)) return
    updateState({ themes: [...state.themes, theme] })
  }

  const removeTheme = (i: number) => {
    updateState({ themes: state.themes.filter((_, idx) => idx !== i) })
  }

  const validate = () => {
    if (state.themes.length === 0) {
      setErrors({ global: 'Adicione pelo menos um tema para continuar' })
      return false
    }
    return true
  }

  const handleNext = async () => {
    if (validate()) await onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[#6C3FE8] text-sm font-medium mb-2">
          <Sparkles size={16} />
          <span>Etapa 5 de 5 — Última etapa!</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Temas de conteúdo</h1>
        <p className="text-gray-400 text-sm mt-1">Defina os temas recorrentes que a IA vai criar para você.</p>
      </div>

      {/* Sugestões */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Sugestões rápidas</h2>
          <p className="form-hint">Clique para adicionar temas prontos à sua lista</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_THEMES.map(theme => {
            const added = state.themes.some(t => t.themeName === theme.themeName)
            return (
              <button
                key={theme.themeName}
                onClick={() => addSuggested(theme)}
                disabled={added}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  added
                    ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-default'
                    : 'bg-white border-gray-200 hover:border-[#6C3FE8] text-gray-600 hover:text-[#6C3FE8]'
                }`}
              >
                {TONE_OPTIONS.find(t => t.value === theme.tone)?.emoji}
                {theme.themeName}
                {added ? ' ✓' : ' +'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Adicionar tema custom */}
      <div className="card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Adicionar tema personalizado</h2>

        <div>
          <label className="form-label">Nome do tema <span className="text-[#6C3FE8]">*</span></label>
          <input
            type="text"
            value={newTheme.themeName}
            onChange={e => setNewTheme(prev => ({ ...prev, themeName: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addTheme()}
            placeholder="ex: Dicas de cuidados, Novidades da semana..."
            className={`input-field ${errors.themeName ? 'border-red-400' : ''}`}
          />
          {errors.themeName && <p className="form-error">{errors.themeName}</p>}
        </div>

        <div>
          <label className="form-label">Tom do tema</label>
          <div className="grid grid-cols-3 gap-2">
            {TONE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNewTheme(prev => ({ ...prev, tone: opt.value }))}
                className={`p-3 rounded-xl border text-center transition-all ${
                  newTheme.tone === opt.value
                    ? toneSelected(opt.value)
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg mb-1">{opt.emoji}</div>
                <p className={`text-xs font-medium ${newTheme.tone === opt.value ? '' : 'text-gray-400'}`}>{opt.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label">Número de slides</label>
          <div className="flex gap-2">
            {SLIDES_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setNewTheme(prev => ({ ...prev, slidesCount: n }))}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  newTheme.slidesCount === n
                    ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={addTheme}
          className="w-full flex items-center justify-center gap-2 bg-[#F8F7FF] hover:bg-[#EDE9FF] border border-[#6C3FE8]/20 text-[#6C3FE8] font-semibold py-3 rounded-xl transition-all text-sm"
        >
          <Plus size={16} />
          Adicionar tema
        </button>
      </div>

      {/* Lista de temas */}
      {state.themes.length > 0 && (
        <div className="card p-6 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Seus temas ({state.themes.length})
          </h2>
          {errors.global && <p className="form-error">{errors.global}</p>}
          <div className="space-y-2">
            {state.themes.map((theme, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{TONE_OPTIONS.find(t => t.value === theme.tone)?.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A2E]">{theme.themeName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-md border ${toneColor(theme.tone)}`}>
                        {TONE_OPTIONS.find(t => t.value === theme.tone)?.label}
                      </span>
                      <span className="text-xs text-gray-400">{theme.slidesCount} slides</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeTheme(i)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.global && state.themes.length === 0 && (
        <p className="form-error text-center">{errors.global}</p>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 sm:flex-none sm:w-32 py-4">
          ← Voltar
        </button>
        <button
          onClick={handleNext}
          disabled={loading}
          className="btn-primary flex-1 py-4"
        >
          {loading ? (
            <><div className="w-4 h-4 spinner" /> Finalizando...</>
          ) : '🚀 Finalizar configuração'}
        </button>
      </div>
    </div>
  )
}
