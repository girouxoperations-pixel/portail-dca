'use server'

import { revalidatePath }    from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { periodLabel }       from '@/lib/payroll'

const TAUX_CLOSER = 0.10
const TAUX_SETTER = 0.05

async function requireRole(roles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profil } = await supabase
    .from('profiles').select('roles').eq('id', user.id).single()
  const userRoles = (profil?.roles ?? []) as string[]
  if (!profil || !userRoles.some((r: string) => roles.includes(r))) throw new Error('Non autorisé')
  return { userId: user.id }
}

export async function creerRecurringDeal(data: {
  client_name:      string
  closer_id:        string | null
  setter_id:        string | null
  montant_mensuel:  number
  date_debut:       string
  versements_total: number
  notes:            string | null
}) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { data: deal, error } = await db
    .from('recurring_deals')
    .insert({ ...data, created_by: userId })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const count = data.versements_total ?? 3
  const start   = new Date(data.date_debut + 'T00:00:00')
  const baseDay = start.getDate()
  const occs = Array.from({ length: count }, (_, i) => {
    const d = new Date(start)
    d.setDate(1)
    d.setMonth(d.getMonth() + i)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(baseDay, lastDay))
    return {
      recurring_deal_id: deal.id,
      mois:              d.getMonth() + 1,
      annee:             d.getFullYear(),
      date_attendue:     d.toISOString().split('T')[0],
      montant_attendu:   data.montant_mensuel,
    }
  })

  await db.from('recurring_occurrences').insert(occs)
  revalidatePath('/recurrents')
}

export async function marquerRecu(occurrenceId: string, montantRecu: number) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { data: occ, error: occErr } = await db
    .from('recurring_occurrences')
    .select('*, recurring_deals(client_name, closer_id, setter_id)')
    .eq('id', occurrenceId)
    .single()

  if (occErr || !occ) throw new Error('Occurrence introuvable')
  if (occ.recu) throw new Error('Déjà reçue')

  const deal = occ.recurring_deals as {
    client_name: string
    closer_id:   string | null
    setter_id:   string | null
  }

  const today              = new Date().toISOString().split('T')[0]
  const [year, month]      = today.split('-').map(Number)
  const label              = periodLabel(today)
  const commission         = Math.round(montantRecu * TAUX_CLOSER * 100) / 100
  const commissionSetter   = Math.round(montantRecu * TAUX_SETTER * 100) / 100

  const { data: cashEntry, error: cashErr } = await db
    .from('cash_entries')
    .insert({
      entry_date:      today,
      client_name:     deal.client_name,
      montant_courant: montantRecu,
      collected:       montantRecu,
      closed_by:       deal.closer_id,
      set_by:          deal.setter_id,
      month,
      year,
      notes:           `Récurrent — ${occ.mois}/${occ.annee}`,
      created_by:      userId,
    })
    .select('id')
    .single()

  if (cashErr) throw new Error(cashErr.message)

  const { data: payeEntry, error: payeErr } = await db
    .from('paye_entries')
    .insert({
      cash_entry_id:     cashEntry.id,
      period_label:      label,
      month,
      year,
      client_name:       deal.client_name,
      closer_id:         deal.closer_id,
      setter_id:         deal.setter_id,
      montant:           montantRecu,
      commission,
      commission_setter: commissionSetter,
      statut:            'En attente',
      notes:             'Récurrent',
      created_by:        userId,
    })
    .select('id')
    .single()

  if (payeErr) throw new Error(payeErr.message)

  await db.from('recurring_occurrences').update({
    recu:          true,
    date_recue:    today,
    montant_recu:  montantRecu,
    cash_entry_id: cashEntry.id,
    paye_entry_id: payeEntry.id,
  }).eq('id', occurrenceId)

  // Auto-désactiver le deal si toutes les occurrences sont maintenant reçues
  const { data: toutes } = await db
    .from('recurring_occurrences')
    .select('recu')
    .eq('recurring_deal_id', occ.recurring_deal_id)

  if (toutes && toutes.every(o => o.recu)) {
    await db.from('recurring_deals').update({ actif: false }).eq('id', occ.recurring_deal_id)
  }

  revalidatePath('/recurrents')
  revalidatePath('/dashboard')
  revalidatePath('/cashcollect')
  revalidatePath('/payes')
}

