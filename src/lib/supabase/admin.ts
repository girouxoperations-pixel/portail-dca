import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase avec la service role key — contourne la RLS.
 * À utiliser UNIQUEMENT dans des Server Components / Route Handlers.
 * Ne jamais exposer côté client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
