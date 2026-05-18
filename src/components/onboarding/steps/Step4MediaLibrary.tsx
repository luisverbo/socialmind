'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { StepProps } from '@/types/onboarding'
import { supabase } from '@/lib/supabase'
import { Camera, X, Plus } from 'lucide-react'

type Category = 'testimony' | 'product' | 'team' | 'structure' | 'brand'

interface MediaItem {
  id: string
  url: string
  category: Category
  description: string
  uploading?: boolean
}

const CATEGORIES: { value: Category; label: string; emoji: string; hint: string }[] = [
  { value: 'testimony',  label: 'Depoimentos', emoji: '💬', hint: 'Fotos de clientes satisfeitos' },
  { value: 'product',   label: 'Produtos',     emoji: '📦', hint: 'Seus produtos e serviços' },
  { value: 'team',      label: 'Equipe',       emoji: '👥', hint: 'Sua equipe e bastidores' },
  { value: 'structure', label: 'Estrutura',    emoji: '🏢', hint: 'Espaço físico e ambiente' },
  { value: 'brand',     label: 'Marca',        emoji: '✨', hint: 'Elementos da sua identidade' },
]

export default function Step4MediaLibrary({ state, updateState, onNext, onBack, loading }: StepProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [activeCategory, setActiveCategory] = useState<Category>('product')
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (files: FileList) => {
    if (!state.companyId) { setError('Salve a etapa anterior primeiro.'); return }
    setError(null)

    const newItems: MediaItem[] = Array.from(files).map(file => ({
      id: `tmp-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      category: activeCategory,
      description: '',
      uploading: true,
    }))

    setItems(prev => [...prev, ...newItems])

    await Promise.all(
      Array.from(files).map(async (file, i) => {
        const tmpId = newItems[i].id
        try {
          if (!file.type.startsWith('image/')) throw new Error('Apenas imagens')
          if (file.size > 10 * 1024 * 1024) throw new Error('Máx 10 MB por foto')

          const ext = file.name.split('.').pop()
          const path = `${state.companyId}/${activeCategory}/${Date.now()}-${i}.${ext}`
          const { error: upErr } = await supabase.storage.from('media-library').upload(path, file)
          if (upErr) throw upErr

          const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(path)
          const publicUrl = urlData.publicUrl

          const { data: dbRow, error: dbErr } = await supabase
            .from('media_library')
            .insert({ company_id: state.companyId, url: publicUrl, category: activeCategory, description: '' })
            .select('id')
            .single()
          if (dbErr) throw dbErr

          setItems(prev => prev.map(it =>
            it.id === tmpId ? { ...it, id: dbRow.id, url: publicUrl, uploading: false } : it
          ))
        } catch (e: unknown) {
          setItems(prev => prev.filter(it => it.id !== tmpId))
          setError(e instanceof Error ? e.message : 'Erro no upload')
        }
      })
    )
  }

  const updateDescription = async (id: string, description: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, description } : it))
    if (!id.startsWith('tmp-')) {
      await supabase.from('media_library').update({ description }).eq('id', id)
    }
  }

  const removeItem = async (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id))
    if (!id.startsWith('tmp-')) {
      await supabase.from('media_library').delete().eq('id', id)
    }
  }

  const categoryItems = items.filter(it => it.category === activeCategory)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[#6C3FE8] text-sm font-medium mb-2">
          <Camera size={16} />
          <span>Etapa 4 de 5</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Biblioteca de mídia</h1>
        <p className="text-gray-400 text-sm mt-1">Adicione fotos categorizadas. A IA as usará nos carrosséis.</p>
      </div>

      {/* Categorias */}
      <div className="card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Categorias</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => {
            const count = items.filter(it => it.category === cat.value).length
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  activeCategory === cat.value
                    ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${activeCategory === cat.value ? 'gradient-bg text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="form-hint">{CATEGORIES.find(c => c.value === activeCategory)?.hint}</p>
      </div>

      {/* Upload area */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {CATEGORIES.find(c => c.value === activeCategory)?.emoji}{' '}
            {CATEGORIES.find(c => c.value === activeCategory)?.label}
          </h2>
          <label className="btn-primary px-3 py-2 text-xs cursor-pointer">
            <Plus size={14} />
            Adicionar fotos
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files && handleUpload(e.target.files)}
            />
          </label>
        </div>

        {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {categoryItems.length === 0 ? (
          <label className="block w-full border-2 border-dashed border-gray-200 hover:border-[#6C3FE8] rounded-xl p-10 text-center cursor-pointer transition-all group">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gray-50 group-hover:bg-[#F8F7FF] flex items-center justify-center transition-all">
                <Camera size={24} className="text-gray-400 group-hover:text-[#6C3FE8] transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 group-hover:text-[#1A1A2E] transition-colors">
                  Arraste fotos ou clique para selecionar
                </p>
                <p className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP até 10 MB cada</p>
              </div>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files && handleUpload(e.target.files)}
            />
          </label>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categoryItems.map(item => (
              <div key={item.id} className="group relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                <div className="aspect-square relative">
                  <Image src={item.url} alt="" fill className="object-cover" />
                  {item.uploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="w-6 h-6 spinner" />
                    </div>
                  )}
                  {!item.uploading && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex transition-all"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  )}
                </div>
                <div className="p-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateDescription(item.id, e.target.value)}
                    placeholder="Descrição (opcional)"
                    className="w-full bg-transparent text-gray-500 text-xs placeholder-gray-300 focus:outline-none focus:text-[#1A1A2E] transition-colors"
                  />
                </div>
              </div>
            ))}

            <label className="aspect-square border-2 border-dashed border-gray-200 hover:border-[#6C3FE8] rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group">
              <Plus size={20} className="text-gray-300 group-hover:text-[#6C3FE8] transition-colors" />
              <span className="text-xs text-gray-300 group-hover:text-[#6C3FE8] mt-1 transition-colors">Mais</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files && handleUpload(e.target.files)}
              />
            </label>
          </div>
        )}
      </div>

      {/* Resumo */}
      {items.length > 0 && (
        <div className="card p-4">
          <p className="text-xs text-gray-400 font-medium mb-3">Resumo da biblioteca</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const count = items.filter(it => it.category === cat.value).length
              if (!count) return null
              return (
                <span key={cat.value} className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">
                  {cat.emoji} {cat.label}: <strong className="text-[#1A1A2E]">{count}</strong>
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 sm:flex-none sm:w-32 py-4">
          ← Voltar
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="btn-primary flex-1 py-4"
        >
          {loading ? (
            <><div className="w-4 h-4 spinner" /> Salvando...</>
          ) : items.length > 0 ? `Continuar com ${items.length} foto${items.length > 1 ? 's' : ''} →` : 'Pular e continuar →'}
        </button>
      </div>
    </div>
  )
}
