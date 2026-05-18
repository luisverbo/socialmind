'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/types/scheduling'
import { STATUS_CONFIG } from '@/types/scheduling'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'failed', label: 'Falharam' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'approved', label: 'Aprovados' },
]

export default function PostHistory({ companyId }: { companyId: string }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('posts')
      .select('*, post_schedules(scheduled_time, type, day_of_week, content_themes(theme_name))')
      .eq('company_id', companyId)
      .in('status', statusFilter ? [statusFilter] : ['published', 'failed', 'rejected', 'approved'])
      .order('scheduled_for', { ascending: false })
      .limit(50)

    if (dateFrom) query = query.gte('scheduled_for', dateFrom + 'T00:00:00')
    if (dateTo)   query = query.lte('scheduled_for', dateTo + 'T23:59:59')

    const { data } = await query
    setPosts(data ?? [])
    setLoading(false)
  }, [companyId, statusFilter, dateFrom, dateTo])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div className="flex-1 min-w-0">
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {STATUS_FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">De</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        {(statusFilter || dateFrom || dateTo) && (
          <div className="flex items-end">
            <button
              onClick={() => { setStatusFilter(''); setDateFrom(''); setDateTo('') }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-300 bg-gray-800 border border-gray-700 rounded-xl transition-all"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Carregando...
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <History size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-500">Nenhum post encontrado</p>
          <p className="text-sm mt-1">Os posts publicados aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const cfg = STATUS_CONFIG[post.status]
            const schedule = post.post_schedules as { content_themes?: { theme_name: string } | null } | null
            const theme = schedule?.content_themes

            return (
              <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {theme?.theme_name ?? 'Post sem tema'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-md border ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(post.scheduled_for)}</p>
                  {post.published_at && (
                    <p className="text-xs text-green-500 mt-0.5">
                      Publicado em {formatDate(post.published_at)}
                    </p>
                  )}
                </div>
                {post.instagram_post_id && (
                  <a
                    href={`https://www.instagram.com/p/${post.instagram_post_id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
                  >
                    Ver no Instagram <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
