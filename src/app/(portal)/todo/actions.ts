'use server'

import { revalidatePath }    from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Toggle suivi message ─────────────────────────────────────────────
export async function toggleSuiviMessage(
  followupId: string,
  messageNum: 1 | 2 | 3,
  done: boolean,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'csm'

  const db = createAdminClient()

  // Closer can only update their own followups
  const query = db.from('client_followups')
  if (!isAdmin) {
    const { data: followup } = await db.from('client_followups').select('closer_id').eq('id', followupId).single()
    if (!followup || followup.closer_id !== user.id) throw new Error('Non autorisé')
  }

  const { error } = await query.update({
    [`message${messageNum}_done`]: done,
    [`message${messageNum}_date`]: done ? new Date().toISOString().split('T')[0] : null,
  }).eq('id', followupId)

  if (error) throw error
  revalidatePath('/todo')
  revalidatePath('/suivi-client')
}
