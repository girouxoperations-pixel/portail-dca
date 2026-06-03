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
const PUBLIC_PATHS = ['/login', '/unauthorized']

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

  // Réponse "pass-through" de base
  let response = NextResponse.next({ request })

  // ── Créer le client Supabase (lecture + écriture cookies) ──────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          )
        },
      },
    }
  )

  // ── Valider + rafraîchir la session ────────────────────────────
  // getUser() contacte le serveur Supabase Auth pour valider le JWT.
  // C'est la seule source fiable — ne jamais utiliser getSession() ici.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Routes publiques ───────────────────────────────────────────
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (isPublic) {
    // Utilisateur connecté qui tente d'accéder à /login → dashboard
    if (user && (pathname === '/login' || pathname.startsWith('/login/'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // ── Route protégée : non connecté → /login ─────────────────────
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Vérification du rôle (uniquement pour les routes restreintes)
  // La requête DB n'est faite QUE si la route le nécessite,
  // pour éviter un aller-retour Supabase sur chaque navigation.
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
