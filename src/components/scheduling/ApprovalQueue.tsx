'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Edit3, Save, X, CheckSquare, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/types/scheduling'

interface Props { companyId: string; onCountChange: (n: number) => void }

export default function ApprovalQueue({ companyId, onCountChange }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

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
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{posts.length} post{posts.length !== 1 ? 's' : ''} aguardando aprovação</p>
        <button
          onClick={approveAll}
          disabled={processing === 'all'}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
        >
          <CheckSquare size={15} />
          Aprovar todos
        </button>
      </div>

      <div className="space-y-4">
        {posts.map(post => {
          const schedule = post.post_schedules as { content_themes?: { theme_name: string; tone: string } | null; type: string } | null
          const theme = schedule?.content_themes
          const isProcessing = processing === post.id

          return (
            <div key={post.id} className="card overflow-hidden">
              {/* Post header */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm font-semibold text-[#1A1A2E]">
                      {theme?.theme_name ?? 'Post sem tema'}
                    </span>
                    {theme?.tone && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md border border-gray-200">
                        {TONE_LABEL[theme.tone] ?? theme.tone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{formatDate(post.scheduled_for)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(post)}
                    disabled={isProcessing}
                    className="p-2 text-gray-400 hover:text-[#6C3FE8] hover:bg-[#F8F7FF] rounded-lg transition-all"
                    title="Editar legenda"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => reject(post.id)}
                    disabled={isProcessing}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Rejeitar"
                  >
                    <XCircle size={15} />
                  </button>
                  <button
                    onClick={() => approve(post.id)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                  >
                    {isProcessing ? (
                      <div className="w-3 h-3 spinner" />
                    ) : <CheckCircle size={14} />}
                    Aprovar
                  </button>
                </div>
              </div>

              {/* Slides preview */}
              {post.slides_images && post.slides_images.length > 0 ? (
                <div className="px-5 py-4">
                  <p className="text-xs text-gray-400 font-medium mb-3">
                    Preview dos slides ({post.slides_images.length})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {post.slides_images.map((url, i) => (
                      <div
                        key={i}
                        className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 relative"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Slide ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1 right-1.5 text-[10px] font-bold text-white drop-shadow">
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : post.content && post.content.length > 0 ? (
                <div className="px-5 py-4">
                  <p className="text-xs text-gray-400 font-medium mb-3">Conteúdo dos slides</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {post.content.map((slide, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-xs text-gray-400 font-medium mb-1">Slide {i + 1}</p>
                        {slide.title && <p className="text-sm font-semibold text-[#1A1A2E] line-clamp-2">{slide.title}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="flex gap-1.5">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-12 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                          <span className="text-gray-300 text-xs">{i + 1}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs">Slides serão gerados pela IA</p>
                  </div>
                </div>
              )}

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