export async function marquerRecuAvecSolde(
  occurrenceId: string,
  montantRecu: number,
  montantSolde: number,
  dateSolde: string,
) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { data: occ, error: occErr } = await db
    .from('recurring_occurrences')
    .select('*, recurring_deals(client_name, closer_id, setter_id)')
    .eq('id', occurrenceId)
    .single()

  if (occErr || !occ) throw new Error('Occurrence introuvable')
  if (occ.recu) throw new Error('Déjà reçue')

  const deal = occ.recurring_deals as {
    client_name: string
    closer_id:   string | null
    setter_id:   string | null
  }

  const today            = new Date().toISOString().split('T')[0]
  const [year, month]    = today.split('-').map(Number)
  const label            = periodLabel(today)
  const commission       = Math.round(montantRecu * TAUX_CLOSER * 100) / 100
  const commissionSetter = Math.round(montantRecu * TAUX_SETTER * 100) / 100

  const { data: cashEntry, error: cashErr } = await db
    .from('cash_entries')
    .insert({
      entry_date:      today,
      client_name:     deal.client_name,
      montant_courant: montantRecu,
      collected:       montantRecu,
      closed_by:       deal.closer_id,
      set_by:          deal.setter_id,
      month,
      year,
      notes:           `Récurrent (partiel) — ${occ.mois}/${occ.annee}`,
      created_by:      userId,
    })
    .select('id')
    .single()

  if (cashErr) throw new Error(cashErr.message)

  const { data: payeEntry, error: payeErr } = await db
    .from('paye_entries')
    .insert({
      cash_entry_id:     cashEntry.id,
      period_label:      label,
      month,
      year,
      client_name:       deal.client_name,
      closer_id:         deal.closer_id,
      setter_id:         deal.setter_id,
      montant:           montantRecu,
      commission,
      commission_setter: commissionSetter,
      statut:            'En attente',
      notes:             'Récurrent (partiel)',
      created_by:        userId,
    })
    .select('id')
    .single()

  if (payeErr) throw new Error(payeErr.message)

  await db.from('recurring_occurrences').update({
    recu:          true,
    date_recue:    today,
    montant_recu:  montantRecu,
    cash_entry_id: cashEntry.id,
    paye_entry_id: payeEntry.id,
  }).eq('id', occurrenceId)

  // Create pending occurrence for the remainder
  const soldeDate = new Date(dateSolde + 'T00:00:00')
  await db.from('recurring_occurrences').insert({
    recurring_deal_id: occ.recurring_deal_id,
    mois:              soldeDate.getMonth() + 1,
    annee:             soldeDate.getFullYear(),
    date_attendue:     dateSolde,
    montant_attendu:   montantSolde,
    recu:              false,
  })

  revalidatePath('/recurrents')
  revalidatePath('/cashcollect')
  revalidatePath('/payes')
}

export async function annulerRecu(occurrenceId: string) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { data: occ } = await db
    .from('recurring_occurrences')
    .select('cash_entry_id, paye_entry_id')
    .eq('id', occurrenceId)
    .single()

  if (occ?.paye_entry_id)
    await db.from('paye_entries').delete().eq('id', occ.paye_entry_id)
  if (occ?.cash_entry_id)
    await db.from('cash_entries').delete().eq('id', occ.cash_entry_id)

  await db.from('recurring_occurrences').update({
    recu: false, date_recue: null, montant_recu: null,
    cash_entry_id: null, paye_entry_id: null,
  }).eq('id', occurrenceId)

  revalidatePath('/recurrents')
  revalidatePath('/cashcollect')
  revalidatePath('/payes')
}

