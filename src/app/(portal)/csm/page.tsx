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
  const [{ data: clients }, { data: dealData }] = await Promise.all([
    db.from('csm_clients').select('*').order('enrollment_date', { ascending: false }),
    db.from('recurring_deals').select('client_name, versements_total, recurring_occurrences(recu)'),
  ])

  // Build set of client names that have fully paid all their installments
  const fullyPaidNames: string[] = (dealData ?? [])
    .filter(d => {
      const occs = (d.recurring_occurrences ?? []) as { recu: boolean }[]
      if (!occs.length) return false
      if (d.versements_total && occs.length < d.versements_total) return false
      return occs.every(o => o.recu)
    })
    .map(d => (d.client_name ?? '').toLowerCase().trim())
    .filter(Boolean)

  return <CsmClientList clients={clients ?? []} fullyPaidNames={fullyPaidNames} />
}
