'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Calendar, RotateCcw, AlertCircle } from 'lucide-react'
import { useCompany } from '@/hooks/useCompany'
import { supabase } from '@/lib/supabase'
import type { ContentTheme } from '@/types/scheduling'

const TONE_OPTS = [
  { value: 'educational',  label: 'Educativo',    emoji: '📚' },
  { value: 'motivational', label: 'Motivacional', emoji: '🔥' },
  { value: 'promotional',  label: 'Promocional',  emoji: '🛍️' },
  { value: 'journalistic', label: 'Jornalístico', emoji: '📰' },
] as const

const SLIDES_OPTS = [5, 7, 10] as const

const DAY_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

// Polling status messages by elapsed seconds
function progressMessage(elapsed: number, status: string) {
  if (status === 'pending')    return 'Na fila, aguardando…'
  if (elapsed < 15)            return 'Preparando contexto da empresa…'
  if (elapsed < 30)            return 'IA criando conteúdo dos slides…'
  if (elapsed < 55)            return 'Renderizando imagens no servidor…'
  return 'Finalizando e salvando…'
}

interface WeeklyEntry {
  day_of_week: number
  theme_id:    string | null
  tone:        'educational' | 'motivational' | 'promotional' | 'journalistic'
  enabled:     boolean
}

type JobStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

interface Props {
  open: boolean
  onClose: () => void
  themes: ContentTheme[]
}

