'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayQC }           from '@/lib/dates'

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
  field: 'j7' | 'j24' | 'j49' | 'j63' | 'j77' | 'j90',
  done: boolean,
) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({
    [`text_${field}_done`]: done,
    [`text_${field}_date`]: done ? todayQC() : null,
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

// ── Email avis ──────────────────────────────────────────────────────
export async function updateEmailAvis(clientId: string, avis: string | null) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ email_avis: avis }).eq('id', clientId)
  if (error) throw error
  revalidatePath('/csm')
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

// ── Remboursement : marque refund + annule récurrents associés ──────────
export async function marquerRemboursement(clientId: string) {
  await verifyAdminOrCsm()
  const db = createAdminClient()

  const { data: client } = await db
    .from('csm_clients')
    .select('cash_entry_id, name')
    .eq('id', clientId)
    .single()

  const { error } = await db
    .from('csm_clients')
    .update({ status: 'refund' })
    .eq('id', clientId)
  if (error) throw error

  const today = new Date().toISOString().split('T')[0]

  if (client?.cash_entry_id) {
    // Marquer comme refund — on garde montant_courant pour affichage dans l'onglet Remboursements
    await db.from('cash_entries')
      .update({
        collected: 0,
        close_type: 'refund',
        notes: `[REMBOURSÉ le ${today}]`,
      })
      .eq('id', client.cash_entry_id)

    // Mettre à zéro les commissions et marquer comme Remboursé (garde la trace)
    await db.from('paye_entries')
      .update({
        montant: 0,
        commission: 0,
        commission_setter: 0,
        statut: 'Remboursé',
        notes: `[REMBOURSÉ le ${today}] — ${client.name ?? ''}`,
      })
      .eq('cash_entry_id', client.cash_entry_id)
  }

  // Auto-annuler tous les récurrents actifs associés à ce client
  if (client?.name) {
    const { data: activeDeals } = await db
      .from('recurring_deals')
      .select('id')
      .eq('client_name', client.name)
      .eq('actif', true)

    if (activeDeals && activeDeals.length > 0) {
      await db.from('recurring_deals')
        .update({
          actif:             false,
          annule_le:         new Date().toISOString(),
          raison_annulation: `Remboursement — ${today}`,
        })
        .in('id', activeDeals.map(d => d.id))
    }
  }

  revalidatePath('/csm')
  revalidatePath(`/csm/${clientId}`)
  revalidatePath('/cashcollect')
  revalidatePath('/dashboard')
  revalidatePath('/payes')
  revalidatePath('/recurrents')
  revalidatePath('/clients')
}

// ── Onboarding date ─────────────────────────────────────────────────
export async function updateOnboardingDate(clientId: string, date: string | null) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ onboarding_date: date || null }).eq('id', clientId)
  if (error) throw error
  revalidatePath('/csm')
}

// ── Notes ───────────────────────────────────────────────────────────
export async function updateNotes(clientId: string, notes: string) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ notes: notes || null }).eq('id', clientId)
  if (error) throw error
  revalidatePath(`/csm/${clientId}`)
}

export async function updateOnboardingNotes(clientId: string, notes: string) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ onboarding_notes: notes || null }).eq('id', clientId)
  if (error) throw error
  revalidatePath(`/csm/${clientId}`)
}

// ── Création manuelle d'un client CSM ───────────────────────────────────
export async function creerCsmClientManuel(data: {
  name:             string
  enrollment_date:  string
  payment_type:     string
  phone?:           string | null
  email?:           string | null
}) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').insert({
    name:            data.name.trim(),
    enrollment_date: data.enrollment_date,
    payment_type:    data.payment_type || 'pif',
    phone:           data.phone || null,
    email:           data.email || null,
    status:          'active',
  })
  if (error) throw error
  revalidatePath('/csm')
}
