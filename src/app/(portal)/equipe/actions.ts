'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireRole(roles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profil } = await supabase
    .from('profiles').select('roles').eq('id', user.id).single()
  const userRoles = (profil?.roles ?? []) as string[]
  if (!profil || !userRoles.some((r: string) => roles.includes(r))) throw new Error('Non autorisé')
}

export async function definirObjectifUser(
  userId: string,
  year: number,
  month: number,
  targetCash: number,
  targetCloses: number,
  targetRdv: number,
  targetCalls: number,
) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db.from('user_goals').upsert(
    {
      user_id:       userId,
      year,
      month,
      target_cash:   targetCash,
      target_closes: targetCloses,
      target_rdv:    targetRdv,
      target_calls:  targetCalls,
    },
    { onConflict: 'user_id,year,month' },
  )

  if (error) throw new Error(error.message)
  revalidatePath('/equipe')
}
