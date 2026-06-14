import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CashView from '@/components/cash/CashView'

export default async function CashPage() {
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

  const db = createAdminClient()

  const [{ data: entrees }, { data: allProfiles }, { data: recOccs }, { data: perfs }] = await Promise.all([
    db.from('cash_entries')
      .select('*')
      .order('entry_date', { ascending: false }),
    db.from('profiles')
      .select('id, full_name, role')
      .in('role', ['closer', 'setter']),
    db.from('recurring_occurrences')
      .select('cash_entry_id')
      .not('cash_entry_id', 'is', null),
    db.from('weekly_perf')
      .select('*')
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .order('week_number', { ascending: true }),
  ])

  const closers = (allProfiles ?? []).filter(p => p.role === 'closer')
  const setters = (allProfiles ?? []).filter(p => p.role === 'setter')
  const recurringCashIds = (recOccs ?? [])
    .map(o => o.cash_entry_id as string)
    .filter(Boolean)

  return (
    <CashView
      entrees={entrees ?? []}
      closers={closers}
      setters={setters}
      allProfiles={allProfiles ?? []}
      isAdmin={role === 'admin'}
      recurringCashIds={recurringCashIds}
      perfs={perfs ?? []}
    />
  )
}
