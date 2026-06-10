import { redirect }         from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CloserFollowupView    from './CloserFollowupView'
import AdminFollowupView     from './AdminFollowupView'

export default async function SuiviClientPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const role = profile.role
  if (role === 'setter') redirect('/dashboard')

  const db = createAdminClient()

  if (role === 'closer') {
    const { data: followups } = await db
      .from('client_followups')
      .select('*')
      .eq('closer_id', user.id)
      .order('close_date', { ascending: false })

    return <CloserFollowupView followups={followups ?? []} />
  }

  // admin / csm
  const [{ data: followups }, { data: profiles }] = await Promise.all([
    db.from('client_followups')
      .select('*')
      .order('close_date', { ascending: false }),
    db.from('profiles')
      .select('id, full_name')
      .eq('role', 'closer'),
  ])

  return (
    <AdminFollowupView
      followups={followups ?? []}
      profiles={profiles ?? []}
    />
  )
}
