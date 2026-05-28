'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, Upload, ChevronLeft, ChevronRight,
  Copy, Check, RefreshCw, Image as ImageIcon,
  ArrowRight, Loader2, X, Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { HEADLINE_STYLES, type HeadlineStyle } from '@/lib/prompt-posts/styles'

type Step = 'config' | 'generating' | 'result'

interface Result {
  postId:     string
  slideUrls:  string[]
  promptText: string
  headline:   string
  ctaWord:    string
}

const SLIDES_OPTIONS = [5, 7, 10]

export default function PromptPostGenerator() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep]                 = useState<Step>('config')
  const [topic, setTopic]               = useState('')
  const [slidesCount, setSlidesCount]   = useState(7)
  const [style, setStyle]               = useState<HeadlineStyle>(HEADLINE_STYLES[0])
  const [coverUrl, setCoverUrl]         = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [generatingMsg, setGeneratingMsg] = useState('')
  const [result, setResult]             = useState<Result | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [copied, setCopied]             = useState(false)
  const [error, setError]               = useState('')

  const companyId = typeof window !== 'undefined'
    ? localStorage.getItem('socialmind_company_id') ?? ''
    : ''

  async function handleCoverUpload(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop()
      const path = `${companyId}/prompt-covers/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('media-library')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('media-library').getPublicUrl(path)
      setCoverUrl(publicUrl)
      setCoverPreview(URL.createObjectURL(file))
    } catch (e) {
      setError('Erro ao fazer upload da foto')
    } finally {
      setUploading(false)
    }
  }

  async function handleGenerate() {
    if (!topic.trim()) { setError('Informe o tema do post'); return }
    setError('')
    setStep('generating')

    const msgs = [
      'Gerando conteúdo com IA...',
      'Criando estrutura dos slides...',
      'Renderizando capa...',
      'Renderizando slides de conteúdo...',
      'Finalizando e salvando...',
    ]
    let i = 0
    setGeneratingMsg(msgs[0])
    const interval = setInterval(() => {
      i = Math.min(i + 1, msgs.length - 1)
      setGeneratingMsg(msgs[i])
    }, 4000)

    try {
      const res = await fetch('/api/prompt-posts/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          topic:          topic.trim(),
          headlineStyleId: style.id,
          coverImageUrl:  coverUrl ?? undefined,
          slidesCount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar post')
      setResult(data as Result)
      setCurrentSlide(0)
      setStep('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado')
      setStep('config')
    } finally {
      clearInterval(interval)
    }
  }

  async function handleCopy() {
    if (!result) return
    await navigator.clipboard.writeText(result.promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleNewPost() {
    setStep('config')
    setTopic('')
    setCoverUrl(null)
    setCoverPreview(null)
    setResult(null)
    setCurrentSlide(0)
    setError('')
  }

  // ── Step: Config ────────────────────────────────────────────────────────────
  if (step === 'config') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6C3FE8,#E84393)' }}>
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Prompt Posts</h1>
              <p className="text-sm text-gray-500">Posts estilo "comenta X e recebe no direct"</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">

          {/* Topic */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Tema do post *</label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Ex: Como usar o Claude para criar posts virais no Instagram sem ter seguidores..."
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-purple-400 focus:bg-white resize-none transition-all"
            />
          </div>

          {/* Slides count */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Quantidade de slides</label>
            <div className="flex gap-3">
              {SLIDES_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => setSlidesCount(n)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                    slidesCount === n
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {n} slides
                </button>
              ))}
            </div>
          </div>

          {/* Headline style */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-4">Estilo da headline da capa</label>
            <div className="grid grid-cols-2 gap-3">
              {HEADLINE_STYLES.map(s => {
                const bg = s.gradient ?? (s.bgColor === 'transparent' ? '#1a1a1a' : s.bgColor)
                const selected = style.id === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      selected ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: bg, color: s.textColor }}
                    >
                      Aa
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${selected ? 'text-purple-700' : 'text-gray-700'}`}>{s.label}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cover image */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Foto de capa</label>
            <p className="text-xs text-gray-400 mb-4">Opcional — sem foto usa fundo escuro gradiente</p>

            {coverPreview ? (
              <div className="relative">
                <img src={coverPreview} alt="Capa" className="w-full h-40 object-cover rounded-xl" />
                <button
                  onClick={() => { setCoverUrl(null); setCoverPreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <X size={14} />
                </button>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-xs text-purple-600 font-medium flex items-center gap-1 hover:text-purple-700"
                  >
                    <RefreshCw size={12} /> Trocar foto
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-purple-300 hover:bg-purple-50/50 transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={24} className="animate-spin text-purple-500 mx-auto mb-2" />
                ) : (
                  <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                )}
                <p className="text-sm text-gray-500 font-medium">
                  {uploading ? 'Enviando...' : 'Clique para fazer upload'}
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG — recomendado 1:1</p>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f) }}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || uploading}
            className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg,#6C3FE8,#E84393)' }}
          >
            <Sparkles size={18} />
            Gerar Post
          </button>
        </div>
      </div>
    )
  }

  // ── Step: Generating ────────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 animate-pulse" style={{ background: 'linear-gradient(135deg,#6C3FE8,#E84393)' }}>
          <Sparkles size={36} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Gerando seu post...</h2>
        <p className="text-sm text-gray-500 text-center">{generatingMsg}</p>
        <div className="mt-8 flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'linear-gradient(135deg,#6C3FE8,#E84393)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Step: Result ────────────────────────────────────────────────────────────
  if (!result) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Post gerado!</h2>
          <p className="text-sm text-gray-500">Revise e publique ou agende</p>
        </div>
        <button onClick={handleNewPost} className="text-sm text-purple-600 font-semibold hover:text-purple-700 flex items-center gap-1">
          <RefreshCw size={14} /> Novo post
        </button>
      </div>

      {/* Slide preview */}
      <div className="bg-black rounded-2xl overflow-hidden shadow-xl">
        <img
          src={result.slideUrls[currentSlide]}
          alt={`Slide ${currentSlide + 1}`}
          className="w-full aspect-square object-cover"
        />
        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
          <button
            onClick={() => setCurrentSlide(p => Math.max(0, p - 1))}
            disabled={currentSlide === 0}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={16} className="text-white" />
          </button>
          <div className="flex gap-1.5">
            {result.slideUrls.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`rounded-full transition-all ${i === currentSlide ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/30'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentSlide(p => Math.min(result.slideUrls.length - 1, p + 1))}
            disabled={currentSlide === result.slideUrls.length - 1}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30 hover:bg-white/20 transition-colors"
          >
            <ChevronRight size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Prompt to copy */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Prompt para enviar no direct</h3>
            <p className="text-xs text-gray-400 mt-0.5">Envie para quem comentar <span className="font-bold text-purple-600">"{result.ctaWord}"</span></p>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              copied ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result.promptText}</p>
        </div>
      </div>

      {/* Caption */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Legenda sugerida</h3>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {result.headline}{'\n\n'}Comenta "{result.ctaWord}" que eu te mando no direct! 👇
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => router.push(`/posts/${result.postId}`)}
          className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#6C3FE8,#E84393)' }}
        >
          <Send size={16} />
          Ver post e publicar
        </button>
        <button
          onClick={handleNewPost}
          className="w-full py-3 rounded-2xl text-gray-600 font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Criar novo post
        </button>
      </div>
    </div>
  )
}
