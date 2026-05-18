'use client'

import { useState } from 'react'
import type { StepProps } from '@/types/onboarding'
import { Mic2 } from 'lucide-react'

const TONE_OPTIONS = [
  {
    value: 'formal',
    label: 'Formal',
    emoji: '🎩',
    description: 'Linguagem profissional e respeitosa. Ideal para escritórios, consultorias e serviços premium.',
  },
  {
    value: 'descontraído',
    label: 'Descontraído',
    emoji: '😄',
    description: 'Leve, divertido e próximo. Ótimo para marcas jovens, lojas e restaurantes.',
  },
  {
    value: 'direto',
    label: 'Direto',
    emoji: '⚡',
    description: 'Objetivo e sem rodeios. Funciona bem para tech, serviços B2B e ofertas.',
  },
  {
    value: 'inspirador',
    label: 'Inspirador',
    emoji: '🌟',
    description: 'Motivacional e emocionante. Perfeito para coaches, fitness e wellness.',
  },
]

export default function Step2ToneOfVoice({ state, updateState, onNext, onBack, loading }: StepProps) {
  const [errors, setErrors] = useState<{ [k: string]: string }>({})

  const validate = () => {
    const e: { [k: string]: string } = {}
    if (!state.toneOfVoice) e.toneOfVoice = 'Selecione um tom de voz'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = async () => {
    if (validate()) await onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[#6C3FE8] text-sm font-medium mb-2">
          <Mic2 size={16} />
          <span>Etapa 2 de 5</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Tom de voz</h1>
        <p className="text-gray-400 text-sm mt-1">Como você quer se comunicar com seu público?</p>
      </div>

      {/* Tom de voz */}
      <div className="card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Como quer falar com seu público?</h2>
        {errors.toneOfVoice && <p className="form-error">{errors.toneOfVoice}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TONE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateState({ toneOfVoice: opt.value })}
              className={`text-left p-4 rounded-xl border transition-all ${
                state.toneOfVoice === opt.value
                  ? 'bg-[#F8F7FF] border-[#6C3FE8] shadow-brand-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{opt.emoji}</span>
                <span className={`font-semibold text-sm ${state.toneOfVoice === opt.value ? 'text-[#6C3FE8]' : 'text-[#1A1A2E]'}`}>
                  {opt.label}
                </span>
                {state.toneOfVoice === opt.value && (
                  <span className="ml-auto text-[#6C3FE8] text-xs">✓</span>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Palavras proibidas */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Palavras ou expressões proibidas</h2>
          <p className="form-hint">A IA nunca usará essas palavras nos conteúdos. Separe por vírgula.</p>
        </div>
        <textarea
          value={state.forbiddenWords}
          onChange={e => updateState({ forbiddenWords: e.target.value })}
          placeholder="ex: barato, promoção relâmpago, imperdível, não perca..."
          rows={3}
          className="textarea-field"
        />
      </div>

      {/* Exemplos de posts */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Exemplos de posts que você gosta</h2>
          <p className="form-hint">Cole exemplos de textos, legendas ou estilos de conteúdo que você admira. Isso ajuda a IA a entender seu estilo.</p>
        </div>
        <textarea
          value={state.postExamples}
          onChange={e => updateState({ postExamples: e.target.value })}
          placeholder={'Exemplo 1:\n"5 motivos para escolher...\n1. Qualidade garantida\n2. ..."\n\nExemplo 2:\n"Você sabia que...?"'}
          rows={6}
          className="textarea-field font-mono"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="btn-secondary flex-1 sm:flex-none sm:w-32 py-4"
        >
          ← Voltar
        </button>
        <button
          onClick={handleNext}
          disabled={loading}
          className="btn-primary flex-1 py-4"
        >
          {loading ? (
            <><div className="w-4 h-4 spinner" /> Salvando...</>
          ) : 'Próxima etapa →'}
        </button>
      </div>
    </div>
  )
}
