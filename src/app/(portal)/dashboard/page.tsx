import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Wallet, Phone, Target, Trophy, Award, TrendingDown, Users,
} from 'lucide-react'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import KpiCard  from '@/components/dashboard/KpiCard'
import { MOIS_FR, PALIERS, dollar, getPalier } from '@/lib/constants'
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

function MonthSelector({ options, selected }: { options: MonthOption[]; selected: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map(o => (
        <Link
          key={o.key}
          href={`/dashboard?mois=${o.key}`}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
            o.key === selected
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700',
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}

function PctBadge({ value }: { value: number }) {
  const color = value >= 40 ? 'text-green-600' : value >= 20 ? 'text-amber-600' : 'text-red-500'
  return <span className={`${color} font-medium`}>{value} %</span>
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
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
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

function BarBonus({ collected }: { collected: number }) {
  const seuils = PALIERS.map(p => p.seuil)
  const next   = seuils.slice().reverse().find(s => collected < s) ?? seuils[0]
  const prev   = seuils.slice().reverse().find(s => collected >= s) ?? 0
  const progress = next === prev ? 100 : Math.min(98, ((collected - prev) / (next - prev)) * 100)
  const reached  = PALIERS.some(p => collected >= p.seuil)

  return (
    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1">
      <div
        className={`h-full rounded-full transition-all ${reached ? 'bg-violet-500' : 'bg-gray-300'}`}
        style={{ width: `${Math.max(2, progress)}%` }}
      />
    </div>
  )
}

function SectionBonus({ closers, setters }: { closers: BonusItem[]; setters: BonusItem[] }) {
  function LigneBonus({ item, type }: { item: BonusItem; type: 'closer' | 'setter' }) {
    const palier = item.palier
    const bonus  = palier ? (type === 'closer' ? palier.closer : palier.setter) : null
    return (
      <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
        {bonus !== null
          ? <Trophy size={14} className="text-amber-400 shrink-0" />
          : <Award  size={14} className="text-gray-200 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">{item.nom}</span>
            {bonus !== null && (
              <span className="text-xs font-semibold text-amber-600 shrink-0">+{dollar(bonus)}</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{dollar(item.collected)} collecté</span>
            {palier && (
              <span className="text-[11px] text-violet-600">Palier {dollar(palier.seuil)}</span>
            )}
          </div>
          <BarBonus collected={item.collected} />
        </div>
      </div>
    )
  }

  if (closers.length === 0 && setters.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Bonus automatiques</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Paliers : 50 k$ → 700 $/350 $ · 70 k$ → 1 000 $/500 $ · 85 k$ → 1 200 $/600 $ ·
          100 k$ → 1 500 $/750 $ · 130 k$ → 1 800 $/900 $
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-50">
        <div className="px-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">Closers</p>
          {closers.length === 0
            ? <p className="text-sm text-gray-400 pb-4">Aucune donnée</p>
            : closers.map((c, i) => <LigneBonus key={i} item={c} type="closer" />)
          }
        </div>
        <div className="px-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">Setters</p>
          {setters.length === 0
            ? <p className="text-sm text-gray-400 pb-4">Aucune donnée</p>
            : setters.map((s, i) => <LigneBonus key={i} item={s} type="setter" />)
          }
        </div>
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
    { data: balanceRaw },
    { data: allProfiles },
    { data: cashMonthsList },
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
    db.from('cash_entries')
      .select('client_name, a_collecter')
      .gt('a_collecter', 0),
    db.from('profiles')
      .select('id, full_name, role'),
    db.from('cash_entries')
      .select('year, month')
      .not('year', 'is', null)
      .not('month', 'is', null),
  ])

  // ── Profile maps ──────────────────────────────────────────────────
  const profileMap = new Map((allProfiles ?? []).map(p => [p.id, p.full_name as string]))
  const closerProfiles = (allProfiles ?? []).filter(p => p.role === 'closer')
  const setterProfiles = (allProfiles ?? []).filter(p => p.role === 'setter')

  // ── Available months (union of monthly_stats + cash_entries) ──────
  const monthsSet = new Set<string>()
  for (const r of allMonthlyStats ?? []) monthsSet.add(monthKey(r.year, r.month))
  for (const r of cashMonthsList ?? []) {
    if (r.year && r.month) monthsSet.add(monthKey(r.year as number, r.month as number))
  }
  const monthOptions: MonthOption[] = Array.from(monthsSet)
    .sort((a, b) => b.localeCompare(a))
    .map(k => {
      const [y, m] = k.split('-').map(Number)
      return { key: k, label: `${MOIS_FR[m - 1]} ${y}` }
    })

  // ── Monthly stats for selected month ─────────────────────────────
  const selStats = (allMonthlyStats ?? []).filter(r => r.year === selYear && r.month === selMonth)
  const teamStat = selStats.find(r => r.source === 'team')
  const closerStats = selStats.filter(r => r.source === 'closer')

  // ── KPI cards ────────────────────────────────────────────────────
  // Cash: from cash_entries (live)
  const cashRevenu    = (cashMois ?? []).reduce((s, e) => s + (e.montant_courant ?? 0), 0)
  const cashCollected = (cashMois ?? []).reduce((s, e) => s + (e.collected ?? 0), 0)
  const prevCollected = (cashPrevMois ?? []).reduce((s, e) => s + (e.collected ?? 0), 0)

  const cashTrend = prevCollected > 0
    ? Math.round(((cashCollected - prevCollected) / prevCollected) * 100)
    : null

  // Performance: from monthly_stats
  const scheduled = teamStat?.scheduled_calls ?? closerStats.reduce((s, r) => s + r.scheduled_calls, 0)
  const shows     = teamStat?.show_calls      ?? closerStats.reduce((s, r) => s + r.show_calls, 0)
  const closes    = teamStat?.closes          ?? closerStats.reduce((s, r) => s + r.closes, 0)
  const revenue   = teamStat?.revenue         ?? closerStats.reduce((s, r) => s + r.revenue, 0)
  const showRate  = pct(shows, scheduled)
  const closeRate = pct(closes, shows)

  // ── Closer performance table ──────────────────────────────────────
  const closerRows: CloserRow[] = closerStats
    .map(r => ({
      nom:      r.closer_name ?? 'Inconnu',
      scheduled: r.scheduled_calls,
      show:     r.show_calls,
      pitch:    r.pitch_calls,
      closes:   r.closes,
      showPct:  pct(r.show_calls, r.scheduled_calls),
      pitchPct: pct(r.pitch_calls, r.show_calls),
      closePct: pct(r.closes, r.show_calls),
      cash:     r.cash_collected,
      revenue:  r.revenue,
    }))
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

  const totalACollecter = (balanceRaw ?? []).reduce((s, e) => s + (e.a_collecter ?? 0), 0)

  const prenom    = profil?.full_name?.split(' ')[0] ?? 'vous'
  const moisLabel = `${MOIS_FR[selMonth - 1]} ${selYear}`
  const isCurrentMonth = selKey === defaultKey

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
        <MonthSelector options={monthOptions} selected={selKey} />
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
        <KpiCard
          title="Solde à collecter"
          value={dollar(totalACollecter)}
          icon={TrendingDown}
          color="red"
          subtitle="Tous mois confondus"
        />
      </div>

      {/* Closer stats */}
      <TableauClosers rows={closerRows} />

      {/* Bonus */}
      <SectionBonus closers={bonusClosers} setters={bonusSetters} />

    </div>
  )
}
