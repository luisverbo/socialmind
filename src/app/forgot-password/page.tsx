'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1030 50%, #0F0F1A 100%)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SocialMind
          </span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)' }}>
                <span className="text-2xl">✉️</span>
              </div>
              <h1 className="text-xl font-bold text-white mb-2">E-mail enviado!</h1>
              <p className="text-gray-400 text-sm mb-6">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
              <Link href="/login" className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
                ← Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Esqueceu a senha?</h1>
              <p className="text-gray-400 text-sm mb-6">Enviaremos um link para redefinir sua senha</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoFocus
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)' }}
                >
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link href="/login" className="text-sm text-gray-400 hover:text-purple-400 transition-colors">
                  ← Voltar para o login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
