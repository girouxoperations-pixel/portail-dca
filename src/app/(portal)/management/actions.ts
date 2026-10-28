'use server'

import { revalidatePath }   from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

export type TaskCategory = 'remboursement' | 'plateforme' | 'paie' | 'csm' | 'admin' | 'autre'
export type TaskStatus   = 'a_faire' | 'en_cours' | 'complete'

export interface TaskPayload {
  title:       string
  category:    TaskCategory
  assigned_to: string | null
  due_date:    string | null
  notes:       string | null
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()
  const roles: string[] = [profile?.role ?? '', ...((profile?.roles as string[] | null) ?? [])]
  if (!roles.some(r => ['admin', 'head_csm'].includes(r))) throw new Error('Accès refusé')
  return user.id
}

export async function creerTache(payload: TaskPayload) {
  const userId = await assertAdmin()
  const db = createAdminClient()
  const { error } = await db.from('management_tasks').insert({
    ...payload,
    created_by: userId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/management')
}

export async function modifierTache(id: string, payload: TaskPayload) {
  await assertAdmin()
  const db = createAdminClient()
  const { error } = await db.from('management_tasks')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/management')
}

export async function changerStatut(id: string, status: TaskStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const db = createAdminClient()
  const { error } = await db.from('management_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/management')
}

export async function supprimerTache(id: string) {
  await assertAdmin()
  const db = createAdminClient()
  const { error } = await db.from('management_tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/management')
}
