'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function ResetPasswordPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [password, setPassword]   = useState('')
  const [confirm,  setConfirm]    = useState('')
  const [showPwd,  setShowPwd]    = useState(false)
  const [error,    setError]      = useState<string | null>(null)
  const [loading,  setLoading]    = useState(false)
  const [done,     setDone]       = useState(false)
  const [ready,    setReady]      = useState(false)

  useEffect(() => {
    // Cas 1 : PKCE — lien email avec ?code=xxx dans la query string
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => { if (!error) setReady(true) })
      return
    }

    // Cas 2 : Implicit — hash URL (#access_token=...&type=recovery)
    const hash = window.location.hash.slice(1)
    const hashParams = new URLSearchParams(hash)
    if (hashParams.get('type') === 'recovery') {
      const accessToken  = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => { if (!error) setReady(true) })
        return
      }
    }

    // Fallback : écouter l'événement PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) {
        setError('Une erreur est survenue. Le lien est peut-être expiré.')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2500)
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
  )

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/5">

        {/* En-tête */}
        <div className="flex flex-col items-center gap-3 px-8 py-10" style={{ backgroundColor: '#0d0d14' }}>
          <div className="w-14 h-14 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <span className="text-white font-bold text-xl tracking-tight select-none">SC</span>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white tracking-tight">She Closes</h1>
            <p className="text-xs text-gray-500 mt-0.5">Nouveau mot de passe</p>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        {/* Corps */}
        <div className="bg-white px-8 py-8">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 size={40} className="text-green-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Mot de passe mis à jour !</p>
                <p className="text-sm text-gray-400 mt-1">Redirection vers le dashboard…</p>
              </div>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <svg className="animate-spin h-6 w-6 text-violet-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-gray-400">Vérification du lien…</p>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-6">
                Choisir un nouveau mot de passe
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="8 caractères minimum"
                      className={cn(INPUT_CLS, 'pr-11')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={INPUT_CLS}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertCircle size={15} className="text-red-500 shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
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