export async function encaisserProchainVersement(dealId: string, montant: number) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { data: deal } = await db
    .from('recurring_deals')
    .select('*, recurring_occurrences(*)')
    .eq('id', dealId)
    .single()

  if (!deal) throw new Error('Deal introuvable')

  const occs = (deal.recurring_occurrences ?? []) as { mois: number; annee: number; date_attendue: string }[]
  if (occs.length === 0) throw new Error('Aucune occurrence existante')

  // Find the last occurrence to compute the next month
  const last = occs.sort((a, b) => a.date_attendue.localeCompare(b.date_attendue)).at(-1)!
  const lastDate = new Date(last.date_attendue + 'T00:00:00')
  lastDate.setMonth(lastDate.getMonth() + 1)
  const nextMois  = lastDate.getMonth() + 1
  const nextAnnee = lastDate.getFullYear()
  const nextDate  = lastDate.toISOString().split('T')[0]
  const [year, month] = [nextAnnee, nextMois]

  // Create cash entry
  const { data: cashEntry, error: cashErr } = await db
    .from('cash_entries')
    .insert({
      entry_date:      nextDate,
      client_name:     deal.client_name,
      montant_courant: 0,
      collected:       montant,
      closed_by:       deal.closer_id,
      set_by:          deal.setter_id,
      close_type:      'recurring',
      month,
      year,
      notes:           `Versement — entente ${deal.client_name}`,
      created_by:      userId,
    })
    .select('id')
    .single()

  if (cashErr || !cashEntry) throw new Error(cashErr?.message ?? 'Erreur cash entry')

  // Create paye entry
  await db.from('paye_entries').insert({
    cash_entry_id:     cashEntry.id,
    period_label:      periodLabel(nextDate),
    month,
    year,
    client_name:       deal.client_name,
    closer_id:         deal.closer_id,
    setter_id:         deal.setter_id,
    montant:           0,
    commission:        Math.round(montant * TAUX_CLOSER * 100) / 100,
    commission_setter: Math.round(montant * TAUX_SETTER * 100) / 100,
    statut:            'En attente',
    notes:             'Versement récurrent',
    created_by:        userId,
  })

  // Create occurrence and mark as received
  const { data: occ, error: occErr } = await db
    .from('recurring_occurrences')
    .insert({
      recurring_deal_id: dealId,
      mois:              nextMois,
      annee:             nextAnnee,
      date_attendue:     nextDate,
      montant_attendu:   deal.montant_mensuel,
      recu:              true,
      montant_recu:      montant,
      date_recue:        nextDate,
      cash_entry_id:     cashEntry.id,
    })
    .select('id')
    .single()

  if (occErr) throw new Error(occErr.message)

  // Auto-deactivate if versements_total reached
  const totalRecu = occs.length + 1
  if (deal.versements_total && totalRecu >= deal.versements_total) {
    await db.from('recurring_deals').update({ actif: false }).eq('id', dealId)
  }

  revalidatePath('/recurrents')
  revalidatePath('/cash')
  revalidatePath('/payes')
}

export async function modifierRecurringDeal(id: string, data: {
  client_name:      string
  closer_id:        string | null
  setter_id:        string | null
  montant_mensuel:  number
  versements_total: number | null
  notes:            string | null
}) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()
  const { error } = await db.from('recurring_deals').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/recurrents')
}

export async function desactiverDeal(id: string) {
  await requireRole(['admin'])
  const db = createAdminClient()
  await db.from('recurring_deals').update({ actif: false }).eq('id', id)
  revalidatePath('/recurrents')
}

export async function reactiverDeal(id: string) {
  await requireRole(['admin'])
  const db = createAdminClient()
  await db.from('recurring_deals').update({ actif: true }).eq('id', id)
  revalidatePath('/recurrents')
}
