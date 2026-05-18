'use client'

import { useState } from 'react'
import type { StepProps, ContentTheme } from '@/types/onboarding'
import { Sparkles, Plus, Trash2 } from 'lucide-react'

const TONE_OPTIONS = [
  { value: 'educational',   label: 'Educativo',     emoji: '📚', color: 'blue' },
  { value: 'motivational',  label: 'Motivacional',  emoji: '🔥', color: 'orange' },
  { value: 'promotional',   label: 'Promocional',   emoji: '🛍️',  color: 'green' },
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

  const toneColor = (tone: string) => {
    if (tone === 'educational')  return 'bg-blue-600/20 border-blue-500/50 text-blue-300'
    if (tone === 'motivational') return 'bg-orange-600/20 border-orange-500/50 text-orange-300'
    return 'bg-green-600/20 border-green-500/50 text-green-300'
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
          <Sparkles size={16} />
          <span>Etapa 5 de 5 — Última etapa!</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Temas de conteúdo</h1>
        <p className="text-gray-400 text-sm mt-1">Defina os temas recorrentes que a IA vai criar para você.</p>
      </div>

      {/* Sugestões */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">Sugestões rápidas</h2>
          <p className="text-xs text-gray-500">Clique para adicionar temas prontos à sua lista</p>
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
                    ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-default'
                    : 'bg-gray-800 border-gray-700 hover:border-amber-500 text-gray-300 hover:text-amber-300'
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
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Adicionar tema personalizado</h2>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome do tema <span className="text-amber-400">*</span></label>
          <input
            type="text"
            value={newTheme.themeName}
            onChange={e => setNewTheme(prev => ({ ...prev, themeName: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addTheme()}
            placeholder="ex: Dicas de cuidados, Novidades da semana..."
            className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${errors.themeName ? 'border-red-500' : 'border-gray-700 focus:border-amber-500'}`}
          />
          {errors.themeName && <p className="text-red-400 text-xs mt-1">{errors.themeName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Tom do tema</label>
          <div className="grid grid-cols-3 gap-2">
            {TONE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNewTheme(prev => ({ ...prev, tone: opt.value }))}
                className={`p-3 rounded-xl border text-center transition-all ${
                  newTheme.tone === opt.value
                    ? toneColor(opt.value) + ' border-opacity-100'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-lg mb-1">{opt.emoji}</div>
                <p className={`text-xs font-medium ${newTheme.tone === opt.value ? '' : 'text-gray-400'}`}>{opt.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Número de slides</label>
          <div className="flex gap-2">
            {SLIDES_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setNewTheme(prev => ({ ...prev, slidesCount: n }))}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  newTheme.slidesCount === n
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={addTheme}
          className="w-full flex items-center justify-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300 font-semibold py-3 rounded-xl transition-all text-sm"
        >
          <Plus size={16} />
          Adicionar tema
        </button>
      </div>

      {/* Lista de temas adicionados */}
      {state.themes.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Seus temas ({state.themes.length})
          </h2>
          {errors.global && <p className="text-red-400 text-xs">{errors.global}</p>}
          <div className="space-y-2">
            {state.themes.map((theme, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{TONE_OPTIONS.find(t => t.value === theme.tone)?.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{theme.themeName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-md border ${toneColor(theme.tone)}`}>
                        {TONE_OPTIONS.find(t => t.value === theme.tone)?.label}
                      </span>
                      <span className="text-xs text-gray-500">{theme.slidesCount} slides</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeTheme(i)}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.global && state.themes.length === 0 && (
        <p className="text-red-400 text-xs text-center">{errors.global}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 sm:flex-none sm:w-32 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-4 rounded-xl transition-all border border-gray-700"
        >
          ← Voltar
        </button>
        <button
          onClick={handleNext}
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Finalizando...
            </>
          ) : '🚀 Finalizar configuração'}
        </button>
      </div>
    </div>
  )
}
