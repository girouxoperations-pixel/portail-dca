import { redirect }         from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CsmClientDetail       from './CsmClientDetail'

interface Props { params: Promise<{ id: string }> }

export default async function CsmClientPage({ params }: Props) {
  const { id } = await params
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
  const { data: client } = await db
    .from('csm_clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) redirect('/csm')

  return <CsmClientDetail client={client} />
}
