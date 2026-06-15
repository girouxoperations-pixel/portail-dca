'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    entry_date:      entryDate,
    client_name:     (formData.get('client_name') as string) || null,
    montant_courant: Number(formData.get('montant_courant')),
    collected:       Number(formData.get('collected')),
    methode:         (formData.get('methode') as string) || null,
    close_type:      (formData.get('close_type') as string) || null,
    closed_by:       (formData.get('closed_by') as string) || null,
    set_by:          (formData.get('set_by') as string) || null,
    source_type:     (formData.get('source_type') as string) || null,
    month,
    year,
    notes:           (formData.get('notes') as string) || null,
    created_by:      userId,
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
      entry_date:      entryDate,
      client_name:     (formData.get('client_name') as string) || null,
      montant_courant: Number(formData.get('montant_courant')),
      collected:       Number(formData.get('collected')),
      methode:         (formData.get('methode') as string) || null,
      close_type:      (formData.get('close_type') as string) || null,
      closed_by:       (formData.get('closed_by') as string) || null,
      set_by:          (formData.get('set_by') as string) || null,
      source_type:     (formData.get('source_type') as string) || null,
      month,
      year,
      notes:           (formData.get('notes') as string) || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/cash')
}

export async function supprimerCash(id: string) {
  await requireRole(['admin'])
  const db = createAdminClient()

  const { error } = await db.from('cash_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/cash')
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
  for (let i = 0; i < entries.length; i += CHUNK) {
    const { error } = await db.from('cash_entries').insert(entries.slice(i, i + CHUNK))
    if (error) throw new Error(error.message)
  }

  revalidatePath('/cash')
  return { count: entries.length }
}

export interface RecurringDealRow {
  originalDate: string  // YYYY-MM-DD — used for day-of-month in occurrences
  client: string
  montant: string       // monthly installment amount
  collecte: string      // amount actually collected in the import month
  methode: string
  closer: string
  setter: string
  notes: string
}

export async function importerRecurringDeals(rows: RecurringDealRow[]) {
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

  // Determine the import month from the first row with a date
  const firstDate = rows.find(r => r.originalDate)?.originalDate ?? '2026-06-01'
  const importYear  = Number(firstDate.split('-')[0])
  const importMonth = Number(firstDate.split('-')[1])
  // Override to the current collect month (June 2026 in this case)
  // We derive it from the cash_entries' forced date (YYYY-06-01)
  // Actually use the most common month in collecte > 0 rows, defaulting to current
  const collectMonth = importMonth  // same as file month
  const collectYear  = importYear

  let count = 0

  for (const r of rows) {
    if (!r.client) continue
    const montant  = Number(r.montant)  || 0
    const collecte = Number(r.collecte) || 0

    // date_debut = same month as the import but keep the original day-of-month
    const originalDay = Number(r.originalDate.split('-')[2] ?? '1')
    const lastDay = new Date(collectYear, collectMonth, 0).getDate()
    const day = String(Math.min(originalDay, lastDay)).padStart(2, '0')
    const dateDebut = `${collectYear}-${String(collectMonth).padStart(2, '0')}-${day}`

    const { data: deal, error } = await db
      .from('recurring_deals')
      .insert({
        client_name:     r.client,
        closer_id:       resolveId(r.closer),
        setter_id:       resolveId(r.setter),
        montant_mensuel: montant,
        date_debut:      dateDebut,
        notes:           r.notes || null,
        created_by:      userId,
      })
      .select('id')
      .single()

    if (error || !deal) continue

    // Generate 24 monthly occurrences starting from dateDebut
    const start = new Date(dateDebut + 'T00:00:00')
    const baseDay = start.getDate()
    const occs = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(start)
      d.setDate(1)
      d.setMonth(d.getMonth() + i)
      const ld = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(baseDay, ld))
      return {
        recurring_deal_id: deal.id,
        mois:              d.getMonth() + 1,
        annee:             d.getFullYear(),
        date_attendue:     d.toISOString().split('T')[0],
        montant_attendu:   montant,
      }
    })

    const { error: occErr } = await db.from('recurring_occurrences').insert(occs)
    if (occErr) continue

    // Mark this month's occurrence as received if it was collected — link to existing cash_entry
    if (collecte > 0) {
      const { data: occ } = await db
        .from('recurring_occurrences')
        .select('id')
        .eq('recurring_deal_id', deal.id)
        .eq('mois', collectMonth)
        .eq('annee', collectYear)
        .maybeSingle()

      if (occ) {
        const { data: cashEntry } = await db
          .from('cash_entries')
          .select('id')
          .ilike('client_name', r.client)
          .eq('year', collectYear)
          .eq('month', collectMonth)
          .maybeSingle()

        await db.from('recurring_occurrences').update({
          recu:          true,
          date_recue:    dateDebut,
          montant_recu:  collecte,
          cash_entry_id: cashEntry?.id ?? null,
        }).eq('id', occ.id)
      }
    }

    count++
  }

  revalidatePath('/recurrents')
  revalidatePath('/cash')
  return { count }
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
