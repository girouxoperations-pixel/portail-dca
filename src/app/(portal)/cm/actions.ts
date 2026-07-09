'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayQC }           from '@/lib/dates'

const ALLOWED = ['admin', 'csm', 'cm']

async function requireCm() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profil } = await supabase
    .from('profiles').select('roles').eq('id', user.id).single()
  const userRoles = (profil?.roles ?? []) as string[]
  if (!profil || !userRoles.some((r: string) => ALLOWED.includes(r))) throw new Error('Non autorisé')

  const isPrivileged = userRoles.some(r => ['admin', 'csm', 'cm'].includes(r))
  return { userId: user.id, isPrivileged }
}

export async function ajouterCmFollowup(formData: FormData) {
  const { userId } = await requireCm()
  const db = createAdminClient()

  const clientName = (formData.get('client_name') as string)?.trim()
  if (!clientName) throw new Error('Nom requis')

  const { error } = await db.from('cm_followups').insert({
    client_name: clientName,
    cm_id:       userId,
    created_by:  userId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/cm')
}

export async function toggleCmMessage(
  followupId: string,
  messageNum: 1 | 2 | 3 | 4 | 5,
  done: boolean,
) {
  const { userId, isPrivileged } = await requireCm()
  const db = createAdminClient()

  if (!isPrivileged) {
    const { data: row } = await db.from('cm_followups').select('cm_id').eq('id', followupId).single()
    if (!row || row.cm_id !== userId) throw new Error('Non autorisé')
  }

  const { error } = await db.from('cm_followups').update({
    [`message_${messageNum}`]:      done,
    [`message_${messageNum}_date`]: done ? todayQC() : null,
  }).eq('id', followupId)
  if (error) throw new Error(error.message)
  revalidatePath('/cm')
}

export async function setCmStatus(
  followupId: string,
  status: 'en_cours' | 'pas_reponse_1' | 'pas_reponse_2',
) {
  const { userId, isPrivileged } = await requireCm()
  const db = createAdminClient()

  if (!isPrivileged) {
    const { data: row } = await db.from('cm_followups').select('cm_id').eq('id', followupId).single()
    if (!row || row.cm_id !== userId) throw new Error('Non autorisé')
  }

  const { error } = await db.from('cm_followups').update({ status }).eq('id', followupId)
  if (error) throw new Error(error.message)
  revalidatePath('/cm')
}

export async function updateCmNotes(followupId: string, notes: string) {
  const { userId, isPrivileged } = await requireCm()
  const db = createAdminClient()

  if (!isPrivileged) {
    const { data: row } = await db.from('cm_followups').select('cm_id').eq('id', followupId).single()
    if (!row || row.cm_id !== userId) throw new Error('Non autorisé')
  }

  const { error } = await db.from('cm_followups').update({ notes: notes.trim() || null }).eq('id', followupId)
  if (error) throw new Error(error.message)
  revalidatePath('/cm')
}

export async function supprimerCmFollowup(followupId: string) {
  const { isPrivileged } = await requireCm()
  if (!isPrivileged) throw new Error('Non autorisé')

  const db = createAdminClient()
  const { error } = await db.from('cm_followups').delete().eq('id', followupId)
  if (error) throw new Error(error.message)
  revalidatePath('/cm')
}
