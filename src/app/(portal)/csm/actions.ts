'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdminOrCsm() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  const userRoles = (profile?.roles ?? []) as string[]
  if (!profile || !userRoles.some((r: string) => ['admin', 'csm'].includes(r))) throw new Error('Forbidden')
}

// ── Meeting dates / notes ───────────────────────────────────────────
export async function updateMeeting(
  clientId: string,
  num: 1 | 2 | 3 | 4 | 5,
  fields: { date?: string | null; notes?: string | null },
) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const update: Record<string, unknown> = {}
  if (fields.date  !== undefined) update[`m${num}_date`]  = fields.date  || null
  if (fields.notes !== undefined) update[`m${num}_notes`] = fields.notes || null

  // Auto-set cert_setter when M4 is booked
  if (num === 4 && fields.date) update.cert_setter_done = true

  const { error } = await db.from('csm_clients').update(update).eq('id', clientId)
  if (error) throw error
  revalidatePath('/csm')
  revalidatePath(`/csm/${clientId}`)
}

// ── Text follow-up toggles ──────────────────────────────────────────
export async function toggleText(
  clientId: string,
  field: 'j7' | 'j21' | 'j49' | 'j63' | 'j77' | 'j90',
  done: boolean,
) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({
    [`text_${field}_done`]: done,
    [`text_${field}_date`]: done ? new Date().toISOString().split('T')[0] : null,
  }).eq('id', clientId)
  if (error) throw error
  revalidatePath('/csm')
  revalidatePath(`/csm/${clientId}`)
}

// ── Milestone checkboxes ────────────────────────────────────────────
export async function toggleMilestone(
  clientId: string,
  field: 'quiz_setter_done' | 'cert_setter_done' | 'opportunity_setter'
       | 'theory_closer_done' | 'quiz_closer_done' | 'cert_closer_done' | 'opportunity_closer',
  value: boolean,
) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ [field]: value }).eq('id', clientId)
  if (error) throw error
  revalidatePath('/csm')
  revalidatePath(`/csm/${clientId}`)
}

// ── Circle last login ───────────────────────────────────────────────
export async function updateCircleLogin(clientId: string, date: string | null) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ circle_last_login: date || null }).eq('id', clientId)
  if (error) throw error
  revalidatePath('/csm')
  revalidatePath(`/csm/${clientId}`)
}

// ── Theory percentage ───────────────────────────────────────────────
export async function updateTheory(clientId: string, pct: number) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ theory_pct: Math.max(0, Math.min(100, pct)) }).eq('id', clientId)
  if (error) throw error
  revalidatePath(`/csm/${clientId}`)
}

// ── Missed meeting flag ─────────────────────────────────────────────
export async function updateMissed(clientId: string, num: 1 | 2 | 3 | 4, missed: boolean) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ [`m${num}_missed`]: missed }).eq('id', clientId)
  if (error) throw error
  revalidatePath('/csm')
  revalidatePath(`/csm/${clientId}`)
}

// ── Status ──────────────────────────────────────────────────────────
export async function updateStatus(clientId: string, status: string) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ status }).eq('id', clientId)
  if (error) throw error
  revalidatePath('/csm')
  revalidatePath(`/csm/${clientId}`)
}

// ── Remboursement : marque refund + supprime cash entry + paye entry ──
export async function marquerRemboursement(clientId: string) {
  await verifyAdminOrCsm()
  const db = createAdminClient()

  const { data: client } = await db
    .from('csm_clients')
    .select('cash_entry_id')
    .eq('id', clientId)
    .single()

  const { error } = await db
    .from('csm_clients')
    .update({ status: 'refund' })
    .eq('id', clientId)
  if (error) throw error

  if (client?.cash_entry_id) {
    await db.from('paye_entries').delete().eq('cash_entry_id', client.cash_entry_id)
    await db.from('cash_entries').delete().eq('id', client.cash_entry_id)
  }

  revalidatePath('/csm')
  revalidatePath(`/csm/${clientId}`)
  revalidatePath('/cashcollect')
  revalidatePath('/dashboard')
  revalidatePath('/payes')
}

// ── Notes ───────────────────────────────────────────────────────────
export async function updateNotes(clientId: string, notes: string) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ notes: notes || null }).eq('id', clientId)
  if (error) throw error
  revalidatePath(`/csm/${clientId}`)
}
