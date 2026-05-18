'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Result {
  ok: boolean
  status: number
  body: unknown
  postId?: string
  durationMs?: number
}

export default function TestGeneratePage() {
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<Result | null>(null)
  const [log,      setLog]      = useState<string[]>([])

  const addLog = (msg: string) =>
    setLog(prev => [`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`, ...prev])

  const run = async () => {
    setLoading(true)
    setResult(null)
    setLog([])

    try {
      // 1. Fetch first company
      addLog('Buscando primeira empresa no Supabase…')
      const { data: companies, error: compErr } = await supabase
        .from('companies')
        .select('id, name, plan')
        .limit(1)
        .single()

      if (compErr || !companies) {
        addLog(`❌ Erro ao buscar empresa: ${compErr?.message}`)
        setResult({ ok: false, status: 0, body: { error: compErr?.message ?? 'Nenhuma empresa encontrada' } })
        setLoading(false)
        return
      }

      addLog(`✅ Empresa encontrada: "${companies.name}" (${companies.plan}) — ID: ${companies.id}`)

      // 2. Call generate-carousel
      const payload = {
        company_id:   companies.id,
        theme:        'Dica de marketing digital',
        tone:         'educational',
        slides_count: 5,
        publish_mode: 'review',
      }

      addLog(`📤 Chamando POST /api/generate-carousel…`)
      addLog(`   Payload: ${JSON.stringify(payload)}`)

      const t0 = performance.now()
      const res = await fetch('/api/generate-carousel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const durationMs = Math.round(performance.now() - t0)

      addLog(`📥 Resposta: HTTP ${res.status} em ${durationMs}ms`)

      const body = await res.json()
      addLog(`   Body: ${JSON.stringify(body)}`)

      if (res.ok && body.post_id) {
        addLog(`🎉 Post gerado com sucesso! post_id: ${body.post_id}`)

        // Fetch slides from DB
        addLog('Buscando imagens do post no Supabase…')
        const { data: post } = await supabase
          .from('posts')
          .select('slides_images, caption, status')
          .eq('id', body.post_id)
          .single()

        addLog(`   slides_images: ${JSON.stringify(post?.slides_images ?? [])}`)
        addLog(`   status: ${post?.status}`)

        setResult({ ok: true, status: res.status, body: { ...body, post }, postId: body.post_id, durationMs })
      } else {
        addLog(`❌ Falha: ${JSON.stringify(body)}`)
        setResult({ ok: false, status: res.status, body, durationMs })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog(`💥 Exceção: ${msg}`)
      setResult({ ok: false, status: 0, body: { error: msg } })
    } finally {
      setLoading(false)
    }
  }

  const slides: string[] = result?.ok
    ? ((result.body as { post?: { slides_images?: string[] } })?.post?.slides_images ?? [])
    : []

  return (
    <div className="min-h-screen bg-[#F8F7FF] p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A2E]">🧪 Teste de Geração</h1>
          <p className="text-xs text-gray-400 mt-0.5">Debug do endpoint /api/generate-carousel</p>
        </div>
        <Link href="/" className="text-sm text-[#6C3FE8] hover:underline">← Dashboard</Link>
      </div>

      {/* Config preview */}
      <div className="card p-4 text-xs font-mono text-gray-500 space-y-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Payload a enviar</p>
        <p><span className="text-[#6C3FE8]">company_id</span>: <em>primeiro da tabela companies</em></p>
        <p><span className="text-[#6C3FE8]">theme</span>: "Dica de marketing digital"</p>
        <p><span className="text-[#6C3FE8]">tone</span>: "educational"</p>
        <p><span className="text-[#6C3FE8]">slides_count</span>: 5</p>
        <p><span className="text-[#6C3FE8]">publish_mode</span>: "review"</p>
      </div>

      {/* Button */}
      <button
        onClick={run}
        disabled={loading}
        className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-70"
        style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)' }}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Gerando… (pode levar até 60s)
          </>
        ) : (
          '🚀 Gerar Post de Teste'
        )}
      </button>

      {/* Log output */}
      {log.length > 0 && (
        <div className="card p-4 space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Log de execução</p>
          <div className="bg-gray-950 rounded-xl p-4 space-y-1 max-h-64 overflow-y-auto">
            {log.map((line, i) => (
              <p key={i} className="text-xs font-mono text-gray-300 leading-relaxed">{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`card p-5 space-y-4 border-2 ${result.ok ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{result.ok ? '✅' : '❌'}</span>
              <div>
                <p className="text-sm font-bold text-[#1A1A2E]">
                  {result.ok ? 'Sucesso!' : 'Falha na geração'}
                </p>
                <p className="text-xs text-gray-400">
                  HTTP {result.status}
                  {result.durationMs ? ` · ${(result.durationMs / 1000).toFixed(1)}s` : ''}
                </p>
              </div>
            </div>
            {result.postId && (
              <Link
                href={`/preview/${result.postId}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)' }}
              >
                Ver preview →
              </Link>
            )}
          </div>

          {/* Slide thumbnails */}
          {slides.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">{slides.length} slides gerados</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {slides.map((url, i) => (
                  <div key={i} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-gray-200 relative">
                    <Image src={url} alt={`Slide ${i + 1}`} fill className="object-cover" />
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw response */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1.5">Resposta completa</p>
            <pre className="bg-gray-950 text-gray-300 text-xs font-mono rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(result.body, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
