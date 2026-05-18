'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCompany } from '@/hooks/useCompany'
import { STATUS_CONFIG } from '@/types/scheduling'
import type { Post } from '@/types/scheduling'
import { ImageIcon, ExternalLink } from 'lucide-react'

export default function RecentPublications() {
  const { companyId } = useCompany()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    supabase
      .from('posts')
      .select('*')
      .eq('company_id', companyId)
      .in('status', ['published', 'failed', 'approved', 'waiting'])
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setPosts((data ?? []) as Post[])
        setLoading(false)
      })
  }, [companyId])

  if (loading) {
    return (
      <div className="card p-6 space-y-3 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
          <ImageIcon size={20} className="text-gray-300" />
        </div>
        <p className="text-sm text-gray-400">Nenhuma publicação ainda</p>
      </div>
    )
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Últimas publicações</h2>
      <div className="space-y-3">
        {posts.map(post => {
          const thumb = Array.isArray(post.slides_images) ? post.slides_images[0] : null
          const cfg   = STATUS_CONFIG[post.status]
          return (
            <div key={post.id} className="flex items-center gap-3">
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-100 overflow-hidden flex-shrink-0">
                {thumb ? (
                  <div className="relative w-full h-full">
                    <Image src={thumb} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={16} className="text-gray-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A2E] truncate">
                  {Array.isArray(post.slides_images) ? `${post.slides_images.length} slides` : 'Carrossel'}
                </p>
                <p className="text-xs text-gray-400">
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : post.scheduled_for
                      ? `Agendado: ${new Date(post.scheduled_for).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                      : new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </p>
              </div>

              {/* Status + link */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge border ${cfg.badge} text-xs`}>{cfg.label}</span>
                <Link
                  href={`/preview/${post.id}`}
                  className="text-gray-300 hover:text-[#6C3FE8] transition-colors"
                  title="Ver preview"
                >
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
