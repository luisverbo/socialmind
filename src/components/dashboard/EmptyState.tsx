'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, Instagram, CalendarDays, Sparkles, Zap } from 'lucide-react'

interface Props {
  hasContext: boolean
  hasInstagram: boolean
  hasSchedules: boolean
  hasPosts: boolean
  onGeneratePost: () => void
}

export default function EmptyState({ hasContext, hasInstagram, hasSchedules, hasPosts, onGeneratePost }: Props) {
  const steps = [
    { done: hasContext,   label: 'Onboarding concluído',          href: '/onboarding', Icon: CheckCircle2 },
    { done: hasInstagram, label: 'Conectar Instagram',            href: '/settings',   Icon: Instagram    },
    { done: hasSchedules, label: 'Criar primeiro agendamento',    href: '/scheduling', Icon: CalendarDays },
    { done: hasPosts,     label: 'Gerar primeiro post',           href: null,          Icon: Sparkles     },
  ]

  const nextStep = steps.find(s => !s.done)

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl gradient-bg flex items-center justify-center shadow-xl">
          <Zap size={40} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center shadow-md animate-bounce">
          <Sparkles size={14} className="text-white" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">
        Bem-vindo ao SocialMind!
      </h2>
      <p className="text-sm text-gray-400 mb-8 leading-relaxed">
        Complete os primeiros passos abaixo para começar a automatizar seus posts no Instagram com IA.
      </p>

      {/* Checklist */}
      <div className="w-full space-y-3 mb-8">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
              step.done
                ? 'bg-green-50 border-green-100'
                : i === steps.findIndex(s => !s.done)
                  ? 'bg-[#F8F7FF] border-[#6C3FE8]/20'
                  : 'bg-white border-gray-100'
            }`}
          >
            {step.done ? (
              <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
            ) : (
              <Circle size={18} className="text-gray-300 flex-shrink-0" />
            )}
            <span className={`text-sm font-medium flex-1 text-left ${
              step.done ? 'text-green-700 line-through decoration-green-300' : 'text-[#1A1A2E]'
            }`}>
              {step.label}
            </span>
            {!step.done && i === steps.findIndex(s => !s.done) && (
              <span className="text-xs font-semibold text-[#6C3FE8] bg-[#EDE9FF] px-2 py-0.5 rounded-full">
                Próximo
              </span>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      {nextStep ? (
        nextStep.href ? (
          <Link href={nextStep.href} className="btn-primary w-full py-4 text-sm">
            <nextStep.Icon size={16} />
            {nextStep.label}
          </Link>
        ) : (
          <button onClick={onGeneratePost} className="btn-primary w-full py-4 text-sm">
            <Sparkles size={16} />
            Gerar primeiro post
          </button>
        )
      ) : (
        <button onClick={onGeneratePost} className="btn-primary w-full py-4 text-sm">
          <Sparkles size={16} />
          Gerar novo post
        </button>
      )}
    </div>
  )
}
