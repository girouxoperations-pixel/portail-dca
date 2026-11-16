import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { utilisateurCoach } from './actions'
import CoachView, { type Conversation, type Message } from './CoachView'

export default async function CoachPage() {
  const u = await utilisateurCoach()
  if (!u) redirect('/dashboard')

  const db = createAdminClient()
  // Chaque closer voit ses conversations ; Samuel voit aussi celles de toute l'équipe.
  let q = db.from('coach_conversations').select('id, user_id, user_name, titre, created_at, updated_at')
    .order('updated_at', { ascending: false }).limit(200)
  if (!u.estSamuel) q = q.eq('user_id', u.id)
  const { data: convs } = await q

  const ids = (convs ?? []).map(c => c.id)
  const { data: msgs } = ids.length
    ? await db.from('coach_messages').select('id, conversation_id, role, content, created_at')
        .in('conversation_id', ids).order('created_at')
    : { data: [] }

  return (
    <CoachView
      moi={{ id: u.id, nom: u.nom, estSamuel: u.estSamuel }}
      conversations={(convs ?? []) as Conversation[]}
      messages={(msgs ?? []) as Message[]}
    />
  )
}
