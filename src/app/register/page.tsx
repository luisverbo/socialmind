'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Mail, Lock, Building2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PLANS = [
  { value: 'starter', label: 'Starter', price: 'R$97', period: '/mês', posts: '12 posts/mês', popular: false },
  { value: 'pro',     label: 'Pro',     price: 'R$197', period: '/mês', posts: '30 posts/mês', popular: true  },
  { value: 'agency',  label: 'Agency',  price: 'R$397', period: '/mês', posts: '90 posts/mês', popular: false },
]

export default function RegisterPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [plan, setPlan] = useState('pro')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres'); return }
    if (password !== confirmPassword) { setError('As senhas não coincidem'); return }

    setLoading(true)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { company_name: companyName, plan } },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Este email já está cadastrado. Faça login.')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #F8F7FF 0%, #F0EBFF 100%)' }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)' }}>
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SocialMind
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Criar sua conta</h1>
          <p className="text-gray-500 text-sm mb-7">Comece a automatizar seu Instagram hoje</p>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Company name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome da empresa</label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Minha Empresa"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mín. 8 caracteres"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Plan selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Escolha seu plano</label>
              <div className="grid grid-cols-3 gap-2">
                {PLANS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlan(p.value)}
                    className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center ${
                      plan === p.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-purple-300'
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap text-white"
                        style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)' }}>
                        Popular
                      </span>
                    )}
                    <span className={`font-bold text-sm mt-0.5 ${plan === p.value ? 'text-purple-700' : 'text-gray-900'}`}>{p.label}</span>
                    <span className={`text-lg font-black mt-1 ${plan === p.value ? 'text-purple-700' : 'text-gray-900'}`}>
                      {p.price}<span className="text-xs font-normal text-gray-400">{p.period}</span>
                    </span>
                    <span className="text-xs text-gray-400 mt-0.5">{p.posts}</span>
                    {plan === p.value && <Check size={13} className="text-purple-500 mt-1.5" />}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6C3FE8, #E84393)' }}
            >
              {loading ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Já tem conta?{' '}
              <Link href="/login" className="text-purple-600 hover:text-purple-700 font-semibold transition-colors">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
