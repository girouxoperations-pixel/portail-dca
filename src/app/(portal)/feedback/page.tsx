import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FeedbackView from '@/components/feedback/FeedbackView'

export default async function FeedbackPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profil) redirect('/login')

  const role = profil.role as string
  const db   = createAdminClient()

  const [{ data: feedbacks }, { data: closers }] = await Promise.all([
    db.from('feedback_entries')
      .select('*')
      .order('call_date', { ascending: false }),
    db.from('profiles')
      .select('id, full_name')
      .eq('role', 'closer'),
  ])

  return (
    <FeedbackView
      feedbacks={feedbacks ?? []}
      closers={closers   ?? []}
      userId={user.id}
      role={role}
    />
  )
}
