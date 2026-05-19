'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ContentTheme } from '@/types/scheduling'
import { DAY_OF_WEEK_OPTIONS } from '@/types/scheduling'

interface Props {
  companyId: string
  onClose: () => void
  onCreated: () => void
}

const SLIDES_OPTIONS = [5, 7, 10] as const

type Step = 'form' | 'generating' | 'done'

function getNextOccurrences(dayOfWeek: string, time: string, weeks: number): Date[] {
  const DAY_MAP: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
  }
  const [h, m] = time.split(':').map(Number)
  const targetDay = DAY_MAP[dayOfWeek] ?? 1
  const results: Date[] = []
  const now = new Date()

  for (let w = 0; w < weeks + 1; w++) {
    const d = new Date(now)
    d.setDate(d.getDate() + ((targetDay - d.getDay() + 7) % 7) + w * 7)
    d.setHours(h, m, 0, 0)
    if (d > now) results.push(d)
    if (results.length === weeks) break
  }
  return results
}

export default function NewScheduleModal({ companyId, onClose, onCreated }: Props) {
  const [type, setType]               = useState<'recurring' | 'one_time'>('recurring')
  const [dayOfWeek, setDayOfWeek]     = useState('monday')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [themeId, setThemeId]         = useState('')
  const [publishMode, setPublishMode] = useState<'automatic' | 'review'>('review')
  const [slidesCount, setSlidesCount] = useState<5 | 7 | 10>(7)
  const [themes, setThemes]           = useState<ContentTheme[]>([])
  const [step, setStep]               = useState<Step>('form')
  const [errors, setErrors]           = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.from('content_themes').select('*').eq('company_id', companyId)
      .then(({ data }) => setThemes(data ?? []))
  }, [companyId])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!scheduledTime) e.scheduledTime = 'Horário é obrigatório'
    if (type === 'one_time' && !scheduledDate) e.scheduledDate = 'Data é obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setStep('generating')
    try {
      const conflictQuery = supabase
        .from('post_schedules')
        .select('id')
        .eq('company_id', companyId)
        .eq('scheduled_time', scheduledTime + ':00')
        .eq('status', 'active')

      if (type === 'recurring') {
        conflictQuery.eq('day_of_week', dayOfWeek).eq('type', 'recurring')
      } else {
        conflictQuery.eq('scheduled_date', scheduledDate).eq('type', 'one_time')
      }

      const { data: conflict } = await conflictQuery.limit(1)
      if (conflict && conflict.length > 0) {
        setErrors({ global: 'Já existe um agendamento neste dia e horário.' })
        setStep('form')
        return
      }

      const schedulePayload: Record<string, unknown> = {
        company_id:   companyId,
        theme_id:     themeId || null,
        type,
        scheduled_time: scheduledTime + ':00',
        publish_mode: publishMode,
        status:       'active',
        repeat:       type === 'recurring',
      }
      if (type === 'recurring') {
        schedulePayload.day_of_week = dayOfWeek
      } else {
        schedulePayload.scheduled_date = scheduledDate
      }

      const { data: schedule, error: schedErr } = await supabase
        .from('post_schedules')
        .insert(schedulePayload)
        .select('id')
        .single()
      if (schedErr) throw new Error(schedErr.message)

      // Create draft posts and capture IDs
      let firstPostId: string | null = null

      if (type === 'recurring') {
        const dates = getNextOccurrences(dayOfWeek, scheduledTime, 4)
        if (dates.length > 0) {
          const { data: insertedPosts } = await supabase
            .from('posts')
            .insert(
              dates.map(d => ({
                company_id:    companyId,
                schedule_id:   schedule.id,
                status:        'draft',
                scheduled_for: d.toISOString(),
                content:       [],
                slides_html:   [],
                slides_images: [],
              }))
            )
            .select('id, scheduled_for')
            .order('scheduled_for', { ascending: true })
          firstPostId = insertedPosts?.[0]?.id ?? null
        }
      } else {
        const dt = new Date(`${scheduledDate}T${scheduledTime}:00`)
        const { data: insertedPost } = await supabase
          .from('posts')
          .insert({
            company_id:    companyId,
            schedule_id:   schedule.id,
            status:        'draft',
            scheduled_for: dt.toISOString(),
            content:       [],
            slides_html:   [],
            slides_images: [],
          })
          .select('id')
          .single()
        firstPostId = insertedPost?.id ?? null
      }

      // Generate the first/nearest post immediately
      if (firstPostId) {
        const res = await fetch('/api/generate-draft', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ post_id: firstPostId }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error('[NewScheduleModal] Geração falhou:', err)
          // Non-fatal: schedule was created, generation can be retried
        }
      }

      setStep('done')
    } catch (e: unknown) {
      setErrors({ global: e instanceof Error ? e.message : 'Erro ao criar agendamento' })
      setStep('form')
    }
  }

  if (step === 'generating') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
               style={{ background: 'var(--brand-gradient)' }}>
            <Sparkles size={28} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">Gerando seu carrossel...</h3>
          <p className="text-sm text-gray-400 mb-6">
            A IA está criando o conteúdo. Isso pode levar até 30 segundos.
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full animate-pulse"
                 style={{ background: 'var(--brand-gradient)', width: '60%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">Post gerado!</h3>
          <p className="text-sm text-gray-500 mb-6">
            Revise e aprove quando quiser. Na hora agendada ele será publicado automaticamente.
          </p>
          <button
            onClick={onCreated}
            className="btn-primary w-full py-3"
          >
            Ver aprovações
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Novo agendamento</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {errors.global && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle size={16} /> {errors.global}
            </div>
          )}

          {/* Tipo */}
          <div>
            <label className="form-label">Tipo de agendamento</label>
            <div className="grid grid-cols-2 gap-2">
              {(['recurring', 'one_time'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                    type === t
                      ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{t === 'recurring' ? '🔁 Recorrente' : '📅 Pontual'}</div>
                  <div className="text-xs mt-0.5 opacity-70">{t === 'recurring' ? 'Toda semana' : 'Data específica'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dia / Data */}
          {type === 'recurring' ? (
            <div>
              <label className="form-label">Dia da semana</label>
              <select
                value={dayOfWeek}
                onChange={e => setDayOfWeek(e.target.value)}
                className="select-field"
              >
                {DAY_OF_WEEK_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="form-label">Data <span className="text-[#6C3FE8]">*</span></label>
              <input
                type="date"
                value={scheduledDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setScheduledDate(e.target.value)}
                className={`input-field ${errors.scheduledDate ? 'border-red-400' : ''}`}
              />
              {errors.scheduledDate && <p className="form-error">{errors.scheduledDate}</p>}
            </div>
          )}

          {/* Horário */}
          <div>
            <label className="form-label">Horário <span className="text-[#6C3FE8]">*</span></label>
            <input
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className={`input-field ${errors.scheduledTime ? 'border-red-400' : ''}`}
            />
            {errors.scheduledTime && <p className="form-error">{errors.scheduledTime}</p>}
          </div>

          {/* Tema */}
          <div>
            <label className="form-label">Tema do post</label>
            <select
              value={themeId}
              onChange={e => setThemeId(e.target.value)}
              className="select-field"
            >
              <option value="">Sem tema específico</option>
              {themes.map(t => (
                <option key={t.id} value={t.id}>{t.theme_name}</option>
              ))}
            </select>
            {themes.length === 0 && (
              <p className="form-hint">Nenhum tema cadastrado. Configure temas no onboarding.</p>
            )}
          </div>

          {/* Modo de publicação */}
          <div>
            <label className="form-label">Modo de publicação</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'review',    label: '👁️ Revisão',    desc: 'Aguarda aprovação' },
                { value: 'automatic', label: '⚡ Automático', desc: 'Publica direto' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPublishMode(opt.value)}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${
                    publishMode === opt.value
                      ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Slides */}
          <div>
            <label className="form-label">Quantidade de slides</label>
            <div className="flex gap-2">
              {SLIDES_OPTIONS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSlidesCount(n)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                    slidesCount === n
                      ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {type === 'recurring' && scheduledTime && (
            <div className="bg-[#F8F7FF] border border-[#6C3FE8]/15 rounded-xl p-4">
              <p className="text-xs text-[#6C3FE8] font-medium mb-2">Posts que serão criados (próximas 4 semanas):</p>
              <div className="space-y-1">
                {getNextOccurrences(dayOfWeek, scheduledTime, 4).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1 h-1 rounded-full bg-[#6C3FE8]/40" />
                    {i === 0 && <span className="text-[#6C3FE8] font-medium">→ Gerado agora</span>}
                    {i > 0 && <span>Gerado domingo</span>}
                    {' '}— {d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="btn-primary w-full py-4"
          >
            Criar agendamento e gerar conteúdo
          </button>
        </div>
      </div>
    </div>
  )
}
