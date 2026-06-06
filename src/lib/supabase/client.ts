import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for Client Components.
 * createBrowserClient gère automatiquement les cookies via document.cookie.
 * Crée un singleton par défaut (isSingleton: true implicite).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  )
}
