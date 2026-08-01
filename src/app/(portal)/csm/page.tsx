import { redirect }         from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nowQC }             from '@/lib/dates'
import CsmClientList         from './CsmClientList'

export default async function CsmPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()

  const userRoles = (profile?.roles ?? []) as string[]
  if (!profile || !userRoles.some(r => ['admin', 'csm'].includes(r))) redirect('/dashboard')

  const db = createAdminClient()
  const { year, month } = nowQC()

  // Week boundaries (Mon–Sun)
  const todayDate = new Date()
  const day = todayDate.getDay() // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day)
  const weekStart = new Date(todayDate)
  weekStart.setDate(todayDate.getDate() + diffToMon)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const [
    { data: clients },
    { data: dealData },
    { data: csmMembers },
    { data: dashCommissions },
    { data: csmGoals },
  ] = await Promise.all([
    db.from('csm_clients').select('*').order('enrollment_date', { ascending: false }),
    db.from('recurring_deals').select('client_name, versements_total, recurring_occurrences(recu)'),
    db.from('profiles').select('id, full_name').contains('roles', ['csm']),
    db.from('csm_commissions')
      .select('csm_id, type, amount, created_at, month, year')
      .in('type', ['cert_setter', 'placement', 'cert_closer'])
      .gte('year', year)
      .order('created_at', { ascending: false }),
    db.from('user_goals')
      .select('user_id, target_cert_setter, target_placement, target_cert_closer')
      .eq('year', year)
      .eq('month', month),
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

  return (
    <CsmClientList
      clients={clients ?? []}
      fullyPaidNames={fullyPaidNames}
      csmMembers={csmMembers ?? []}
      dashCommissions={dashCommissions ?? []}
      csmGoals={csmGoals ?? []}
      currentYear={year}
      currentMonth={month}
      weekStartStr={weekStartStr}
      currentUserId={user.id}
      isAdmin={userRoles.includes('admin')}
    />
  )
}
