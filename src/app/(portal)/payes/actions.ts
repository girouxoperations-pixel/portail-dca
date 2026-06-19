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
    .from('profiles').select('roles').eq('id', user.id).single()

  const userRoles = (profil?.roles ?? []) as string[]
  if (!profil || !userRoles.some((r: string) => roles.includes(r))) throw new Error('Non autorisé')
  return { userId: user.id, role: userRoles[0] as string }
}

// ── Actions ──────────────────────────────────────────────────────────

export async function creerPaye(formData: FormData) {
  const { userId } = await requireRole(['admin'])
  const db = createAdminClient()

  const { error } = await db.from('paye_entries').insert({
    period_label:      formData.get('period_label') as string,
    month:             Number(formData.get('month')),
    year:              Number(formData.get('year')),
    client_name:       formData.get('client_name') as string,
    closer_id:         (formData.get('closer_id') as string) || null,
    setter_id:         (formData.get('setter_id') as string) || null,
    montant:           Number(formData.get('montant')),
    commission:        Number(formData.get('commission')),
    commission_setter: Number(formData.get('commission_setter')),
    statut:            formData.get('statut') as string,
    notes:             (formData.get('notes') as string) || null,
    created_by:        userId,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/payes')
}

export async function basculerStatut(id: string, statutActuel: string) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db
    .from('paye_entries')
    .update({ statut: statutActuel === 'Payé' ? 'En attente' : 'Payé' })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/payes')
}

export async function supprimerPaye(id: string) {
  await requireRole(['admin'])
  const db = createAdminClient()

  const { error } = await db.from('paye_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/payes')
}

export async function modifierPaye(id: string, data: {
  client_name?:       string
  commission?:        number
  commission_setter?: number
  montant?:           number
  notes?:             string | null
}) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db.from('paye_entries').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/payes')
}

export async function approuverPeriode(periodLabel: string) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db
    .from('paye_entries')
    .update({ statut: 'Payé' })
    .eq('period_label', periodLabel)
    .eq('statut', 'En attente')

  if (error) throw new Error(error.message)
  revalidatePath('/payes')
}

export async function approuverPayesBatch(ids: string[]) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db
    .from('paye_entries')
    .update({ statut: 'Payé' })
    .in('id', ids)

  if (error) throw new Error(error.message)
  revalidatePath('/payes')
}

export async function ajouterBonusPeriode(
  items: Array<{ uid: string; role: 'closer' | 'setter'; bonus: number; seuil: number }>,
  period: { label: string; month: number; year: number },
): Promise<{ inserted: number; skipped: number }> {
  const { userId } = await requireRole(['admin'])
  if (items.length === 0) return { inserted: 0, skipped: 0 }

  const db = createAdminClient()

  // Find existing bonus entries for this period to prevent duplicates
  const { data: existing } = await db
    .from('paye_entries')
    .select('closer_id, setter_id')
    .eq('period_label', period.label)
    .ilike('notes', '%Bonus palier%')

  const existingClosers = new Set((existing ?? []).map(e => e.closer_id).filter(Boolean) as string[])
  const existingSetters = new Set((existing ?? []).map(e => e.setter_id).filter(Boolean) as string[])

  const toInsert = items.filter(i =>
    i.role === 'closer' ? !existingClosers.has(i.uid) : !existingSetters.has(i.uid)
  )

  if (toInsert.length === 0) return { inserted: 0, skipped: items.length }

  const { error } = await db.from('paye_entries').insert(
    toInsert.map(i => ({
      period_label:      period.label,
      month:             period.month,
      year:              period.year,
      client_name:       `— Bonus palier ${i.seuil.toLocaleString('fr-FR')} $ —`,
      closer_id:         i.role === 'closer' ? i.uid : null,
      setter_id:         i.role === 'setter' ? i.uid : null,
      montant:           i.bonus,
      commission:        i.role === 'closer' ? i.bonus : 0,
      commission_setter: i.role === 'setter' ? i.bonus : 0,
      statut:            'En attente',
      notes:             `Bonus palier ${i.seuil.toLocaleString('fr-FR')} $`,
      created_by:        userId,
    }))
  )

  if (error) throw new Error(error.message)
  revalidatePath('/payes')
  return { inserted: toInsert.length, skipped: items.length - toInsert.length }
}

export async function assignerMVP(
  personId: string,
  personRole: string,
  periodLabel: string,
  month: number,
  year: number,
) {
  const { userId } = await requireRole(['admin'])
  const db = createAdminClient()
  const isCloser = personRole === 'closer'

  const { error } = await db.from('paye_entries').insert({
    period_label:      periodLabel,
    month,
    year,
    client_name:       '— MVP du mois —',
    closer_id:         isCloser ? personId : null,
    setter_id:         isCloser ? null : personId,
    montant:           500,
    commission:        isCloser ? 500 : 0,
    commission_setter: isCloser ? 0 : 500,
    statut:            'En attente',
    notes:             'Bonus MVP du mois (500 $)',
    created_by:        userId,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/payes')
}
