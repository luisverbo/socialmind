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
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
          <Camera size={16} />
          <span>Etapa 4 de 5</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Biblioteca de mídia</h1>
        <p className="text-gray-400 text-sm mt-1">Adicione fotos categorizadas. A IA as usará nos carrosséis.</p>
      </div>

      {/* Categorias */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Categorias</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => {
            const count = items.filter(it => it.category === cat.value).length
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  activeCategory === cat.value
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeCategory === cat.value ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Hint da categoria ativa */}
        <p className="text-xs text-gray-500">
          {CATEGORIES.find(c => c.value === activeCategory)?.hint}
        </p>
      </div>

      {/* Upload area */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            {CATEGORIES.find(c => c.value === activeCategory)?.emoji}{' '}
            {CATEGORIES.find(c => c.value === activeCategory)?.label}
          </h2>
          <label className="flex items-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
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

        {error && <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">{error}</p>}

        {categoryItems.length === 0 ? (
          <label className="block w-full border-2 border-dashed border-gray-700 hover:border-emerald-500 rounded-xl p-10 text-center cursor-pointer transition-all group">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gray-800 group-hover:bg-emerald-600/20 flex items-center justify-center transition-all">
                <Camera size={24} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                  Arraste fotos ou clique para selecionar
                </p>
                <p className="text-xs text-gray-600 mt-1">JPG, PNG, WEBP até 10 MB cada</p>
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
              <div key={item.id} className="group relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                <div className="aspect-square relative">
                  <Image src={item.url} alt="" fill className="object-cover" />
                  {item.uploading && (
                    <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                      <svg className="animate-spin w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
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
                    className="w-full bg-transparent text-gray-400 text-xs placeholder-gray-600 focus:outline-none focus:text-gray-200 transition-colors"
                  />
                </div>
              </div>
            ))}

            {/* Add more */}
            <label className="aspect-square border-2 border-dashed border-gray-700 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group">
              <Plus size={20} className="text-gray-600 group-hover:text-emerald-400 transition-colors" />
              <span className="text-xs text-gray-600 group-hover:text-emerald-400 mt-1 transition-colors">Mais</span>
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
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-medium mb-3">Resumo da biblioteca</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const count = items.filter(it => it.category === cat.value).length
              if (!count) return null
              return (
                <span key={cat.value} className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300">
                  {cat.emoji} {cat.label}: <strong className="text-white">{count}</strong>
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 sm:flex-none sm:w-32 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-4 rounded-xl transition-all border border-gray-700"
        >
          ← Voltar
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Salvando...
            </>
          ) : items.length > 0 ? `Continuar com ${items.length} foto${items.length > 1 ? 's' : ''} →` : 'Pular e continuar →'}
        </button>
      </div>
    </div>
  )
}
