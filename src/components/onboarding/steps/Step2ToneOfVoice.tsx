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
        <div className="flex items-center gap-2 text-purple-400 text-sm font-medium mb-2">
          <Mic2 size={16} />
          <span>Etapa 2 de 5</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Tom de voz</h1>
        <p className="text-gray-400 text-sm mt-1">Como você quer se comunicar com seu público?</p>
      </div>

      {/* Tom de voz */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Como quer falar com seu público?</h2>
        {errors.toneOfVoice && <p className="text-red-400 text-xs">{errors.toneOfVoice}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TONE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateState({ toneOfVoice: opt.value })}
              className={`text-left p-4 rounded-xl border transition-all ${
                state.toneOfVoice === opt.value
                  ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/10'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{opt.emoji}</span>
                <span className={`font-semibold text-sm ${state.toneOfVoice === opt.value ? 'text-purple-300' : 'text-gray-200'}`}>
                  {opt.label}
                </span>
                {state.toneOfVoice === opt.value && (
                  <span className="ml-auto text-purple-400 text-xs">✓</span>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Palavras proibidas */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">Palavras ou expressões proibidas</h2>
          <p className="text-xs text-gray-500">A IA nunca usará essas palavras nos conteúdos. Separe por vírgula.</p>
        </div>
        <textarea
          value={state.forbiddenWords}
          onChange={e => updateState({ forbiddenWords: e.target.value })}
          placeholder="ex: barato, promoção relâmpago, imperdível, não perca..."
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
        />
      </div>

      {/* Exemplos de posts */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">Exemplos de posts que você gosta</h2>
          <p className="text-xs text-gray-500">Cole exemplos de textos, legendas ou estilos de conteúdo que você admira. Isso ajuda a IA a entender seu estilo.</p>
        </div>
        <textarea
          value={state.postExamples}
          onChange={e => updateState({ postExamples: e.target.value })}
          placeholder={'Exemplo 1:\n"5 motivos para escolher...\n1. Qualidade garantida\n2. ..."\n\nExemplo 2:\n"Você sabia que...?"'}
          rows={6}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-mono"
        />
      </div>

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
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Salvando...
            </>
          ) : 'Próxima etapa →'}
        </button>
      </div>
    </div>
  )
}
