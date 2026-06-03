import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client pour Server Components, Route Handlers et Server Functions.
 *
 * ⚠️  Toujours créer une nouvelle instance par requête — ne jamais partager
 *     un client entre les requêtes (cf. doc @supabase/ssr).
 *
 * Le `setAll` est wrappé dans un try/catch car les Server Components ne
 * peuvent pas écrire de cookies (contrainte HTTP/Next.js). Les tokens sont
 * rafraîchis via le middleware qui, lui, dispose d'un accès complet en écriture.
 */
export async function createClient() {
  // cookies() est async depuis Next.js 15 / 16
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Appelé depuis un Server Component : l'écriture de cookies
            // n'est pas possible ici. Le middleware se charge du refresh.
          }
        },
      },
    }
  )
}
