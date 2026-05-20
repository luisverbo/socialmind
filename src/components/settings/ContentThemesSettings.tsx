'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useCompany } from '@/hooks/useCompany'
import { Plus, Pencil, Trash2, Check, X, BookOpen } from 'lucide-react'

const TONE_OPTS = [
  { value: 'educational',  label: 'Educativo',    emoji: '📚' },
  { value: 'motivational', label: 'Motivacional', emoji: '🔥' },
  { value: 'promotional',  label: 'Promocional',  emoji: '🛍️' },
] as const

const SLIDES_OPTS = [5, 7, 10] as const

type Tone = 'educational' | 'motivational' | 'promotional'

interface Theme {
  id:          string
  theme_name:  string
  tone:        Tone
  slides_count: number
}

interface EditState {
  theme_name:  string
  tone:        Tone
  slides_count: number
}

const emptyEdit = (): EditState => ({ theme_name: '', tone: 'educational', slides_count: 7 })

export default function ContentThemesSettings() {
  const { companyId } = useCompany()
  const [themes,    setThemes]    = useState<Theme[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)   // id being edited, or 'new'
  const [editState, setEditState] = useState<EditState>(emptyEdit())
  const [saving,    setSaving]    = useState(false)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase
      .from('content_themes')
      .select('id, theme_name, tone, slides_count')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
    setThemes((data ?? []) as Theme[])
    setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load])

  const startNew = () => {
    setEditingId('new')
    setEditState(emptyEdit())
    setDeleteId(null)
  }

  const startEdit = (t: Theme) => {
    setEditingId(t.id)
    setEditState({ theme_name: t.theme_name, tone: t.tone, slides_count: t.slides_count })
    setDeleteId(null)
  }

  const cancelEdit = () => { setEditingId(null); setEditState(emptyEdit()) }

  const handleSave = async () => {
    if (!companyId || !editState.theme_name.trim()) return
    setSaving(true)

    if (editingId === 'new') {
      await supabase.from('content_themes').insert({
        company_id:  companyId,
        theme_name:  editState.theme_name.trim(),
        tone:        editState.tone,
        slides_count: editState.slides_count,
      })
    } else {
      await supabase.from('content_themes').update({
        theme_name:  editState.theme_name.trim(),
        tone:        editState.tone,
        slides_count: editState.slides_count,
      }).eq('id', editingId!)
    }

    setSaving(false)
    setEditingId(null)
    setEditState(emptyEdit())
    await load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('content_themes').delete().eq('id', id)
    setDeleteId(null)
    await load()
  }

  const TONE_MAP = Object.fromEntries(TONE_OPTS.map(t => [t.value, t]))

  if (loading) {
    return (
      <div className="card p-5 animate-pulse space-y-3">
        {[1, 2].map(i => <div key={i} className="h-14 bg-gray-50 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="card divide-y divide-gray-50">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1A1A2E]">Meus temas</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {themes.length === 0 ? 'Nenhum tema ainda' : `${themes.length} tema${themes.length > 1 ? 's' : ''} cadastrado${themes.length > 1 ? 's' : ''}`}
          </p>
        </div>
        {editingId !== 'new' && (
          <button
            onClick={startNew}
            className="btn-primary px-3 py-2 text-xs flex items-center gap-1.5"
          >
            <Plus size={13} />
            Novo tema
          </button>
        )}
      </div>

      {/* New theme form */}
      {editingId === 'new' && (
        <ThemeForm
          state={editState}
          onChange={setEditState}
          onSave={handleSave}
          onCancel={cancelEdit}
          saving={saving}
          isNew
        />
      )}

      {/* Theme list */}
      {themes.length === 0 && editingId !== 'new' && (
        <div className="px-5 py-10 text-center space-y-3">
          <BookOpen size={32} className="mx-auto text-gray-200" />
          <p className="text-sm text-gray-400">Crie temas para organizar seu conteúdo</p>
          <button onClick={startNew} className="btn-primary px-4 py-2 text-xs">
            <Plus size={13} /> Criar primeiro tema
          </button>
        </div>
      )}

      {themes.map(theme => (
        <div key={theme.id}>
          {editingId === theme.id ? (
            <ThemeForm
              state={editState}
              onChange={setEditState}
              onSave={handleSave}
              onCancel={cancelEdit}
              saving={saving}
            />
          ) : (
            <div className="px-5 py-3.5 flex items-center gap-3">
              {/* Tone emoji */}
              <span className="text-lg flex-shrink-0">{TONE_MAP[theme.tone]?.emoji}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A2E] truncate">{theme.theme_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {TONE_MAP[theme.tone]?.label} · {theme.slides_count} slides
                </p>
              </div>

              {/* Actions */}
              {deleteId === theme.id ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">Excluir?</span>
                  <button
                    onClick={() => handleDelete(theme.id)}
                    className="px-2.5 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setDeleteId(null)}
                    className="px-2.5 py-1.5 text-gray-400 text-xs rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(theme)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => setDeleteId(theme.id)}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Footer tip */}
      {themes.length > 0 && (
        <div className="px-5 py-3 bg-[#F8F7FF]/60">
          <p className="text-xs text-gray-400">
            💡 Os temas aparecem na grade semanal, no modal "Gerar post" e nos agendamentos.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Inline form (shared by new + edit) ──────────────────────────────────────

function ThemeForm({
  state,
  onChange,
  onSave,
  onCancel,
  saving,
  isNew = false,
}: {
  state:    EditState
  onChange: (s: EditState) => void
  onSave:   () => void
  onCancel: () => void
  saving:   boolean
  isNew?:   boolean
}) {
  const set = (patch: Partial<EditState>) => onChange({ ...state, ...patch })

  return (
    <div className="px-5 py-4 bg-[#F8F7FF]/40 space-y-3 border-l-2 border-[#6C3FE8]/30">
      <p className="text-xs font-semibold text-[#6C3FE8]">
        {isNew ? '+ Novo tema' : 'Editar tema'}
      </p>

      {/* Name */}
      <input
        type="text"
        value={state.theme_name}
        onChange={e => set({ theme_name: e.target.value })}
        onKeyDown={e => e.key === 'Enter' && onSave()}
        placeholder="ex: Mitos e Verdades, Dicas Práticas…"
        autoFocus
        className="input-field text-sm"
      />

      {/* Tone */}
      <div className="flex gap-2">
        {TONE_OPTS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => set({ tone: opt.value })}
            className={`flex-1 py-2 rounded-xl border text-center text-xs transition-all ${
              state.tone === opt.value
                ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8] font-semibold'
                : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>

      {/* Slides count */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 flex-shrink-0">Slides padrão:</span>
        <div className="flex gap-1.5">
          {SLIDES_OPTS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => set({ slides_count: n })}
              className={`w-9 h-9 rounded-lg border text-xs font-bold transition-all ${
                state.slides_count === n
                  ? 'bg-[#F8F7FF] border-[#6C3FE8] text-[#6C3FE8]'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving || !state.theme_name.trim()}
          className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
        >
          <Check size={13} />
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-xs text-gray-400 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-1.5"
        >
          <X size={13} />
          Cancelar
        </button>
      </div>
    </div>
  )
}
