'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, Eye, X, Zap, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/types/scheduling'

interface UpcomingPost extends Post { theme?: string }

const DAY_NAMES: Record<string, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

function formatScheduled(iso: string) {
  const d    = new Date(iso)
  const day  = DAY_NAMES[d.getDay()]
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return { day, date, time }
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-gray-100 rounded w-40" />
        <div className="h-2.5 bg-gray-100 rounded w-24" />
      </div>
      <div className="h-6 w-16 bg-gray-100 rounded-lg" />
    </div>
  )
}

interface Props {
  posts: UpcomingPost[]
  loading: boolean
  onCancel?: (postId: string) => void
}

export default function UpcomingPosts({ posts, loading, onCancel }: Props) {
  const cancelPost = async (postId: string) => {
    if (!confirm('Cancelar este agendamento?')) return
    await supabase.from('posts').update({ status: 'rejected' }).eq('id', postId)
    onCancel?.(postId)
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[#6C3FE8]" />
          <h2 className="text-sm font-semibold text-[#1A1A2E]">Próximas publicações</h2>
        </div>
        <Link href="/scheduling" className="text-xs text-[#6C3FE8] hover:underline font-medium">
          Ver todos
        </Link>
      </div>

      {loading ? (
        <div className="divide-y divide-gray-50">
          {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <CalendarDays size={20} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Nenhum post agendado</p>
          <Link href="/scheduling" className="text-xs text-[#6C3FE8] hover:underline mt-1 inline-block">
            Criar agendamento
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {posts.map(post => {
            const thumb = Array.isArray(post.slides_images) ? post.slides_images[0] : null
            const { day, date, time } = post.scheduled_for
              ? formatScheduled(post.scheduled_for)
              : { day: '—', date: '—', time: '—' }

            return (
              <div key={post.id} className="flex items-center gap-3 py-3 group">
                {/* Date pill */}
                <div className="flex-shrink-0 w-12 text-center">
                  <p className="text-xs text-gray-400 font-medium">{day}</p>
                  <p className="text-sm font-bold text-[#1A1A2E]">{date.split(' ')[0]}</p>
                  <p className="text-xs text-[#6C3FE8] font-medium">{time}</p>
                </div>

                {/* Thumb */}
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                  {thumb
                    ? <div className="relative w-full h-full"><Image src={thumb} alt="" fill className="object-cover" /></div>
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-gray-300" /></div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A2E] truncate">
                    {post.theme ?? 'Carrossel'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {post.post_schedules?.publish_mode === 'automatic' ? (
                      <span className="flex items-center gap-0.5 text-xs text-[#6C3FE8]">
                        <Zap size={10} strokeWidth={2.5} />
                        Auto
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600">Revisão</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/preview/${post.id}`}
                    className="w-7 h-7 rounded-lg bg-[#F8F7FF] hover:bg-[#EDE9FF] flex items-center justify-center transition-colors"
                    title="Ver preview"
                  >
                    <Eye size={13} className="text-[#6C3FE8]" />
                  </Link>
                  <button
                    onClick={() => cancelPost(post.id)}
                    className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                    title="Cancelar"
                  >
                    <X size={13} className="text-red-500" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
