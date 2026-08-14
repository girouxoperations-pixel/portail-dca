'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayQC }           from '@/lib/dates'
import { periodLabel }       from '@/lib/payroll'

// ── Commission helpers ────────────────────────────────────────────────

async function insertCommission(db: ReturnType<typeof createAdminClient>, {
  csmId, clientId, clientName, type, amount, description,
}: {
  csmId:      string
  clientId:   string
  clientName: string
  type:       'cert_setter' | 'placement' | 'cert_closer'
  amount:     number
  description: string
}) {
  const today = todayQC()
  const [year, month] = today.split('-').map(Number)
  await db.from('csm_commissions').insert({
    csm_id: csmId, client_id: clientId, client_name: clientName,
    type, amount, description, month, year,
  })
}

async function verifyAdminOrCsm() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  const userRoles = (profile?.roles ?? []) as string[]
  if (!profile || !userRoles.some((r: string) => ['admin', 'csm', 'head_csm'].includes(r))) throw new Error('Forbidden')
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
  if (num === 4 && fields.date) {
    const { data: client } = await db.from('csm_clients')
      .select('csm_id, name, cert_setter_done').eq('id', clientId).single()
    if (client && !client.cert_setter_done && client.csm_id) {
      await insertCommission(db, {
        csmId: client.csm_id, clientId, clientName: client.name,
        type: 'cert_setter', amount: 50,
        description: `Certification setter — ${client.name}`,
      })
    }
    update.cert_setter_done = true
  }

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

  // Fetch client before update for commission logic
  const { data: client } = await db.from('csm_clients')
    .select('csm_id, name, cert_setter_done, cert_closer_done, opportunity_setter, opportunity_closer')
    .eq('id', clientId).single()

  const { error } = await db.from('csm_clients').update({ [field]: value }).eq('id', clientId)
  if (error) throw error

  // If no CSM assigned, default to Jacinthe
  let csmId = client?.csm_id
  if (!csmId) {
    const { data: jacinthe } = await db.from('profiles')
      .select('id').ilike('full_name', 'Jacinthe%').limit(1).single()
    csmId = jacinthe?.id ?? null
  }

  if (csmId) {
    if (value) {
      // Auto-commission on first-time milestone trigger
      if (field === 'cert_setter_done' && !client.cert_setter_done) {
        await insertCommission(db, {
          csmId, clientId, clientName: client.name,
          type: 'cert_setter', amount: 50,
          description: `Certification setter — ${client.name}`,
        })
      }
      if (field === 'cert_closer_done' && !client.cert_closer_done) {
        await insertCommission(db, {
          csmId, clientId, clientName: client.name,
          type: 'cert_closer', amount: 150,
          description: `Certification closer — ${client.name}`,
        })
      }
      // Placement: only once per client (neither opportunity was set before)
      if ((field === 'opportunity_setter' || field === 'opportunity_closer')
        && !client.opportunity_setter && !client.opportunity_closer) {
        await insertCommission(db, {
          csmId, clientId, clientName: client.name,
          type: 'placement', amount: 100,
          description: `Placement — ${client.name}`,
        })
      }
    } else {
      // Uncheck removes the associated commission
      if (field === 'cert_setter_done') {
        await db.from('csm_commissions')
          .delete()
          .eq('client_id', clientId)
          .eq('type', 'cert_setter')
      }
      if (field === 'cert_closer_done') {
        await db.from('csm_commissions')
          .delete()
          .eq('client_id', clientId)
          .eq('type', 'cert_closer')
      }
    }
  }

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

// ── Payment type ─────────────────────────────────────────────────────
export async function updatePaymentType(clientId: string, paymentType: string) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ payment_type: paymentType }).eq('id', clientId)
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

