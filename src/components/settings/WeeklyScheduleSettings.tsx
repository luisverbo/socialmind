'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useCompany } from '@/hooks/useCompany'
import { Calendar, CheckCircle2, Circle, ChevronDown } from 'lucide-react'
import type { ContentTheme } from '@/types/scheduling'

const DAYS = [
  { dow: 1, label: 'Segunda',   short: 'Seg' },
  { dow: 2, label: 'Terça',     short: 'Ter' },
  { dow: 3, label: 'Quarta',    short: 'Qua' },
  { dow: 4, label: 'Quinta',    short: 'Qui' },
  { dow: 5, label: 'Sexta',     short: 'Sex' },
  { dow: 6, label: 'Sábado',    short: 'Sab' },
  { dow: 0, label: 'Domingo',   short: 'Dom' },
]

const TONE_OPTS = [
  { value: 'educational',  label: 'Educativo',    emoji: '📚' },
  { value: 'motivational', label: 'Motivacional', emoji: '🔥' },
  { value: 'promotional',  label: 'Promocional',  emoji: '🛍️' },
] as const

interface DayConfig {
  enabled:  boolean
  theme_id: string
  tone:     'educational' | 'motivational' | 'promotional'
}

type WeeklyConfig = Record<number, DayConfig>

const defaultDay = (): DayConfig => ({ enabled: false, theme_id: '', tone: 'educational' })

export default function WeeklyScheduleSettings() {
  const { companyId } = useCompany()
  const [themes,  setThemes]  = useState<ContentTheme[]>([])
  const [config,  setConfig]  = useState<WeeklyConfig>(() =>
    Object.fromEntries(DAYS.map(d => [d.dow, defaultDay()]))
  )
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch themes & existing config
  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const [{ data: th }, { data: wt }] = await Promise.all([
      supabase
        .from('content_themes')
        .select('id, theme_name, tone, slides_count')
        .eq('company_id', companyId)
        .order('theme_name'),
      supabase
        .from('weekly_theme_schedule')
        .select('day_of_week, theme_id, tone, enabled')
        .eq('company_id', companyId),
    ])
    setThemes((th ?? []) as ContentTheme[])

    if (wt && wt.length > 0) {
      const next: WeeklyConfig = Object.fromEntries(DAYS.map(d => [d.dow, defaultDay()]))
      wt.forEach(row => {
        next[row.day_of_week] = {
          enabled:  row.enabled ?? true,
          theme_id: row.theme_id ?? '',
          tone:     (row.tone as DayConfig['tone']) ?? 'educational',
        }
      })
      setConfig(next)
    }
    setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load])

  const setDay = (dow: number, patch: Partial<DayConfig>) =>
    setConfig(prev => ({ ...prev, [dow]: { ...prev[dow], ...patch } }))

  const handleSave = async () => {
    if (!companyId) return
    setSaving(true)

    const rows = DAYS.map(d => ({
      company_id:  companyId,
      day_of_week: d.dow,
      theme_id:    config[d.dow].theme_id || null,
      tone:        config[d.dow].tone,
      enabled:     config[d.dow].enabled,
      updated_at:  new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('weekly_theme_schedule')
      .upsert(rows, { onConflict: 'company_id,day_of_week' })

    setSaving(false)
    if (error) {
      console.error('[WeeklySchedule] upsert error:', error)
      alert('Erro ao salvar: ' + error.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const enabledCount = DAYS.filter(d => config[d.dow].enabled && config[d.dow].theme_id).length

  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (themes.length === 0) {
    return (
      <div className="card p-5 text-center space-y-2">
        <Calendar size={32} className="mx-auto text-gray-300" />
        <p className="text-sm font-medium text-gray-500">Nenhum tema cadastrado</p>
        <p className="text-xs text-gray-400">
          Crie temas em <strong>Agendamento → Temas</strong> antes de configurar a grade semanal.
        </p>
      </div>
    )
  }

  return (
    <div className="card divide-y divide-gray-50">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1A1A2E]">Grade semanal de temas</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {enabledCount > 0
              ? `${enabledCount} dia${enabledCount > 1 ? 's' : ''} configurado${enabledCount > 1 ? 's' : ''}`
              : 'Nenhum dia configurado ainda'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            saved
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'btn-primary'
          }`}
        >
          {saving ? 'Salvando…' : saved ? '✓ Salvo' : 'Salvar grade'}
        </button>
      </div>

      {/* Day rows */}
      {DAYS.map(day => {
        const cfg     = config[day.dow]
        const isToday = new Date().getDay() === day.dow
        return (
          <div
            key={day.dow}
            className={`px-5 py-3.5 flex items-center gap-3 transition-colors ${
              cfg.enabled ? 'bg-white' : 'bg-gray-50/60'
            }`}
          >
            {/* Toggle */}
            <button
              type="button"
              onClick={() => setDay(day.dow, { enabled: !cfg.enabled })}
              className="flex-shrink-0"
              title={cfg.enabled ? 'Desativar dia' : 'Ativar dia'}
            >
              {cfg.enabled
                ? <CheckCircle2 size={20} className="text-[#6C3FE8]" />
                : <Circle       size={20} className="text-gray-300" />}
            </button>

            {/* Day label */}
            <div className="w-20 flex-shrink-0">
              <p className={`text-sm font-semibold ${cfg.enabled ? 'text-[#1A1A2E]' : 'text-gray-400'}`}>
                {day.label}
              </p>
              {isToday && (
                <span className="text-[10px] font-medium text-[#6C3FE8] bg-[#F8F7FF] px-1.5 py-0.5 rounded-full">
                  hoje
                </span>
              )}
            </div>

            {/* Theme select */}
            <div className="flex-1 relative">
              <select
                value={cfg.theme_id}
                onChange={e => {
                  const tid = e.target.value
                  const th  = themes.find(t => t.id === tid)
                  setDay(day.dow, {
                    theme_id: tid,
                    enabled:  true,
                    tone:     th?.tone as DayConfig['tone'] ?? cfg.tone,
                  })
                }}
                disabled={!cfg.enabled}
                className={`w-full appearance-none text-xs rounded-lg border py-2 pl-3 pr-7 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6C3FE8]/20 ${
                  cfg.enabled
                    ? 'border-gray-200 bg-white text-[#1A1A2E]'
                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                <option value="">— sem post —</option>
                {themes.map(t => (
                  <option key={t.id} value={t.id}>{t.theme_name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Tone select */}
            <div className="relative w-32 flex-shrink-0">
              <select
                value={cfg.tone}
                onChange={e => setDay(day.dow, { tone: e.target.value as DayConfig['tone'] })}
                disabled={!cfg.enabled || !cfg.theme_id}
                className={`w-full appearance-none text-xs rounded-lg border py-2 pl-3 pr-7 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6C3FE8]/20 ${
                  cfg.enabled && cfg.theme_id
                    ? 'border-gray-200 bg-white text-[#1A1A2E]'
                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                {TONE_OPTS.map(t => (
                  <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )
      })}

      {/* Footer tip */}
      <div className="px-5 py-3 bg-[#F8F7FF]/60">
        <p className="text-xs text-gray-400">
          💡 Ao gerar um post, o sistema sugerirá o tema configurado para o dia selecionado.
          Agendamentos diários automáticos usarão essa grade silenciosamente.
        </p>
      </div>
    </div>
  )
}
