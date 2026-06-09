'use client'

import { useState, useEffect, Suspense } from 'react'
import { Eye, EyeOff, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loginAction } from './actions'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const supabase     = createClient()
  const searchParams = useSearchParams()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [mode,     setMode]     = useState<'login' | 'forgot' | 'sent'>('login')

  // Errors redirected back from the server action
  useEffect(() => {
    const e = searchParams.get('error')
    if (e === 'credentials') setError('Email ou mot de passe incorrect.')
    else if (e === 'unconfirmed') setError('Veuillez confirmer votre adresse e-mail avant de vous connecter.')
    else if (e === 'unknown') setError('Une erreur est survenue. Veuillez réessayer.')
  }, [searchParams])

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` },
      )
      if (authError) {
        if (authError.status === 429 || authError.message?.includes('rate limit')) {
          setError('Trop de demandes envoyées. Attends quelques minutes avant de réessayer.')
        } else {
          setError('Une erreur est survenue. Vérifie l\'adresse e-mail.')
        }
        return
      }
      setMode('sent')
    } catch {
      setError('Une erreur inattendue est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const INPUT_CLS = cn(
    'w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900',
    'placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
    'transition-shadow',
  )

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/5">

        {/* En-tête sombre */}
        <div className="flex flex-col items-center gap-3 px-8 py-10" style={{ backgroundColor: '#0d0d14' }}>
          <div className="w-14 h-14 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <span className="text-white font-bold text-xl tracking-tight select-none">SC</span>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white tracking-tight">She Closes</h1>
            <p className="text-xs text-gray-500 mt-0.5">Portail de performance commerciale</p>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        <div className="bg-white px-8 py-8">

          {/* ── Confirmation envoi ── */}
          {mode === 'sent' ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 size={40} className="text-green-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Lien envoyé !</p>
                <p className="text-sm text-gray-500 mt-1">
                  Vérifie ta boîte e-mail et clique sur le lien pour choisir un nouveau mot de passe.
                </p>
              </div>
              <button
                onClick={() => { setMode('login'); setError(null) }}
                className="text-sm text-violet-600 hover:underline mt-1"
              >
                Retour à la connexion
              </button>
            </div>

          ) : mode === 'forgot' ? (
            /* ── Mot de passe oublié ── */
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Mot de passe oublié</h2>
              <p className="text-sm text-gray-400 mb-6">
                Entre ton adresse e-mail et on t&apos;envoie un lien de réinitialisation.
              </p>
              <form onSubmit={handleForgot} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email-forgot" className="text-sm font-medium text-gray-700">Adresse e-mail</label>
                  <input
                    id="email-forgot"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    className={cn(INPUT_CLS, error ? 'border-red-300' : 'border-gray-200')}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertCircle size={15} className="text-red-500 shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="mt-1 w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
                </button>
                <button type="button" onClick={() => { setMode('login'); setError(null) }}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors text-center">
                  Retour à la connexion
                </button>
              </form>
            </>

          ) : (
            /* ── Connexion via Server Action ── */
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-6">Connexion à votre compte</h2>
              <form action={loginAction} className="flex flex-col gap-4"
                onSubmit={() => setLoading(true)}>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">Adresse e-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="vous@sheclosesacademy.com"
                    className={cn(INPUT_CLS, error ? 'border-red-300' : 'border-gray-200')}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">Mot de passe</label>
                    <button type="button" onClick={() => { setMode('forgot'); setError(null) }}
                      className="text-xs text-violet-600 hover:text-violet-700 hover:underline transition-colors">
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={cn(INPUT_CLS, 'pr-11', error ? 'border-red-300' : 'border-gray-200')}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertCircle size={15} className="text-red-500 shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className={cn(
                    'mt-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg',
                    'bg-violet-600 hover:bg-violet-700 active:bg-violet-800',
                    'text-white text-sm font-medium',
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                  )}>
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Connexion en cours…
                    </>
                  ) : (
                    <>
                      <LogIn size={15} />
                      Se connecter
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-600/40 mt-6">
        © {new Date().getFullYear()} She Closes Academy · Tous droits réservés
      </p>
    </div>
  )
}
