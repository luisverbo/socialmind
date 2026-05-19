'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCompany } from '@/hooks/useCompany'
import { STATUS_CONFIG } from '@/types/scheduling'
import type { Post } from '@/types/scheduling'
import { Eye, Check, X, Trash2, ImageIcon, Search, Loader2, Sparkles, Send } from 'lucide-react'

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'waiting',   label: 'Aguardando' },
  { value: 'approved',  label: 'Aprovados'  },
  { value: 'published', label: 'Publicados' },
  { value: 'failed',    label: 'Falharam'   },
  { value: 'rejected',  label: 'Rejeitados' },
]

function SkeletonCard() {
  return (
    <div className="card p-0 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-20" />
        <div className="h-2.5 bg-gray-100 rounded w-28" />
      </div>
    </div>
  )
}

export default function PostsPage() {
  const { companyId } = useCompany()
  const [posts,    setPosts]    = useState<Post[]>([])
  const [loading,  setLoading]  = useState(true)
  const [status,   setStatus]   = useState('')
  const [search,   setSearch]   = useState('')
  const [acting,   setActing]   = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    let q = supabase.from('posts').select('*').eq('company_id', companyId)
    if (status) q = q.eq('status', status)
    q = q.order('created_at', { ascending: false }).limit(60)
    const { data } = await q
    setPosts((data ?? []) as Post[])
    setLoading(false)
  }, [companyId, status])

  useEffect(() => { load() }, [load])

  // Read URL param
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('status')
    if (p) setStatus(p)
  }, [])

  const approve = async (post: Post) => {
    setActing(a => ({ ...a, [post.id]: true }))
    await supabase.from('posts').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', post.id)
    setPosts(ps => ps.map(p => p.id === post.id ? { ...p, status: 'approved' } : p))
    setActing(a => ({ ...a, [post.id]: false }))
  }

  const reject = async (post: Post) => {
    if (!confirm('Rejeitar este post?')) return
    setActing(a => ({ ...a, [post.id]: true }))
    await supabase.from('posts').update({ status: 'rejected' }).eq('id', post.id)
    setPosts(ps => ps.map(p => p.id === post.id ? { ...p, status: 'rejected' } : p))
    setActing(a => ({ ...a, [post.id]: false }))
  }

  const remove = async (post: Post) => {
    if (!confirm('Deletar este post permanentemente?')) return
    setActing(a => ({ ...a, [post.id]: true }))
    await supabase.from('posts').delete().eq('id', post.id)
    setPosts(ps => ps.filter(p => p.id !== post.id))
  }

  const publishNow = async (post: Post) => {
    if (!confirm('Publicar este post no Instagram agora?')) return
    setActing(a => ({ ...a, [post.id]: true }))
    try {
      const res = await fetch('/api/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      })
      let data: Record<string, string> = {}
      try { data = await res.json() } catch { /* response wasn't JSON */ }
      if (!res.ok) throw new Error(data.error ?? `Erro ao publicar (HTTP ${res.status})`)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao publicar')
    } finally {
      setActing(a => ({ ...a, [post.id]: false }))
    }
  }

  const generateDraft = async (post: Post) => {
    setActing(a => ({ ...a, [post.id]: true }))
    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      })
      let data: Record<string, string> = {}
      try { data = await res.json() } catch { /* response wasn't JSON */ }
      if (!res.ok) throw new Error(data.error ?? `Erro ao gerar (HTTP ${res.status})`)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao gerar post')
    } finally {
      setActing(a => ({ ...a, [post.id]: false }))
    }
  }

  const filtered = search.trim()
    ? posts.filter(p => p.caption?.toLowerCase().includes(search.toLowerCase()))
    : posts

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1A1A2E]">Posts</h1>
        <p className="text-xs text-gray-400 mt-0.5">Todos os carrosséis gerados pela IA</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar na legenda…"
            className="input-field pl-9 py-2 text-sm"
          />
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                status === f.value
                  ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <ImageIcon size={22} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Nenhum post encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(post => {
            const thumb = Array.isArray(post.slides_images) ? post.slides_images[0] : null
            const count = Array.isArray(post.slides_images) ? post.slides_images.length : 0
            const cfg   = STATUS_CONFIG[post.status]
            const busy  = acting[post.id]

            return (
              <div key={post.id} className="card overflow-hidden group">
                {/* Thumbnail */}
                <div className="relative aspect-square bg-gray-100">
                  {thumb ? (
                    <Image src={thumb} alt="" fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon size={24} className="text-gray-300" />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {post.status !== 'draft' && (
                      <Link
                        href={`/preview/${post.id}`}
                        className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <Eye size={15} className="text-[#6C3FE8]" />
                      </Link>
                    )}
                    {post.status === 'draft' && (
                      <button
                        onClick={() => generateDraft(post)}
                        disabled={busy}
                        className="w-9 h-9 bg-[#6C3FE8] rounded-full flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                        title="Gerar agora"
                      >
                        {busy ? <Loader2 size={14} className="text-white animate-spin" /> : <Sparkles size={14} className="text-white" />}
                      </button>
                    )}
                    {post.status === 'waiting' && (
                      <button
                        onClick={() => approve(post)}
                        disabled={busy}
                        className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="text-white animate-spin" /> : <Check size={14} className="text-white" />}
                      </button>
                    )}
                    <button
                      onClick={() => remove(post)}
                      disabled={busy}
                      className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </div>
                  {count > 1 && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded-md">
                      {count}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 space-y-1.5">
                  <span className={`badge border text-[10px] ${cfg.badge}`}>{cfg.label}</span>
                  <p className="text-xs text-gray-400">
                    {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                  {post.status === 'draft' && (
                    <button
                      onClick={() => generateDraft(post)}
                      disabled={busy}
                      className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg bg-[#F8F7FF] text-[#6C3FE8] hover:bg-[#ede9ff] transition-colors disabled:opacity-50 mt-1"
                    >
                      {busy ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      {busy ? 'Gerando...' : 'Gerar agora'}
                    </button>
                  )}
                  {post.status === 'waiting' && (
                    <div className="flex gap-1 pt-1">
                      <button onClick={() => approve(post)} disabled={busy} className="flex-1 text-[10px] font-semibold py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50">
                        Aprovar
                      </button>
                      <button onClick={() => reject(post)} disabled={busy} className="flex-1 text-[10px] font-semibold py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                        Rejeitar
                      </button>
                    </div>
                  )}
                  {post.status === 'approved' && (
                    <button
                      onClick={() => publishNow(post)}
                      disabled={busy}
                      className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50 mt-1"
                    >
                      {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                      {busy ? 'Publicando...' : 'Publicar agora'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
