'use server'

import { revalidatePath }    from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profil } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profil?.role !== 'admin') throw new Error('Non autorisé')
}

async function requireAdminOrCsm() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profil } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  const roles = (profil?.roles ?? []) as string[]
  if (!roles.some(r => ['admin', 'csm', 'head_csm'].includes(r))) throw new Error('Non autorisé')
}

// Update contact info directly on csm_clients (for 2026 clients without cash_entry link)
export async function updateCsmClientContact(
  id: string,
  data: { phone?: string | null; email?: string | null; methode?: string | null },
) {
  await requireAdmin()
  const db = createAdminClient()
  const { error } = await db.from('csm_clients').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/clients')
}

// Update contact info on clients_registry (for 2024/2025 historical clients)
export async function updateRegistryClientContact(
  id: string,
  data: { phone?: string | null; email?: string | null; methode?: string | null; exit_date?: string | null },
) {
  await requireAdmin()
  const db = createAdminClient()
  const { error } = await db.from('clients_registry').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/clients')
}

export async function toggleClientRefundDone(
  id: string,
  source: 'csm' | 'registry',
  done: boolean,
) {
  await requireAdminOrCsm()
  const db = createAdminClient()
  const table = source === 'csm' ? 'csm_clients' : 'clients_registry'
  const { error } = await db.from(table).update({ refund_done: done }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/clients')
}
