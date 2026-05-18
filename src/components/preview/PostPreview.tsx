'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, ChevronRight, Check, X, Edit3, RefreshCw, ArrowLeft, Loader2
} from 'lucide-react'
import type { Post } from '@/types/scheduling'

interface Props {
  post: Post
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function PostPreview({ post: initialPost }: Props) {
  const router = useRouter()
  const [post, setPost] = useState(initialPost)
  const [current, setCurrent] = useState(0)
  const [caption, setCaption] = useState(post.caption ?? '')
  const [editingCaption, setEditingCaption] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const images: string[] = Array.isArray(post.slides_images) ? post.slides_images : []
  const total = images.length

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  async function handleApprove() {
    setLoadingAction('approve')
    try {
      const supabase = getSupabase()
      await supabase
        .from('posts')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', post.id)
      setPost(p => ({ ...p, status: 'approved' }))
      showMessage('success', 'Post aprovado com sucesso!')
    } catch {
      showMessage('error', 'Erro ao aprovar post.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleReject() {
    setLoadingAction('reject')
    try {
      const supabase = getSupabase()
      await supabase.from('posts').update({ status: 'rejected' }).eq('id', post.id)
      setPost(p => ({ ...p, status: 'rejected' }))
      showMessage('success', 'Post rejeitado.')
    } catch {
      showMessage('error', 'Erro ao rejeitar post.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleSaveCaption() {
    setLoadingAction('caption')
    try {
      const supabase = getSupabase()
      await supabase.from('posts').update({ caption }).eq('id', post.id)
      setPost(p => ({ ...p, caption }))
      setEditingCaption(false)
      showMessage('success', 'Legenda salva!')
    } catch {
      showMessage('error', 'Erro ao salvar legenda.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleRegenerateSlide(index: number) {
    setRegeneratingSlide(index)
    try {
      const res = await fetch('/api/regenerate-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, slide_index: index }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const newImages = [...images]
      newImages[index] = data.url
      setPost(p => ({ ...p, slides_images: newImages }))
      showMessage('success', `Slide ${index + 1} regenerado!`)
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Erro ao regenerar slide')
    } finally {
      setRegeneratingSlide(null)
    }
  }

  const statusLabel = {
    waiting: { label: 'Aguardando aprovação', classes: 'bg-amber-50 border-amber-200 text-amber-700' },
    approved: { label: 'Aprovado', classes: 'bg-green-50 border-green-200 text-green-700' },
    rejected: { label: 'Rejeitado', classes: 'bg-red-50 border-red-200 text-red-600' },
    published: { label: 'Publicado', classes: 'bg-blue-50 border-blue-200 text-blue-600' },
    draft: { label: 'Rascunho', classes: 'bg-gray-50 border-gray-200 text-gray-600' },
    failed: { label: 'Falhou', classes: 'bg-red-50 border-red-200 text-red-600' },
  }[post.status] ?? { label: post.status, classes: 'bg-gray-50 border-gray-200 text-gray-600' }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F7FF' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-[#1A1A2E] transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <span className={`badge border ${statusLabel.classes}`}>
            {statusLabel.label}
          </span>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-md border transition-all ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Slide viewer */}
          <div className="space-y-4">
            <div className="card overflow-hidden">
              <div className="relative aspect-square bg-gray-100">
                {images[current] ? (
                  <>
                    <Image
                      src={images[current]}
                      alt={`Slide ${current + 1}`}
                      fill
                      className="object-cover"
                      priority
                    />
                    {regeneratingSlide === current && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 size={32} className="text-[#6C3FE8] animate-spin" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={32} className="text-gray-300 animate-spin" />
                  </div>
                )}

                {/* Nav arrows */}
                {total > 1 && (
                  <>
                    <button
                      onClick={() => setCurrent(c => Math.max(0, c - 1))}
                      disabled={current === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all disabled:opacity-30"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => setCurrent(c => Math.min(total - 1, c + 1))}
                      disabled={current === total - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all disabled:opacity-30"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {/* Slide counter + regen */}
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
                <span className="text-sm text-gray-400 font-medium">
                  {current + 1} / {total}
                </span>
                <button
                  onClick={() => handleRegenerateSlide(current)}
                  disabled={regeneratingSlide !== null}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#6C3FE8] hover:text-[#5B34D1] transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} className={regeneratingSlide === current ? 'animate-spin' : ''} />
                  Regenerar este slide
                </button>
              </div>
            </div>

            {/* Thumbnail strip */}
            {total > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                      i === current ? 'border-[#6C3FE8]' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="relative w-full h-full">
                      <Image src={url} alt={`Slide ${i + 1}`} fill className="object-cover" />
                      {regeneratingSlide === i && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <Loader2 size={12} className="text-[#6C3FE8] animate-spin" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Caption */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Legenda</h2>
                {!editingCaption && (
                  <button
                    onClick={() => setEditingCaption(true)}
                    className="flex items-center gap-1 text-xs text-[#6C3FE8] hover:text-[#5B34D1] font-medium transition-colors"
                  >
                    <Edit3 size={12} />
                    Editar
                  </button>
                )}
              </div>

              {editingCaption ? (
                <div className="space-y-3">
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    rows={8}
                    className="textarea-field text-sm"
                    placeholder="Legenda do post..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCaption}
                      disabled={loadingAction === 'caption'}
                      className="btn-primary flex-1 py-2.5 text-sm"
                    >
                      {loadingAction === 'caption' ? (
                        <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                      ) : (
                        <><Check size={14} /> Salvar</>
                      )}
                    </button>
                    <button
                      onClick={() => { setCaption(post.caption ?? ''); setEditingCaption(false) }}
                      className="btn-secondary px-4 py-2.5 text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {caption || <span className="text-gray-300 italic">Sem legenda</span>}
                </p>
              )}
            </div>

            {/* Action buttons */}
            {(post.status === 'waiting' || post.status === 'draft') && (
              <div className="card p-5 space-y-3">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</h2>
                <button
                  onClick={handleApprove}
                  disabled={loadingAction !== null}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-60 text-sm"
                >
                  {loadingAction === 'approve' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Aprovar e agendar publicação
                </button>
                <button
                  onClick={handleReject}
                  disabled={loadingAction !== null}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-600 hover:text-red-600 font-semibold py-3.5 rounded-xl transition-all disabled:opacity-60 text-sm"
                >
                  {loadingAction === 'reject' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  Rejeitar
                </button>
              </div>
            )}

            {post.status === 'approved' && (
              <div className="card p-5 flex items-center gap-3 bg-green-50 border-green-200">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-700">Post aprovado</p>
                  <p className="text-xs text-green-600 mt-0.5">Aguardando publicação no horário agendado</p>
                </div>
              </div>
            )}

            {/* Post info */}
            <div className="card p-5 space-y-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Informações</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Slides</span>
                  <span className="font-medium text-[#1A1A2E]">{total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Criado em</span>
                  <span className="font-medium text-[#1A1A2E]">
                    {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {post.scheduled_for && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Agendado para</span>
                    <span className="font-medium text-[#1A1A2E]">
                      {new Date(post.scheduled_for).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
