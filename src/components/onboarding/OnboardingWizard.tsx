'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { OnboardingState } from '@/types/onboarding'
import Step1Business from './steps/Step1Business'
import Step2ToneOfVoice from './steps/Step2ToneOfVoice'
import Step3VisualIdentity from './steps/Step3VisualIdentity'
import Step4MediaLibrary from './steps/Step4MediaLibrary'
import Step5ContentThemes from './steps/Step5ContentThemes'
import WelcomeScreen from './WelcomeScreen'

const STORAGE_KEY = 'socialmind_onboarding_v1'

const DEFAULT_STATE: OnboardingState = {
  currentStep: 1,
  companyId: null,
  contextId: null,
  name: '',
  email: '',
  phone: '',
  plan: 'starter',
  businessName: '',
  niche: '',
  city: '',
  whatSells: '',
  targetAudience: '',
  differentials: '',
  toneOfVoice: '',
  forbiddenWords: '',
  postExamples: '',
  brandColors: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#ec4899' },
  logoUrl: '',
  slideStyle: 'moderno',
  themes: [],
}

const STEPS = [
  { number: 1, title: 'Sobre o negócio', description: 'Dados da empresa' },
  { number: 2, title: 'Tom de voz', description: 'Como você fala' },
  { number: 3, title: 'Identidade visual', description: 'Cores e logo' },
  { number: 4, title: 'Biblioteca de mídia', description: 'Suas fotos' },
  { number: 5, title: 'Temas de conteúdo', description: 'O que publicar' },
]

export default function OnboardingWizard() {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setState(JSON.parse(saved)) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const goToStep = (step: number) => {
    setState(prev => ({ ...prev, currentStep: step }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const withLoading = async (fn: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    try {
      await fn()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar. Tente novamente.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const saveStep1 = () => withLoading(async () => {
    let companyId = state.companyId

    if (!companyId) {
      const { data, error } = await supabase
        .from('companies')
        .insert({ name: state.name, email: state.email, phone: state.phone || null, plan: state.plan })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      companyId = data.id
    } else {
      const { error } = await supabase
        .from('companies')
        .update({ name: state.name, email: state.email, phone: state.phone || null, plan: state.plan })
        .eq('id', companyId)
      if (error) throw new Error(error.message)
    }

    const contextPayload = {
      company_id: companyId,
      business_name: state.businessName,
      niche: state.niche,
      city: state.city,
      what_sells: state.whatSells,
      target_audience: state.targetAudience,
      differentials: state.differentials,
    }

    const { data: ctx, error: ctxErr } = await supabase
      .from('company_context')
      .upsert(contextPayload, { onConflict: 'company_id' })
      .select('id')
      .single()
    if (ctxErr) throw new Error(ctxErr.message)

    updateState({ companyId, contextId: ctx.id, currentStep: 2 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  const saveStep2 = () => withLoading(async () => {
    const { error } = await supabase
      .from('company_context')
      .update({ tone_of_voice: state.toneOfVoice, forbidden_words: state.forbiddenWords, post_examples: state.postExamples })
      .eq('id', state.contextId)
    if (error) throw new Error(error.message)
    updateState({ currentStep: 3 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  const saveStep3 = () => withLoading(async () => {
    const { error } = await supabase
      .from('company_context')
      .update({ brand_colors: state.brandColors, logo_url: state.logoUrl || null, slide_style: state.slideStyle })
      .eq('id', state.contextId)
    if (error) throw new Error(error.message)
    updateState({ currentStep: 4 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  const saveStep4 = () => withLoading(async () => {
    updateState({ currentStep: 5 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  const saveStep5 = () => withLoading(async () => {
    if (state.themes.length > 0) {
      const { error } = await supabase.from('content_themes').insert(
        state.themes.map(t => ({
          company_id: state.companyId,
          theme_name: t.themeName,
          tone: t.tone,
          slides_count: t.slidesCount,
        }))
      )
      if (error) throw new Error(error.message)
    }

    // Força regeneração do system_prompt pelo trigger
    const { error } = await supabase
      .from('company_context')
      .update({ system_prompt: null })
      .eq('id', state.contextId)
    if (error) throw new Error(error.message)

    // Persiste company_id para as demais páginas do app
    if (state.companyId) {
      localStorage.setItem('socialmind_company_id', state.companyId)
    }
    localStorage.removeItem(STORAGE_KEY)
    setCompleted(true)
  })

  if (completed) return <WelcomeScreen state={state} />

  const progress = ((state.currentStep - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-gray-900 border-r border-gray-800 p-8 fixed h-full">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">SocialMind</p>
              <p className="text-indigo-400 text-xs">Configuração inicial</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {STEPS.map((step) => {
            const isCurrent = state.currentStep === step.number
            const isDone = state.currentStep > step.number
            return (
              <button
                key={step.number}
                onClick={() => isDone ? goToStep(step.number) : undefined}
                disabled={!isDone && !isCurrent}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  isCurrent
                    ? 'bg-indigo-600/20 border border-indigo-500/40'
                    : isDone
                    ? 'hover:bg-gray-800/60 cursor-pointer'
                    : 'opacity-40 cursor-default'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                    : isDone
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-500'
                }`}>
                  {isDone ? '✓' : step.number}
                </div>
                <div>
                  <p className={`text-sm font-medium ${isCurrent ? 'text-indigo-300' : isDone ? 'text-gray-200' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-800">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-72 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-black text-xs">S</span>
              </div>
              <span className="text-white font-bold text-sm">SocialMind</span>
            </div>
            <span className="text-gray-400 text-xs">Etapa {state.currentStep} de {STEPS.length}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map(s => (
              <span key={s.number} className={`text-xs font-medium ${
                state.currentStep === s.number ? 'text-indigo-400' :
                state.currentStep > s.number ? 'text-green-500' : 'text-gray-600'
              }`}>{s.number}</span>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center py-8 px-4 sm:px-6">
          <div className="w-full max-w-2xl">
            {error && (
              <div className="mb-4 p-4 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}
            {state.currentStep === 1 && <Step1Business state={state} updateState={updateState} onNext={saveStep1} loading={loading} />}
            {state.currentStep === 2 && <Step2ToneOfVoice state={state} updateState={updateState} onNext={saveStep2} onBack={() => goToStep(1)} loading={loading} />}
            {state.currentStep === 3 && <Step3VisualIdentity state={state} updateState={updateState} onNext={saveStep3} onBack={() => goToStep(2)} loading={loading} />}
            {state.currentStep === 4 && <Step4MediaLibrary state={state} updateState={updateState} onNext={saveStep4} onBack={() => goToStep(3)} loading={loading} />}
            {state.currentStep === 5 && <Step5ContentThemes state={state} updateState={updateState} onNext={saveStep5} onBack={() => goToStep(4)} loading={loading} />}
          </div>
        </div>
      </main>
    </div>
  )
}