export default function GeneratePostModal({ open, onClose, themes }: Props) {
  const router = useRouter()
  const { companyId } = useCompany()

  // form
  const [themeId,      setThemeId]      = useState('')
  const [customTheme,  setCustomTheme]  = useState('')
  const [tone,         setTone]         = useState<'educational' | 'motivational' | 'promotional' | 'journalistic'>('educational')
  const [slides,       setSlides]       = useState<5 | 7 | 10>(7)
  const [mode,         setMode]         = useState<'review' | 'automatic'>('review')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  // weekly suggestion
  const [weeklyMap,     setWeeklyMap]     = useState<Record<number, WeeklyEntry>>({})
  const [suggestion,    setSuggestion]    = useState<WeeklyEntry | null>(null)
  const [suggDismissed, setSuggDismissed] = useState(false)

  // job polling
  const [jobStatus,  setJobStatus]  = useState<JobStatus>('idle')
  const [jobId,      setJobId]      = useState<string | null>(null)
  const [postId,     setPostId]     = useState<string | null>(null)
  const [elapsed,    setElapsed]    = useState(0)
  const [error,      setError]      = useState<string | null>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load weekly schedule on open ──────────────────────────────────────────
  const loadWeekly = useCallback(async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('weekly_theme_schedule')
      .select('day_of_week, theme_id, tone, enabled')
      .eq('company_id', companyId)
    const map: Record<number, WeeklyEntry> = {}
    ;(data ?? []).forEach((r: WeeklyEntry) => { map[r.day_of_week] = r })
    setWeeklyMap(map)
  }, [companyId])

  // ── Suggestion based on selected date or today ────────────────────────────
  useEffect(() => {
    if (suggDismissed) return
    const target = scheduleDate ? new Date(scheduleDate + 'T12:00:00') : new Date()
    const dow    = target.getDay()
    const entry  = weeklyMap[dow]
    setSuggestion(entry?.enabled && entry.theme_id ? entry : null)
  }, [scheduleDate, weeklyMap, suggDismissed])

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    stopPolling()
    setThemeId(themes[0]?.id ?? '')
    setCustomTheme('')
    setTone('educational')
    setSlides(7)
    setMode('review')
    setScheduleDate('')
    setScheduleTime('')
    setSuggDismissed(false)
    setSuggestion(null)
    setJobStatus('idle')
    setJobId(null)
    setPostId(null)
    setElapsed(0)
    setError(null)
    loadWeekly()
  }, [open, themes, loadWeekly]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && jobStatus === 'idle') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [jobStatus, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // ── Polling logic ─────────────────────────────────────────────────────────
  const stopPolling = () => {
    if (pollRef.current)    { clearInterval(pollRef.current);    pollRef.current    = null }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null }
  }

  const startPolling = (jId: string) => {
    setElapsed(0)
    elapsedRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/jobs/${jId}`)
        const data = await res.json()

        setJobStatus(data.status)

        if (data.status === 'completed') {
          stopPolling()
          setTimeout(() => {
            onClose()
            router.push(`/preview/${data.post_id}`)
          }, 600)
        }

        if (data.status === 'failed') {
          stopPolling()
          setError(data.error ?? 'Geração falhou. Tente novamente.')
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 3000)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!companyId) return
    const selectedTheme = themes.find(t => t.id === themeId)
    const themeName     = customTheme.trim() || selectedTheme?.theme_name || 'Conteúdo geral'

    let scheduledFor: string | null = null
    if (scheduleDate && scheduleTime) {
      const local  = new Date(`${scheduleDate}T${scheduleTime}:00`)
      scheduledFor = new Date(local.getTime() + 3 * 60 * 60 * 1000).toISOString()
    }

    setError(null)
    setJobStatus('pending')
    setElapsed(0)

    try {
      const res = await fetch('/api/generate-carousel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id:    companyId,
          schedule_id:   null,
          theme:         themeName,
          tone,
          slides_count:  slides,
          publish_mode:  mode,
          scheduled_for: scheduledFor,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar job')

      setJobId(data.job_id)
      setPostId(data.post_id)
      setJobStatus('pending')
      startPolling(data.job_id)
    } catch (err) {
      setJobStatus('failed')
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  const handleRetry = () => {
    setJobStatus('idle')
    setJobId(null)
    setPostId(null)
    setElapsed(0)
    setError(null)
  }

  const applySuggestion = () => {
    if (!suggestion) return
    setThemeId(suggestion.theme_id ?? '')
    setTone(suggestion.tone)
    setSuggDismissed(true)
    setSuggestion(null)
  }

  const isGenerating = jobStatus === 'pending' || jobStatus === 'processing'
  const progressPct  = Math.min(95, Math.round(elapsed / 70 * 100)) // reaches ~95% at 70s

  const suggDayName   = DAY_NAMES[(scheduleDate ? new Date(scheduleDate + 'T12:00:00') : new Date()).getDay()]
  const suggThemeName = suggestion ? (themes.find(t => t.id === suggestion.theme_id)?.theme_name ?? '') : ''
  const suggToneLabel = suggestion ? TONE_OPTS.find(t => t.value === suggestion.tone) : null

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={!isGenerating ? onClose : undefined} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-auto" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1A1A2E]">Gerar post agora</h2>
                <p className="text-xs text-gray-400">IA criará e renderizará os slides</p>
              </div>
            </div>
            {!isGenerating && (
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X size={15} className="text-gray-500" />
              </button>
            )}
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* ── Generating state ── */}
            {isGenerating && (
              <div className="py-4 space-y-5">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center animate-pulse">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">Gerando seu carrossel…</p>
                    <p className="text-xs text-gray-400 mt-1">{progressMessage(elapsed, jobStatus)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Progresso</span>
                    <span>{elapsed}s</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #6C3FE8, #E84393)' }}
                    />
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400">Processando em segundo plano — pode fechar e voltar depois.</p>
              </div>
            )}

            {/* ── Failed state ── */}
            {jobStatus === 'failed' && (
              <div className="py-2 space-y-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                    <AlertCircle size={24} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">Geração falhou</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">{error}</p>
                  </div>
                </div>
                <button onClick={handleRetry} className="btn-primary w-full py-3 text-sm">
                  <RotateCcw size={15} />
                  Tentar novamente
                </button>
              </div>
            )}

            {/* ── Form ── */}
            {jobStatus === 'idle' && (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3">{error}</div>
                )}

                {/* Weekly suggestion */}
                {suggestion && suggThemeName && (
                  <div className="bg-[#F8F7FF] border border-[#6C3FE8]/20 rounded-xl px-4 py-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Calendar size={15} className="text-[#6C3FE8] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#6C3FE8]">Grade configurada para {suggDayName}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {suggThemeName}
                          {suggToneLabel && <span className="ml-1.5 text-gray-400">· {suggToneLabel.emoji} {suggToneLabel.label}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={applySuggestion}
                        className="flex-1 py-1.5 bg-[#6C3FE8] text-white text-xs font-semibold rounded-lg hover:bg-[#5a33c4] transition-colors">
                        Usar esse tema
                      </button>
                      <button type="button" onClick={() => { setSuggDismissed(true); setSuggestion(null) }}
                        className="px-3 py-1.5 text-gray-400 text-xs rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1">
                        <RotateCcw size={11} /> Escolher outro
                      </button>
                    </div>
                  </div>
                )}

                {/* Theme */}
                <div>
                  <label className="form-label">Tema do carrossel</label>
                  {themes.length > 0 && (
                    <select value={themeId} onChange={e => setThemeId(e.target.value)} className="select-field">
                      {themes.map(t => <option key={t.id} value={t.id}>{t.theme_name}</option>)}
                      <option value="">Tema personalizado…</option>
                    </select>
                  )}
                  {(themeId === '' || themes.length === 0) && (
                    <input type="text" value={customTheme} onChange={e => setCustomTheme(e.target.value)}
                      placeholder="ex: 5 dicas de produtividade" className="input-field mt-2" />
                  )}
                </div>

                {/* Tone */}
                <div>
                  <label className="form-label">Tom</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TONE_OPTS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setTone(opt.value)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          tone === opt.value
                            ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-400'
                        }`}>
                        <div className="text-base mb-0.5">{opt.emoji}</div>
                        <p className="text-xs font-medium">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slides */}
                <div>
                  <label className="form-label">Número de slides</label>
                  <div className="flex gap-2">
                    {SLIDES_OPTS.map(n => (
                      <button key={n} type="button" onClick={() => setSlides(n)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                          slides === n
                            ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}>{n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode */}
                <div>
                  <label className="form-label">Modo de publicação</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'review',    label: 'Revisão',    desc: 'Aprovar antes de publicar' },
                      { value: 'automatic', label: 'Automático', desc: 'Publicar direto no Instagram' },
                    ] as const).map(opt => (
                      <button key={opt.value} type="button" onClick={() => setMode(opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          mode === opt.value ? 'bg-[#F8F7FF] border-[#6C3FE8]' : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}>
                        <p className={`text-xs font-semibold ${mode === opt.value ? 'text-[#6C3FE8]' : 'text-[#1A1A2E]'}`}>{opt.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="form-label">
                    Agendar publicação
                    <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={scheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => { setScheduleDate(e.target.value); setSuggDismissed(false) }}
                      className="input-field text-sm" />
                    <input type="time" value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="input-field text-sm" />
                  </div>
                  {scheduleDate && scheduleTime ? (
                    <p className="text-xs text-[#6C3FE8] mt-1.5">
                      📅 Agendado para {scheduleDate.split('-').reverse().join('/')} às {scheduleTime} (Brasília)
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1.5">Sem agendamento — vai para a fila de aprovação</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {jobStatus === 'idle' && (
            <div className="px-6 pb-5">
              <button
                onClick={handleGenerate}
                disabled={!companyId || (!themeId && !customTheme.trim())}
                className="btn-primary w-full py-3.5 text-sm"
              >
                <Sparkles size={16} />
                Gerar agora
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
