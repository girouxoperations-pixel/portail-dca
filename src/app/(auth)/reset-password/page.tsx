'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [ready,    setReady]    = useState(false)
  const [debug,    setDebug]    = useState('')

  // Keep a ref to the access token from the URL hash
  const accessTokenRef  = useRef<string | null>(null)
  const refreshTokenRef = useRef<string | null>(null)

  useEffect(() => {
    const hash         = window.location.hash.slice(1)
    const hashParams   = new URLSearchParams(hash)
    const searchParams = new URLSearchParams(window.location.search)

    const accessToken  = hashParams.get('access_token')
    const type         = hashParams.get('type')
    const errParam     = hashParams.get('error') || searchParams.get('error')
    const code         = searchParams.get('code')

    setDebug(`hash=${hash.slice(0,30)}… type=${type} token=${accessToken ? 'OUI' : 'NON'} err=${errParam} code=${code ? 'OUI' : 'NON'}`)

    // Error in URL
    if (errParam) {
      setError('Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien depuis la page de connexion.')
      return
    }

    const refreshToken = hashParams.get('refresh_token')

    // Implicit flow invite/recovery — show form immediately
    if (accessToken && (type === 'invite' || type === 'recovery')) {
      accessTokenRef.current  = accessToken
      refreshTokenRef.current = refreshToken
      setReady(true)
      return
    }

    // PKCE flow — exchange code for session
    if (code) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      supabase.auth.exchangeCodeForSession(code).then(({ error: e }) => {
        if (e) setError('Lien invalide. Demande un nouveau lien.')
        else setReady(true)
      })
      return
    }

    setError('Lien invalide ou expiré. Demande un nouveau lien depuis la page de connexion.')
  }, [])

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
      // Create a client authenticated with the access token from the URL
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: accessTokenRef.current
              ? { Authorization: `Bearer ${accessTokenRef.current}` }
              : {},
          },
          auth: { persistSession: false },
        }
      )

      if (accessTokenRef.current && refreshTokenRef.current) {
        await supabase.auth.setSession({
          access_token:  accessTokenRef.current,
          refresh_token: refreshTokenRef.current,
        })
      }

      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) {
        setError('Une erreur est survenue : ' + authError.message)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
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

        {/* Header */}
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

        <div className="bg-white px-8 py-8">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 size={40} className="text-green-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Mot de passe créé !</p>
                <p className="text-sm text-gray-400 mt-1">Redirection vers la connexion…</p>
              </div>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              {error ? (
                <>
                  <AlertCircle size={40} className="text-red-400" />
                  <p className="text-sm text-gray-600">{error}</p>
                  <button
                    onClick={() => router.push('/login')}
                    className="mt-2 text-sm text-violet-600 hover:underline"
                  >
                    Retour à la connexion
                  </button>
                </>
              ) : (
                <>
                  <svg className="animate-spin h-6 w-6 text-violet-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <p className="text-sm text-gray-400">Vérification du lien…</p>
                  {debug && <p className="text-[10px] text-gray-300 font-mono mt-2 break-all">{debug}</p>}
                </>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-6">
                Choisir un mot de passe
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
                  {loading ? 'Création…' : 'Créer mon mot de passe'}
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
