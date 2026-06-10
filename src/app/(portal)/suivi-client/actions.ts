'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function toggleMessage(
  followupId: string,
  messageNum: 1 | 2 | 3,
  done: boolean,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const db = createAdminClient()

  // Vérifier que le closer est bien propriétaire de ce suivi
  const { data: row } = await db
    .from('client_followups')
    .select('closer_id')
    .eq('id', followupId)
    .single()

  if (!row || row.closer_id !== user.id) throw new Error('Accès refusé')

  await db
    .from('client_followups')
    .update({
      [`message${messageNum}_done`]: done,
      [`message${messageNum}_date`]: done ? new Date().toISOString().split('T')[0] : null,
    })
    .eq('id', followupId)

  revalidatePath('/suivi-client')
}
