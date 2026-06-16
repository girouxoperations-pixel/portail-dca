import { redirect }         from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CsmClientList         from './CsmClientList'

export default async function CsmPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'csm'].includes(profile.role)) redirect('/dashboard')

  const db = createAdminClient()
  const { data: clients } = await db
    .from('csm_clients')
    .select('*')
    .order('enrollment_date', { ascending: true })

  return <CsmClientList clients={clients ?? []} />
}
