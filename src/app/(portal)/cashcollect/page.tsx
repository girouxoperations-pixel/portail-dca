import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CashCollectView from '@/components/cashcollect/CashCollectView'
import { nowQC }        from '@/lib/dates'

export default async function CashCollectPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profil) redirect('/login')

  const role = profil.role as string
  if (role !== 'admin' && role !== 'csm') redirect('/dashboard')

  const db    = createAdminClient()
  const { year: annee } = nowQC()

  const [
    { data: entrees },
    { data: closers },
    { data: setters },
    { data: recOccs },
    { data: recurringDeals },
  ] = await Promise.all([
    db.from('cash_entries')
      .select('*')
      .eq('year', annee)
      .order('entry_date', { ascending: false }),
    db.from('profiles').select('id, full_name').eq('role', 'closer'),
    db.from('profiles').select('id, full_name').eq('role', 'setter'),
    db.from('recurring_occurrences')
      .select('cash_entry_id')
      .not('cash_entry_id', 'is', null),
    db.from('recurring_deals')
      .select('id, client_name, montant_mensuel, closer_id, setter_id')
      .eq('actif', true)
      .order('client_name', { ascending: true }),
  ])

  const recurringCashIds = (recOccs ?? [])
    .map(o => o.cash_entry_id as string)
    .filter(Boolean)

  return (
    <CashCollectView
      entrees={entrees  ?? []}
      closers={closers  ?? []}
      setters={setters  ?? []}
      isAdmin={role === 'admin'}
      recurringCashIds={recurringCashIds}
      recurringDeals={recurringDeals ?? []}
    />
  )
}
