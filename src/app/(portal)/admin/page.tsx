import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminView from '@/components/admin/AdminView'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profil) redirect('/login')

  const role = profil.role as string
  if (role !== 'admin' && role !== 'csm') redirect('/dashboard')

  const db = createAdminClient()

  const { data: membres } = await db
    .from('profiles')
    .select('id, full_name, email, role, avatar_url, created_at')
    .order('created_at', { ascending: true })

  return (
    <AdminView
      membres={membres ?? []}
      currentUserId={user.id}
      isAdmin={role === 'admin'}
    />
  )
}
