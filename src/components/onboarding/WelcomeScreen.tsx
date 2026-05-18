'use client'

import type { OnboardingState } from '@/types/onboarding'
import { CheckCircle2, Instagram, Palette, Image, BookOpen, Sparkles, Zap } from 'lucide-react'

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
      colorClass: 'bg-[#F8F7FF] border-[#6C3FE8]/20 text-[#6C3FE8]',
    },
    {
      icon: <Sparkles size={18} />,
      label: 'Tom de voz',
      value: TONE_LABELS[state.toneOfVoice] ?? state.toneOfVoice,
      colorClass: 'bg-purple-50 border-purple-200 text-purple-600',
    },
    {
      icon: <Palette size={18} />,
      label: 'Identidade visual',
      value: `Estilo ${STYLE_LABELS[state.slideStyle] ?? state.slideStyle}`,
      colorClass: 'bg-pink-50 border-pink-200 text-pink-600',
      extra: (
        <div className="flex gap-1.5 mt-1">
          {[state.brandColors.primary, state.brandColors.secondary, state.brandColors.accent].map((c, i) => (
            <div key={i} className="w-4 h-4 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
      ),
    },
    {
      icon: <Image size={18} />,
      label: 'Plano',
      value: state.plan === 'starter' ? 'Starter — 12 posts/mês' : state.plan === 'pro' ? 'Pro — 30 posts/mês' : 'Agency — 90 posts/mês',
      colorClass: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    },
    {
      icon: <BookOpen size={18} />,
      label: 'Temas de conteúdo',
      value: state.themes.length > 0
        ? `${state.themes.length} tema${state.themes.length > 1 ? 's' : ''}: ${state.themes.map(t => t.themeName).join(', ')}`
        : 'Nenhum tema adicionado',
      colorClass: 'bg-amber-50 border-amber-200 text-amber-600',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Success icon */}
        <div className="text-center mb-8">
          <div className="relative inline-flex mb-4">
            <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center shadow-brand">
              <Zap size={36} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle2 size={18} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">
            Tudo pronto! 🎉
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
            Sua conta do <strong className="text-gradient">SocialMind</strong> foi configurada com sucesso.
            A IA já aprendeu sobre seu negócio e está pronta para criar conteúdos.
          </p>
        </div>

        {/* Summary card */}
        <div className="card p-6 space-y-3 mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Resumo da configuração</h2>
          {summaryItems.map((item, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${item.colorClass}`}>
              <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs opacity-70 font-medium mb-0.5">{item.label}</p>
                <p className="text-sm font-medium text-[#1A1A2E] truncate">{item.value}</p>
                {item.extra}
              </div>
            </div>
          ))}
        </div>

        {/* System prompt notice */}
        <div className="bg-[#F8F7FF] border border-[#6C3FE8]/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Sparkles size={18} className="text-[#6C3FE8] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#6C3FE8]">System prompt gerado automaticamente</p>
            <p className="text-xs text-gray-400 mt-1">
              A IA criou um prompt personalizado com base em todos os dados que você forneceu.
              Ele será usado em toda geração de conteúdo.
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => window.location.href = '/scheduling'}
          className="btn-primary w-full py-4 text-base"
        >
          Ir para o Agendamento →
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Você pode editar essas configurações a qualquer momento nas preferências da conta.
        </p>
      </div>
    </div>
  )
}