// ── Remboursement avec montant : crée les entrées paye négatives + propage ──
export async function marquerRemboursementAvecMontant(clientId: string, montantAvantTaxe: number) {
  await verifyAdminOrCsm()
  const db = createAdminClient()

  const { data: client } = await db
    .from('csm_clients')
    .select('cash_entry_id, name')
    .eq('id', clientId)
    .single()
  if (!client) throw new Error('Client introuvable')

  const dateStr   = todayQC()
  const [year, month] = dateStr.split('-').map(Number)
  const pLabel    = periodLabel(dateStr)

  let closerId: string | null = null
  let setterId: string | null = null

  let resolvedCashEntryId: string | null = client.cash_entry_id

  // Fallback: if no cash_entry_id, look up by client name
  if (!resolvedCashEntryId && client.name) {
    const { data: found } = await db
      .from('cash_entries')
      .select('id')
      .ilike('client_name', client.name.trim())
      .eq('is_refunded', false)
      .order('entry_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    resolvedCashEntryId = found?.id ?? null
  }

  if (resolvedCashEntryId) {
    const { data: payeEntry } = await db
      .from('paye_entries')
      .select('closer_id, setter_id')
      .eq('cash_entry_id', resolvedCashEntryId)
      .maybeSingle()

    closerId = payeEntry?.closer_id ?? null
    setterId = payeEntry?.setter_id ?? null

    await db.from('paye_entries')
      .update({
        montant:           0,
        commission:        0,
        commission_setter: 0,
        statut:            'Remboursé',
        notes:             `[REMBOURSÉ le ${dateStr}] — ${client.name ?? ''}`,
      })
      .eq('cash_entry_id', resolvedCashEntryId)

    await db.from('cash_entries')
      .update({
        collected:   0,
        close_type:  'refund',
        is_refunded: true,
        notes:       `[REMBOURSÉ le ${dateStr}]`,
      })
      .eq('id', resolvedCashEntryId)
  }

  // Insert negative paye entries (closer 10%, setter 5%)
  if (closerId || setterId) {
    const commCloser = Math.round(montantAvantTaxe * 0.10 * 100) / 100
    const commSetter = Math.round(montantAvantTaxe * 0.05 * 100) / 100
    await db.from('paye_entries').insert({
      period_label:      pLabel,
      month,
      year,
      client_name:       client.name ?? '',
      closer_id:         closerId,
      setter_id:         setterId,
      montant:           -montantAvantTaxe,
      commission:        closerId ? -commCloser : 0,
      commission_setter: setterId ? -commSetter : 0,
      statut:            'En attente',
      notes:             'Remboursement',
    })
  }

  await db.from('csm_clients').update({ status: 'refund' }).eq('id', clientId)

  await db.from('cm_followups').update({ status: 'remboursee' }).eq('csm_client_id', clientId)
  if (client.name) {
    await db.from('cm_followups').update({ status: 'remboursee' }).ilike('client_name', client.name.trim())
  }

  if (client.name) {
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
          raison_annulation: `Remboursement — ${dateStr}`,
        })
        .in('id', activeDeals.map(d => d.id))
    }
  }

  revalidatePath('/csm')
  revalidatePath(`/csm/${clientId}`)
  revalidatePath('/payes')
  revalidatePath('/recurrents')
  revalidatePath('/clients')
  revalidatePath('/cm')
  revalidatePath('/cashcollect')
  revalidatePath('/cash')
  revalidatePath('/dashboard')
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
  csm_id?:          string | null
}) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  let csmIdManuel = data.csm_id || null
  if (!csmIdManuel) {
    const { data: jacinthe } = await db.from('profiles')
      .select('id').ilike('full_name', 'Jacinthe%').limit(1).single()
    csmIdManuel = jacinthe?.id ?? null
  }

  const { error } = await db.from('csm_clients').insert({
    name:            data.name.trim(),
    enrollment_date: data.enrollment_date,
    payment_type:    data.payment_type || 'pif',
    phone:           data.phone || null,
    email:           data.email || null,
    csm_id:          csmIdManuel,
    status:          'active',
  })
  if (error) throw error
  revalidatePath('/csm')
}

