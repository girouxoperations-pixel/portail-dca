'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Auth guard ──────────────────────────────────────────────────────

async function requireRole(roles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profil || !roles.includes(profil.role)) throw new Error('Non autorisé')
  return { userId: user.id, role: profil.role as string }
}

// ── Actions ──────────────────────────────────────────────────────────

export async function ajouterFeedback(formData: FormData) {
  const { userId, role } = await requireRole(['admin', 'csm', 'closer'])
  const db = createAdminClient()

  // Closer can only add for themselves
  const closerId = (role === 'closer')
    ? userId
    : (formData.get('user_id') as string) || userId

  const forts = ((formData.get('forts') as string) ?? '')
    .split('\n').map(s => s.trim()).filter(Boolean)
  const ameliorer = ((formData.get('ameliorer') as string) ?? '')
    .split('\n').map(s => s.trim()).filter(Boolean)

  const scoreRaw = formData.get('score') as string
  const durationRaw = formData.get('duration') as string

  const { error } = await db.from('feedback_entries').insert({
    user_id:   closerId,
    call_date: formData.get('call_date') as string,
    duration:  durationRaw ? Number(durationRaw) : null,
    score:     scoreRaw    ? Number(scoreRaw)    : null,
    forts:     forts.length     > 0 ? forts     : null,
    ameliorer: ameliorer.length > 0 ? ameliorer : null,
    statut:    formData.get('statut') as string,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/feedback')
}

export async function supprimerFeedback(id: string) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db.from('feedback_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/feedback')
}
