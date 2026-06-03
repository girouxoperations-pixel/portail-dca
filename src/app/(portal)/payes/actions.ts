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
