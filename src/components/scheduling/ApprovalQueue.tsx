'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Edit3, Save, X, CheckSquare, Clock, ChevronLeft, ChevronRight, Expand, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Post } from '@/types/scheduling'

// ── Slide Carousel Modal ──────────────────────────────────────────────────────
function SlideCarouselModal({ images, postId, initialIndex, onClose }: {
  images: string[]
  postId: string
  initialIndex: number
  onClose: () => void
}) {
  const [current, setCurrent] = useState(initialIndex)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  setCurrent(c => Math.max(0, c - 1))
      if (e.key === 'ArrowRight') setCurrent(c => Math.min(images.length - 1, c + 1))
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose, images.length])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <X size={18} className="text-white" />
      </button>

      {/* Slide image */}
      <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[current]}
          alt={`Slide ${current + 1}`}
          className="w-full h-full object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrent(c => Math.min(images.length - 1, c + 1))}
              disabled={current === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* Counter */}
      <p className="text-white/70 text-sm mt-3 font-medium">
        {current + 1} / {images.length}
      </p>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto max-w-sm pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === current ? 'border-white' : 'border-white/30 opacity-60 hover:opacity-90'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Full preview link */}
      <Link
        href={`/preview/${postId}`}
        className="mt-4 flex items-center gap-2 bg-white text-[#1A1A2E] text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
        onClick={onClose}
      >
        <ExternalLink size={14} />
        Abrir preview completo
      </Link>
    </div>
  )
}

interface Props { companyId: string; onCountChange: (n: number) => void }

