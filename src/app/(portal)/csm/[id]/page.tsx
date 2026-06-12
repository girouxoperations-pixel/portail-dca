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

  // Fetch linked data in parallel
  const [{ data: cashEntry }, { data: followup }, { data: closer }] = await Promise.all([
    client.cash_entry_id
      ? db.from('cash_entries').select('montant_courant, collected, entry_date, methode').eq('id', client.cash_entry_id).single()
      : Promise.resolve({ data: null }),
    client.cash_entry_id
      ? db.from('client_followups').select('*').eq('cash_entry_id', client.cash_entry_id).single()
      : Promise.resolve({ data: null }),
    client.closer_id
      ? db.from('profiles').select('full_name').eq('id', client.closer_id).single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <CsmClientDetail
      client={client}
      cashEntry={cashEntry ?? null}
      followup={followup ?? null}
      closerName={closer?.full_name ?? null}
    />
  )
}