export async function supprimerCsmClient(clientId: string) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').delete().eq('id', clientId)
  if (error) throw error
  revalidatePath('/csm')
}

export async function updateCsmId(clientId: string, csmId: string | null) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update({ csm_id: csmId || null }).eq('id', clientId)
  if (error) throw error
  revalidatePath('/csm')
}

// ── Tâches CSM ──────────────────────────────────────────────────────
export async function creerTache(clientId: string, title: string, dueDate: string) {
  await verifyAdminOrCsm()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = createAdminClient()
  const { error } = await db.from('csm_tasks').insert({
    csm_client_id: clientId,
    title:         title.trim(),
    due_date:      dueDate,
    created_by:    user?.id ?? null,
  })
  if (error) throw error
  revalidatePath('/csm')
}

export async function toggleTache(taskId: string, done: boolean) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_tasks').update({
    done,
    done_at: done ? new Date().toISOString() : null,
  }).eq('id', taskId)
  if (error) throw error
  revalidatePath('/csm')
}

export async function supprimerTache(taskId: string) {
  await verifyAdminOrCsm()
  const db = createAdminClient()
  const { error } = await db.from('csm_tasks').delete().eq('id', taskId)
  if (error) throw error
  revalidatePath('/csm')
}

export async function genererTachesVirement(): Promise<{ created: number }> {
  await verifyAdminOrCsm()
  const db = createAdminClient()

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const d1 = new Date(now); d1.setDate(d1.getDate() + 1)
  const d3 = new Date(now); d3.setDate(d3.getDate() + 3)
  const windowStart = d1.toISOString().slice(0, 10)
  const windowEnd   = d3.toISOString().slice(0, 10)

  const moisFr = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.']

  const { data: occurrences } = await db
    .from('recurring_occurrences')
    .select('id, date_attendue, recurring_deal_id, recurring_deals(client_name, methode_paiement)')
    .eq('recu', false)
    .gte('date_attendue', windowStart)
    .lte('date_attendue', windowEnd)

  if (!occurrences?.length) { revalidatePath('/csm'); return { created: 0 } }

  const virementOccs = occurrences.filter(o => {
    const deal = Array.isArray(o.recurring_deals) ? o.recurring_deals[0] : o.recurring_deals
    return deal?.methode_paiement === 'virement'
  })

  if (!virementOccs.length) { revalidatePath('/csm'); return { created: 0 } }

  const { data: csmClients } = await db.from('csm_clients').select('id, name')

  const occurrenceIds = virementOccs.map(o => o.id)
  const { data: existingTasks } = await db
    .from('csm_tasks')
    .select('recurring_occurrence_id')
    .in('recurring_occurrence_id', occurrenceIds)

  const alreadyCreated = new Set((existingTasks ?? []).map(t => t.recurring_occurrence_id))

  const toInsert: { csm_client_id: string; recurring_occurrence_id: string; title: string; due_date: string }[] = []

  for (const occ of virementOccs) {
    if (alreadyCreated.has(occ.id)) continue

    const deal = Array.isArray(occ.recurring_deals) ? occ.recurring_deals[0] : occ.recurring_deals
    if (!deal?.client_name) continue

    const needle = deal.client_name.toLowerCase().trim()
    const csmClient = (csmClients ?? []).find(c => {
      const hay = (c.name ?? '').toLowerCase().trim()
      return hay === needle || (hay.startsWith(needle.split(' ')[0]) && needle.startsWith(hay.split(' ')[0]))
    })

    if (!csmClient) continue

    const [, dm, dd] = occ.date_attendue.split('-').map(Number)
    const title = `Email virement — ${deal.client_name} (dû le ${dd} ${moisFr[dm - 1]})`

    toInsert.push({ csm_client_id: csmClient.id, recurring_occurrence_id: occ.id, title, due_date: todayStr })
  }

  if (toInsert.length > 0) {
    await db.from('csm_tasks').insert(toInsert)
  }

  revalidatePath('/csm')
  return { created: toInsert.length }
}
