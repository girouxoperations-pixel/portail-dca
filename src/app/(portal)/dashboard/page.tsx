import { redirect } from 'next/navigation'
import {
  Wallet, Phone, Target, Users,
} from 'lucide-react'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import KpiCard       from '@/components/dashboard/KpiCard'
import TrendChart    from '@/components/dashboard/TrendChart'
import GoalSection   from '@/components/dashboard/GoalSection'
import CloserView    from '@/components/dashboard/CloserView'
import SetterView    from '@/components/dashboard/SetterView'
import MonthSelectorComp from '@/components/dashboard/MonthSelector'
import type { TrendPoint }  from '@/components/dashboard/TrendChart'
import { MOIS_FR, MOIS_COURT, PALIERS, dollar, getPalier } from '@/lib/constants'
import { cn } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function monthBounds(year: number, month: number) {
  const pad  = (n: number) => String(n).padStart(2, '0')
  const min  = `${year}-${pad(month)}-01`
  const ny   = month === 12 ? year + 1 : year
  const nm   = month === 12 ? 1 : month + 1
  const max  = `${ny}-${pad(nm)}-01`
  return { min, max }
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

// ── Types ────────────────────────────────────────────────────────────

interface MonthOption { key: string; label: string }

interface CloserRow {
  nom:       string
  scheduled: number
  show:      number
  pitch:     number
  closes:    number
  showPct:   number
  pitchPct:  number
  closePct:  number
  cash:      number
  revenue:   number
}

interface BonusItem {
  nom:       string
  collected: number
  palier:    typeof PALIERS[number] | null
}

// ── Sub-components ───────────────────────────────────────────────────

function PctBadge({ value }: { value: number }) {
  const cls = value >= 40
    ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
    : value >= 20
    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    : 'bg-red-50 text-red-600 ring-1 ring-red-200'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums', cls)}>
      {value} %
    </span>
  )
}

function PerfIndicator({ closePct }: { closePct: number }) {
  if (closePct >= 40) return <span title="Haute performance" className="inline-block w-1.5 h-5 rounded-full bg-green-400" />
  if (closePct >= 20) return <span title="Performance moyenne" className="inline-block w-1.5 h-5 rounded-full bg-amber-400" />
  return <span title="À améliorer" className="inline-block w-1.5 h-5 rounded-full bg-red-400" />
}

