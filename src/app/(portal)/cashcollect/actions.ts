'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MOIS_FR } from '@/lib/constants'

const TAUX_CLOSER = 0.10
const TAUX_SETTER = 0.05

// ── Auth guard ──────────────────────────────────────────────────────

async function requireRole(roles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profil || !roles.includes(profil.role)) throw new Error('Non autorisé')
  return { userId: user.id }
}

function periodLabel(entryDateStr: string): string {
  const [yearStr, monthStr, dayStr] = entryDateStr.split('-')
  const year    = Number(yearStr)
  const month   = Number(monthStr)
  const day     = Number(dayStr)
  const lastDay = new Date(year, month, 0).getDate()
  const mois    = MOIS_FR[month - 1]
  return day <= 14
    ? `1-14 ${mois} ${year}`
    : `15-${lastDay} ${mois} ${year}`
}

// ── Actions ──────────────────────────────────────────────────────────

export async function creerCashCollect(formData: FormData) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const entryDate      = formData.get('entry_date') as string
  const [year, month]  = entryDate.split('-').map(Number)
  const clientName     = (formData.get('client_name') as string) || null
  const montantCourant = Number(formData.get('montant_courant'))
  const collected      = Number(formData.get('collected'))
  const methode        = (formData.get('methode') as string) || null
  const closedBy       = (formData.get('closed_by') as string) || null
  const setBy          = (formData.get('set_by') as string) || null
  const notes          = (formData.get('notes') as string) || null

  // 1. Insert cash entry
  const { data: cashEntry, error: cashErr } = await db
    .from('cash_entries')
    .insert({
      entry_date: entryDate,
      client_name: clientName,
      montant_courant: montantCourant,
      collected,
      methode,
      closed_by: closedBy,
      set_by: setBy,
      month,
      year,
      notes,
      created_by: userId,
    })
    .select('id')
    .single()

  if (cashErr) throw new Error(cashErr.message)

  // 2. Auto-create paye entry — commission on cash received, not deal total
  const { error: payeErr } = await db.from('paye_entries').insert({
    cash_entry_id:     cashEntry.id,
    period_label:      periodLabel(entryDate),
    month,
    year,
    client_name:       clientName ?? 'Client',
    closer_id:         closedBy,
    setter_id:         setBy,
    montant:           montantCourant,
    commission:        Math.round(collected * TAUX_CLOSER * 100) / 100,
    commission_setter: Math.round(collected * TAUX_SETTER * 100) / 100,
    statut:            'En attente',
    created_by:        userId,
  })

  if (payeErr) throw new Error(payeErr.message)

  revalidatePath('/cashcollect')
  revalidatePath('/dashboard')
  revalidatePath('/payes')
}

export async function modifierCashEntry(id: string, formData: FormData) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const entryDate      = formData.get('entry_date') as string
  const [year, month]  = entryDate.split('-').map(Number)
  const clientName     = (formData.get('client_name') as string) || null
  const montantCourant = Number(formData.get('montant_courant'))
  const collected      = Number(formData.get('collected'))
  const methode        = (formData.get('methode') as string) || null
  const closedBy       = (formData.get('closed_by') as string) || null
  const setBy          = (formData.get('set_by') as string) || null
  const notes          = (formData.get('notes') as string) || null

  // 1. Update cash entry
  const { error: cashErr } = await db
    .from('cash_entries')
    .update({ entry_date: entryDate, client_name: clientName, montant_courant: montantCourant, collected, methode, closed_by: closedBy, set_by: setBy, month, year, notes })
    .eq('id', id)

  if (cashErr) throw new Error(cashErr.message)

  // 2. Sync linked paye entry if it exists
  const { data: paye } = await db
    .from('paye_entries')
    .select('id, statut')
    .eq('cash_entry_id', id)
    .maybeSingle()

  if (paye) {
    await db.from('paye_entries').update({
      period_label:      periodLabel(entryDate),
      month,
      year,
      client_name:       clientName ?? 'Client',
      closer_id:         closedBy,
      setter_id:         setBy,
      montant:           montantCourant,
      commission:        Math.round(collected * TAUX_CLOSER * 100) / 100,
      commission_setter: Math.round(collected * TAUX_SETTER * 100) / 100,
    }).eq('id', paye.id)
  }

  revalidatePath('/cashcollect')
  revalidatePath('/dashboard')
  revalidatePath('/payes')
}

export async function modifierCollecte(id: string, collected: number) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db
    .from('cash_entries')
    .update({ collected })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Sync commission in linked paye_entry (commission is on cash received)
  await db.from('paye_entries').update({
    commission:        Math.round(collected * TAUX_CLOSER * 100) / 100,
    commission_setter: Math.round(collected * TAUX_SETTER * 100) / 100,
  }).eq('cash_entry_id', id)

  revalidatePath('/cashcollect')
  revalidatePath('/dashboard')
  revalidatePath('/payes')
}

export async function supprimerCashCollect(id: string) {
  await requireRole(['admin'])
  const db = createAdminClient()

  const { error } = await db.from('cash_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/cashcollect')
  revalidatePath('/dashboard')
  revalidatePath('/payes')
}
