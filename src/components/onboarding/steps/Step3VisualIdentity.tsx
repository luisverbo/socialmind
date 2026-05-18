'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import type { StepProps } from '@/types/onboarding'
import { supabase } from '@/lib/supabase'
import { Palette, Upload, X } from 'lucide-react'

const SLIDE_STYLES = [
  { value: 'moderno',      label: 'Moderno',      emoji: '✨', description: 'Arrojado, tipografia grande, cores vibrantes' },
  { value: 'minimalista', label: 'Minimalista',  emoji: '◻️', description: 'Limpo, espaços em branco, elegante' },
  { value: 'colorido',    label: 'Colorido',     emoji: '🌈', description: 'Cheio de cor, alegre e chamativo' },
  { value: 'corporativo', label: 'Corporativo',  emoji: '💼', description: 'Sério, estruturado, confiável' },
]

const COLOR_LABELS = [
  { key: 'primary'   as const, label: 'Cor primária',   hint: 'Cor principal da marca' },
  { key: 'secondary' as const, label: 'Cor secundária', hint: 'Cor de apoio' },
  { key: 'accent'    as const, label: 'Destaque',        hint: 'Botões, CTAs' },
]

export default function Step3VisualIdentity({ state, updateState, onNext, onBack, loading }: StepProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Envie apenas imagens (JPG, PNG, SVG, WEBP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('O arquivo deve ter no máximo 5 MB')
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${state.companyId ?? 'tmp'}/logo-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
      updateState({ logoUrl: urlData.publicUrl })
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = () => updateState({ logoUrl: '' })

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[#6C3FE8] text-sm font-medium mb-2">
          <Palette size={16} />
          <span>Etapa 3 de 5</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Identidade visual</h1>
        <p className="text-gray-400 text-sm mt-1">Cores e estilo que definem sua marca nos slides.</p>
      </div>

      {/* Cores da marca */}
      <div className="card p-6 space-y-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cores da marca</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COLOR_LABELS.map(({ key, label, hint }) => (
            <div key={key} className="space-y-2">
              <label className="block text-sm font-medium text-[#1A1A2E]">{label}</label>
              <p className="form-hint">{hint}</p>
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                <label className="relative w-10 h-10 rounded-lg cursor-pointer overflow-hidden flex-shrink-0 shadow-inner border border-gray-200">
                  <input
                    type="color"
                    value={state.brandColors[key]}
                    onChange={e => updateState({ brandColors: { ...state.brandColors, [key]: e.target.value } })}
                    className="absolute inset-0 w-full h-full cursor-pointer"
                  />
                  <div className="w-full h-full rounded-lg" style={{ backgroundColor: state.brandColors[key] }} />
                </label>
                <input
                  type="text"
                  value={state.brandColors[key]}
                  onChange={e => {
                    const v = e.target.value
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                      updateState({ brandColors: { ...state.brandColors, [key]: v } })
                    }
                  }}
                  className="flex-1 bg-transparent text-gray-600 text-sm font-mono focus:outline-none w-0"
                  maxLength={7}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-xs text-gray-400">Preview das cores</p>
          </div>
          <div className="p-4 flex items-center gap-3 bg-white">
            <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: state.brandColors.primary }} />
            <div className="flex-1 h-3 rounded-full" style={{ backgroundColor: state.brandColors.secondary }} />
            <div
              className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold"
              style={{ backgroundColor: state.brandColors.accent }}
            >
              Ver mais
            </div>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Logo da marca</h2>

        {state.logoUrl ? (
          <div className="relative inline-flex">
            <div className="w-32 h-32 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
              <Image src={state.logoUrl} alt="Logo" width={120} height={120} className="object-contain max-w-full max-h-full p-2" />
            </div>
            <button
              onClick={removeLogo}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X size={12} className="text-white" />
            </button>
          </div>
        ) : (
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-gray-200 hover:border-[#6C3FE8] rounded-xl p-8 flex flex-col items-center gap-3 transition-all group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-[#F8F7FF] flex items-center justify-center transition-all">
                {uploading ? (
                  <div className="w-5 h-5 spinner" />
                ) : (
                  <Upload size={20} className="text-gray-400 group-hover:text-[#6C3FE8] transition-colors" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 group-hover:text-[#1A1A2E] transition-colors">
                  {uploading ? 'Enviando...' : 'Clique para enviar seu logo'}
                </p>
                <p className="text-xs text-gray-300 mt-1">PNG, JPG, SVG até 5 MB</p>
              </div>
            </button>
            {uploadError && <p className="form-error mt-2">{uploadError}</p>}
          </div>
        )}
      </div>

      {/* Estilo dos slides */}
      <div className="card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estilo dos slides</h2>
        <div className="grid grid-cols-2 gap-3">
          {SLIDE_STYLES.map(style => (
            <button
              key={style.value}
              type="button"
              onClick={() => updateState({ slideStyle: style.value })}
              className={`text-left p-4 rounded-xl border transition-all ${
                state.slideStyle === style.value
                  ? 'bg-[#F8F7FF] border-[#6C3FE8] shadow-brand-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{style.emoji}</span>
                <span className={`font-semibold text-sm ${state.slideStyle === style.value ? 'text-[#6C3FE8]' : 'text-[#1A1A2E]'}`}>
                  {style.label}
                </span>
                {state.slideStyle === style.value && <span className="ml-auto text-[#6C3FE8] text-xs">✓</span>}
              </div>
              <p className="text-xs text-gray-400">{style.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 sm:flex-none sm:w-32 py-4">
          ← Voltar
        </button>
        <button
          onClick={onNext}
          disabled={loading || uploading}
          className="btn-primary flex-1 py-4"
        >
          {loading ? (
            <><div className="w-4 h-4 spinner" /> Salvando...</>
          ) : 'Próxima etapa →'}
        </button>
      </div>
    </div>
  )
}
