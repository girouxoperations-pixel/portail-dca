'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { periodLabel }       from '@/lib/payroll'

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

  const entryDate      = formData.get('entry_date') as string
  const [year, month]  = entryDate.split('-').map(Number)
  const clientName     = (formData.get('client_name') as string)        || null
  const montantCourant = Number(formData.get('montant_courant'))
  const collected      = Number(formData.get('collected'))
  const methode        = (formData.get('methode') as string)             || null
  const closeType      = (formData.get('close_type') as string)          || null
  const notes          = (formData.get('notes') as string)               || null
  const setBy          = (formData.get('set_by') as string)              || null
  const planPaiement   = (formData.get('plan_paiement') as string)       || 'pif'
  const prochainV      = (formData.get('prochain_versement') as string)  || null
  const montantMensuel = Number(formData.get('montant_mensuel'))         || 0
  const nbMois         = Number(formData.get('nb_mois'))                 || 0

  // 1. Insert cash_entry
  const { data: cashEntry, error: cashErr } = await db
    .from('cash_entries')
    .insert({
      entry_date:      entryDate,
      client_name:     clientName,
      montant_courant: montantCourant,
      collected,
      methode,
      close_type:      closeType,
      closed_by:       userId,
      set_by:          setBy,
      year,
      month,
      notes,
      created_by:      userId,
    })
    .select('id')
    .single()

  if (cashErr) throw new Error(cashErr.message)

  // 2. Auto-create paye_entry
  const label            = periodLabel(entryDate)
  const commission       = Math.round(collected * TAUX_CLOSER * 100) / 100
  const commissionSetter = setBy ? Math.round(collected * TAUX_SETTER * 100) / 100 : 0

  const { error: payeErr } = await db.from('paye_entries').insert({
    cash_entry_id:     cashEntry.id,
    period_label:      label,
    month,
    year,
    client_name:       clientName,
    closer_id:         userId,
    setter_id:         setBy,
    montant:           montantCourant,
    commission,
    commission_setter: commissionSetter,
    statut:            'En attente',
    notes,
    created_by:        userId,
  })

  if (payeErr) throw new Error(payeErr.message)

  // 3. Auto-create recurring deal + occurrences (si pas PIF)
  if (planPaiement !== 'pif' && prochainV) {
    type Occ = { mois: number; annee: number; date_attendue: string; montant_attendu: number }
    const occs: Occ[] = []

    if (planPaiement === 'versements_2') {
      const reste = montantCourant - collected
      const d = new Date(prochainV + 'T00:00:00')
      occs.push({ mois: d.getMonth() + 1, annee: d.getFullYear(), date_attendue: prochainV, montant_attendu: reste })
    } else if (planPaiement === 'versements_3') {
      const montantV = Math.round(((montantCourant - collected) / 2) * 100) / 100
      const d1 = new Date(prochainV + 'T00:00:00')
      const d2 = new Date(d1)
      d2.setMonth(d2.getMonth() + 1)
      const d2str = d2.toISOString().split('T')[0]
      occs.push({ mois: d1.getMonth() + 1, annee: d1.getFullYear(), date_attendue: prochainV,  montant_attendu: montantV })
      occs.push({ mois: d2.getMonth() + 1, annee: d2.getFullYear(), date_attendue: d2str, montant_attendu: montantV })
    } else if (planPaiement === 'financement' && montantMensuel > 0 && nbMois > 0) {
      const start   = new Date(prochainV + 'T00:00:00')
      const baseDay = start.getDate()
      for (let i = 0; i < nbMois; i++) {
        const d = new Date(start)
        d.setDate(1)
        d.setMonth(d.getMonth() + i)
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
        d.setDate(Math.min(baseDay, lastDay))
        occs.push({ mois: d.getMonth() + 1, annee: d.getFullYear(), date_attendue: d.toISOString().split('T')[0], montant_attendu: montantMensuel })
      }
    }

    if (occs.length > 0) {
      const montantV =
        planPaiement === 'financement'  ? montantMensuel :
        planPaiement === 'versements_2' ? (montantCourant / 2) :
                                          (montantCourant / 3)

      const { data: rd, error: rdErr } = await db
        .from('recurring_deals')
        .insert({
          client_name:     clientName ?? '',
          closer_id:       userId,
          setter_id:       setBy,
          montant_mensuel: montantV,
          date_debut:      prochainV,
          notes,
          created_by:      userId,
        })
        .select('id')
        .single()

      if (rdErr) throw new Error(rdErr.message)

      await db.from('recurring_occurrences').insert(
        occs.map(o => ({ ...o, recurring_deal_id: rd.id })),
      )
    }
  }

  // 4. Upsert closer_entries pour la journée (+1 close, +cash, +revenue)
  const { data: existing } = await db
    .from('closer_entries')
    .select('id, closes, cash_collected, revenue')
    .eq('user_id', userId)
    .eq('entry_date', entryDate)
    .maybeSingle()

  if (existing) {
    await db.from('closer_entries').update({
      closes:         existing.closes         + 1,
      cash_collected: existing.cash_collected + collected,
      revenue:        existing.revenue        + montantCourant,
    }).eq('id', existing.id)
  } else {
    await db.from('closer_entries').insert({
      user_id:         userId,
      entry_date:      entryDate,
      scheduled_calls: 0,
      show_calls:      0,
      pitch_calls:     0,
      closes:          1,
      cash_collected:  collected,
      revenue:         montantCourant,
      created_by:      userId,
    })
  }

  revalidatePath('/closer')
  revalidatePath('/dashboard')
}
