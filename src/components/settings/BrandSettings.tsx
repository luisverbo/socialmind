'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useCompany } from '@/hooks/useCompany'
import { Palette, Upload, X, Check, Loader2 } from 'lucide-react'

const COLOR_LABELS = [
  { key: 'primary'   as const, label: 'Cor primária',   hint: 'Cor principal da marca' },
  { key: 'secondary' as const, label: 'Cor secundária', hint: 'Cor de apoio' },
  { key: 'accent'    as const, label: 'Destaque',        hint: 'Botões e CTAs' },
]

const SLIDE_STYLES = [
  { value: 'moderno',      label: 'Moderno',      emoji: '✨' },
  { value: 'minimalista',  label: 'Minimalista',  emoji: '◻️' },
  { value: 'colorido',     label: 'Colorido',     emoji: '🌈' },
  { value: 'corporativo',  label: 'Corporativo',  emoji: '💼' },
]

interface BrandColors { primary: string; secondary: string; accent: string }

export default function BrandSettings() {
  const { companyId } = useCompany()
  const fileRef = useRef<HTMLInputElement>(null)

  const [colors, setColors]       = useState<BrandColors>({ primary: '#6C3FE8', secondary: '#E84393', accent: '#A855F7' })
  const [slideStyle, setStyle]    = useState('moderno')
  const [logoUrl, setLogoUrl]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [loaded, setLoaded]       = useState(false)

  useEffect(() => {
    if (!companyId) return
    supabase.from('company_context').select('brand_colors, slide_style, logo_url').eq('company_id', companyId).single()
      .then(({ data }) => {
        if (data) {
          if (data.brand_colors) setColors(data.brand_colors as BrandColors)
          if (data.slide_style)  setStyle(data.slide_style)
          if (data.logo_url)     setLogoUrl(data.logo_url)
        }
        setLoaded(true)
      })
  }, [companyId])

  const handleSave = async () => {
    if (!companyId) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('company_context')
      .update({ brand_colors: colors, slide_style: slideStyle, logo_url: logoUrl || null })
      .eq('company_id', companyId)
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Envie apenas imagens (JPG, PNG, SVG, WEBP)'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5 MB'); return }
    setError('')
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${companyId}/logo-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    setLogoUrl(urlData.publicUrl)
    setUploading(false)
  }

  if (!loaded) {
    return (
      <div className="card p-6 flex items-center justify-center py-12">
        <div className="w-6 h-6 spinner" />
      </div>
    )
  }

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Palette size={16} className="text-[#6C3FE8]" />
        <h2 className="text-sm font-semibold text-[#1A1A2E]">Identidade Visual</h2>
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cores da marca</p>
        <div className="grid grid-cols-3 gap-3">
          {COLOR_LABELS.map(({ key, label, hint }) => (
            <div key={key} className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1A1A2E]">{label}</label>
              <p className="text-[11px] text-gray-400">{hint}</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                <label className="relative w-9 h-9 rounded-lg cursor-pointer overflow-hidden flex-shrink-0 border border-gray-200">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={e => setColors(c => ({ ...c, [key]: e.target.value }))}
                    className="absolute inset-0 w-full h-full cursor-pointer"
                  />
                  <div className="w-full h-full rounded-lg" style={{ backgroundColor: colors[key] }} />
                </label>
                <input
                  type="text"
                  value={colors[key]}
                  onChange={e => {
                    const v = e.target.value
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColors(c => ({ ...c, [key]: v }))
                  }}
                  className="flex-1 text-xs font-mono bg-transparent border-none outline-none text-gray-600 w-0 min-w-0"
                  maxLength={7}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: colors.primary }} />
          <div className="flex-1 h-2.5 rounded-full" style={{ backgroundColor: colors.secondary }} />
          <div className="w-16 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: colors.accent }} />
        </div>
      </div>

      {/* Slide style */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estilo dos slides</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SLIDE_STYLES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStyle(s.value)}
              className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                slideStyle === s.value
                  ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8] font-semibold'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="mr-1.5">{s.emoji}</span>{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logo */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Logo</p>
        {logoUrl ? (
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
              <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Logo atual</p>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="text-xs text-[#6C3FE8] hover:underline">Trocar</button>
                <span className="text-gray-300">·</span>
                <button onClick={() => setLogoUrl('')} className="text-xs text-red-500 hover:underline">Remover</button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 hover:border-[#6C3FE8]/40 hover:text-[#6C3FE8] transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Enviando...' : 'Enviar logo (JPG, PNG, SVG — máx 5 MB)'}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full"
      >
        {saving  ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> :
         saved   ? <><Check size={15} /> Salvo com sucesso!</> :
                   'Salvar identidade visual'}
      </button>
    </div>
  )
}
