'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Edit3, Save, X, CheckSquare, Clock, ChevronLeft, ChevronRight, Expand, ExternalLink, Trash2, RotateCcw } from 'lucide-react'
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

      <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[current]} alt={`Slide ${current + 1}`} className="w-full h-full object-cover" />
        {images.length > 1 && (
          <>
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all disabled:opacity-30">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setCurrent(c => Math.min(images.length - 1, c + 1))} disabled={current === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all disabled:opacity-30">
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      <p className="text-white/70 text-sm mt-3 font-medium">{current + 1} / {images.length}</p>

      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto max-w-sm pb-1">
          {images.map((url, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === current ? 'border-white' : 'border-white/30 opacity-60 hover:opacity-90'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <Link href={`/preview/${postId}`}
        className="mt-4 flex items-center gap-2 bg-white text-[#1A1A2E] text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
        onClick={onClose}>
        <ExternalLink size={14} />
        Abrir preview completo
      </Link>
    </div>
  )
}

// ── Delete confirmation inline ────────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="mx-4 mb-3 rounded-xl bg-red-50 border border-red-200 p-3 flex items-center gap-3">
      <p className="text-xs text-red-600 flex-1 font-medium">Excluir este post permanentemente?</p>
      <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-white transition-colors">
        Não
      </button>
      <button onClick={onConfirm} className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded-lg transition-colors">
        Excluir
      </button>
    </div>
  )
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({
  post,
  onApprove,
  onReject,
  onDelete,
  onUndoApprove,
  onPreview,
  isApproved,
}: {
  post: Post
  onApprove?: () => void
  onReject?: () => void
  onDelete: () => void
  onUndoApprove?: () => void
  onPreview: (index: number) => void
  isApproved: boolean
}) {
  const [editingCaption, setEditingCaption] = useState(false)
  const [editCaption, setEditCaption]       = useState(post.caption ?? '')
  const [confirming, setConfirming]         = useState(false)
  const [processing, setProcessing]         = useState(false)

  const hasImages   = post.slides_images && post.slides_images.length > 0
  const isGenerating = !hasImages && (!post.content || post.content.length === 0)
  const coverImage  = hasImages ? post.slides_images[0] : null

  const schedule = post.post_schedules as { content_themes?: { theme_name: string; tone: string } | null } | null
  const theme    = schedule?.content_themes

  const TONE_LABEL: Record<string, string> = {
    educational: 'Educativo', motivational: 'Motivacional', promotional: 'Promocional',
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const saveCaption = async () => {
    await supabase.from('posts').update({ caption: editCaption }).eq('id', post.id)
    setEditingCaption(false)
  }

  const handleAction = async (fn: () => void) => {
    setProcessing(true)
    await fn()
    setProcessing(false)
  }

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Status badge for approved posts */}
      {isApproved && (
        <div className="px-4 pt-3 pb-0 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-xs font-medium text-purple-600">Aprovado — aguardando publicação</span>
        </div>
      )}

      {/* Cover image */}
      <button
        onClick={() => hasImages ? onPreview(0) : undefined}
        disabled={!hasImages}
        className={`relative w-full overflow-hidden group ${isApproved ? 'aspect-[4/3]' : 'aspect-square'} bg-gray-100`}
      >
        {coverImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt="Capa" className="w-full h-full object-cover" />
            <span className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {post.slides_images.length} slides
            </span>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-all bg-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-semibold text-[#1A1A2E]">
                <Expand size={14} /> Ver todos os slides
              </div>
            </div>
          </>
        ) : isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 spinner" />
            <p className="text-xs text-gray-400">Gerando imagens...</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
            <div className="w-8 h-8 spinner" />
            <p className="text-xs text-gray-400 text-center">Renderizando slides...</p>
          </div>
        )}
      </button>

      {/* Thumbnail strip */}
      {hasImages && post.slides_images.length > 1 && (
        <div className="flex gap-1 px-3 pt-3 overflow-x-auto">
          {post.slides_images.slice(0, 6).map((url, i) => (
            <button key={i} onClick={() => onPreview(i)}
              className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-gray-100 hover:border-[#6C3FE8] transition-colors">
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
      {post.caption && !editingCaption && (
        <p className="px-4 py-1 text-xs text-gray-400 line-clamp-2 leading-relaxed">{post.caption}</p>
      )}

      {/* Caption editor */}
      {editingCaption && (
        <div className="px-4 pb-3 pt-2 border-t border-gray-100 mt-2">
          <textarea
            value={editCaption}
            onChange={e => setEditCaption(e.target.value)}
            rows={3}
            className="textarea-field text-xs"
            placeholder="Legenda do Instagram..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setEditingCaption(false)}
              className="text-gray-400 hover:text-gray-600 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              <X size={12} /> Cancelar
            </button>
            <button onClick={saveCaption}
              className="bg-[#6C3FE8] hover:bg-[#5830cc] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
              <Save size={12} /> Salvar
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirming && (
        <DeleteConfirm
          onConfirm={() => { setConfirming(false); handleAction(onDelete) }}
          onCancel={() => setConfirming(false)}
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4 pt-2 mt-auto">
        {isApproved ? (
          // Approved post: undo + delete
          <>
            <button
              onClick={() => handleAction(onUndoApprove!)}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-1.5 border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              {processing ? <div className="w-3 h-3 spinner" /> : <RotateCcw size={13} />}
              Desfazer aprovação
            </button>
            <button
              onClick={() => setEditingCaption(true)}
              disabled={processing}
              className="w-10 flex items-center justify-center border border-gray-200 text-gray-400 hover:text-[#6C3FE8] hover:border-[#6C3FE8]/30 rounded-xl transition-all"
              title="Editar legenda"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => setConfirming(true)}
              disabled={processing}
              className="w-10 flex items-center justify-center border border-red-200 text-red-400 hover:bg-red-50 rounded-xl transition-all"
              title="Excluir post"
            >
              <Trash2 size={14} />
            </button>
          </>
        ) : (
          // Waiting post: reject + edit + approve + delete
          <>
            <button
              onClick={() => handleAction(onReject!)}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              <XCircle size={14} />
              Rejeitar
            </button>
            <button
              onClick={() => setEditingCaption(true)}
              disabled={processing}
              className="w-10 flex items-center justify-center border border-gray-200 text-gray-400 hover:text-[#6C3FE8] hover:border-[#6C3FE8]/30 rounded-xl transition-all"
              title="Editar legenda"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => setConfirming(true)}
              disabled={processing}
              className="w-10 flex items-center justify-center border border-red-200 text-red-400 hover:bg-red-50 rounded-xl transition-all"
              title="Excluir post"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={() => handleAction(onApprove!)}
              disabled={processing || (!hasImages && isGenerating)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-xl transition-all"
            >
              {processing ? <div className="w-3 h-3 spinner" /> : <CheckCircle size={14} />}
              Aprovar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { companyId: string; onCountChange: (n: number) => void }

export default function ApprovalQueue({ companyId, onCountChange }: Props) {
  const [waiting,  setWaiting]  = useState<Post[]>([])
  const [approved, setApproved] = useState<Post[]>([])
  const [loading,  setLoading]  = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [previewModal, setPreviewModal] = useState<{ postId: string; images: string[]; index: number } | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, post_schedules(scheduled_time, day_of_week, scheduled_date, type, content_themes(theme_name, tone))')
      .eq('company_id', companyId)
      .in('status', ['waiting', 'approved'])
      .order('scheduled_for', { ascending: true })

    const list = data ?? []
    const w = list.filter(p => p.status === 'waiting')
    const a = list.filter(p => p.status === 'approved')
    setWaiting(w)
    setApproved(a)
    onCountChange(w.length)
    setLoading(false)
  }, [companyId, onCountChange])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const approve = async (id: string) => {
    await supabase.from('posts').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    fetchPosts()
  }

  const reject = async (id: string) => {
    await supabase.from('posts').update({ status: 'rejected' }).eq('id', id)
    fetchPosts()
  }

  const deletePost = async (id: string) => {
    await supabase.from('posts').delete().eq('id', id)
    fetchPosts()
  }

  const undoApprove = async (id: string) => {
    await supabase.from('posts').update({ status: 'waiting', approved_at: null }).eq('id', id)
    fetchPosts()
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

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
      <div className="w-5 h-5 spinner" />
      Carregando...
    </div>
  )

  const total = waiting.length + approved.length

  if (total === 0) return (
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
      {previewModal && (
        <SlideCarouselModal
          images={previewModal.images}
          postId={previewModal.postId}
          initialIndex={previewModal.index}
          onClose={() => setPreviewModal(null)}
        />
      )}

      {/* ── Waiting for approval ── */}
      {waiting.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <h2 className="text-sm font-semibold text-[#1A1A2E]">
                Aguardando aprovação
                <span className="ml-1.5 text-gray-400 font-normal">({waiting.length})</span>
              </h2>
            </div>
            {waiting.length > 1 && (
              <button
                onClick={approveAll}
                disabled={processing === 'all'}
                className="flex items-center gap-1.5 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-60 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              >
                {processing === 'all' ? <div className="w-3 h-3 spinner" /> : <CheckSquare size={13} />}
                Aprovar todos ({waiting.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {waiting.map(post => (
              <PostCard
                key={post.id}
                post={post}
                isApproved={false}
                onApprove={() => approve(post.id)}
                onReject={() => reject(post.id)}
                onDelete={() => deletePost(post.id)}
                onPreview={(i) => setPreviewModal({ postId: post.id, images: post.slides_images, index: i })}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Approved — scheduled to publish ── */}
      {approved.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <h2 className="text-sm font-semibold text-[#1A1A2E]">
              Aprovados — aguardando publicação
              <span className="ml-1.5 text-gray-400 font-normal">({approved.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {approved.map(post => (
              <PostCard
                key={post.id}
                post={post}
                isApproved={true}
                onDelete={() => deletePost(post.id)}
                onUndoApprove={() => undoApprove(post.id)}
                onPreview={(i) => setPreviewModal({ postId: post.id, images: post.slides_images, index: i })}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
