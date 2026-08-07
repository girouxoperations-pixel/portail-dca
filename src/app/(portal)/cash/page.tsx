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
  if (role !== 'admin' && role !== 'csm' && role !== 'head_csm') redirect('/dashboard')

  const db = createAdminClient()

  const [{ data: entrees }, { data: allProfiles }, { data: recOccs }, { data: perfs }, { data: csmClients }, { data: csmMembers }, { data: closerEntries }] = await Promise.all([
    db.from('cash_entries')
      .select('*')
      .order('entry_date', { ascending: false }),
    db.from('profiles')
      .select('id, full_name, role')
      .in('role', ['closer', 'setter']),
    db.from('recurring_occurrences')
      .select('id, cash_entry_id')
      .not('cash_entry_id', 'is', null),
    db.from('weekly_perf')
      .select('*')
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .order('week_number', { ascending: true }),
    db.from('csm_clients')
      .select('id, status, payment_type'),
    db.from('profiles')
      .select('id, full_name, role')
      .contains('roles', ['csm']),
    db.from('closer_entries')
      .select('entry_date, pitch_calls, closes'),
  ])

  const closers = (allProfiles ?? []).filter(p => p.role === 'closer')
  const setters = (allProfiles ?? []).filter(p => p.role === 'setter')
  const recurringCashIds = (recOccs ?? [])
    .map(o => o.cash_entry_id as string)
    .filter(Boolean)
  const recurringOccMap: Record<string, string> = {}
  for (const o of (recOccs ?? [])) {
    if (o.cash_entry_id) recurringOccMap[o.cash_entry_id] = o.id
  }

  return (
    <CashView
      entrees={entrees ?? []}
      closers={closers}
      setters={setters}
      allProfiles={allProfiles ?? []}
      csmMembers={csmMembers ?? []}
      isAdmin={role === 'admin'}
      recurringCashIds={recurringCashIds}
      recurringOccMap={recurringOccMap}
      perfs={perfs ?? []}
      closerEntries={closerEntries ?? []}
      csmClients={csmClients ?? []}
    />
  )
}
