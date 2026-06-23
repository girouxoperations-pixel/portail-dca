import { redirect, notFound } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import RecurringClientDetail from '@/components/recurrents/RecurringClientDetail'

export default async function RecurringClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('roles').eq('id', user.id).single()
  const userRoles = (profil?.roles ?? []) as string[]
  if (!userRoles.some(r => ['admin', 'csm'].includes(r))) redirect('/dashboard')

  const db = createAdminClient()

  const [{ data: deal }, { data: profiles }] = await Promise.all([
    db.from('recurring_deals')
      .select('*, recurring_occurrences(*)')
      .eq('id', id)
      .single(),
    db.from('profiles').select('id, full_name, roles'),
  ])

  if (!deal) notFound()

  return (
    <RecurringClientDetail
      deal={deal}
      profiles={profiles ?? []}
      isAdmin={userRoles.includes('admin') || userRoles.includes('csm')}
    />
  )
}
