import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminView, { type RefundStats } from '@/components/admin/AdminView'

const DEFAULT_TREE = {
  id: 'root', name: 'She Closes', title: 'Direction', color: '#7c3aed', children: [],
}

function buildRefundStats(entries: { entry_date: string; is_refunded: boolean; refunded_at: string | null }[]): RefundStats {
  const monthMap = new Map<string, { totalDeals: number; totalRefunds: number; year: number; month: number }>()

  for (const e of entries) {
    if (!e.entry_date) continue
    const d = new Date(e.entry_date + 'T12:00:00')
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const key = `${y}-${String(m).padStart(2, '0')}`
    if (!monthMap.has(key)) monthMap.set(key, { totalDeals: 0, totalRefunds: 0, year: y, month: m })
    const row = monthMap.get(key)!
    row.totalDeals++
    if (e.is_refunded) row.totalRefunds++
  }

  const monthly = [...monthMap.entries()]
    .map(([, v]) => v)
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)

  const refunded = entries.filter(e => e.is_refunded && e.refunded_at && e.entry_date)
  const delays = { d10: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 }
  for (const e of refunded) {
    const orig    = new Date(e.entry_date + 'T12:00:00').getTime()
    const refDate = new Date(e.refunded_at! + 'T12:00:00').getTime()
    const days    = Math.round((refDate - orig) / 86400000)
    if (days <= 10)      delays.d10++
    else if (days <= 30) delays.d30++
    else if (days <= 60) delays.d60++
    else if (days <= 90) delays.d90++
    else                 delays.d90plus++
  }

  return { monthly, delays, totalRefunds: refunded.length }
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('role, roles').eq('id', user.id).single()
  if (!profil) redirect('/login')

  const role      = profil.role as string
  const userRoles = (profil.roles ?? []) as string[]
  if (!userRoles.some(r => ['admin', 'csm'].includes(r))) redirect('/dashboard')
  const isOwner   = userRoles.includes('owner')

  const db = createAdminClient()

  const [
    { data: membres },
    { data: orgChart },
    { data: plMonths },
    { data: refundEntries },
  ] = await Promise.all([
    db.from('profiles')
      .select('id, full_name, email, role, roles, avatar_url, created_at')
      .not('roles', 'eq', '{}')
      .order('created_at', { ascending: true }),
    db.from('org_chart').select('data').eq('id', 'main').single(),
    db.from('pl_months').select('id, year, month, data').order('year').order('month'),
    db.from('cash_entries')
      .select('entry_date, is_refunded, refunded_at')
      .neq('close_type', 'recurring')
      .not('notes', 'ilike', 'Récurrent%'),
  ])

  const refundStats = buildRefundStats(refundEntries ?? [])

  return (
    <AdminView
      membres={membres ?? []}
      currentUserId={user.id}
      isAdmin={role === 'admin' || userRoles.includes('csm') || userRoles.includes('head_csm')}
      isOwner={isOwner}
      orgChartData={orgChart?.data ?? DEFAULT_TREE}
      plMonths={plMonths ?? []}
      refundStats={refundStats}
    />
  )
}
