'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Guard : admin seulement ──────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profil || profil.role !== 'admin') throw new Error('Accès refusé — rôle admin requis')

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

  // Envoie un e-mail d'invitation ; le trigger crée le profil avec le bon rôle
  const { error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
  })
  if (error) throw new Error(error.message)

  revalidatePath('/admin')
}

// ── Modifier un membre ───────────────────────────────────────────────
export async function modifierMembre(id: string, formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const fullName = (formData.get('full_name') as string)?.trim()
  const role     = formData.get('role')       as string

  if (!fullName || !role) throw new Error('Tous les champs sont requis')

  // Mettre à jour la table profiles
  const { error: profileError } = await db
    .from('profiles')
    .update({ full_name: fullName, role })
    .eq('id', id)
  if (profileError) throw new Error(profileError.message)

  // Mettre à jour les métadonnées Supabase Auth pour la cohérence
  const { error: authError } = await db.auth.admin.updateUserById(id, {
    user_metadata: { full_name: fullName, role },
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
