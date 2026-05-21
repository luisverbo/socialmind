'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { X, Search, Upload, Image as ImageIcon, Loader2, Check } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MediaItem {
  id: string
  url: string
  category: string
  description: string | null
}

interface UnsplashResult {
  id: string
  thumbUrl: string
  regularUrl: string
  photographer: string
  photographerUrl: string
  pageUrl: string
  downloadLocation: string
}

interface Props {
  open: boolean
  slideIndex: number
  companyId: string
  onClose: () => void
  onSelect: (imageUrl: string) => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: '',           label: 'Todas' },
  { value: 'brand',      label: 'Marca' },
  { value: 'product',    label: 'Produtos' },
  { value: 'team',       label: 'Equipe' },
  { value: 'structure',  label: 'Estrutura' },
  { value: 'testimony',  label: 'Depoimentos' },
]

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── ImageSwapModal ─────────────────────────────────────────────────────────────

export default function ImageSwapModal({ open, slideIndex, companyId, onClose, onSelect }: Props) {
  const [tab, setTab] = useState<'library' | 'unsplash' | 'upload'>('library')

  // library
  const [mediaItems,  setMediaItems]  = useState<MediaItem[]>([])
  const [catFilter,   setCatFilter]   = useState('')
  const [loadingLib,  setLoadingLib]  = useState(false)

  // unsplash
  const [query,        setQuery]       = useState('')
  const [unsplashRes,  setUnsplashRes] = useState<UnsplashResult[]>([])
  const [searching,    setSearching]   = useState(false)

  // upload
  const [uploading,    setUploading]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // load media library on open
  useEffect(() => {
    if (!open || !companyId) return
    setLoadingLib(true)
    const supabase = getSupabase()
    supabase.from('media_library')
      .select('id, url, category, description')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: MediaItem[] | null }) => {
        setMediaItems((data ?? []) as MediaItem[])
        setLoadingLib(false)
      })
  }, [open, companyId])

  const filteredMedia = catFilter
    ? mediaItems.filter(m => m.category === catFilter)
    : mediaItems

  const handleUnsplashSearch = async (e?: { preventDefault: () => void }) => {
    e?.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/unsplash-search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setUnsplashRes(data.results ?? [])
    } catch { setUnsplashRes([]) }
    finally { setSearching(false) }
  }

  const handleUnsplashSelect = async (photo: UnsplashResult) => {
    // Fire download tracking (Unsplash requirement) — best-effort
    fetch('/api/unsplash-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ downloadLocation: photo.downloadLocation }),
    }).catch(() => {})
    onSelect(photo.regularUrl)
    onClose()
  }

  const handleFileUpload = async (file: File) => {
    if (!companyId) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) { alert('Máx 10 MB'); return }
    setUploading(true)
    try {
      const supabase = getSupabase()
      const ext  = file.name.split('.').pop()
      const path = `${companyId}/uploads/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('media-library').upload(path, file)
      if (upErr) throw upErr
      const url = supabase.storage.from('media-library').getPublicUrl(path).data.publicUrl
      // Save to media_library table
      await supabase.from('media_library').insert({
        company_id: companyId, url, category: 'brand', description: null,
      })
      onSelect(url)
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Trocar imagem</h2>
            <p className="text-xs text-gray-400 mt-0.5">Slide {slideIndex + 1}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {[
            { id: 'library' as const,  label: 'Minha biblioteca', icon: ImageIcon },
            { id: 'unsplash' as const, label: 'Buscar no Unsplash', icon: Search },
            { id: 'upload' as const,   label: 'Upload novo', icon: Upload },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Tab 1: Library ── */}
          {tab === 'library' && (
            <div className="space-y-4">
              {/* Category filter */}
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setCatFilter(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      catFilter === c.value
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>

              {loadingLib ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="text-purple-500 animate-spin" />
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  {catFilter ? 'Sem fotos nesta categoria' : 'Nenhuma foto na biblioteca'}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {filteredMedia.map(m => (
                    <button key={m.id}
                      onClick={() => { onSelect(m.url); onClose() }}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-purple-500 transition-all group">
                      <Image src={m.url} alt={m.description ?? m.category} fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Check size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded capitalize">
                        {m.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 2: Unsplash ── */}
          {tab === 'unsplash' && (
            <div className="space-y-4">
              <form onSubmit={handleUnsplashSearch} className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Ex: business success, teamwork, marketing"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                />
                <button type="submit" disabled={searching}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)' }}>
                  {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Buscar
                </button>
              </form>

              {searching ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="text-purple-500 animate-spin" />
                </div>
              ) : unsplashRes.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  {query ? 'Nenhum resultado. Tente outra busca.' : 'Digite um termo para buscar fotos'}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {unsplashRes.map(p => (
                      <button key={p.id}
                        onClick={() => handleUnsplashSelect(p)}
                        className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-purple-500 transition-all group">
                        <Image src={p.thumbUrl} alt={`Photo by ${p.photographer}`} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <Check size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white truncate">{p.photographer}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    Fotos por{' '}
                    <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="underline">Unsplash</a>
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Tab 3: Upload ── */}
          {tab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all"
              >
                {uploading ? (
                  <Loader2 size={32} className="text-purple-500 animate-spin mx-auto mb-3" />
                ) : (
                  <Upload size={32} className="text-gray-300 mx-auto mb-3" />
                )}
                <p className="text-sm font-medium text-gray-700">
                  {uploading ? 'Enviando...' : 'Clique ou arraste uma imagem aqui'}
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WebP — máx 10 MB</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
              />
              <p className="text-xs text-gray-400 text-center">
                A foto será salva na sua biblioteca de mídia e aplicada ao slide
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
