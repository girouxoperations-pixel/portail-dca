'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireRole(roles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profil || !roles.includes(profil.role)) throw new Error('Non autorisé')
}

export async function definirObjectifs(
  year: number,
  month: number,
  targetCash: number,
  targetCloses: number,
  targetRevenue: number,
) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db.from('goals').upsert(
    { year, month, target_cash: targetCash, target_closes: targetCloses, target_revenue: targetRevenue, updated_at: new Date().toISOString() },
    { onConflict: 'year,month' },
  )

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
