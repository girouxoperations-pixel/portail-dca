'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath }    from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!p || p.role !== 'admin') throw new Error('Non autorisé')
}

export async function saveOrgChart(data: object) {
  await requireAdmin()
  const db = createAdminClient()
  const { error } = await db
    .from('org_chart')
    .upsert({ id: 'main', data, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/organigramme')
}
