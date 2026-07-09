'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nowQC }             from '@/lib/dates'

// ── Guard : admin seulement ──────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profil } = await supabase
    .from('profiles').select('roles').eq('id', user.id).single()
  const userRoles = (profil?.roles ?? []) as string[]
  if (!profil || !userRoles.includes('admin')) throw new Error('Accès refusé — rôle admin requis')

  return { userId: user.id }
}

// ── Inviter un nouveau membre ────────────────────────────────────────
export async function inviterMembre(formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const email    = (formData.get('email')     as string)?.trim().toLowerCase()
  const fullName = (formData.get('full_name') as string)?.trim()
  const role     = formData.get('role')       as string

  if (!email || !fullName || !role) throw new Error('Tous les champs sont requis')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portail-dca.vercel.app'
  const { error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
    redirectTo: `${siteUrl}/reset-password`,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/admin')
}

// ── Modifier un membre ───────────────────────────────────────────────
export async function modifierMembre(id: string, formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const fullName = (formData.get('full_name') as string)?.trim()
  const roles    = formData.getAll('roles')   as string[]

  if (!fullName || !roles.length) throw new Error('Tous les champs sont requis')

  const { error: profileError } = await db
    .from('profiles')
    .update({ full_name: fullName, roles })
    .eq('id', id)
  if (profileError) throw new Error(profileError.message)

  const { error: authError } = await db.auth.admin.updateUserById(id, {
    user_metadata: { full_name: fullName, role: roles[0], roles },
  })
  if (authError) throw new Error(authError.message)

  revalidatePath('/admin')
}

// ── Supprimer un membre ──────────────────────────────────────────────
export async function supprimerMembre(id: string) {
  const { userId } = await requireAdmin()
  if (id === userId) throw new Error('Vous ne pouvez pas supprimer votre propre compte')

  const db = createAdminClient()

  // Supprime auth.users → cascade vers profiles via FK
  const { error } = await db.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin')
}

// ── Assigner MVP du mois ─────────────────────────────────────────────
export async function assignerMVP(formData: FormData) {
  const { userId } = await requireAdmin()
  const db = createAdminClient()

  const memberId = (formData.get('member_id') as string)?.trim()
  if (!memberId) throw new Error('Membre requis')

  const { month, year, day: _day } = nowQC()
  const now = new Date(year, month - 1, _day)

  // Vérifier qu'aucun MVP n'a déjà été assigné ce mois
  const { data: existing } = await db
    .from('paye_entries')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .eq('client_name', '🏆 Bonus MVP')
    .limit(1)

  if (existing && existing.length > 0) {
    throw new Error('Un MVP a déjà été assigné pour ce mois')
  }

  const { data: profil } = await db
    .from('profiles').select('roles').eq('id', memberId).single()
  if (!profil) throw new Error('Membre introuvable')

  const MOIS_FR = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
  ]
  const memberRoles = (profil.roles ?? []) as string[]
  const isSetter = memberRoles.includes('setter') && !memberRoles.includes('closer')

  const { error } = await db.from('paye_entries').insert({
    period_label:      `MVP — ${MOIS_FR[now.getMonth()]} ${year}`,
    client_name:       '🏆 Bonus MVP',
    month,
    year,
    montant:           500,
    commission:        isSetter ? null : 500,
    commission_setter: isSetter ? 500 : null,
    closer_id:         isSetter ? null : memberId,
    setter_id:         isSetter ? memberId : null,
    statut:            'En attente',
    notes:             `Bonus MVP du mois de ${MOIS_FR[now.getMonth()]} ${year}`,
    created_by:        userId,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/admin')
  revalidatePath('/payes')
}
