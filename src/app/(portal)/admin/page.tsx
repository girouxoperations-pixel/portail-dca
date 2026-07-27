import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminView from '@/components/admin/AdminView'

const DEFAULT_TREE = {
  id: 'root', name: 'She Closes', title: 'Direction', color: '#7c3aed', children: [],
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('role, roles').eq('id', user.id).single()
  if (!profil) redirect('/login')

  const role      = profil.role as string
  const userRoles = (profil.roles ?? []) as string[]
  if (!userRoles.some(r => ['admin', 'csm'].includes(r))) redirect('/dashboard')

  const db = createAdminClient()

  const [
    { data: membres },
    { data: orgChart },
    { data: plMonths },
  ] = await Promise.all([
    db.from('profiles')
      .select('id, full_name, email, role, roles, avatar_url, created_at')
      .order('created_at', { ascending: true }),
    db.from('org_chart').select('data').eq('id', 'main').single(),
    db.from('pl_months').select('id, year, month, data').order('year').order('month'),
  ])

  return (
    <AdminView
      membres={membres ?? []}
      currentUserId={user.id}
      isAdmin={role === 'admin'}
      orgChartData={orgChart?.data ?? DEFAULT_TREE}
      plMonths={plMonths ?? []}
    />
  )
}
