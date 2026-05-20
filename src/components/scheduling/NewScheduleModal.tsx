'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle2, Sparkles, Plus, Minus, Zap, Clock } from 'lucide-react'
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

// Default times for 1, 2 or 3 posts per day
const DEFAULT_TIMES: Record<number, string[]> = {
  1: ['09:00'],
  2: ['09:00', '18:00'],
  3: ['09:00', '13:00', '18:00'],
}

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

function calcDailyCredits(postsPerDay: number, slidesCount: number, durationDays: number | null, creditsBalance: number) {
  const creditsPerDay = postsPerDay * slidesCount
  const totalCredits  = durationDays ? durationDays * creditsPerDay : null
  const daysCanAfford = Math.floor(creditsBalance / creditsPerDay)
  return { creditsPerDay, totalCredits, daysCanAfford }
}

export default function NewScheduleModal({ companyId, onClose, onCreated }: Props) {
  const [type, setType]                 = useState<'recurring' | 'one_time' | 'daily'>('daily')
  const [dayOfWeek, setDayOfWeek]       = useState('monday')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [themeId, setThemeId]           = useState('')
  const [publishMode, setPublishMode]   = useState<'automatic' | 'review'>('review')
  const [slidesCount, setSlidesCount]   = useState<5 | 7 | 10>(7)
  const [themes, setThemes]             = useState<ContentTheme[]>([])
  const [customTopic, setCustomTopic]   = useState('')
  const [step, setStep]                 = useState<Step>('form')
  const [errors, setErrors]             = useState<Record<string, string>>({})
  const [creditsBalance, setCreditsBalance] = useState(100)

  // Daily-specific state
  const [postsPerDay, setPostsPerDay]   = useState(1)
  const [dailyTimes, setDailyTimes]     = useState<string[]>(['09:00'])
  const [durationType, setDurationType] = useState<'indefinite' | 'days'>('indefinite')
  const [durationDays, setDurationDays] = useState(30)

  useEffect(() => {
    supabase.from('content_themes').select('*').eq('company_id', companyId)
      .then(({ data }) => setThemes(data ?? []))
    supabase.from('companies').select('credits_balance').eq('id', companyId).single()
      .then(({ data }) => { if (data) setCreditsBalance(data.credits_balance ?? 100) })
  }, [companyId])

  // Sync dailyTimes when postsPerDay changes
  const handlePostsPerDay = (n: number) => {
    setPostsPerDay(n)
    setDailyTimes(DEFAULT_TIMES[n])
  }

  const updateDailyTime = (index: number, value: string) => {
    setDailyTimes(prev => prev.map((t, i) => i === index ? value : t))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!scheduledTime && type !== 'daily') e.scheduledTime = 'Horário é obrigatório'
    if (type === 'one_time' && !scheduledDate) e.scheduledDate = 'Data é obrigatória'
    if (type === 'daily' && durationType === 'days' && durationDays < 1) e.durationDays = 'Informe quantos dias'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setStep('generating')
    try {
      // ── Conflict check ────────────────────────────────────────────
      if (type !== 'daily') {
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
          const { data: activePosts } = await supabase
            .from('posts')
            .select('id')
            .eq('schedule_id', conflict[0].id)
            .in('status', ['draft', 'waiting', 'approved'])
            .gte('scheduled_for', new Date().toISOString())
            .limit(1)

          if (activePosts && activePosts.length > 0) {
            setErrors({ global: 'Já existe um agendamento ativo neste dia e horário.' })
            setStep('form')
            return
          }
        }
      }

      // ── Build schedule payload ─────────────────────────────────────
      const schedulePayload: Record<string, unknown> = {
        company_id:   companyId,
        theme_id:     themeId || null,
        type,
        publish_mode: publishMode,
        status:       'active',
        repeat:       type === 'recurring' || type === 'daily',
      }

      schedulePayload.slides_count = slidesCount   // always save slides_count

      if (type === 'daily') {
        schedulePayload.posts_per_day   = postsPerDay
        schedulePayload.scheduled_times = dailyTimes.map(t => t + ':00')
        schedulePayload.scheduled_time  = (dailyTimes[0] ?? '09:00') + ':00'
        schedulePayload.duration_days   = durationType === 'days' ? durationDays : null
        schedulePayload.batch_size      = 7
      } else if (type === 'recurring') {
        schedulePayload.day_of_week    = dayOfWeek
        schedulePayload.scheduled_time = scheduledTime + ':00'
      } else {
        schedulePayload.scheduled_date = scheduledDate
        schedulePayload.scheduled_time = scheduledTime + ':00'
      }

      const { data: schedule, error: schedErr } = await supabase
        .from('post_schedules')
        .insert(schedulePayload)
        .select('id')
        .single()
      if (schedErr) throw new Error(schedErr.message)

      // ── Create first batch of draft posts ─────────────────────────
      let firstPostId: string | null = null
      let allPostIds: string[] = []

      if (type === 'daily') {
        // Generate first week (7 days) of posts, respecting duration_days
        const days = Math.min(7, durationType === 'days' ? durationDays : 7)
        const now  = new Date()
        const posts: Record<string, unknown>[] = []

        for (let d = 0; d < days; d++) {
          for (const t of dailyTimes) {
            const [h, m] = t.split(':').map(Number)
            const dt = new Date(now)
            dt.setDate(dt.getDate() + d)
            dt.setHours(h, m, 0, 0)
            if (dt <= now) { dt.setDate(dt.getDate() + 1) } // skip past times today
            posts.push({
              company_id:    companyId,
              schedule_id:   schedule.id,
              status:        'draft',
              scheduled_for: dt.toISOString(),
              content:       [],
              slides_html:   [],
              slides_images: [],
            })
          }
        }

        const { data: insertedPosts } = await supabase
          .from('posts')
          .insert(posts)
          .select('id, scheduled_for')
          .order('scheduled_for', { ascending: true })
        firstPostId = insertedPosts?.[0]?.id ?? null
        allPostIds  = (insertedPosts ?? []).map(p => p.id)

        // Mark batch as generated
        await supabase.from('post_schedules')
          .update({ last_batch_at: new Date().toISOString() })
          .eq('id', schedule.id)

      } else if (type === 'recurring') {
        const dates = getNextOccurrences(dayOfWeek, scheduledTime, 4)
        if (dates.length > 0) {
          const { data: insertedPosts } = await supabase
            .from('posts')
            .insert(dates.map(dt => ({
              company_id:    companyId,
              schedule_id:   schedule.id,
              status:        'draft',
              scheduled_for: dt.toISOString(),
              content:       [],
              slides_html:   [],
              slides_images: [],
            })))
            .select('id, scheduled_for')
            .order('scheduled_for', { ascending: true })
          firstPostId = insertedPosts?.[0]?.id ?? null
          allPostIds  = (insertedPosts ?? []).map(p => p.id)
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
        allPostIds  = firstPostId ? [firstPostId] : []
      }

      // ── Generate week plan for variety (one unique angle per post) ──
      let weekPlanAngles: { topic: string; hook: string; format: string; keyInsight: string }[] = []
      if (allPostIds.length > 1) {
        try {
          // Resolve theme name and tone for the plan request
          const selectedTheme = themes.find(t => t.id === themeId)
          const planTheme = customTopic.trim() || selectedTheme?.theme_name || 'Conteúdo geral'
          const planTone  = selectedTheme?.tone ?? 'educational'

          const planRes = await fetch('/api/generate-week-plan', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              company_id: companyId,
              theme:      planTheme,
              tone:       planTone,
              count:      allPostIds.length,
            }),
          })
          if (planRes.ok) {
            const planData = await planRes.json()
            weekPlanAngles = planData.plan ?? []
          }
        } catch (e) {
          console.warn('[NewScheduleModal] Week plan falhou (não fatal):', e)
        }
      }

      // ── Generate first post (awaited) + fire-and-forget the rest ──
      if (firstPostId) {
        // Generate the first post and await it (shows loading screen)
        const res = await fetch('/api/generate-draft', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            post_id:      firstPostId,
            custom_topic: customTopic.trim() || undefined,
            batch_angle:  weekPlanAngles[0] ?? undefined,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error('[NewScheduleModal] Geração do 1º post falhou:', err)
        }
      }

      // Generate remaining posts in the background (fire-and-forget)
      if (allPostIds && allPostIds.length > 1) {
        for (let i = 1; i < allPostIds.length; i++) {
          const pid   = allPostIds[i]
          const angle = weekPlanAngles[i] ?? undefined
          fetch('/api/generate-draft', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ post_id: pid, batch_angle: angle }),
          }).catch(e => console.error('[NewScheduleModal] Background gen falhou:', e))
        }
      }

      setStep('done')
    } catch (e: unknown) {
      setErrors({ global: e instanceof Error ? e.message : 'Erro ao criar agendamento' })
      setStep('form')
    }
  }

  // ── Credit estimate for daily ──────────────────────────────────────────────
  const { creditsPerDay, totalCredits, daysCanAfford } = calcDailyCredits(
    postsPerDay, slidesCount, durationType === 'days' ? durationDays : null, creditsBalance
  )
  const notEnoughCredits = type === 'daily' && durationType === 'days'
    && totalCredits !== null && totalCredits > creditsBalance

  // ── Loading screen ─────────────────────────────────────────────────────────
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

  // ── Done screen ────────────────────────────────────────────────────────────
  if (step === 'done') {
    const weekPosts = type === 'daily' ? postsPerDay * 7 : null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">
            {type === 'daily' ? 'Semana gerada!' : 'Post gerado!'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {type === 'daily' && publishMode === 'review'
              ? `${weekPosts} posts da primeira semana estão prontos. Revise e aprove-os. Quando restar 2 dias de conteúdo, geramos a próxima semana e te avisamos.`
              : type === 'daily' && publishMode === 'automatic'
              ? `${weekPosts} posts da primeira semana foram gerados e serão publicados automaticamente nos horários definidos.`
              : 'Revise e aprove quando quiser. Na hora agendada ele será publicado automaticamente.'
            }
          </p>
          <button onClick={onCreated} className="btn-primary w-full py-3">
            {type === 'daily' && publishMode === 'review' ? 'Ir para aprovações' : 'Ver agendamentos'}
          </button>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
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

          {/* ── Tipo ───────────────────────────────────────────────── */}
          <div>
            <label className="form-label">Tipo de agendamento</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'daily',     icon: '📆', label: 'Diário',  desc: 'Todo dia' },
                { value: 'recurring', icon: '🔁', label: 'Semanal', desc: 'Toda semana' },
                { value: 'one_time',  icon: '📅', label: 'Pontual', desc: 'Data única' },
              ] as const).map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                    type === t.value
                      ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  <div className="font-semibold">{t.icon} {t.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── DAILY options ──────────────────────────────────────── */}
          {type === 'daily' && (
            <>
              {/* Posts per day */}
              <div>
                <label className="form-label">Posts por dia</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <button key={n} type="button" onClick={() => handlePostsPerDay(n)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                        postsPerDay === n
                          ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {n}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              <div>
                <label className="form-label">Horários de publicação</label>
                <div className="space-y-2">
                  {dailyTimes.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400 w-12 flex-shrink-0">
                        {i === 0 ? '1º post' : i === 1 ? '2º post' : '3º post'}
                      </span>
                      <input
                        type="time"
                        value={t}
                        onChange={e => updateDailyTime(i, e.target.value)}
                        className="input-field flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="form-label">Por quanto tempo?</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {([
                    { value: 'indefinite', label: '♾️ Indefinido', desc: 'Até créditos acabarem' },
                    { value: 'days',       label: '📅 Período fixo', desc: 'Número de dias' },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button" onClick={() => setDurationType(opt.value)}
                      className={`p-3 rounded-xl border text-left text-sm transition-all ${
                        durationType === opt.value
                          ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-xs mt-0.5 opacity-70">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {durationType === 'days' && (
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setDurationDays(d => Math.max(1, d - 1))}
                      className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                      <Minus size={14} />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-bold text-[#1A1A2E]">{durationDays}</span>
                      <span className="text-sm text-gray-400 ml-2">dias</span>
                    </div>
                    <button type="button" onClick={() => setDurationDays(d => d + 1)}
                      className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Credit calculator */}
              <div className={`rounded-xl p-4 border ${notEnoughCredits ? 'bg-red-50 border-red-200' : 'bg-[#F8F7FF] border-[#6C3FE8]/15'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={13} className={notEnoughCredits ? 'text-red-500' : 'text-[#6C3FE8]'} />
                  <p className={`text-xs font-semibold ${notEnoughCredits ? 'text-red-600' : 'text-[#6C3FE8]'}`}>
                    Estimativa de créditos
                  </p>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>• {postsPerDay} post{postsPerDay > 1 ? 's' : ''}/dia × {slidesCount} slides = <strong className="text-[#1A1A2E]">{creditsPerDay} créditos/dia</strong></p>
                  {durationType === 'days' && totalCredits !== null && (
                    <p>• {durationDays} dias = <strong className={notEnoughCredits ? 'text-red-600' : 'text-[#1A1A2E]'}>{totalCredits} créditos no total</strong></p>
                  )}
                  <p>• Você tem <strong className="text-[#1A1A2E]">{creditsBalance} créditos</strong> → consegue <strong className="text-[#1A1A2E]">{daysCanAfford} dias</strong> de conteúdo</p>
                  {notEnoughCredits && (
                    <p className="text-red-600 font-medium mt-1">⚠️ Créditos insuficientes para o período. Reduza os dias ou faça upgrade do plano.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Dia / Data (recurring / one_time) ─────────────────── */}
          {type === 'recurring' && (
            <div>
              <label className="form-label">Dia da semana</label>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="select-field">
                {DAY_OF_WEEK_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}
          {type === 'one_time' && (
            <div>
              <label className="form-label">Data <span className="text-[#6C3FE8]">*</span></label>
              <input type="date" value={scheduledDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setScheduledDate(e.target.value)}
                className={`input-field ${errors.scheduledDate ? 'border-red-400' : ''}`} />
              {errors.scheduledDate && <p className="form-error">{errors.scheduledDate}</p>}
            </div>
          )}

          {/* ── Horário (recurring / one_time only) ────────────────── */}
          {type !== 'daily' && (
            <div>
              <label className="form-label">Horário <span className="text-[#6C3FE8]">*</span></label>
              <input type="time" value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className={`input-field ${errors.scheduledTime ? 'border-red-400' : ''}`} />
              {errors.scheduledTime && <p className="form-error">{errors.scheduledTime}</p>}
            </div>
          )}

          {/* ── Tema ───────────────────────────────────────────────── */}
          <div>
            <label className="form-label">Tema do post</label>
            <select value={themeId} onChange={e => setThemeId(e.target.value)} className="select-field">
              <option value="">Sem tema específico</option>
              {themes.map(t => <option key={t.id} value={t.id}>{t.theme_name}</option>)}
            </select>
          </div>

          {/* ── Assunto específico ──────────────────────────────────── */}
          <div>
            <label className="form-label">
              Assunto específico <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input type="text" value={customTopic}
              onChange={e => setCustomTopic(e.target.value)}
              placeholder="ex: 7 erros que donos de salão cometem no Instagram"
              className="input-field" maxLength={120} />
            <p className="form-hint">Quanto mais específico, melhor o conteúdo gerado pela IA.</p>
          </div>

          {/* ── Modo de publicação ──────────────────────────────────── */}
          <div>
            <label className="form-label">Modo de publicação</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                {
                  value: 'review',
                  label: type === 'daily' ? '👁️ Revisão semanal' : '👁️ Revisão',
                  desc:  type === 'daily'
                    ? 'Gera 7 dias de uma vez, você aprova antes de publicar'
                    : 'Aguarda sua aprovação antes de publicar',
                },
                {
                  value: 'automatic',
                  label: '⚡ Automático',
                  desc:  type === 'daily'
                    ? 'Gera e publica direto nos horários definidos'
                    : 'Publica direto no Instagram',
                },
              ] as const).map(opt => (
                <button key={opt.value} type="button" onClick={() => setPublishMode(opt.value)}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${
                    publishMode === opt.value
                      ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Slides ─────────────────────────────────────────────── */}
          <div>
            <label className="form-label">Quantidade de slides por post</label>
            <div className="flex gap-2">
              {SLIDES_OPTIONS.map(n => (
                <button key={n} type="button" onClick={() => setSlidesCount(n)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                    slidesCount === n
                      ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* ── Preview recurring ───────────────────────────────────── */}
          {type === 'recurring' && scheduledTime && (
            <div className="bg-[#F8F7FF] border border-[#6C3FE8]/15 rounded-xl p-4">
              <p className="text-xs text-[#6C3FE8] font-medium mb-2">Posts que serão criados (próximas 4 semanas):</p>
              <div className="space-y-1">
                {getNextOccurrences(dayOfWeek, scheduledTime, 4).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1 h-1 rounded-full bg-[#6C3FE8]/40" />
                    {i === 0 ? <span className="text-[#6C3FE8] font-medium">→ Gerado agora</span> : <span>Gerado todo domingo</span>}
                    {' '}— {d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={notEnoughCredits}
            className="btn-primary w-full py-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {type === 'daily'
              ? `Criar agendamento e gerar 1ª semana (${postsPerDay * 7} posts)`
              : 'Criar agendamento e gerar conteúdo'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
