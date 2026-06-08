/**
 * proxy.ts — Next.js 16
 *
 * ⚠️  Dans Next.js 16, "middleware.ts" est déprécié et renommé "proxy.ts".
 *    La fonction exportée s'appelle `proxy` (non plus `middleware`).
 *
 * Responsabilités :
 *  1. Rafraîchir le token Supabase sur chaque requête
 *  2. Rediriger vers /login si l'utilisateur n'est pas connecté
 *  3. Rediriger vers /unauthorized si le rôle ne permet pas l'accès
 *  4. Rediriger vers /dashboard si l'utilisateur connecté accède à /login
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ----------------------------------------------------------------
// Routes publiques (pas d'authentification requise)
// ----------------------------------------------------------------
const PUBLIC_PATHS = ['/login', '/unauthorized', '/reset-password']

// ----------------------------------------------------------------
// Routes avec restriction de rôle.
// Toute route non listée ici est accessible à tous les utilisateurs
// authentifiés (la RLS Supabase protège les données au niveau DB).
// ----------------------------------------------------------------
const ROUTE_RULES: { prefix: string; roles: string[] }[] = [
  { prefix: '/cash',    roles: ['admin', 'csm']              },
  { prefix: '/admin',   roles: ['admin', 'csm']              },
  { prefix: '/closer',  roles: ['admin', 'csm', 'closer']    },
  { prefix: '/setter',  roles: ['admin', 'csm', 'setter']    },
  { prefix: '/feedback',roles: ['admin', 'csm', 'closer', 'setter'] },
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  // Routes publiques — laisser passer sans toucher à Supabase
  // (évite toute boucle si les env vars sont invalides)
  if (isPublic) {
    return NextResponse.next({ request })
  }

  // Réponse "pass-through" de base
  let response = NextResponse.next({ request })

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\s+/g, '')
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/\s+/g, '')

  // Si les env vars sont absentes, rediriger vers /login sans boucler
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let user: { id: string } | null = null

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data } = await supabase.auth.getUser()
    user = data.user

    // ── Route protégée : non connecté → /login ───────────────────
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // ── Vérification du rôle ─────────────────────────────────────
    const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix))
    if (rule) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !rule.roles.includes(profile.role)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  } catch {
    // En cas d'erreur Supabase, laisser passer (fail-open sur les routes protégées
    // est acceptable — la RLS DB protège les données de toute façon)
    return response
  }

  return response
}

export const config = {
  matcher: [
    /**
     * Exécuter sur toutes les routes sauf les fichiers statiques.
     * Les routes _next/data sont intentionnellement incluses (cf. doc
     * Next.js 16) pour éviter des failles de sécurité silencieuses.
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
