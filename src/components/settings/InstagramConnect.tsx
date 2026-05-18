'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Instagram, Link2, Unlink, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useCompany } from '@/hooks/useCompany'

interface IGStatus {
  connected: boolean
  username?: string
  profile_picture_url?: string
  followers_count?: number
  media_count?: number
  token_expires_at?: string
  days_until_expiry?: number
  expiring_soon?: boolean
}

export default function InstagramConnect() {
  const { companyId } = useCompany()
  const [status, setStatus] = useState<IGStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/instagram/status?company_id=${companyId}`)
      const data = await res.json()
      setStatus(data)
    } catch {
      setError('Erro ao verificar status da conexão.')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // Read URL params on mount (connected=true / error=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      // Clean URL
      window.history.replaceState({}, '', '/settings')
      fetchStatus()
    }
    const err = params.get('error')
    if (err) {
      setError(decodeURIComponent(err))
      window.history.replaceState({}, '', '/settings')
    }
  }, [fetchStatus])

  const handleConnect = () => {
    if (!companyId) return
    window.location.href = `/api/instagram/auth?company_id=${companyId}`
  }

  const handleDisconnect = async () => {
    if (!companyId || !confirm('Desconectar o Instagram? Posts agendados não serão publicados automaticamente.')) return
    setDisconnecting(true)
    try {
      await fetch('/api/instagram/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      })
      setStatus({ connected: false })
    } catch {
      setError('Erro ao desconectar.')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-6 flex items-center gap-3">
        <Loader2 size={18} className="text-gray-300 animate-spin" />
        <span className="text-sm text-gray-400">Verificando conexão...</span>
      </div>
    )
  }

  const gradient = 'linear-gradient(135deg, #6C3FE8 0%, #E84393 100%)'

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: gradient }}
        >
          <Instagram size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#1A1A2E]">Instagram</h2>
          <p className="text-xs text-gray-400">Conta para publicação automática</p>
        </div>
        <div className="ml-auto">
          {status?.connected ? (
            <span className="badge bg-green-50 border-green-200 text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Conectado
            </span>
          ) : (
            <span className="badge bg-gray-50 border-gray-200 text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
              Desconectado
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {status?.connected ? (
        <>
          {/* Profile card */}
          <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
            {status.profile_picture_url ? (
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                <Image
                  src={status.profile_picture_url}
                  alt={status.username ?? ''}
                  width={56}
                  height={56}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: gradient }}>
                <Instagram size={22} className="text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold text-[#1A1A2E] text-sm">@{status.username}</p>
              <div className="flex items-center gap-4 mt-1">
                {status.followers_count != null && (
                  <span className="text-xs text-gray-400">
                    <strong className="text-gray-600">{status.followers_count.toLocaleString('pt-BR')}</strong> seguidores
                  </span>
                )}
                {status.media_count != null && (
                  <span className="text-xs text-gray-400">
                    <strong className="text-gray-600">{status.media_count}</strong> posts
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Token expiry */}
          {status.token_expires_at && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs border ${
              status.expiring_soon
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              {status.expiring_soon ? (
                <AlertTriangle size={14} className="flex-shrink-0" />
              ) : (
                <CheckCircle2 size={14} className="flex-shrink-0" />
              )}
              <span>
                {status.expiring_soon
                  ? `Token expira em ${status.days_until_expiry} dias — recomendamos reconectar.`
                  : `Token válido por mais ${status.days_until_expiry} dias (renovado automaticamente).`}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {status.expiring_soon && (
              <button onClick={handleConnect} className="btn-primary flex-1 py-3 text-sm">
                <RefreshCw size={15} />
                Reconectar conta
              </button>
            )}
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="btn-secondary flex-1 sm:flex-none sm:w-auto px-5 py-3 text-sm hover:border-red-300 hover:text-red-600"
            >
              {disconnecting ? <Loader2 size={15} className="animate-spin" /> : <Unlink size={15} />}
              Desconectar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500 leading-relaxed">
            Conecte sua conta profissional do Instagram para que o SocialMind publique seus carrosséis automaticamente no horário agendado.
          </p>
          <button onClick={handleConnect} className="btn-primary w-full py-3.5 text-sm">
            <Link2 size={16} />
            Conectar Instagram
          </button>
        </>
      )}
    </div>
  )
}
