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

function parseFields(formData: FormData) {
  return {
    entry_date:      formData.get('entry_date') as string,
    scheduled_calls: Number(formData.get('scheduled_calls')) || 0,
    show_calls:      Number(formData.get('show_calls'))      || 0,
    pitch_calls:     Number(formData.get('pitch_calls'))     || 0,
    closes:          Number(formData.get('closes'))          || 0,
    cash_collected:  Number(formData.get('cash_collected'))  || 0,
    revenue:         Number(formData.get('revenue'))         || 0,
    notes:           (formData.get('notes') as string)       || null,
  }
}

// ── Actions ──────────────────────────────────────────────────────────

export async function ajouterEntree(formData: FormData) {
  const { userId, role } = await requireRole(['admin', 'csm', 'closer'])
  const db = createAdminClient()

  const targetUserId = (role === 'closer')
    ? userId
    : (formData.get('user_id') as string) || userId

  const { error } = await db.from('closer_entries').insert({
    ...parseFields(formData),
    user_id:    targetUserId,
    created_by: userId,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/closer')
  revalidatePath('/dashboard')
}

export async function modifierEntree(id: string, formData: FormData) {
  const { userId, role } = await requireRole(['admin', 'csm', 'closer'])
  const db = createAdminClient()

  if (role === 'closer') {
    const { data } = await db
      .from('closer_entries').select('user_id').eq('id', id).single()
    if (!data || data.user_id !== userId) throw new Error('Non autorisé')
  }

  const { error } = await db
    .from('closer_entries')
    .update(parseFields(formData))
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/closer')
  revalidatePath('/dashboard')
}

export async function supprimerEntree(id: string) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db.from('closer_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/closer')
  revalidatePath('/dashboard')
}

export async function creerDealCloser(formData: FormData) {
  const { userId } = await requireRole(['admin', 'csm', 'closer'])
  const db = createAdminClient()

  const entryDate = formData.get('entry_date') as string
  const [year, month] = entryDate.split('-').map(Number)

  const { error } = await db.from('cash_entries').insert({
    entry_date:      entryDate,
    client_name:     (formData.get('client_name') as string) || null,
    montant_courant: Number(formData.get('montant_courant')),
    collected:       Number(formData.get('collected')),
    methode:         (formData.get('methode') as string) || null,
    close_type:      (formData.get('close_type') as string) || null,
    closed_by:       userId,
    year,
    month,
    notes:           (formData.get('notes') as string) || null,
    created_by:      userId,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/closer')
  revalidatePath('/dashboard')
}
