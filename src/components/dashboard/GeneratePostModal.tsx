'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { useCompany } from '@/hooks/useCompany'
import type { ContentTheme } from '@/types/scheduling'

const TONE_OPTS = [
  { value: 'educational',  label: 'Educativo',    emoji: '📚' },
  { value: 'motivational', label: 'Motivacional', emoji: '🔥' },
  { value: 'promotional',  label: 'Promocional',  emoji: '🛍️' },
] as const

const SLIDES_OPTS = [5, 7, 10] as const

interface Props {
  open: boolean
  onClose: () => void
  themes: ContentTheme[]
}

export default function GeneratePostModal({ open, onClose, themes }: Props) {
  const router = useRouter()
  const { companyId } = useCompany()
  const [themeId,     setThemeId]     = useState('')
  const [customTheme, setCustomTheme] = useState('')
  const [tone,        setTone]        = useState<'educational' | 'motivational' | 'promotional'>('educational')
  const [slides,      setSlides]      = useState<5 | 7 | 10>(7)
  const [mode,        setMode]        = useState<'review' | 'automatic'>('review')
  const [loading,     setLoading]     = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [error,       setError]       = useState<string | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setThemeId(themes[0]?.id ?? '')
      setCustomTheme('')
      setTone('educational')
      setSlides(7)
      setMode('review')
      setLoading(false)
      setProgress(0)
      setError(null)
    }
  }, [open, themes])

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [loading, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const startProgress = () => {
    setProgress(0)
    // Advance to 85% over ~50 seconds (fake progress)
    let current = 0
    progressRef.current = setInterval(() => {
      current += Math.random() * 2
      if (current >= 85) { clearInterval(progressRef.current!); current = 85 }
      setProgress(Math.round(current))
    }, 600)
  }

  const stopProgress = (final = 100) => {
    if (progressRef.current) clearInterval(progressRef.current)
    setProgress(final)
  }

  const handleGenerate = async () => {
    if (!companyId) return
    const selectedTheme = themes.find(t => t.id === themeId)
    const themeName = customTheme.trim() || selectedTheme?.theme_name || 'Conteúdo geral'

    setLoading(true)
    setError(null)
    startProgress()

    try {
      const res = await fetch('/api/generate-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id:   companyId,
          schedule_id:  null,
          theme:        themeName,
          tone,
          slides_count: slides,
          publish_mode: mode,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar post')

      stopProgress(100)
      setTimeout(() => {
        onClose()
        router.push(`/preview/${data.post_id}`)
      }, 400)
    } catch (err) {
      stopProgress(0)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
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
            {!loading && (
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X size={15} className="text-gray-500" />
              </button>
            )}
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Loading state */}
            {loading ? (
              <div className="py-4 space-y-5">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center animate-pulse">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">Gerando seu carrossel…</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {progress < 30 ? 'Preparando contexto da empresa…'
                        : progress < 60 ? 'IA criando conteúdo dos slides…'
                        : progress < 85 ? 'Renderizando imagens…'
                        : 'Finalizando e salvando…'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Progresso</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6C3FE8, #E84393)' }}
                    />
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400">Isso pode levar até 60 segundos…</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                {/* Theme selector */}
                <div>
                  <label className="form-label">Tema do carrossel</label>
                  {themes.length > 0 ? (
                    <select
                      value={themeId}
                      onChange={e => setThemeId(e.target.value)}
                      className="select-field"
                    >
                      {themes.map(t => (
                        <option key={t.id} value={t.id}>{t.theme_name}</option>
                      ))}
                      <option value="">Tema personalizado…</option>
                    </select>
                  ) : null}
                  {(themeId === '' || themes.length === 0) && (
                    <input
                      type="text"
                      value={customTheme}
                      onChange={e => setCustomTheme(e.target.value)}
                      placeholder="ex: 5 dicas de produtividade"
                      className="input-field mt-2"
                    />
                  )}
                </div>

                {/* Tone */}
                <div>
                  <label className="form-label">Tom</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TONE_OPTS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTone(opt.value)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          tone === opt.value
                            ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-400'
                        }`}
                      >
                        <div className="text-base mb-0.5">{opt.emoji}</div>
                        <p className="text-xs font-medium">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slides count */}
                <div>
                  <label className="form-label">Número de slides</label>
                  <div className="flex gap-2">
                    {SLIDES_OPTS.map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSlides(n)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                          slides === n
                            ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Publish mode */}
                <div>
                  <label className="form-label">Modo de publicação</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'review',    label: 'Revisão', desc: 'Aprovar antes de publicar' },
                      { value: 'automatic', label: 'Automático', desc: 'Publicar direto no Instagram' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMode(opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          mode === opt.value
                            ? 'bg-[#F8F7FF] border-[#6C3FE8]'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className={`text-xs font-semibold ${mode === opt.value ? 'text-[#6C3FE8]' : 'text-[#1A1A2E]'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!loading && (
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
