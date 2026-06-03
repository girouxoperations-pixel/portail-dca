'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Auth guard ────────────────────────────────────────────────────────

async function requireRole(roles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profil || !roles.includes(profil.role)) throw new Error('Non autorisé')

  return { userId: user.id, role: profil.role as string }
}

// ── Parser de champs communs ──────────────────────────────────────────

function parseFields(formData: FormData) {
  return {
    entry_date:   formData.get('entry_date') as string,
    attempts:     Number(formData.get('attempts')     ?? 0),
    contacts:     Number(formData.get('contacts')     ?? 0),
    rdv_booked:   Number(formData.get('rdv_booked')   ?? 0),
    showed:       Number(formData.get('showed')       ?? 0),
    no_show:      Number(formData.get('no_show')      ?? 0),
    disqualified: Number(formData.get('disqualified') ?? 0),
    cancelled:    Number(formData.get('cancelled')    ?? 0),
    notes:        (formData.get('notes') as string) || null,
  }
}

// ── Actions ───────────────────────────────────────────────────────────

export async function ajouterEntreeSetter(formData: FormData) {
  const { userId, role } = await requireRole(['admin', 'csm', 'setter'])
  const db = createAdminClient()

  const targetUserId = role === 'setter'
    ? userId
    : ((formData.get('user_id') as string) || userId)

  const { error } = await db.from('setter_entries').insert({
    ...parseFields(formData),
    user_id:    targetUserId,
    created_by: userId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/setter')
}

export async function modifierEntreeSetter(id: string, formData: FormData) {
  const { userId, role } = await requireRole(['admin', 'csm', 'setter'])
  const db = createAdminClient()

  if (role === 'setter') {
    const { data } = await db
      .from('setter_entries').select('user_id').eq('id', id).single()
    if (!data || data.user_id !== userId) throw new Error('Non autorisé')
  }

  const { error } = await db
    .from('setter_entries').update(parseFields(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/setter')
}

export async function supprimerEntreeSetter(id: string) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db.from('setter_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/setter')
}