function TableauClosers({ rows }: { rows: CloserRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
        <p className="text-sm text-gray-400">Aucune stat closer pour ce mois</p>
      </div>
    )
  }

  const totals = rows.reduce(
    (acc, r) => ({
      scheduled: acc.scheduled + r.scheduled,
      show:      acc.show      + r.show,
      pitch:     acc.pitch     + r.pitch,
      closes:    acc.closes    + r.closes,
      cash:      acc.cash      + r.cash,
      revenue:   acc.revenue   + r.revenue,
    }),
    { scheduled: 0, show: 0, pitch: 0, closes: 0, cash: 0, revenue: 0 },
  )

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <Users size={15} className="text-violet-500" />
        <h3 className="text-sm font-semibold text-gray-900">Performance closers</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <th className="px-3 py-3 w-4" />
              <th className="px-4 py-3 text-left">Closer</th>
              <th className="px-4 py-3 text-right">Schedulés</th>
              <th className="px-4 py-3 text-right">Shows</th>
              <th className="px-4 py-3 text-right">Show %</th>
              <th className="px-4 py-3 text-right">Pitch</th>
              <th className="px-4 py-3 text-right">Pitch %</th>
              <th className="px-4 py-3 text-right">Closes</th>
              <th className="px-4 py-3 text-right">Close %</th>
              <th className="px-4 py-3 text-right">Cash collecté</th>
              <th className="px-4 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r, i) => (
              <tr key={i} className={cn(
                'hover:bg-gray-50/60 transition-colors',
                r.closePct >= 40 ? 'bg-green-50/30' : r.closePct >= 20 ? '' : r.closes > 0 ? 'bg-red-50/20' : '',
              )}>
                <td className="px-3 py-3 text-center">
                  <PerfIndicator closePct={r.closePct} />
                </td>
                <td className="px-4 py-3 font-semibold text-gray-800">{r.nom}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{r.scheduled}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{r.show}</td>
                <td className="px-4 py-3 text-right tabular-nums"><PctBadge value={r.showPct} /></td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{r.pitch}</td>
                <td className="px-4 py-3 text-right tabular-nums"><PctBadge value={r.pitchPct} /></td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{r.closes}</td>
                <td className="px-4 py-3 text-right tabular-nums"><PctBadge value={r.closePct} /></td>
                <td className="px-4 py-3 text-right tabular-nums text-blue-700 font-medium">{dollar(r.cash)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{dollar(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-100 bg-gray-50/60 font-semibold text-gray-700 text-xs">
              <td className="px-3 py-3" />
              <td className="px-4 py-3 text-gray-500 uppercase tracking-wide">Total équipe</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.scheduled}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.show}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                <PctBadge value={pct(totals.show, totals.scheduled)} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.pitch}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                <PctBadge value={pct(totals.pitch, totals.show)} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.closes}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                <PctBadge value={pct(totals.closes, totals.show)} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-blue-700">{dollar(totals.cash)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{dollar(totals.revenue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function SectionBonus({ closers, setters }: { closers: BonusItem[]; setters: BonusItem[] }) {
  const all = [
    ...closers.map(c => ({ ...c, role: 'closer' as const })),
    ...setters.map(s => ({ ...s, role: 'setter' as const })),
  ].sort((a, b) => b.collected - a.collected)

  if (all.length === 0) return null

  const totalBonus = all.reduce((sum, item) => {
    if (!item.palier) return sum
    return sum + (item.role === 'closer' ? item.palier.closer : item.palier.setter)
  }, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Bonus automatiques</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            5 paliers · 50k → 70k → 85k → 100k → 130k de cash collecté
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400">Total à verser</p>
          <p className={cn('text-base font-bold', totalBonus > 0 ? 'text-green-600' : 'text-gray-300')}>
            {totalBonus > 0 ? `+${dollar(totalBonus)}` : '—'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Rôle</th>
              <th className="px-4 py-3 text-right">Cash collecté</th>
              <th className="px-4 py-3 text-right">Palier atteint</th>
              <th className="px-4 py-3 text-right">Bonus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {all.map((item, i) => {
              const bonus = item.palier
                ? (item.role === 'closer' ? item.palier.closer : item.palier.setter)
                : null
              return (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{item.nom}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      item.role === 'closer' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700',
                    )}>
                      {item.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{dollar(item.collected)}</td>
                  <td className="px-4 py-3 text-right">
                    {item.palier
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">{dollar(item.palier.seuil)}</span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    {bonus !== null
                      ? <span className="font-semibold text-green-600 tabular-nums">+{dollar(bonus)}</span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
          {totalBonus > 0 && (
            <tfoot>
              <tr className="border-t border-gray-100 bg-gray-50/60">
                <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total à verser
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-600 tabular-nums">
                  +{dollar(totalBonus)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}


// ── Page ─────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()

  const params = await searchParams
  const now    = new Date()
  const defaultKey = monthKey(now.getFullYear(), now.getMonth() + 1)
  const selKey     = params.mois ?? defaultKey
  const [selYear, selMonth] = selKey.split('-').map(Number)
  const prev = prevMonth(selYear, selMonth)
  const { min: dateMin, max: dateMax } = monthBounds(selYear, selMonth)

  const db = createAdminClient()

  const [
    { data: allMonthlyStats },
    { data: cashMois },
    { data: cashPrevMois },
    { data: allProfiles },
    { data: cashMonthsList },
    { data: goalRaw },
    { data: allCloserEntries },
  ] = await Promise.all([
    db.from('monthly_stats')
      .select('source, closer_name, user_id, year, month, scheduled_calls, show_calls, pitch_calls, closes, cash_collected, revenue'),
    db.from('cash_entries')
      .select('montant_courant, collected, closed_by, set_by')
      .gte('entry_date', dateMin)
      .lt('entry_date', dateMax),
    db.from('cash_entries')
      .select('montant_courant, collected')
      .gte('entry_date', monthBounds(prev.year, prev.month).min)
      .lt('entry_date', monthBounds(prev.year, prev.month).max),
    db.from('profiles')
      .select('id, full_name, role'),
    db.from('cash_entries')
      .select('year, month')
      .not('year', 'is', null)
      .not('month', 'is', null),
    db.from('goals')
      .select('target_cash, target_closes, target_revenue')
      .eq('year', selYear)
      .eq('month', selMonth)
      .maybeSingle(),
    db.from('closer_entries')
      .select('user_id, entry_date, scheduled_calls, show_calls, pitch_calls, closes, cash_collected, revenue'),
  ])

  // ── Profile maps ──────────────────────────────────────────────────
  const profileMap = new Map((allProfiles ?? []).map(p => [p.id, p.full_name as string]))
  const closerProfiles = (allProfiles ?? []).filter(p => p.role === 'closer')
  const setterProfiles = (allProfiles ?? []).filter(p => p.role === 'setter')

  // ── Aggregate closer_entries by month ────────────────────────────
  type EntryAgg = { scheduled: number; shows: number; pitches: number; closes: number; cash: number; revenue: number }
  const entriesByMonth = new Map<string, EntryAgg>()
  const entriesByUserMonth = new Map<string, EntryAgg>() // key: `${uid}::${monthKey}`

  for (const e of allCloserEntries ?? []) {
    const [ey, em] = e.entry_date.split('-').map(Number)
    const mk  = monthKey(ey, em)
    const umk = `${e.user_id}::${mk}`
    const add = (m: Map<string, EntryAgg>, k: string) => {
      const cur = m.get(k) ?? { scheduled: 0, shows: 0, pitches: 0, closes: 0, cash: 0, revenue: 0 }
      m.set(k, {
        scheduled: cur.scheduled + e.scheduled_calls,
        shows:     cur.shows     + e.show_calls,
        pitches:   cur.pitches   + e.pitch_calls,
        closes:    cur.closes    + e.closes,
        cash:      cur.cash      + e.cash_collected,
        revenue:   cur.revenue   + e.revenue,
      })
    }
    add(entriesByMonth,     mk)
    add(entriesByUserMonth, umk)
  }

  const selMonthKey      = monthKey(selYear, selMonth)
  const entriesThisMonth = entriesByMonth.get(selMonthKey)

  // ── Available months (union of all sources) ───────────────────────
  const monthsSet = new Set<string>()
  for (const r of allMonthlyStats ?? []) monthsSet.add(monthKey(r.year, r.month))
  for (const r of cashMonthsList ?? []) {
    if (r.year && r.month) monthsSet.add(monthKey(r.year as number, r.month as number))
  }
  for (const mk of entriesByMonth.keys()) monthsSet.add(mk)

  const monthOptions: MonthOption[] = Array.from(monthsSet)
    .sort((a, b) => b.localeCompare(a))
    .map(k => {
      const [y, m] = k.split('-').map(Number)
      return { key: k, label: `${MOIS_FR[m - 1]} ${y}` }
    })

  // ── Monthly stats for selected month (team manual entry fallback) ──
  const selStats   = (allMonthlyStats ?? []).filter(r => r.year === selYear && r.month === selMonth)
  const teamStat   = selStats.find(r => r.source === 'team')

  // ── KPI cards ────────────────────────────────────────────────────
  const cashRevenu    = (cashMois ?? []).reduce((s, e) => s + (e.montant_courant ?? 0), 0)
  const cashCollected = (cashMois ?? []).reduce((s, e) => s + (e.collected ?? 0), 0)
  const prevCollected = (cashPrevMois ?? []).reduce((s, e) => s + (e.collected ?? 0), 0)

  const cashTrend = prevCollected > 0
    ? Math.round(((cashCollected - prevCollected) / prevCollected) * 100)
    : null

  // Performance KPIs: prefer closer_entries (live), fall back to team monthly_stat
  const scheduled = entriesThisMonth?.scheduled ?? teamStat?.scheduled_calls ?? 0
  const shows     = entriesThisMonth?.shows     ?? teamStat?.show_calls      ?? 0
  const closes    = entriesThisMonth?.closes    ?? teamStat?.closes          ?? 0
  const revenue   = entriesThisMonth?.revenue   ?? teamStat?.revenue        ?? 0
  const showRate  = pct(shows, scheduled)
  const closeRate = pct(closes, shows)

  // ── Closer performance table (live from closer_entries) ───────────
  const closerRows: CloserRow[] = Array.from(entriesByUserMonth.entries())
    .filter(([key]) => key.endsWith(`::${selMonthKey}`))
    .map(([key, s]) => {
      const uid = key.split('::')[0]
      return {
        nom:      profileMap.get(uid) ?? 'Inconnu',
        scheduled: s.scheduled,
        show:     s.shows,
        pitch:    s.pitches,
        closes:   s.closes,
        showPct:  pct(s.shows, s.scheduled),
        pitchPct: pct(s.pitches, s.shows),
        closePct: pct(s.closes, s.shows),
        cash:     s.cash,
        revenue:  s.revenue,
      }
    })
    .sort((a, b) => b.closes - a.closes)

  // ── Bonus (from cash_entries linked to profiles) ──────────────────
  const closerCash = new Map<string, number>()
  const setterCash = new Map<string, number>()
  for (const e of cashMois ?? []) {
    if (e.closed_by) closerCash.set(e.closed_by, (closerCash.get(e.closed_by) ?? 0) + (e.collected ?? 0))
    if (e.set_by)    setterCash.set(e.set_by,    (setterCash.get(e.set_by)    ?? 0) + (e.collected ?? 0))
  }
  const bonusClosers: BonusItem[] = closerProfiles
    .map(p => {
      const collected = closerCash.get(p.id) ?? 0
      return { nom: p.full_name ?? 'Inconnu', collected, palier: getPalier(collected) }
    })
    .sort((a, b) => b.collected - a.collected)

  const bonusSetters: BonusItem[] = setterProfiles
    .map(p => {
      const collected = setterCash.get(p.id) ?? 0
      return { nom: p.full_name ?? 'Inconnu', collected, palier: getPalier(collected) }
    })
    .sort((a, b) => b.collected - a.collected)

  // ── Trend chart: closer_entries for months that have data, monthly_stats for history ──
  const allChartMonths = Array.from(
    new Set([
      ...(allMonthlyStats ?? []).map(r => monthKey(r.year, r.month)),
      ...entriesByMonth.keys(),
    ])
  ).sort()

  const chartData: TrendPoint[] = allChartMonths.map(mk => {
    const [y, m] = mk.split('-').map(Number)
    const fromEntries = entriesByMonth.get(mk)
    const team    = (allMonthlyStats ?? []).find(r => r.source === 'team'   && r.year === y && r.month === m)
    const closers = (allMonthlyStats ?? []).filter(r => r.source === 'closer' && r.year === y && r.month === m)
    return {
      mois:    MOIS_COURT[m - 1],
      cash:    fromEntries?.cash    ?? team?.cash_collected ?? closers.reduce((s, r) => s + r.cash_collected, 0),
      revenue: fromEntries?.revenue ?? team?.revenue        ?? closers.reduce((s, r) => s + r.revenue, 0),
      closes:  fromEntries?.closes  ?? team?.closes         ?? closers.reduce((s, r) => s + r.closes, 0),
    }
  })

  const isAdmin    = profil?.role === 'admin' || profil?.role === 'csm'
  const role       = profil?.role ?? ''
  const prenom     = profil?.full_name?.split(' ')[0] ?? 'vous'
  const moisLabel  = `${MOIS_FR[selMonth - 1]} ${selYear}`
  const isCurrentMonth = selKey === defaultKey

  // ── Closer view ───────────────────────────────────────────────────
  if (role === 'closer') {
    // Aggregate this closer's entries for selected month
    const myThisMonth = entriesByUserMonth.get(`${user.id}::${selMonthKey}`)

    // Build personal trend chart from closer_entries (primary) + monthly_stats fallback
    const myEntryMonths = Array.from(entriesByUserMonth.keys())
      .filter(k => k.startsWith(`${user.id}::`))
      .map(k => k.split('::')[1])

    const myStatMonths = (allMonthlyStats ?? [])
      .filter(r => r.source === 'closer' && (r.user_id === user.id || r.closer_name?.toLowerCase() === prenom.toLowerCase()))
      .map(r => monthKey(r.year, r.month))

    const myAllMonths = Array.from(new Set([...myEntryMonths, ...myStatMonths])).sort()

    const myChartData: TrendPoint[] = myAllMonths.map(mk => {
      const [y, m] = mk.split('-').map(Number)
      const fromEntry = entriesByUserMonth.get(`${user.id}::${mk}`)
      const fromStat  = (allMonthlyStats ?? []).find(r =>
        r.source === 'closer' && r.year === y && r.month === m &&
        (r.user_id === user.id || r.closer_name?.toLowerCase() === prenom.toLowerCase())
      )
      return {
        mois:    MOIS_COURT[m - 1],
        cash:    fromEntry?.cash    ?? fromStat?.cash_collected ?? 0,
        revenue: fromEntry?.revenue ?? fromStat?.revenue        ?? 0,
        closes:  fromEntry?.closes  ?? fromStat?.closes         ?? 0,
      }
    })

    const { data: recentDeals } = await db
      .from('cash_entries')
      .select('id, entry_date, client_name, montant_courant, collected')
      .eq('closed_by', user.id)
      .order('entry_date', { ascending: false })
      .limit(10)

    return (
      <CloserView
        prenom={prenom}
        moisLabel={moisLabel}
        selKey={selKey}
        isCurrentMonth={isCurrentMonth}
        monthOptions={monthOptions}
        closes={myThisMonth?.closes ?? 0}
        cashCollected={myThisMonth?.cash ?? 0}
        revenue={myThisMonth?.revenue ?? 0}
        scheduled={myThisMonth?.scheduled ?? 0}
        shows={myThisMonth?.shows ?? 0}
        chartData={myChartData}
        recentDeals={recentDeals ?? []}
      />
    )
  }

  // ── Setter view ───────────────────────────────────────────────────
  if (role === 'setter') {
    const { data: myDeals } = await db
      .from('cash_entries')
      .select('id, entry_date, client_name, montant_courant, collected, closed_by')
      .eq('set_by', user.id)
      .order('entry_date', { ascending: false })
      .limit(10)

    const { min: dMin, max: dMax } = monthBounds(selYear, selMonth)
    const { data: myMonthDeals } = await db
      .from('cash_entries')
      .select('collected')
      .eq('set_by', user.id)
      .gte('entry_date', dMin)
      .lt('entry_date', dMax)

    const cashGeneré = (myMonthDeals ?? []).reduce((s, d) => s + (d.collected ?? 0), 0)
    const dealsSettés = myMonthDeals?.length ?? 0
    const commission  = Math.round(cashGeneré * 0.05)

    const dealsWithCloser = (myDeals ?? []).map(d => ({
      ...d,
      closer_name: d.closed_by ? (profileMap.get(d.closed_by) ?? null) : null,
    }))

    return (
      <SetterView
        prenom={prenom}
        moisLabel={moisLabel}
        selKey={selKey}
        isCurrentMonth={isCurrentMonth}
        monthOptions={monthOptions}
        dealsSettés={dealsSettés}
        cashGeneré={cashGeneré}
        commission={commission}
        recentDeals={dealsWithCloser}
      />
    )
  }

  // ── Admin / CSM view ──────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isCurrentMonth ? `Bonjour, ${prenom} 👋` : moisLabel}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isCurrentMonth ? `Tableau de bord · ${moisLabel}` : 'Tableau de bord — historique'}
          </p>
        </div>
        <MonthSelectorComp options={monthOptions} selected={selKey} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Cash collecté"
          value={dollar(cashCollected)}
          icon={Wallet}
          color="blue"
          subtitle={`Revenus deals : ${dollar(cashRevenu)}`}
          trend={cashTrend !== null ? {
            label: `${cashTrend > 0 ? '+' : ''}${cashTrend} % vs mois préc.`,
            direction: cashTrend > 0 ? 'up' : cashTrend < 0 ? 'down' : 'neutral',
          } : undefined}
        />
        <KpiCard
          title="Appels schedulés"
          value={scheduled}
          icon={Phone}
          color="violet"
          subtitle={`${shows} shows · ${showRate} % show rate`}
        />
        <KpiCard
          title="Closes"
          value={closes}
          icon={Target}
          color="green"
          subtitle={`Taux de closing : ${closeRate} %`}
        />
      </div>

      {/* Objectifs */}
      <GoalSection
        targetCash={goalRaw?.target_cash ?? 0}
        targetCloses={goalRaw?.target_closes ?? 0}
        targetRevenue={goalRaw?.target_revenue ?? 0}
        actualCash={cashCollected}
        actualCloses={closes}
        actualRevenue={revenue}
        year={selYear}
        month={selMonth}
        isAdmin={isAdmin}
      />

      {/* Trend chart */}
      <TrendChart data={chartData} />

      {/* Closer stats */}
      <TableauClosers rows={closerRows} />

      {/* Bonus */}
      <SectionBonus closers={bonusClosers} setters={bonusSetters} />

    </div>
  )
}
