'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Clock, Check, X, Eye, ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import type { Post } from '@/types/scheduling'

function SkeletonCard() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-gray-100 rounded w-28" />
        <div className="h-2.5 bg-gray-100 rounded w-20" />
        <div className="flex gap-2 mt-2">
          <div className="h-7 w-16 bg-gray-100 rounded-lg" />
          <div className="h-7 w-16 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

interface Props {
  posts: Post[]
  loading: boolean
  onAction?: () => void
}

export default function PendingApproval({ posts, loading, onAction }: Props) {
  const [acting, setActing] = useState<Record<string, boolean>>({})

  const approve = async (post: Post) => {
    setActing(a => ({ ...a, [post.id]: true }))
    await supabase
      .from('posts')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', post.id)
    setActing(a => ({ ...a, [post.id]: false }))
    onAction?.()
  }

  const reject = async (post: Post) => {
    if (!confirm('Rejeitar este post?')) return
    setActing(a => ({ ...a, [post.id]: true }))
    await supabase.from('posts').update({ status: 'rejected' }).eq('id', post.id)
    setActing(a => ({ ...a, [post.id]: false }))
    onAction?.()
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-[#1A1A2E]">Aguardando aprovação</h2>
          {posts.length > 0 && !loading && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold gradient-bg text-white">
              {posts.length}
            </span>
          )}
        </div>
        {posts.length > 0 && (
          <Link href="/posts?status=waiting" className="text-xs text-[#6C3FE8] hover:underline font-medium">
            Ver todos
          </Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-5">
          {[1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-3">
            <Check size={20} className="text-green-500" />
          </div>
          <p className="text-sm text-gray-400">Tudo aprovado! Nenhum post pendente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.slice(0, 4).map(post => {
            const thumb = Array.isArray(post.slides_images) ? post.slides_images[0] : null
            const count = Array.isArray(post.slides_images) ? post.slides_images.length : 0
            const busy  = acting[post.id]

            return (
              <div key={post.id} className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                  {thumb
                    ? <div className="relative w-full h-full"><Image src={thumb} alt="" fill className="object-cover" /></div>
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={16} className="text-gray-300" /></div>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A2E] truncate">
                    {count > 0 ? `${count} slides` : 'Carrossel'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => approve(post)}
                      disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Check size={11} />
                      Aprovar
                    </button>
                    <Link
                      href={`/preview/${post.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F8F7FF] hover:bg-[#EDE9FF] text-[#6C3FE8] text-xs font-semibold transition-colors"
                    >
                      <Eye size={11} />
                      Ver
                    </Link>
                    <button
                      onClick={() => reject(post)}
                      disabled={busy}
                      className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <X size={12} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
