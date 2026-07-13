'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { periodLabel } from '@/lib/payroll'

const TAUX_CLOSER = 0.10
const TAUX_SETTER = 0.05

// ── Auth guard ──────────────────────────────────────────────────────

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


// ── Actions ──────────────────────────────────────────────────────────

export async function creerCashCollect(formData: FormData) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const entryDate      = formData.get('entry_date') as string
  const [year, month]  = entryDate.split('-').map(Number)
  const clientName     = (formData.get('client_name') as string) || null
  const clientPhone    = (formData.get('client_phone') as string) || null
  const clientEmail    = (formData.get('client_email') as string) || null
  const montantCourant = Number(formData.get('montant_courant'))
  const collected      = Number(formData.get('collected'))
  const methode        = (formData.get('methode') as string) || null
  const closedBy       = (formData.get('closed_by') as string) || null
  const setBy          = (formData.get('set_by') as string) || null
  const notes          = (formData.get('notes') as string) || null
  const onboardingDate = (formData.get('onboarding_date') as string) || null

  // 1. Insert cash entry
  const { data: cashEntry, error: cashErr } = await db
    .from('cash_entries')
    .insert({
      entry_date:      entryDate,
      client_name:     clientName,
      client_phone:    clientPhone,
      client_email:    clientEmail,
      montant_courant: montantCourant,
      collected,
      methode,
      closed_by:       closedBy,
      set_by:          setBy,
      onboarding_date: onboardingDate,
      month,
      year,
      notes,
      created_by:      userId,
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

  // 3. Si versements > 1, créer les prochains versements dans Récurrents
  const versements = Number(formData.get('versements')) || 1
  if (versements > 1) {
    const versementMontant = collected

    // Récupérer les dates spécifiques choisies par l'admin
    const futureDates: string[] = []
    for (let n = 2; n <= versements; n++) {
      const d = formData.get(`versement_date_${n}`) as string
      if (d) futureDates.push(d)
    }

    // Date de début = premier versement futur
    const dateDebut = futureDates[0] ?? (() => {
      const d = new Date(entryDate + 'T00:00:00')
      d.setMonth(d.getMonth() + 1)
      return d.toISOString().split('T')[0]
    })()

    const { data: deal } = await db.from('recurring_deals').insert({
      client_name:     clientName ?? 'Client',
      closer_id:       closedBy,
      setter_id:       setBy,
      montant_mensuel: versementMontant,
      date_debut:      dateDebut,
      notes:           `Plan ${versements} versements — deal du ${entryDate}`,
      created_by:      userId,
    }).select('id').single()

    if (deal) {
      // Si aucune date spécifique fournie, calculer au même jour du mois que le deal
      const base = new Date(entryDate + 'T00:00:00')
      const baseDay = base.getDate()

      const effectiveDates = futureDates.length > 0
        ? futureDates
        : Array.from({ length: versements - 1 }, (_, i) => {
            const d = new Date(base)
            d.setDate(1) // aller au 1er pour éviter les dépassements de fin de mois
            d.setMonth(d.getMonth() + i + 1)
            // Revenir au bon jour (ou dernier jour du mois si trop court)
            const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
            d.setDate(Math.min(baseDay, lastDay))
            return d.toISOString().split('T')[0]
          })

      const occs = effectiveDates.map(dateStr => {
        const d = new Date(dateStr + 'T00:00:00')
        return {
          recurring_deal_id: deal.id,
          mois:              d.getMonth() + 1,
          annee:             d.getFullYear(),
          date_attendue:     dateStr,
          montant_attendu:   versementMontant,
        }
      })
      await db.from('recurring_occurrences').insert(occs)
    }
  }

  // 4. Mettre à jour le payment_type CSM avec le bon nombre de versements
  //    (le trigger a créé le CSM client avec 'pif' par défaut)
  if (versements > 1) {
    await db.from('csm_clients')
      .update({ payment_type: `${versements}-vers` })
      .eq('cash_entry_id', cashEntry.id)
  }

  revalidatePath('/cashcollect')
  revalidatePath('/dashboard')
  revalidatePath('/payes')
  revalidatePath('/recurrents')
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

  // Sync linked paye entry via cash_entry_id (requires migration: add_cash_entry_id.sql)
  // If column not yet added, this silently does nothing (no matching rows)
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
  }).eq('cash_entry_id', id)

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

  // Sync commission via cash_entry_id (requires migration: add_cash_entry_id.sql)
  await db.from('paye_entries').update({
    commission:        Math.round(collected * TAUX_CLOSER * 100) / 100,
    commission_setter: Math.round(collected * TAUX_SETTER * 100) / 100,
  }).eq('cash_entry_id', id)

  revalidatePath('/cashcollect')
  revalidatePath('/dashboard')
  revalidatePath('/payes')
}

// ── Versement récurrent hors tableau ─────────────────────────────────
// Crée deal + occurrence reçue + cash entry + paye entry en un coup
export async function ajouterVersementNouveauRecurrent(formData: FormData) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const entryDate  = formData.get('entry_date') as string
  const clientName = (formData.get('client_name') as string) || 'Client'
  const closedBy   = (formData.get('closed_by') as string) || null
  const setBy      = (formData.get('set_by') as string) || null
  const montant    = Number(formData.get('montant'))
  const notes      = (formData.get('notes') as string) || null
  const [year, month] = entryDate.split('-').map(Number)

  // 1. Créer le deal récurrent
  const { data: deal, error: dealErr } = await db
    .from('recurring_deals')
    .insert({
      client_name:     clientName,
      closer_id:       closedBy,
      setter_id:       setBy,
      montant_mensuel: montant,
      date_debut:      entryDate,
      notes,
      created_by:      userId,
    })
    .select('id')
    .single()

  if (dealErr || !deal) throw new Error(dealErr?.message ?? 'Erreur deal')

  // 2. Cash entry
  const { data: cashEntry, error: cashErr } = await db
    .from('cash_entries')
    .insert({
      entry_date:      entryDate,
      client_name:     clientName,
      montant_courant: 0,
      collected:       montant,
      closed_by:       closedBy,
      set_by:          setBy,
      close_type:      'recurring',
      month,
      year,
      notes:           notes ?? `Versement récurrent — ${clientName}`,
      created_by:      userId,
    })
    .select('id')
    .single()

  if (cashErr || !cashEntry) throw new Error(cashErr?.message ?? 'Erreur cash entry')

  // 3. Paye entry
  await db.from('paye_entries').insert({
    cash_entry_id:     cashEntry.id,
    period_label:      periodLabel(entryDate),
    month,
    year,
    client_name:       clientName,
    closer_id:         closedBy,
    setter_id:         setBy,
    montant:           0,
    commission:        Math.round(montant * TAUX_CLOSER * 100) / 100,
    commission_setter: Math.round(montant * TAUX_SETTER * 100) / 100,
    statut:            'En attente',
    notes:             'Versement récurrent',
    created_by:        userId,
  })

  // 4. Occurrence reçue liée au cash entry
  await db.from('recurring_occurrences').insert({
    recurring_deal_id: deal.id,
    mois:              month,
    annee:             year,
    date_attendue:     entryDate,
    montant_attendu:   montant,
    recu:              true,
    montant_recu:      montant,
    date_recue:        entryDate,
    cash_entry_id:     cashEntry.id,
  })

  revalidatePath('/cashcollect')
  revalidatePath('/recurrents')
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
