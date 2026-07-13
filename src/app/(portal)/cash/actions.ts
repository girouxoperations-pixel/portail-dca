'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { periodLabel }       from '@/lib/payroll'
import { nowQC }             from '@/lib/dates'

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
  return { userId: user.id, role: userRoles[0] as string }
}

function parseYearMonth(entryDate: string) {
  const [year, month] = entryDate.split('-').map(Number)
  return { year, month }
}

// ── Actions ──────────────────────────────────────────────────────────

export async function creerCash(formData: FormData) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const entryDate = formData.get('entry_date') as string
  const { year, month } = parseYearMonth(entryDate)

  const { error } = await db.from('cash_entries').insert({
    entry_date:       entryDate,
    client_name:      (formData.get('client_name') as string) || null,
    client_phone:     (formData.get('client_phone') as string) || null,
    client_email:     (formData.get('client_email') as string) || null,
    montant_courant:  Number(formData.get('montant_courant')),
    collected:        Number(formData.get('collected')),
    methode:          (formData.get('methode') as string) || null,
    close_type:       (formData.get('close_type') as string) || null,
    closed_by:        (formData.get('closed_by') as string) || null,
    set_by:           (formData.get('set_by') as string) || null,
    source_type:      (formData.get('source_type') as string) || null,
    onboarding_date:  (formData.get('onboarding_date') as string) || null,
    month,
    year,
    notes:            (formData.get('notes') as string) || null,
    created_by:       userId,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/cash')
}

export async function modifierCash(id: string, formData: FormData) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const entryDate = formData.get('entry_date') as string
  const { year, month } = parseYearMonth(entryDate)

  const { error } = await db
    .from('cash_entries')
    .update({
      entry_date:       entryDate,
      client_name:      (formData.get('client_name') as string) || null,
      client_phone:     (formData.get('client_phone') as string) || null,
      client_email:     (formData.get('client_email') as string) || null,
      montant_courant:  Number(formData.get('montant_courant')),
      collected:        Number(formData.get('collected')),
      methode:          (formData.get('methode') as string) || null,
      close_type:       (formData.get('close_type') as string) || null,
      closed_by:        (formData.get('closed_by') as string) || null,
      set_by:           (formData.get('set_by') as string) || null,
      source_type:      (formData.get('source_type') as string) || null,
      onboarding_date:  (formData.get('onboarding_date') as string) || null,
      month,
      year,
      notes:            (formData.get('notes') as string) || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/cash')
}

export async function supprimerCash(id: string) {
  await requireRole(['admin'])
  const db = createAdminClient()

  // If this cash entry is linked to a recurring occurrence, delete the whole recurring deal
  const { data: occ } = await db
    .from('recurring_occurrences')
    .select('id, recurring_deal_id')
    .eq('cash_entry_id', id)
    .maybeSingle()

  if (occ?.recurring_deal_id) {
    // Delete occurrences first (no cascade assumed), then the deal
    await db.from('recurring_occurrences').delete().eq('recurring_deal_id', occ.recurring_deal_id)
    await db.from('recurring_deals').delete().eq('id', occ.recurring_deal_id)
  }

  const { error } = await db.from('cash_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/cash')
  revalidatePath('/recurrents')
}

// ── Weekly performance (Webi / VSL) ──────────────────────────────

export async function ajouterWeeklyPerf(formData: FormData) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db.from('weekly_perf').insert({
    year:         Number(formData.get('year')),
    quarter:      Number(formData.get('quarter')),
    week_number:  Number(formData.get('week_number')),
    source_type:  formData.get('source_type') as string,
    budget:       Number(formData.get('budget'))       || 0,
    leads:        Number(formData.get('leads'))        || 0,
    webinar_att:  Number(formData.get('webinar_att'))  || 0,
    booked:       Number(formData.get('booked'))       || 0,
    showed:       Number(formData.get('showed'))       || 0,
    closed:       Number(formData.get('closed'))       || 0,
    revenue:      Number(formData.get('revenue'))      || 0,
    cash_collect: Number(formData.get('cash_collect')) || 0,
    notes:        (formData.get('notes') as string)    || null,
    created_by:   userId,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/cash')
}

export async function modifierWeeklyPerf(id: string, formData: FormData) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db.from('weekly_perf').update({
    week_number:  Number(formData.get('week_number')),
    budget:       Number(formData.get('budget'))       || 0,
    leads:        Number(formData.get('leads'))        || 0,
    webinar_att:  Number(formData.get('webinar_att'))  || 0,
    booked:       Number(formData.get('booked'))       || 0,
    showed:       Number(formData.get('showed'))       || 0,
    closed:       Number(formData.get('closed'))       || 0,
    revenue:      Number(formData.get('revenue'))      || 0,
    cash_collect: Number(formData.get('cash_collect')) || 0,
    notes:        (formData.get('notes') as string)    || null,
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/cash')
}

export async function supprimerWeeklyPerf(id: string) {
  await requireRole(['admin'])
  const db = createAdminClient()

  const { error } = await db.from('weekly_perf').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/cash')
}

// ── Bulk import ───────────────────────────────────────────────────

export interface CashImportRow {
  date: string
  client: string
  montant: string
  collecte: string
  methode: string
  type_close: string
  closer: string
  setter: string
  source: string
  notes: string
}

export interface PerfImportRow {
  annee: string
  trimestre: string
  semaine: string
  source: string
  budget: string
  leads: string
  presentes_webi: string
  bookes: string
  shows: string
  closes: string
  revenue: string
  cash_collect: string
  notes: string
}

export async function importerCashEntries(rows: CashImportRow[]) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { data: profiles } = await db.from('profiles').select('id, full_name')
  const nameToId = new Map(
    (profiles ?? []).map(p => [p.full_name?.toLowerCase().trim(), p.id])
  )
  // First-name fallback so "Shanny" matches "Shanny Leduc" etc.
  const firstNameToId = new Map(
    (profiles ?? []).map(p => [p.full_name?.split(' ')[0]?.toLowerCase().trim(), p.id])
  )
  const resolveId = (name: string) => {
    if (!name) return null
    const key = name.toLowerCase().trim()
    return nameToId.get(key) ?? firstNameToId.get(key) ?? null
  }

  const entries = rows
    .filter(r => r.date && r.montant)
    .map(r => {
      const { year, month } = parseYearMonth(r.date)
      return {
        entry_date:      r.date,
        client_name:     r.client   || null,
        montant_courant: Number(r.montant) || 0,
        collected:       Number(r.collecte) || 0,
        methode:         r.methode  || null,
        close_type:      r.type_close || null,
        closed_by:       resolveId(r.closer ?? ''),
        set_by:          resolveId(r.setter ?? ''),
        source_type:     (['webi', 'vsl'].includes(r.source?.toLowerCase())
                           ? r.source.toLowerCase() : null) as 'webi' | 'vsl' | null,
        notes:           r.notes || null,
        month,
        year,
        created_by:      userId,
      }
    })

  if (entries.length === 0) throw new Error('Aucune ligne valide trouvée')

  const CHUNK = 100
  const insertedEntries: { id: string; entry_date: string; client_name: string | null; montant_courant: number; collected: number; closed_by: string | null; set_by: string | null; month: number | null; year: number | null }[] = []

  for (let i = 0; i < entries.length; i += CHUNK) {
    const { data, error } = await db
      .from('cash_entries')
      .insert(entries.slice(i, i + CHUNK))
      .select('id, entry_date, client_name, montant_courant, collected, closed_by, set_by, month, year')
    if (error) throw new Error(error.message)
    if (data) insertedEntries.push(...data)
  }

  // Create paye_entries for all inserted deals that have a collected amount
  const payeRows = insertedEntries
    .filter(e => e.collected > 0 && (e.closed_by || e.set_by))
    .map(e => ({
      cash_entry_id:     e.id,
      period_label:      periodLabel(e.entry_date),
      month:             e.month,
      year:              e.year,
      client_name:       e.client_name ?? 'Client',
      closer_id:         e.closed_by,
      setter_id:         e.set_by,
      montant:           e.montant_courant,
      commission:        Math.round(e.collected * TAUX_CLOSER * 100) / 100,
      commission_setter: Math.round(e.collected * TAUX_SETTER * 100) / 100,
      statut:            'En attente',
      created_by:        userId,
    }))

  if (payeRows.length > 0) {
    for (let i = 0; i < payeRows.length; i += CHUNK) {
      const { error } = await db.from('paye_entries').insert(payeRows.slice(i, i + CHUNK))
      if (error) throw new Error(error.message)
    }
  }

  revalidatePath('/cash')
  revalidatePath('/payes')
  return { count: entries.length }
}

export interface RecurringDealRow {
  originalDate:    string   // YYYY-MM-DD — used for day-of-month in occurrences
  client:          string
  montant:         string   // monthly installment amount
  collecte:        string   // amount actually collected in the import month
  methode:         string
  closer:          string
  setter:          string
  notes:           string
  versementsTotal?: number  // explicit count; if absent, inferred from montant
}

export async function importerRecurringDeals(
  rows: RecurringDealRow[],
  collectYear: number,
  collectMonth: number,
  forceCreate = false,
) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { data: profiles } = await db.from('profiles').select('id, full_name')
  const nameToId = new Map((profiles ?? []).map(p => [p.full_name?.toLowerCase().trim(), p.id]))
  const firstNameToId = new Map((profiles ?? []).map(p => [p.full_name?.split(' ')[0]?.toLowerCase().trim(), p.id]))
  const resolveId = (name: string) => {
    if (!name) return null
    const key = name.toLowerCase().trim()
    return nameToId.get(key) ?? firstNameToId.get(key) ?? null
  }

  // Fall back to current month if caller didn't provide valid values
  const { year: _cy, month: _cm } = nowQC()
  const cy = collectYear  || _cy
  const cm = collectMonth || _cm

  let created = 0
  let updated = 0

  for (const r of rows) {
    if (!r.client) continue
    const montant  = Number(r.montant)  || 0
    const collecte = Number(r.collecte) || 0

    // Check if a deal for this client already exists (e.g. from a prior month's import)
    const existingDealResult = forceCreate ? null : await db
      .from('recurring_deals')
      .select('id, versements_total')
      .ilike('client_name', r.client)
      .maybeSingle()
    const existingDeal = existingDealResult?.data ?? null

    if (existingDeal) {
      // Deal exists — add the collect-month occurrence if not already there
      const { data: existingOcc } = await db
        .from('recurring_occurrences')
        .select('id')
        .eq('recurring_deal_id', existingDeal.id)
        .eq('mois', cm)
        .eq('annee', cy)
        .maybeSingle()

      if (!existingOcc) {
        const { data: cashEntry } = await db
          .from('cash_entries')
          .select('id')
          .ilike('client_name', r.client)
          .eq('year', cy)
          .eq('month', cm)
          .limit(1)
          .maybeSingle()

        await db.from('recurring_occurrences').insert({
          recurring_deal_id: existingDeal.id,
          mois:              cm,
          annee:             cy,
          date_attendue:     r.originalDate,
          montant_attendu:   montant,
          recu:              collecte > 0,
          montant_recu:      collecte > 0 ? collecte : null,
          date_recue:        collecte > 0 ? r.originalDate : null,
          cash_entry_id:     cashEntry?.id ?? null,
        })

        // Auto-deactivate if all versements now received
        if (existingDeal.versements_total) {
          const { data: allOccs } = await db
            .from('recurring_occurrences')
            .select('recu')
            .eq('recurring_deal_id', existingDeal.id)
          if (allOccs && allOccs.length >= existingDeal.versements_total && allOccs.every(o => o.recu)) {
            await db.from('recurring_deals').update({ actif: false }).eq('id', existingDeal.id)
          }
        }
      }

      updated++
      continue
    }

    // No existing deal — first import for this client, create deal + occurrences
    const inferred = montant > 0 ? Math.round(4000 / montant) : 2
    const versementsTotal = r.versementsTotal ?? ((inferred === 2 || inferred === 3) ? inferred : 2)

    const { data: deal, error } = await db
      .from('recurring_deals')
      .insert({
        client_name:      r.client,
        closer_id:        resolveId(r.closer),
        setter_id:        resolveId(r.setter),
        montant_mensuel:  montant,
        date_debut:       r.originalDate,
        versements_total: versementsTotal,
        notes:            r.notes || null,
        created_by:       userId,
      })
      .select('id')
      .single()

    if (error || !deal) continue

    // Generate occurrences up to and including the collect month
    const start = new Date(r.originalDate + 'T00:00:00')
    const baseDay = start.getDate()
    const occs: object[] = []
    let collectMonthDateAttendue = ''

    for (let i = 0; i < versementsTotal; i++) {
      const d = new Date(start)
      d.setDate(1)
      d.setMonth(d.getMonth() + i)
      const ld = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(baseDay, ld))

      const occMois  = d.getMonth() + 1
      const occAnnee = d.getFullYear()
      const dateAttendue = d.toISOString().split('T')[0]

      const isBeforeCollect = occAnnee < cy || (occAnnee === cy && occMois < cm)
      const isCollectMonth  = occAnnee === cy && occMois === cm

      if (!isBeforeCollect && !isCollectMonth) continue
      if (isCollectMonth) collectMonthDateAttendue = dateAttendue

      occs.push({
        recurring_deal_id: deal.id,
        mois:              occMois,
        annee:             occAnnee,
        date_attendue:     dateAttendue,
        montant_attendu:   montant,
        recu:        isBeforeCollect || (isCollectMonth && collecte > 0),
        montant_recu: isBeforeCollect ? montant : (isCollectMonth && collecte > 0 ? collecte : null),
        date_recue:   isBeforeCollect ? dateAttendue : (isCollectMonth && collecte > 0 ? dateAttendue : null),
      })
    }

    const { error: occErr } = await db.from('recurring_occurrences').insert(occs)
    if (occErr) continue

    // Link the collect-month occurrence to the existing cash_entry
    if (collecte > 0 && collectMonthDateAttendue) {
      const { data: cashEntry } = await db
        .from('cash_entries')
        .select('id')
        .ilike('client_name', r.client)
        .eq('year', cy)
        .eq('month', cm)
        .limit(1)
        .maybeSingle()

      if (cashEntry) {
        await db.from('recurring_occurrences')
          .update({ cash_entry_id: cashEntry.id })
          .eq('recurring_deal_id', deal.id)
          .eq('mois', cm)
          .eq('annee', cy)
      }
    }

    created++
  }

  revalidatePath('/recurrents')
  revalidatePath('/cash')
  return { count: created + updated, created, updated }
}

export async function importerWeeklyPerfs(rows: PerfImportRow[]) {
  const { userId } = await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const perfs = rows
    .filter(r => r.annee && r.trimestre && r.semaine && r.source)
    .map(r => ({
      year:         Number(r.annee),
      quarter:      Number(r.trimestre),
      week_number:  Number(r.semaine),
      source_type:  r.source.toLowerCase() as 'webi' | 'vsl',
      budget:       Number(r.budget)        || 0,
      leads:        Number(r.leads)         || 0,
      webinar_att:  Number(r.presentes_webi)|| 0,
      booked:       Number(r.bookes)        || 0,
      showed:       Number(r.shows)         || 0,
      closed:       Number(r.closes)        || 0,
      revenue:      Number(r.revenue)       || 0,
      cash_collect: Number(r.cash_collect)  || 0,
      notes:        r.notes || null,
      created_by:   userId,
    }))

  if (perfs.length === 0) throw new Error('Aucune ligne valide trouvée')

  const { error } = await db
    .from('weekly_perf')
    .upsert(perfs, { onConflict: 'year,quarter,week_number,source_type' })
  if (error) throw new Error(error.message)

  revalidatePath('/cash')
  return { count: perfs.length }
}
