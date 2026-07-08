'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdminOrCsm() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profil || !['admin', 'csm'].includes(profil.role as string)) {
    throw new Error('Non autorisé')
  }
  return { userId: user.id, role: profil.role as string }
}

export async function ajouterDeal(data: {
  client_name:  string
  deal_date:    string | null
  montant:      number
  collected:    number
  methode:      string
  setter_name:  string
  closer_name:  string
  notes:        string
}) {
  const { userId } = await requireAdminOrCsm()
  const db = createAdminClient()

  const commission_setter = Math.round(data.montant * 0.05 * 100) / 100
  const commission_closer = Math.round(data.montant * 0.10 * 100) / 100
  const moisAmount_s = Math.round((commission_setter / 3) * 100) / 100
  const moisAmount_c = Math.round((commission_closer / 3) * 100) / 100

  const { data: deal, error } = await db.from('alveo_deals').insert({
    client_name:      data.client_name.trim(),
    deal_date:        data.deal_date || null,
    montant:          data.montant,
    collected:        data.collected,
    methode:          data.methode || 'Financement',
    setter_name:      data.setter_name.trim() || null,
    closer_name:      data.closer_name.trim() || null,
    commission_setter,
    commission_closer,
    notes:            data.notes.trim() || null,
    statut:           'actif',
    created_by:       userId,
  }).select('id').single()

  if (error) throw new Error(error.message)

  const payments = []
  if (commission_setter > 0) {
    for (const m of [1, 2, 3] as const) {
      payments.push({
        deal_id:     deal.id,
        person_role: 'setter' as const,
        mois:        m,
        amount:      moisAmount_s,
        paid:        false,
      })
    }
  }
  if (commission_closer > 0) {
    for (const m of [1, 2, 3] as const) {
      payments.push({
        deal_id:     deal.id,
        person_role: 'closer' as const,
        mois:        m,
        amount:      moisAmount_c,
        paid:        false,
      })
    }
  }

  if (payments.length > 0) {
    const { error: pe } = await db.from('alveo_payments').insert(payments)
    if (pe) throw new Error(pe.message)
  }

  revalidatePath('/alveo')
}

export async function modifierCollected(dealId: string, collected: number) {
  await requireAdminOrCsm()
  const db = createAdminClient()

  const { error } = await db
    .from('alveo_deals')
    .update({ collected })
    .eq('id', dealId)

  if (error) throw new Error(error.message)
  revalidatePath('/alveo')
}

export async function togglePaiement(paymentId: string, paid: boolean) {
  const { userId } = await requireAdminOrCsm()
  const db = createAdminClient()

  const { error } = await db
    .from('alveo_payments')
    .update({
      paid,
      paid_at: paid ? new Date().toISOString() : null,
      paid_by: paid ? userId : null,
    })
    .eq('id', paymentId)

  if (error) throw new Error(error.message)
  revalidatePath('/alveo')
}

export async function annulerDeal(dealId: string) {
  await requireAdminOrCsm()
  const db = createAdminClient()

  const { error } = await db
    .from('alveo_deals')
    .update({ statut: 'annulé' })
    .eq('id', dealId)

  if (error) throw new Error(error.message)
  revalidatePath('/alveo')
}

export async function supprimerDeal(dealId: string) {
  await requireAdminOrCsm()
  const db = createAdminClient()

  const { error } = await db.from('alveo_deals').delete().eq('id', dealId)
  if (error) throw new Error(error.message)
  revalidatePath('/alveo')
}
