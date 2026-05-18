'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useCompany } from '@/hooks/useCompany'
import { Camera, Plus, X, Trash2, Loader2 } from 'lucide-react'

type Category = 'testimony' | 'product' | 'team' | 'structure' | 'brand'

interface MediaItem {
  id: string
  url: string
  category: Category
  description: string | null
  created_at: string
}

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'testimony',  label: 'Depoimentos', emoji: '💬' },
  { value: 'product',    label: 'Produtos',     emoji: '📦' },
  { value: 'team',       label: 'Equipe',       emoji: '👥' },
  { value: 'structure',  label: 'Estrutura',    emoji: '🏢' },
  { value: 'brand',      label: 'Marca',        emoji: '✨' },
]

export default function MediaPage() {
  const { companyId } = useCompany()
  const [items,    setItems]    = useState<MediaItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [category, setCategory] = useState<Category | ''>('')
  const [uploading, setUploading] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    let q = supabase.from('media_library').select('*').eq('company_id', companyId)
    if (category) q = q.eq('category', category)
    q = q.order('created_at', { ascending: false })
    const { data } = await q
    setItems((data ?? []) as MediaItem[])
    setLoading(false)
  }, [companyId, category])

  useEffect(() => { load() }, [load])

  const handleUpload = async (files: FileList, cat: Category) => {
    if (!companyId) return
    setError(null)
    setUploading(true)

    for (const file of Array.from(files)) {
      try {
        if (!file.type.startsWith('image/')) throw new Error('Apenas imagens')
        if (file.size > 10 * 1024 * 1024) throw new Error('Máx 10 MB')

        const ext  = file.name.split('.').pop()
        const path = `${companyId}/${cat}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('media-library').upload(path, file)
        if (upErr) throw upErr

        const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(path)
        const { data: row, error: dbErr } = await supabase
          .from('media_library')
          .insert({ company_id: companyId, url: urlData.publicUrl, category: cat, description: '' })
          .select('*').single()
        if (dbErr) throw dbErr
        setItems(prev => [row as MediaItem, ...prev])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro no upload')
      }
    }
    setUploading(false)
  }

  const remove = async (item: MediaItem) => {
    if (!confirm('Deletar esta imagem?')) return
    setItems(prev => prev.filter(i => i.id !== item.id))
    await supabase.from('media_library').delete().eq('id', item.id)
  }

  const updateDesc = async (id: string, description: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, description } : i))
    await supabase.from('media_library').update({ description }).eq('id', id)
  }

  const activeCategory = (category || 'product') as Category

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A2E]">Biblioteca de Mídia</h1>
          <p className="text-xs text-gray-400 mt-0.5">{items.length} foto{items.length !== 1 ? 's' : ''} cadastrada{items.length !== 1 ? 's' : ''}</p>
        </div>
        <label className="btn-primary px-4 py-2.5 text-sm cursor-pointer">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Adicionar fotos
          <input
            type="file" multiple accept="image/*" className="hidden"
            onChange={e => e.target.files && handleUpload(e.target.files, activeCategory)}
          />
        </label>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
            category === ''
              ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          Todas
          {!category && <span className="text-xs px-1.5 py-0.5 rounded-full gradient-bg text-white font-bold">{items.length}</span>}
        </button>
        {CATEGORIES.map(cat => {
          const cnt = items.filter(i => i.category === cat.value).length
          return (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                category === cat.value
                  ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              {cnt > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${category === cat.value ? 'gradient-bg text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {cnt}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-2"><div className="h-3 bg-gray-100 rounded w-3/4" /></div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <label className="block w-full border-2 border-dashed border-gray-200 hover:border-[#6C3FE8] rounded-2xl p-16 text-center cursor-pointer transition-all group">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gray-50 group-hover:bg-[#F8F7FF] flex items-center justify-center transition-all">
              <Camera size={24} className="text-gray-400 group-hover:text-[#6C3FE8] transition-colors" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-[#1A1A2E]">Nenhuma foto ainda</p>
              <p className="text-xs text-gray-300 mt-1">Clique para adicionar imagens</p>
            </div>
          </div>
          <input type="file" multiple accept="image/*" className="hidden"
            onChange={e => e.target.files && handleUpload(e.target.files, activeCategory)} />
        </label>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="card overflow-hidden group">
              <div className="relative aspect-square bg-gray-100">
                <Image src={item.url} alt="" fill className="object-cover" />
                <button
                  onClick={() => remove(item)}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex transition-all hover:bg-red-600"
                >
                  <X size={12} className="text-white" />
                </button>
                <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-md">
                  {CATEGORIES.find(c => c.value === item.category)?.emoji} {CATEGORIES.find(c => c.value === item.category)?.label}
                </span>
              </div>
              <div className="p-2">
                <input
                  type="text"
                  value={item.description ?? ''}
                  onChange={e => updateDesc(item.id, e.target.value)}
                  placeholder="Descrição…"
                  className="w-full bg-transparent text-gray-500 text-xs placeholder-gray-300 focus:outline-none"
                />
              </div>
            </div>
          ))}

          {/* Add more tile */}
          <label className="aspect-square border-2 border-dashed border-gray-200 hover:border-[#6C3FE8] rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group">
            {uploading
              ? <Loader2 size={20} className="text-[#6C3FE8] animate-spin" />
              : <Plus size={20} className="text-gray-300 group-hover:text-[#6C3FE8] transition-colors" />
            }
            <span className="text-xs text-gray-300 group-hover:text-[#6C3FE8] mt-1">Mais</span>
            <input type="file" multiple accept="image/*" className="hidden"
              onChange={e => e.target.files && handleUpload(e.target.files, activeCategory)} />
          </label>
        </div>
      )}
    </div>
  )
}
