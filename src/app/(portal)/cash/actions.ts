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
