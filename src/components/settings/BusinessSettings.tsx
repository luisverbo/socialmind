'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCompany } from '@/hooks/useCompany'

export default function BusinessSettings() {
  const { companyId } = useCompany()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [form, setForm] = useState({
    business_name:   '',
    niche:           '',
    city:            '',
    what_sells:      '',
    target_audience: '',
    differentials:   '',
    tone_of_voice:   '',
    forbidden_words: '',
    post_examples:   '',
  })

  useEffect(() => {
    if (!companyId) return
    supabase
      .from('company_context')
      .select('business_name,niche,city,what_sells,target_audience,differentials,tone_of_voice,forbidden_words,post_examples')
      .eq('company_id', companyId)
      .single()
      .then(({ data }) => {
        if (data) setForm({
          business_name:   data.business_name   ?? '',
          niche:           data.niche           ?? '',
          city:            data.city            ?? '',
          what_sells:      data.what_sells      ?? '',
          target_audience: data.target_audience ?? '',
          differentials:   data.differentials   ?? '',
          tone_of_voice:   data.tone_of_voice   ?? '',
          forbidden_words: data.forbidden_words ?? '',
          post_examples:   data.post_examples   ?? '',
        })
        setLoading(false)
      })
  }, [companyId])

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const save = async () => {
    if (!companyId) return
    setSaving(true)
    await supabase
      .from('company_context')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div className="card p-6 flex items-center justify-center">
      <Loader2 size={20} className="animate-spin text-gray-300" />
    </div>
  )

  return (
    <div className="card p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Nome do negócio</label>
          <input className="input-field" value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="ex: Studio Beleza da Ana" />
        </div>
        <div>
          <label className="form-label">Nicho</label>
          <input className="input-field" value={form.niche} onChange={e => set('niche', e.target.value)} placeholder="ex: Salão de beleza, Coach, E-commerce" />
        </div>
        <div>
          <label className="form-label">Cidade</label>
          <input className="input-field" value={form.city} onChange={e => set('city', e.target.value)} placeholder="ex: São Paulo - SP" />
        </div>
        <div>
          <label className="form-label">O que vende</label>
          <input className="input-field" value={form.what_sells} onChange={e => set('what_sells', e.target.value)} placeholder="ex: Cortes, coloração, tratamentos capilares" />
        </div>
      </div>

      <div>
        <label className="form-label">Público-alvo</label>
        <input className="input-field" value={form.target_audience} onChange={e => set('target_audience', e.target.value)} placeholder="ex: Mulheres 25-45 anos que querem se sentir bem" />
      </div>

      <div>
        <label className="form-label">Diferenciais</label>
        <textarea className="textarea-field" rows={2} value={form.differentials} onChange={e => set('differentials', e.target.value)} placeholder="ex: Produtos veganos, atendimento personalizado, ambiente exclusivo" />
      </div>

      <div>
        <label className="form-label">Tom de voz</label>
        <input className="input-field" value={form.tone_of_voice} onChange={e => set('tone_of_voice', e.target.value)} placeholder="ex: Próximo, feminino, inspirador e sem jargões técnicos" />
      </div>

      <div>
        <label className="form-label">Palavras proibidas <span className="text-gray-400 font-normal">(separadas por vírgula)</span></label>
        <input className="input-field" value={form.forbidden_words} onChange={e => set('forbidden_words', e.target.value)} placeholder="ex: barato, promoção, desconto" />
      </div>

      <div>
        <label className="form-label">Exemplos de posts que você gosta <span className="text-gray-400 font-normal">(opcional)</span></label>
        <textarea className="textarea-field" rows={3} value={form.post_examples} onChange={e => set('post_examples', e.target.value)} placeholder="Cole aqui legendas ou textos de posts que representam o estilo que você quer..." />
        <p className="form-hint">A IA usará esses exemplos como referência de estilo e tom.</p>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full py-3">
        {saving ? (
          <><Loader2 size={16} className="animate-spin" /> Salvando...</>
        ) : saved ? (
          '✓ Salvo!'
        ) : (
          <><Save size={16} /> Salvar alterações</>
        )}
      </button>
    </div>
  )
}
