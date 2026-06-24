import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Wallet, Phone, Target, AlertTriangle, Calendar, TrendingUp,
  ArrowUp, ArrowDown, Clock,
} from 'lucide-react'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import KpiCard               from '@/components/dashboard/KpiCard'
import TrendChart            from '@/components/dashboard/TrendChart'
import GoalSection           from '@/components/dashboard/GoalSection'
import CloserView            from '@/components/dashboard/CloserView'
import SetterView            from '@/components/dashboard/SetterView'
import DashboardPeriodFilter from '@/components/dashboard/DashboardPeriodFilter'
import FunnelCard            from '@/components/dashboard/FunnelCard'
import ClosersTable          from '@/components/dashboard/ClosersTable'
import QuickCashModal        from '@/components/dashboard/QuickCashModal'
import RecurrentsHealthSection from '@/components/dashboard/RecurrentsHealthSection'
import type { RecurrentsOcc } from '@/components/dashboard/RecurrentsHealthSection'
import ExportCsvButton       from '@/components/ui/ExportCsvButton'
import type { TrendPoint }   from '@/components/dashboard/TrendChart'
import { MOIS_FR, MOIS_COURT, PALIERS, dollar, getPalier } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Periode } from '@/components/ui/PeriodFilter'

// ── Server-side period helpers ────────────────────────────────────────

const MOIS_SERVER = ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc']

function toISO(d: Date) { return d.toISOString().split('T')[0] }

function getMonday(d: Date): Date {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m    = new Date(d)
  m.setHours(0, 0, 0, 0)
  m.setDate(d.getDate() + diff)
  return m
}

interface ServerRange {
  dateMin:         string
  dateMax:         string  // exclusive upper bound for .lt()
  selYear:         number
  selMonth:        number
  isCurrentPeriod: boolean
  periodLabel:     string
}

function serverComputeRange(
  periode: string,
  offset: number,
  customStart?: string,
  customEnd?: string,
): ServerRange {
  const now = new Date()

  if (periode === 'personnalise' && customStart && customEnd && customStart <= customEnd) {
    const endDate = new Date(customEnd + 'T00:00:00')
    endDate.setDate(endDate.getDate() + 1)
    const [y, m] = customStart.split('-').map(Number)
    const todayISO = toISO(now)
    return {
      dateMin: customStart, dateMax: toISO(endDate),
      selYear: y, selMonth: m,
      isCurrentPeriod: todayISO >= customStart && todayISO <= customEnd,
      periodLabel: `${customStart} – ${customEnd}`,
    }
  }

  if (periode === 'semaine') {
    const monday = getMonday(now)
    monday.setDate(monday.getDate() + offset * 7)
    const nextMon = new Date(monday)
    nextMon.setDate(monday.getDate() + 7)
    const [y, m] = toISO(monday).split('-').map(Number)
    return {
      dateMin: toISO(monday), dateMax: toISO(nextMon),
      selYear: y, selMonth: m,
      isCurrentPeriod: offset === 0,
      periodLabel: `Semaine du ${monday.getDate()} ${MOIS_SERVER[monday.getMonth()]}`,
    }
  }

  if (periode === 'trimestre') {
    const rawQ = Math.floor(now.getMonth() / 3) + offset
    const year = now.getFullYear() + Math.floor(rawQ / 4)
    const q    = ((rawQ % 4) + 4) % 4
    const sm   = q * 3
    const start = new Date(year, sm, 1)
    const nextQ = new Date(year, sm + 3, 1)
    return {
      dateMin: toISO(start), dateMax: toISO(nextQ),
      selYear: year, selMonth: sm + 1,
      isCurrentPeriod: offset === 0,
      periodLabel: `T${q + 1} ${year}`,
    }
  }

  if (periode === 'annee') {
    const year = now.getFullYear() + offset
    return {
      dateMin: `${year}-01-01`, dateMax: `${year + 1}-01-01`,
      selYear: year, selMonth: now.getMonth() + 1,
      isCurrentPeriod: offset === 0,
      periodLabel: `${year}`,
    }
  }

  // mois (default)
  const d  = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const nx = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  return {
    dateMin: toISO(d), dateMax: toISO(nx),
    selYear: d.getFullYear(), selMonth: d.getMonth() + 1,
    isCurrentPeriod: offset === 0,
    periodLabel: `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`,
  }
}

