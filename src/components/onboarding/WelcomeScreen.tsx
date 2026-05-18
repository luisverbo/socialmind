'use client'

import type { OnboardingState } from '@/types/onboarding'
import { CheckCircle2, Instagram, Palette, Image, BookOpen, Sparkles } from 'lucide-react'

const TONE_LABELS: Record<string, string> = {
  formal: 'Formal',
  descontraído: 'Descontraído',
  direto: 'Direto',
  inspirador: 'Inspirador',
}

const STYLE_LABELS: Record<string, string> = {
  moderno: 'Moderno',
  minimalista: 'Minimalista',
  colorido: 'Colorido',
  corporativo: 'Corporativo',
}

export default function WelcomeScreen({ state }: { state: OnboardingState }) {
  const summaryItems = [
    {
      icon: <Instagram size={18} />,
      label: 'Negócio configurado',
      value: `${state.businessName} · ${state.niche}`,
      color: 'indigo',
    },
    {
      icon: <Sparkles size={18} />,
      label: 'Tom de voz',
      value: TONE_LABELS[state.toneOfVoice] ?? state.toneOfVoice,
      color: 'purple',
    },
    {
      icon: <Palette size={18} />,
      label: 'Identidade visual',
      value: `Estilo ${STYLE_LABELS[state.slideStyle] ?? state.slideStyle}`,
      color: 'pink',
      extra: (
        <div className="flex gap-1.5 mt-1">
          {[state.brandColors.primary, state.brandColors.secondary, state.brandColors.accent].map((c, i) => (
            <div key={i} className="w-4 h-4 rounded-full border border-gray-600" style={{ backgroundColor: c }} />
          ))}
        </div>
      ),
    },
    {
      icon: <Image size={18} />,
      label: 'Plano',
      value: state.plan === 'starter' ? 'Starter — 12 posts/mês' : state.plan === 'pro' ? 'Pro — 30 posts/mês' : 'Agency — 90 posts/mês',
      color: 'emerald',
    },
    {
      icon: <BookOpen size={18} />,
      label: 'Temas de conteúdo',
      value: state.themes.length > 0
        ? `${state.themes.length} tema${state.themes.length > 1 ? 's' : ''}: ${state.themes.map(t => t.themeName).join(', ')}`
        : 'Nenhum tema adicionado',
      color: 'amber',
    },
  ]

  const colorClasses: Record<string, string> = {
    indigo:  'bg-indigo-600/20 text-indigo-400 border-indigo-500/30',
    purple:  'bg-purple-600/20 text-purple-400 border-purple-500/30',
    pink:    'bg-pink-600/20 text-pink-400 border-pink-500/30',
    emerald: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    amber:   'bg-amber-600/20 text-amber-400 border-amber-500/30',
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Success icon */}
        <div className="text-center mb-8">
          <div className="relative inline-flex mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <span className="text-3xl font-black text-white">S</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle2 size={18} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Tudo pronto! 🎉
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
            Sua conta do <strong className="text-white">SocialMind</strong> foi configurada com sucesso.
            A IA já aprendeu sobre seu negócio e está pronta para criar conteúdos.
          </p>
        </div>

        {/* Summary card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Resumo da configuração</h2>
          {summaryItems.map((item, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${colorClasses[item.color]}`}>
              <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs opacity-70 font-medium mb-0.5">{item.label}</p>
                <p className="text-sm font-medium text-gray-200 truncate">{item.value}</p>
                {item.extra}
              </div>
            </div>
          ))}
        </div>

        {/* System prompt notice */}
        <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Sparkles size={18} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-300">System prompt gerado automaticamente</p>
            <p className="text-xs text-indigo-400/70 mt-1">
              A IA criou um prompt personalizado com base em todos os dados que você forneceu.
              Ele será usado em toda geração de conteúdo.
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 text-base"
        >
          Ir para o Dashboard →
        </button>
        <p className="text-center text-xs text-gray-600 mt-3">
          Você pode editar essas configurações a qualquer momento nas preferências da conta.
        </p>
      </div>
    </div>
  )
}
