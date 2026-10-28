import { redirect }         from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ManagementView        from './ManagementView'

export default async function ManagementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const userRoles: string[] = [profile.role, ...((profile.roles as string[] | null) ?? [])]
  const isAdmin = userRoles.some(r => ['admin', 'head_csm'].includes(r))

  const db = createAdminClient()

  const [{ data: tasks }, { data: members }] = await Promise.all([
    db.from('management_tasks')
      .select('*, assigned_profile:profiles!assigned_to(full_name), creator_profile:profiles!created_by(full_name)')
      .order('due_date', { ascending: true, nullsFirst: false }),
    db.from('profiles')
      .select('id, full_name, role')
      .eq('active', true)
      .order('full_name'),
  ])

  return (
    <ManagementView
      tasks={tasks ?? []}
      members={members ?? []}
      currentUserId={user.id}
      isAdmin={isAdmin}
    />
  )
}