function serverComputePrevRange(
  periode: string, offset: number, dateMin: string, dateMax: string,
): { prevMin: string; prevMax: string } {
  if (periode === 'personnalise') {
    const startMs = new Date(dateMin + 'T00:00:00').getTime()
    const endMs   = new Date(dateMax + 'T00:00:00').getTime()
    return { prevMin: toISO(new Date(startMs - (endMs - startMs))), prevMax: dateMin }
  }
  const prev = serverComputeRange(periode, offset - 1)
  return { prevMin: prev.dateMin, prevMax: prev.dateMax }
}

// ── Helpers ───────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

// ── Types ────────────────────────────────────────────────────────────

interface CloserRow {
  userId:    string
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

interface SetterRow {
  nom:         string
  attempts:    number
  contacts:    number
  rdv:         number
  showed:      number
  no_show:     number
  contactRate: number
  bookRate:    number
  showRate:    number
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

function PctBadgeSetter({ value }: { value: number }) {
  const cls = value >= 50
    ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
    : value >= 30
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

// ── 1. Projection fin de mois ─────────────────────────────────────────

function ProjectionCard({
  cashCollected, targetCash, dayOfMonth, daysInMonth, isCurrentMonth,
}: {
  cashCollected: number
  targetCash:    number
  dayOfMonth:    number
  daysInMonth:   number
  isCurrentMonth: boolean
}) {
  if (!isCurrentMonth || cashCollected === 0) return null

  const daysRemaining  = daysInMonth - dayOfMonth
  const dailyRate      = cashCollected / dayOfMonth
  const projected      = Math.round(cashCollected + dailyRate * daysRemaining)
  const monthPct       = Math.round((dayOfMonth / daysInMonth) * 100)
  const onTrack        = targetCash > 0 ? projected >= targetCash : null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Projection fin de mois</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{dollar(projected)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {dollar(Math.round(dailyRate))}/jour · {daysRemaining} jour{daysRemaining !== 1 ? 's' : ''} restant{daysRemaining !== 1 ? 's' : ''}
          </p>
        </div>
        {onTrack !== null && (
          <span className={cn(
            'shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
            onTrack
              ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
              : 'bg-red-50 text-red-600 ring-1 ring-red-200',
          )}>
            {onTrack ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {onTrack ? 'En bonne voie' : 'Sous l\'objectif'}
          </span>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Avancement du mois</span>
          <span>{monthPct} % ({dayOfMonth}/{daysInMonth} jours)</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gray-300 rounded-full" style={{ width: `${monthPct}%` }} />
        </div>
      </div>

      {targetCash > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Cash collecté</span>
            <span className="tabular-nums">{dollar(cashCollected)} / {dollar(targetCash)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
            <div
              className="absolute h-full bg-violet-100 rounded-full"
              style={{ width: `${Math.min((projected / targetCash) * 100, 100)}%` }}
            />
            <div
              className="absolute h-full bg-violet-600 rounded-full"
              style={{ width: `${Math.min((cashCollected / targetCash) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-sm bg-violet-600 inline-block" />Collecté</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-sm bg-violet-100 inline-block" />Projeté</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 2. Santé des récurrents ───────────────────────────────────────────

interface RecurrentsHealth {
  nRetard:    number
  montRetard: number
  nSemaine:   number
  montSemaine: number
  nMois:      number
  montMois:   number
}

function RecurrentsHealthRow({ health }: { health: RecurrentsHealth }) {
  const hasData = health.nRetard + health.nSemaine + health.nMois > 0
  if (!hasData) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Link
        href="/recurrents?filtre=retard"
        className={cn(
          'rounded-xl border shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5',
          health.nRetard > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100',
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={14} className={health.nRetard > 0 ? 'text-red-500' : 'text-gray-300'} />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">En retard</p>
        </div>
        <p className={cn('text-2xl font-bold tabular-nums', health.nRetard > 0 ? 'text-red-600' : 'text-gray-300')}>
          {health.nRetard > 0 ? dollar(health.montRetard) : '—'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {health.nRetard} versement{health.nRetard !== 1 ? 's' : ''} non reçu{health.nRetard !== 1 ? 's' : ''}
        </p>
      </Link>

      <Link
        href="/recurrents?filtre=semaine"
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-amber-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cette semaine</p>
        </div>
        <p className="text-2xl font-bold text-gray-900 tabular-nums">
          {health.nSemaine > 0 ? dollar(health.montSemaine) : '—'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {health.nSemaine} versement{health.nSemaine !== 1 ? 's' : ''} attendu{health.nSemaine !== 1 ? 's' : ''}
        </p>
      </Link>

      <Link
        href="/recurrents?filtre=mois"
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} className="text-violet-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ce mois (à venir)</p>
        </div>
        <p className="text-2xl font-bold text-gray-900 tabular-nums">
          {health.nMois > 0 ? dollar(health.montMois) : '—'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {health.nMois} versement{health.nMois !== 1 ? 's' : ''} à encaisser
        </p>
      </Link>
    </div>
  )
}

// ── 3. Tableau setters ────────────────────────────────────────────────

function TableauSetters({ rows }: { rows: SetterRow[] }) {
  if (rows.length === 0) return null

  const totals = rows.reduce(
    (acc, r) => ({
      attempts: acc.attempts + r.attempts,
      contacts: acc.contacts + r.contacts,
      rdv:      acc.rdv      + r.rdv,
      showed:   acc.showed   + r.showed,
      no_show:  acc.no_show  + r.no_show,
    }),
    { attempts: 0, contacts: 0, rdv: 0, showed: 0, no_show: 0 },
  )

  const csvData = rows.map(r => ({
    Setter: r.nom, Tentatives: r.attempts, Contacts: r.contacts,
    'Contact %': r.contactRate, 'RDV bookés': r.rdv, 'Book %': r.bookRate,
    Présentés: r.showed, 'Show %': r.showRate, 'No Show': r.no_show,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <TrendingUp size={15} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-900">Performance setters</h3>
        <div className="ml-auto"><ExportCsvButton filename="setters" data={csvData} /></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Setter</th>
              <th className="px-4 py-3 text-right">Tentatives</th>
              <th className="px-4 py-3 text-right">Contacts</th>
              <th className="px-4 py-3 text-right">Contact %</th>
              <th className="px-4 py-3 text-right">RDV bookés</th>
              <th className="px-4 py-3 text-right">Book %</th>
              <th className="px-4 py-3 text-right">Présentés</th>
              <th className="px-4 py-3 text-right">Show %</th>
              <th className="px-4 py-3 text-right">No Show</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-800">{r.nom}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{r.attempts}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{r.contacts}</td>
                <td className="px-4 py-3 text-right"><PctBadgeSetter value={r.contactRate} /></td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{r.rdv}</td>
                <td className="px-4 py-3 text-right"><PctBadgeSetter value={r.bookRate} /></td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{r.showed}</td>
                <td className="px-4 py-3 text-right"><PctBadgeSetter value={r.showRate} /></td>
                <td className="px-4 py-3 text-right tabular-nums text-red-400">{r.no_show}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-100 bg-gray-50/60 font-semibold text-gray-700 text-xs">
              <td className="px-4 py-3 text-gray-500 uppercase tracking-wide">Total équipe</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.attempts}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.contacts}</td>
              <td className="px-4 py-3 text-right"><PctBadgeSetter value={pct(totals.contacts, totals.attempts)} /></td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.rdv}</td>
              <td className="px-4 py-3 text-right"><PctBadgeSetter value={pct(totals.rdv, totals.contacts)} /></td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.showed}</td>
              <td className="px-4 py-3 text-right"><PctBadgeSetter value={pct(totals.showed, totals.rdv)} /></td>
              <td className="px-4 py-3 text-right tabular-nums text-red-400">{totals.no_show}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Bonus ─────────────────────────────────────────────────────────────

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
          <p className="text-xs text-gray-400 mt-0.5">5 paliers · 50k → 70k → 85k → 100k → 130k de cash collecté</p>
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
                <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total à verser</td>
                <td className="px-4 py-3 text-right font-bold text-green-600 tabular-nums">+{dollar(totalBonus)}</td>
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
  searchParams: Promise<{ mois?: string; p?: string; o?: string; start?: string; end?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()

  const params = await searchParams
  const now    = new Date()

  // ── Period resolution ────────────────────────────────────────────────
  let periode: Periode = (params.p as Periode) ?? 'mois'
  let offset  = parseInt(params.o ?? '0') || 0
  const customStart = params.start ?? ''
  const customEnd   = params.end   ?? ''

  // Backward compat: ?mois=YYYY-MM (from MonthSelector in personal views)
  if (params.mois && !params.p) {
    const [my, mm] = params.mois.split('-').map(Number)
    const diff = (my - now.getFullYear()) * 12 + (mm - (now.getMonth() + 1))
    periode = 'mois'
    offset  = diff
  }

  const {
    dateMin, dateMax, selYear, selMonth, isCurrentPeriod, periodLabel,
  } = serverComputeRange(periode, offset, customStart, customEnd)

  const { prevMin, prevMax } = serverComputePrevRange(periode, offset, dateMin, dateMax)

  const isMoisMode        = periode === 'mois'
  const isCurrentMonthSel = isMoisMode && isCurrentPeriod
  const selKey            = monthKey(selYear, selMonth)  // for personal views
  const moisLabel         = periodLabel

  const db = createAdminClient()

  const todayStr    = now.toISOString().split('T')[0]
  const weekEndDate = new Date(now)
  weekEndDate.setDate(now.getDate() + 7)
  const weekEndStr  = weekEndDate.toISOString().split('T')[0]

  const [
    { data: allMonthlyStats },
    { data: cashMois },
    { data: cashPrevMois },
    { data: allProfiles },
    { data: cashMonthsList },
    { data: goalRaw },
    { data: allCloserEntries },
    { data: setterEntriesMois },
    { data: recurringOccs },
  ] = await Promise.all([
    supabase.from('monthly_stats')
      .select('source, closer_name, user_id, year, month, scheduled_calls, show_calls, pitch_calls, closes, cash_collected, revenue'),
    supabase.from('cash_entries')
      .select('montant_courant, collected, closed_by, set_by, close_type, notes')
      .gte('entry_date', dateMin)
      .lt('entry_date', dateMax),
    supabase.from('cash_entries')
      .select('montant_courant, collected')
      .gte('entry_date', prevMin)
      .lt('entry_date', prevMax),
    supabase.from('profiles')
      .select('id, full_name, role'),
    supabase.from('cash_entries')
      .select('year, month')
      .not('year', 'is', null)
      .not('month', 'is', null),
    supabase.from('goals')
      .select('target_cash, target_closes, target_revenue')
      .eq('year', selYear)
      .eq('month', selMonth)
      .maybeSingle(),
    supabase.from('closer_entries')
      .select('user_id, entry_date, scheduled_calls, show_calls, pitch_calls, closes, cash_collected, revenue'),
    supabase.from('setter_entries')
      .select('user_id, entry_date, attempts, contacts, rdv_booked, showed, no_show, disqualified, cancelled')
      .gte('entry_date', dateMin)
      .lt('entry_date', dateMax),
    db.from('recurring_occurrences')
      .select('id, date_attendue, montant_attendu, recu, mois, annee, recurring_deals(client_name, closer_id, methode_paiement)')
      .eq('recu', false),
  ])

  // ── Profile maps ──────────────────────────────────────────────────
  const profileMap     = new Map((allProfiles ?? []).map(p => [p.id, p.full_name as string]))
  const closerProfiles = (allProfiles ?? []).filter(p => p.role === 'closer')
  const setterProfiles = (allProfiles ?? []).filter(p => p.role === 'setter')

  // ── Aggregate closer_entries (all months — for trend + personal views) ─
  type EntryAgg = { scheduled: number; shows: number; pitches: number; closes: number; cash: number; revenue: number }
  const entriesByMonth     = new Map<string, EntryAgg>()
  const entriesByUserMonth = new Map<string, EntryAgg>()

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

  // ── Aggregate closer_entries for selected period ──────────────────
  const periodCloserEntries = (allCloserEntries ?? []).filter(e =>
    e.entry_date >= dateMin && e.entry_date < dateMax
  )

  const periodAgg = periodCloserEntries.reduce(
    (acc, e) => ({
      scheduled: acc.scheduled + e.scheduled_calls,
      shows:     acc.shows     + e.show_calls,
      pitches:   acc.pitches   + e.pitch_calls,
      closes:    acc.closes    + e.closes,
      cash:      acc.cash      + e.cash_collected,
      revenue:   acc.revenue   + e.revenue,
    }),
    { scheduled: 0, shows: 0, pitches: 0, closes: 0, cash: 0, revenue: 0 },
  )

  const entriesByUserPeriod = new Map<string, EntryAgg>()
  for (const e of periodCloserEntries) {
    const cur = entriesByUserPeriod.get(e.user_id) ?? { scheduled: 0, shows: 0, pitches: 0, closes: 0, cash: 0, revenue: 0 }
    entriesByUserPeriod.set(e.user_id, {
      scheduled: cur.scheduled + e.scheduled_calls,
      shows:     cur.shows     + e.show_calls,
      pitches:   cur.pitches   + e.pitch_calls,
      closes:    cur.closes    + e.closes,
      cash:      cur.cash      + e.cash_collected,
      revenue:   cur.revenue   + e.revenue,
    })
  }

  // Legacy: for personal closer view (month-based)
  const selMonthKey      = selKey
  const entriesThisMonth = entriesByMonth.get(selMonthKey)

  // ── Aggregate setter_entries for selected period ───────────────────
  type SetterAgg = { attempts: number; contacts: number; rdv: number; showed: number; no_show: number }
  const setterByUser = new Map<string, SetterAgg>()
  for (const e of setterEntriesMois ?? []) {
    const cur = setterByUser.get(e.user_id) ?? { attempts: 0, contacts: 0, rdv: 0, showed: 0, no_show: 0 }
    setterByUser.set(e.user_id, {
      attempts: cur.attempts + e.attempts,
      contacts: cur.contacts + e.contacts,
      rdv:      cur.rdv      + e.rdv_booked,
      showed:   cur.showed   + e.showed,
      no_show:  cur.no_show  + e.no_show,
    })
  }

  const setterRows: SetterRow[] = Array.from(setterByUser.entries())
    .map(([uid, s]) => ({
      nom:         profileMap.get(uid) ?? 'Inconnu',
      ...s,
      contactRate: pct(s.contacts, s.attempts),
      bookRate:    pct(s.rdv, s.contacts),
      showRate:    pct(s.showed, s.rdv),
    }))
    .sort((a, b) => b.rdv - a.rdv)

  // ── Récurrents health (always relative to today, not the period) ────
  const occs = recurringOccs ?? []
  const curMonth = now.getMonth() + 1
  const curYear  = now.getFullYear()

  function toHealthOcc(o: typeof occs[number]): RecurrentsOcc {
    const raw  = o.recurring_deals as unknown
    const deal = (Array.isArray(raw) ? raw[0] : raw) as { client_name: string; closer_id: string | null; methode_paiement: string | null } | null
    return {
      id:               o.id,
      date_attendue:    o.date_attendue,
      montant_attendu:  o.montant_attendu,
      mois:             o.mois,
      annee:            o.annee,
      clientName:       deal?.client_name ?? '—',
      closerName:       deal?.closer_id ? (profileMap.get(deal.closer_id) ?? undefined) : undefined,
      methodePaiement:  deal?.methode_paiement ?? null,
    }
  }

  const occsAujourdhuiHealth = occs.filter(o => o.date_attendue === todayStr).map(toHealthOcc)
  const occsRetardHealth     = occs.filter(o => o.date_attendue < todayStr).map(toHealthOcc)
  const occsSemaineHealth    = occs.filter(o => o.date_attendue >= todayStr && o.date_attendue <= weekEndStr).map(toHealthOcc)
  const occsMoisHealth       = occs.filter(o => o.mois === curMonth && o.annee === curYear && o.date_attendue >= todayStr).map(toHealthOcc)

  const recurrentsHealth: RecurrentsHealth = {
    nRetard:    occsRetardHealth.length,
    montRetard: occsRetardHealth.reduce((s, o) => s + o.montant_attendu, 0),
    nSemaine:   occsSemaineHealth.length,
    montSemaine: occsSemaineHealth.reduce((s, o) => s + o.montant_attendu, 0),
    nMois:      occsMoisHealth.length,
    montMois:   occsMoisHealth.reduce((s, o) => s + o.montant_attendu, 0),
  }

  // ── KPIs ─────────────────────────────────────────────────────────
  const cashRevenu    = (cashMois ?? []).reduce((s, e) => s + (e.montant_courant ?? 0), 0)
  const cashCollected = (cashMois ?? []).reduce((s, e) => s + (e.collected ?? 0), 0)
  const nOnTheSpotDash = (cashMois ?? []).filter(e => e.close_type === 'on_the_spot').length
  const nFollowUpDash  = (cashMois ?? []).filter(e => e.close_type === 'follow_up').length

  const dealsCollected = (cashMois ?? [])
    .filter(e => !e.notes?.startsWith('Récurrent'))
    .reduce((s, e) => s + (e.collected ?? 0), 0)
  const recCollected = (cashMois ?? [])
    .filter(e => e.notes?.startsWith('Récurrent'))
    .reduce((s, e) => s + (e.collected ?? 0), 0)
  const prevCollected = (cashPrevMois ?? []).reduce((s, e) => s + (e.collected ?? 0), 0)
  const cashTrend     = prevCollected > 0
    ? Math.round(((cashCollected - prevCollected) / prevCollected) * 100)
    : null

  const selStats = (allMonthlyStats ?? []).filter(r => r.year === selYear && r.month === selMonth)
  const teamStat = selStats.find(r => r.source === 'team')

  // Use period aggregation for KPIs; fall back to monthly_stats for legacy data
  const scheduled = periodAgg.scheduled || entriesThisMonth?.scheduled || teamStat?.scheduled_calls || 0
  const shows     = periodAgg.shows     || entriesThisMonth?.shows     || teamStat?.show_calls      || 0
  const pitches   = periodAgg.pitches   || entriesThisMonth?.pitches   || teamStat?.pitch_calls     || 0
  const closes    = periodAgg.closes    || entriesThisMonth?.closes    || teamStat?.closes          || 0
  const revenue   = periodAgg.revenue   || entriesThisMonth?.revenue   || teamStat?.revenue         || 0
  const showRate  = pct(shows, scheduled)
  const closeRate = pct(closes, shows)

  // ── Funnel data ───────────────────────────────────────────────────
  const funnelSteps = [
    { label: 'Schedulés', value: scheduled, pct: 100,                       convRate: 100 },
    { label: 'Shows',     value: shows,     pct: pct(shows,   scheduled),   convRate: pct(shows,   scheduled) },
    { label: 'Pitches',   value: pitches,   pct: pct(pitches, scheduled),   convRate: pct(pitches, shows)     },
    { label: 'Closes',    value: closes,    pct: pct(closes,  scheduled),   convRate: pct(closes,  pitches)   },
  ]

  // ── Projection (mois mode only) ───────────────────────────────────
  const daysInMonth = new Date(selYear, selMonth, 0).getDate()
  const dayOfMonth  = isCurrentMonthSel ? now.getDate() : daysInMonth

  // ── Closer rows ───────────────────────────────────────────────────
  const closerRows: CloserRow[] = Array.from(entriesByUserPeriod.entries())
    .map(([uid, s]) => ({
      userId:   uid,
      nom:      profileMap.get(uid) ?? 'Inconnu',
      scheduled: s.scheduled,
      show:     s.shows,
      pitch:    s.pitches,
      closes:   s.closes,
      showPct:  pct(s.shows, s.scheduled),
      pitchPct: pct(s.pitches, s.shows),
      closePct: pct(s.closes, s.pitches),
      cash:     s.cash,
      revenue:  s.revenue,
    }))
    .sort((a, b) => b.closes - a.closes)

  // ── Closer history for drill-down ─────────────────────────────────
  const closerHistory = Array.from(
    new Set(Array.from(entriesByUserMonth.keys()).map(k => k.split('::')[0]))
  ).map(uid => {
    const months = Array.from(entriesByUserMonth.keys())
      .filter(k => k.startsWith(`${uid}::`))
      .map(k => k.split('::')[1])
      .sort()
    return {
      userId: uid,
      points: months.map(mk => {
        const [y, m] = mk.split('-').map(Number)
        const d = entriesByUserMonth.get(`${uid}::${mk}`)!
        return { mois: MOIS_COURT[m - 1], closes: d.closes, cash: d.cash }
      }),
    }
  })

  // ── Bonus (cash per closer/setter for the selected period) ────────
  const closerCash = new Map<string, number>()
  const setterCash = new Map<string, number>()
  for (const e of cashMois ?? []) {
    if (e.closed_by) closerCash.set(e.closed_by, (closerCash.get(e.closed_by) ?? 0) + (e.collected ?? 0))
    if (e.set_by)    setterCash.set(e.set_by,    (setterCash.get(e.set_by)    ?? 0) + (e.collected ?? 0))
  }
  const bonusClosers: BonusItem[] = closerProfiles
    .map(p => ({ nom: p.full_name ?? 'Inconnu', collected: closerCash.get(p.id) ?? 0, palier: getPalier(closerCash.get(p.id) ?? 0) }))
    .sort((a, b) => b.collected - a.collected)
  const bonusSetters: BonusItem[] = setterProfiles
    .map(p => ({ nom: p.full_name ?? 'Inconnu', collected: setterCash.get(p.id) ?? 0, palier: getPalier(setterCash.get(p.id) ?? 0) }))
    .sort((a, b) => b.collected - a.collected)

  // ── Trend chart ───────────────────────────────────────────────────
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
    const cls     = (allMonthlyStats ?? []).filter(r => r.source === 'closer' && r.year === y && r.month === m)
    return {
      mois:    MOIS_COURT[m - 1],
      cash:    fromEntries?.cash    ?? team?.cash_collected ?? cls.reduce((s, r) => s + r.cash_collected, 0),
      revenue: fromEntries?.revenue ?? team?.revenue        ?? cls.reduce((s, r) => s + r.revenue, 0),
      closes:  fromEntries?.closes  ?? team?.closes         ?? cls.reduce((s, r) => s + r.closes, 0),
    }
  })

  // ── Weekly trend ──────────────────────────────────────────────────
  function getMondayISO(dateStr: string): string {
    const d   = new Date(dateStr + 'T00:00:00')
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    return d.toISOString().split('T')[0]
  }

  type WeekAgg = { cash: number; revenue: number; closes: number }
  const weeklyMap = new Map<string, WeekAgg>()
  for (const e of allCloserEntries ?? []) {
    const wk  = getMondayISO(e.entry_date)
    const cur = weeklyMap.get(wk) ?? { cash: 0, revenue: 0, closes: 0 }
    weeklyMap.set(wk, {
      cash:    cur.cash    + e.cash_collected,
      revenue: cur.revenue + e.revenue,
      closes:  cur.closes  + e.closes,
    })
  }

  const weeklyChartData: TrendPoint[] = Array.from(weeklyMap.keys())
    .sort()
    .slice(-24)  // last 24 weeks max
    .map(wk => {
      const d = new Date(wk + 'T00:00:00')
      const { cash, revenue, closes } = weeklyMap.get(wk)!
      return {
        mois: `${d.getDate()}/${d.getMonth() + 1}`,
        cash, revenue, closes,
      }
    })

  const isAdmin   = profil?.role === 'admin' || profil?.role === 'csm'
  const role      = profil?.role ?? ''
  const prenom    = profil?.full_name?.split(' ')[0] ?? 'vous'

  const hasData = cashCollected > 0 || cashRevenu > 0 || scheduled > 0 || closes > 0

  // ── Full business view (all roles) ───────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isCurrentPeriod && isMoisMode ? `Bonjour, ${prenom} 👋` : periodLabel}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isCurrentPeriod && isMoisMode ? `Tableau de bord · ${periodLabel}` : 'Tableau de bord — historique'}
            </p>
          </div>
        </div>
        <DashboardPeriodFilter
          periode={periode}
          offset={offset}
          customStart={customStart}
          customEnd={customEnd}
        />
      </div>

      {!hasData && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-16 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-base font-semibold text-gray-700">Aucune donnée pour cette période</p>
          <p className="text-sm text-gray-400 mt-1">Importe tes données via Cash / Stats → Importer CSV</p>
        </div>
      )}

      {hasData && <>

      {/* KPI cards + Projection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Cash collecté"
          value={dollar(cashCollected)}
          icon={Wallet}
          color="blue"
          subtitle={recCollected > 0
            ? `⚡ ${dollar(dealsCollected)} deals · 🔄 ${dollar(recCollected)} réc.`
            : `Revenus deals : ${dollar(cashRevenu)}`}
          trend={cashTrend !== null ? {
            label: `${cashTrend > 0 ? '+' : ''}${cashTrend} % vs période préc.`,
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
          subtitle={`Close rate : ${closeRate} % · ⚡ ${nOnTheSpotDash} spot · 🔄 ${nFollowUpDash} FU`}
        />
        {/* Projection card — mois mode only */}
        <div className="sm:col-span-2 lg:col-span-1">
          {isMoisMode ? (
            <ProjectionCard
              cashCollected={cashCollected}
              targetCash={goalRaw?.target_cash ?? 0}
              dayOfMonth={dayOfMonth}
              daysInMonth={daysInMonth}
              isCurrentMonth={isCurrentMonthSel}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center justify-center h-full text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Période</p>
              <p className="text-lg font-bold text-gray-700">{periodLabel}</p>
              <p className="text-xs text-gray-400 mt-1">vs période préc. : {cashTrend !== null ? `${cashTrend > 0 ? '+' : ''}${cashTrend} %` : '—'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Santé des récurrents */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Santé des récurrents</p>
        <RecurrentsHealthSection
          occsAujourdhui={occsAujourdhuiHealth}
          occsRetard={occsRetardHealth}
          occsSemaine={occsSemaineHealth}
          occsMois={occsMoisHealth}
        />
      </div>

      {/* Objectifs — mois mode only */}
      {isMoisMode && (
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
      )}

      {/* Funnel + Trend côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <Target size={15} className="text-violet-500" />
            <h3 className="text-sm font-semibold text-gray-900">Funnel de conversion</h3>
            <span className="ml-auto text-xs text-gray-400">
              {scheduled > 0 ? `Close rate global : ${pct(closes, scheduled)} %` : ''}
            </span>
          </div>
          <div className="p-5">
            {scheduled > 0
              ? <FunnelCard steps={funnelSteps} />
              : <p className="text-sm text-gray-400 text-center py-6">Aucune donnée closer pour cette période</p>
            }
          </div>
        </div>

        <TrendChart data={chartData} weeklyData={weeklyChartData} />
      </div>

      {/* Closers */}
      <ClosersTable rows={closerRows} history={closerHistory} />

      {/* Setters */}
      {setterRows.length > 0 && (
        <TableauSetters rows={setterRows} />
      )}

      {/* Bonus — mois mode only */}
      {isMoisMode && (
        <SectionBonus closers={bonusClosers} setters={bonusSetters} />
      )}

      {/* Quick cash entry (admin only) */}
      <QuickCashModal
        closers={closerProfiles.map(p => ({ id: p.id, full_name: p.full_name, role: p.role }))}
        setters={setterProfiles.map(p => ({ id: p.id, full_name: p.full_name, role: p.role }))}
      />

      </>}

    </div>
  )
}