export default function ApprovalQueue({ companyId, onCountChange }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [previewModal, setPreviewModal] = useState<{ postId: string; images: string[]; index: number } | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, post_schedules(scheduled_time, day_of_week, scheduled_date, type, content_themes(theme_name, tone))')
      .eq('company_id', companyId)
      .eq('status', 'waiting')
      .order('scheduled_for', { ascending: true })
    const list = data ?? []
    setPosts(list)
    onCountChange(list.length)
    setLoading(false)
  }, [companyId, onCountChange])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const approve = async (id: string) => {
    setProcessing(id)
    await supabase.from('posts').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('notifications').insert({
      company_id: companyId,
      type: 'post_published',
      message: 'Post aprovado e pronto para publicação.',
      read: false,
    })
    fetchPosts()
    setProcessing(null)
  }

  const reject = async (id: string) => {
    setProcessing(id)
    await supabase.from('posts').update({ status: 'rejected' }).eq('id', id)
    fetchPosts()
    setProcessing(null)
  }

  const approveAll = async () => {
    setProcessing('all')
    const now = new Date().toISOString()
    await supabase
      .from('posts')
      .update({ status: 'approved', approved_at: now })
      .eq('company_id', companyId)
      .eq('status', 'waiting')
    fetchPosts()
    setProcessing(null)
  }

  const startEdit = (post: Post) => {
    setEditingId(post.id)
    setEditCaption(post.caption ?? '')
  }

  const saveEdit = async (id: string) => {
    await supabase.from('posts').update({ caption: editCaption }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, caption: editCaption } : p))
    setEditingId(null)
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const TONE_LABEL: Record<string, string> = {
    educational: 'Educativo', motivational: 'Motivacional', promotional: 'Promocional',
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
      <div className="w-5 h-5 spinner" />
      Carregando...
    </div>
  )

  if (posts.length === 0) return (
    <div className="text-center py-20">
      <div className="w-14 h-14 bg-[#F8F7FF] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#6C3FE8]/15">
        <CheckSquare size={26} className="text-[#6C3FE8]/60" />
      </div>
      <p className="font-medium text-gray-600">Nenhum post aguardando aprovação</p>
      <p className="text-sm text-gray-400 mt-1">Quando posts forem gerados pela IA, eles aparecerão aqui.</p>
    </div>
  )

  return (
    <div>
      {/* Slide carousel modal */}
      {previewModal && (
        <SlideCarouselModal
          images={previewModal.images}
          postId={previewModal.postId}
          initialIndex={previewModal.index}
          onClose={() => setPreviewModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-400">
          {posts.length} post{posts.length !== 1 ? 's' : ''} aguardando aprovação
        </p>
        {posts.length > 1 && (
          <button
            onClick={approveAll}
            disabled={processing === 'all'}
            className="flex items-center gap-1.5 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-60 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          >
            {processing === 'all' ? <div className="w-3 h-3 spinner" /> : <CheckSquare size={13} />}
            Aprovar todos ({posts.length})
          </button>
        )}
      </div>

      {/* Grid of post cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.map(post => {
          const schedule = post.post_schedules as { content_themes?: { theme_name: string; tone: string } | null; type: string } | null
          const theme = schedule?.content_themes
          const isProcessing = processing === post.id
          const hasImages = post.slides_images && post.slides_images.length > 0
          const isGenerating = !hasImages && (!post.content || post.content.length === 0)
          const coverImage = hasImages ? post.slides_images[0] : null

          return (
            <div key={post.id} className="card overflow-hidden flex flex-col">
              {/* Cover image — large, clickable */}
              <button
                onClick={() => hasImages
                  ? setPreviewModal({ postId: post.id, images: post.slides_images, index: 0 })
                  : undefined
                }
                disabled={!hasImages}
                className="relative aspect-square bg-gray-100 w-full overflow-hidden group"
              >
                {coverImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage}
                      alt="Capa do post"
                      className="w-full h-full object-cover"
                    />
                    {/* Slide count badge */}
                    <span className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {post.slides_images.length} slides
                    </span>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-all bg-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-semibold text-[#1A1A2E]">
                        <Expand size={14} />
                        Ver todos os slides
                      </div>
                    </div>
                  </>
                ) : isGenerating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 spinner" />
                    <p className="text-xs text-gray-400">Gerando imagens...</p>
                  </div>
                ) : (
                  // Has content but no images yet
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                    <div className="w-8 h-8 spinner" />
                    <p className="text-xs text-gray-400 text-center">Renderizando slides...</p>
                  </div>
                )}
              </button>

              {/* Thumbnail strip (if multiple slides) */}
              {hasImages && post.slides_images.length > 1 && (
                <div className="flex gap-1 px-3 pt-3 overflow-x-auto">
                  {post.slides_images.slice(0, 6).map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewModal({ postId: post.id, images: post.slides_images, index: i })}
                      className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-gray-100 hover:border-[#6C3FE8] transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {post.slides_images.length > 6 && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400 font-medium">
                      +{post.slides_images.length - 6}
                    </div>
                  )}
                </div>
              )}

              {/* Post info */}
              <div className="px-4 pt-3 pb-1">
                <p className="text-sm font-semibold text-[#1A1A2E] line-clamp-1">
                  {post.content?.[0]?.title ?? theme?.theme_name ?? 'Post sem tema'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock size={11} className="text-gray-400" />
                  <span className="text-xs text-gray-400">{formatDate(post.scheduled_for)}</span>
                  {theme?.tone && (
                    <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">
                      {TONE_LABEL[theme.tone] ?? theme.tone}
                    </span>
                  )}
                </div>
              </div>

              {/* Caption preview */}
              {post.caption && editingId !== post.id && (
                <p className="px-4 py-1 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {post.caption}
                </p>
              )}

              {/* Caption editor */}
              {editingId === post.id && (
                <div className="px-4 pb-3 pt-2 border-t border-gray-100 mt-2">
                  <textarea
                    value={editCaption}
                    onChange={e => setEditCaption(e.target.value)}
                    rows={3}
                    className="textarea-field text-xs"
                    placeholder="Legenda do Instagram..."
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setEditingId(null)}
                      className="text-gray-400 hover:text-gray-600 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                      <X size={12} /> Cancelar
                    </button>
                    <button onClick={() => saveEdit(post.id)}
                      className="bg-[#6C3FE8] hover:bg-[#5830cc] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                      <Save size={12} /> Salvar
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 px-4 pb-4 pt-2 mt-auto">
                <button
                  onClick={() => reject(post.id)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
                >
                  <XCircle size={14} />
                  Rejeitar
                </button>
                <button
                  onClick={() => startEdit(post)}
                  disabled={isProcessing}
                  className="w-10 flex items-center justify-center border border-gray-200 text-gray-400 hover:text-[#6C3FE8] hover:border-[#6C3FE8]/30 rounded-xl transition-all"
                  title="Editar legenda"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => approve(post.id)}
                  disabled={isProcessing || (!hasImages && isGenerating)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-xl transition-all"
                >
                  {isProcessing ? <div className="w-3 h-3 spinner" /> : <CheckCircle size={14} />}
                  Aprovar
                </button>
              </div>

              {/* Caption editor */}
              {editingId === post.id ? (
                <div className="px-5 pb-4 border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-400 font-medium mb-2">Legenda do Instagram</p>
                  <textarea
                    value={editCaption}
                    onChange={e => setEditCaption(e.target.value)}
                    rows={3}
                    className="textarea-field"
                    placeholder="Digite a legenda do post..."
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <X size={13} /> Cancelar
                    </button>
                    <button
                      onClick={() => saveEdit(post.id)}
                      className="flex items-center gap-1 bg-[#6C3FE8] hover:bg-[#5830cc] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Save size={13} /> Salvar
                    </button>
                  </div>
                </div>
              ) : post.caption ? (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400 font-medium mb-1">Legenda</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{post.caption}</p>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
