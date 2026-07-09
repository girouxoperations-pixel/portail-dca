'use server'

import { revalidatePath }    from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayQC }           from '@/lib/dates'

// ── Prospect follow-ups ──────────────────────────────────────────────
export async function addProspectFollowup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const db = createAdminClient()
  const { error } = await db.from('prospect_followups').insert({
    closer_id:     user.id,
    prospect_name: (formData.get('prospect_name') as string).trim(),
    followup_date: formData.get('followup_date') as string,
    notes:         (formData.get('notes') as string)?.trim() || null,
  })
  if (error) throw error
  revalidatePath('/todo')
  revalidatePath('/suivi-client')
  revalidatePath('/closer')
}

export async function toggleProspectFollowup(id: string, done: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const db = createAdminClient()
  // Security: verify ownership or admin
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  const isAdmin = (profile?.roles as string[] | undefined)?.some(r => ['admin', 'csm'].includes(r)) ?? false
  if (!isAdmin) {
    const { data: fp } = await db.from('prospect_followups').select('closer_id').eq('id', id).single()
    if (!fp || fp.closer_id !== user.id) throw new Error('Non autorisé')
  }

  const { error } = await db.from('prospect_followups').update({
    done,
    done_date: done ? todayQC() : null,
  }).eq('id', id)
  if (error) throw error
  revalidatePath('/todo')
  revalidatePath('/suivi-client')
  revalidatePath('/closer')
}

export async function deleteProspectFollowup(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const db = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  const isAdmin = (profile?.roles as string[] | undefined)?.some(r => ['admin', 'csm'].includes(r)) ?? false
  if (!isAdmin) {
    const { data: fp } = await db.from('prospect_followups').select('closer_id').eq('id', id).single()
    if (!fp || fp.closer_id !== user.id) throw new Error('Non autorisé')
  }

  await db.from('prospect_followups').delete().eq('id', id)
  revalidatePath('/todo')
  revalidatePath('/suivi-client')
  revalidatePath('/closer')
}

export async function setProspectStatut(id: string, statut: 'actif' | 'contacté' | 'closé' | 'perdu') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const db = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  const isAdmin = (profile?.roles as string[] | undefined)?.some(r => ['admin', 'csm'].includes(r)) ?? false
  if (!isAdmin) {
    const { data: fp } = await db.from('prospect_followups').select('closer_id').eq('id', id).single()
    if (!fp || fp.closer_id !== user.id) throw new Error('Non autorisé')
  }

  const done = statut === 'closé' || statut === 'perdu'
  const { error } = await db.from('prospect_followups').update({
    statut,
    done,
    done_date: done ? todayQC() : null,
  }).eq('id', id)
  if (error) throw error
  revalidatePath('/todo')
  revalidatePath('/suivi-client')
  revalidatePath('/closer')
}

export async function batchAddFollowups(items: { closer_id: string; prospect_name: string; followup_date: string }[]) {
  if (items.length === 0) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const db = createAdminClient()
  const { error } = await db.from('prospect_followups').insert(
    items.map(i => ({ closer_id: i.closer_id, prospect_name: i.prospect_name.trim(), followup_date: i.followup_date }))
  )
  if (error) throw error
  revalidatePath('/closer')
  revalidatePath('/suivi-client')
  revalidatePath('/todo')
}

// ── Closer personal recurring note (no cash entry) ──────────────────
export async function noterRecuCloser(occurrenceId: string, noted: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const db = createAdminClient()

  const { data: occ } = await db
    .from('recurring_occurrences')
    .select('recurring_deals(closer_id)')
    .eq('id', occurrenceId)
    .single()

  if (!occ?.recurring_deals) throw new Error('Introuvable')
  const deal = occ.recurring_deals as unknown as { closer_id: string | null }
  if (deal.closer_id !== user.id) throw new Error('Non autorisé')

  const { error } = await db
    .from('recurring_occurrences')
    .update({ closer_noted: noted })
    .eq('id', occurrenceId)

  if (error) throw error
  revalidatePath('/todo')
}

// ── Toggle suivi message ─────────────────────────────────────────────
export async function toggleSuiviMessage(
  followupId: string,
  messageNum: 1 | 2 | 3,
  done: boolean,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  const isAdmin = (profile?.roles as string[] | undefined)?.some(r => ['admin', 'csm'].includes(r)) ?? false

  const db = createAdminClient()

  // Closer can only update their own followups
  const query = db.from('client_followups')
  if (!isAdmin) {
    const { data: followup } = await db.from('client_followups').select('closer_id').eq('id', followupId).single()
    if (!followup || followup.closer_id !== user.id) throw new Error('Non autorisé')
  }

  const { error } = await query.update({
    [`message${messageNum}_done`]: done,
    [`message${messageNum}_date`]: done ? todayQC() : null,
  }).eq('id', followupId)

  if (error) throw error
  revalidatePath('/todo')
  revalidatePath('/suivi-client')
}
