import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CmView from '@/components/cm/CmView'

export default async function CmPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('role, roles').eq('id', user.id).single()
  if (!profil) redirect('/login')

  const userRoles = (profil.roles ?? []) as string[]
  if (!userRoles.some(r => ['admin', 'csm', 'cm'].includes(r))) redirect('/dashboard')

  const isPrivileged = userRoles.some(r => ['admin', 'csm'].includes(r))
  const db = createAdminClient()

  const query = db
    .from('cm_followups')
    .select('*, profiles!cm_id(full_name)')
    .order('created_at', { ascending: false })

  // CM users see only their own followups
  const { data: followups } = isPrivileged
    ? await query
    : await query.eq('cm_id', user.id)

  return (
    <CmView
      followups={followups ?? []}
      isPrivileged={isPrivileged}
      currentUserId={user.id}
    />
  )
}
