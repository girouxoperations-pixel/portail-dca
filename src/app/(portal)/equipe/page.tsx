import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nowQC }             from '@/lib/dates'
import PersonCard            from '@/components/equipe/PersonCard'
import type { PersonGoal }   from '@/components/equipe/PersonCard'

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles').select('roles').eq('id', user.id).single()
  const myRoles = (me?.roles ?? []) as string[]
  const isAdmin = myRoles.some(r => ['admin', 'csm'].includes(r))

  const db  = createAdminClient()
  const now = nowQC()

  // Resolve selected month from search params (default = current month)
  const params   = await searchParams
  const selYear  = params.year  ? Number(params.year)  : now.year
  const selMonth = params.month ? Number(params.month) : now.month

  const isCurrentMonth = selYear === now.year && selMonth === now.month
  const isFutureMonth  = selYear > now.year || (selYear === now.year && selMonth > now.month)

  // Navigation hrefs
  const prevM = selMonth === 1  ? { year: selYear - 1, month: 12 } : { year: selYear, month: selMonth - 1 }
  const nextM = selMonth === 12 ? { year: selYear + 1, month: 1  } : { year: selYear, month: selMonth + 1 }
  const prevHref = `/equipe?year=${prevM.year}&month=${prevM.month}`
  const nextHref = `/equipe?year=${nextM.year}&month=${nextM.month}`

  // Month progress (only meaningful for the current month)
  const daysInMonth = new Date(selYear, selMonth, 0).getDate()
  const dayOfMonth  = isCurrentMonth ? now.day : daysInMonth
  const daysLeft    = isCurrentMonth ? daysInMonth - now.day : 0
  const monthPct    = Math.round((dayOfMonth / daysInMonth) * 100)

  const dateMin = `${selYear}-${String(selMonth).padStart(2, '0')}-01`
  const dateMax = new Date(selYear, selMonth, 1).toISOString().split('T')[0]

  const [
    { data: profiles },
    { data: goals },
    { data: setterEntries },
    { data: cashEntries },
    { data: q3Cash },
  ] = await Promise.all([
    db.from('profiles')
      .select('id, full_name, role')
      .in('role', ['closer', 'setter'])
      .order('full_name'),
    db.from('user_goals')
      .select('user_id, target_cash, target_closes, target_rdv, target_calls')
      .eq('year', selYear)
      .eq('month', selMonth),
    db.from('setter_entries')
      .select('user_id, attempts')
      .gte('entry_date', dateMin)
      .lt('entry_date', dateMax),
    db.from('cash_entries')
      .select('closed_by, set_by, collected, close_type, notes')
      .gte('entry_date', dateMin)
      .lt('entry_date', dateMax),
    db.from('cash_entries')
      .select('closed_by, set_by, collected')
      .gte('entry_date', '2026-07-01')
      .lt('entry_date', '2026-10-01'),
  ])

  const goalMap = new Map((goals ?? []).map(g => [g.user_id, g]))

  // ── Q3 2026 bonus trimestriel ────────────────────────────────────────
  const CLOSER_PALIERS = [215_000, 270_000] as const
  const SETTER_PALIERS = [270_000, 325_000] as const

  const closerQ3 = new Map<string, number>()
  const setterQ3 = new Map<string, number>()
  for (const e of q3Cash ?? []) {
    if (e.closed_by) closerQ3.set(e.closed_by, (closerQ3.get(e.closed_by) ?? 0) + (e.collected ?? 0))
    if (e.set_by)    setterQ3.set(e.set_by,    (setterQ3.get(e.set_by)    ?? 0) + (e.collected ?? 0))
  }

  const q3Closers = (profiles ?? [])
    .filter(p => p.role === 'closer')
    .map(p => ({ id: p.id, nom: p.full_name ?? '?', cash: closerQ3.get(p.id) ?? 0 }))
    .sort((a, b) => b.cash - a.cash)

  const q3Setters = (profiles ?? [])
    .filter(p => p.role === 'setter')
    .map(p => ({ id: p.id, nom: p.full_name ?? '?', cash: setterQ3.get(p.id) ?? 0 }))
    .sort((a, b) => b.cash - a.cash)

  function isRealDeal(e: { close_type: string | null; notes: string | null }) {
    return e.close_type !== 'recurring' &&
      !e.notes?.startsWith('Récurrent')
  }

  const closerClosesAgg = new Map<string, number>()
  const closerCashAgg   = new Map<string, number>()
  const setterDealsAgg  = new Map<string, number>()
  const setterCashAgg   = new Map<string, number>()

  for (const e of cashEntries ?? []) {
    if (e.closed_by) {
      closerCashAgg.set(e.closed_by, (closerCashAgg.get(e.closed_by) ?? 0) + (e.collected ?? 0))
      if (isRealDeal(e)) closerClosesAgg.set(e.closed_by, (closerClosesAgg.get(e.closed_by) ?? 0) + 1)
    }
    if (e.set_by) {
      setterCashAgg.set(e.set_by, (setterCashAgg.get(e.set_by) ?? 0) + (e.collected ?? 0))
      if (isRealDeal(e)) setterDealsAgg.set(e.set_by, (setterDealsAgg.get(e.set_by) ?? 0) + 1)
    }
  }

  const setterCallsAgg = new Map<string, number>()
  for (const e of setterEntries ?? []) {
    setterCallsAgg.set(e.user_id, (setterCallsAgg.get(e.user_id) ?? 0) + (e.attempts ?? 0))
  }

  const closerCards: PersonGoal[] = (profiles ?? [])
    .filter(p => p.role === 'closer')
    .map(p => {
      const g      = goalMap.get(p.id)
      const cash   = closerCashAgg.get(p.id)   ?? 0
      const closes = closerClosesAgg.get(p.id) ?? 0
      const projectedCash = isCurrentMonth && cash > 0 && dayOfMonth > 0
        ? Math.round(cash + (cash / dayOfMonth) * daysLeft)
        : null
      return {
        userId: p.id, nom: p.full_name ?? 'Inconnu', role: 'closer' as const, rank: 0,
        targetCash: g?.target_cash ?? 0, targetCloses: g?.target_closes ?? 0,
        targetRdv: 0, targetCalls: 0,
        actualCash: cash, actualCloses: closes, actualRdv: 0, actualCalls: 0,
        projectedCash, year: selYear, month: selMonth, isAdmin,
      }
    })
    .sort((a, b) => b.actualCash - a.actualCash)
    .map((c, i) => ({ ...c, rank: i + 1 }))

  const setterCards: PersonGoal[] = (profiles ?? [])
    .filter(p => p.role === 'setter')
    .map(p => {
      const g     = goalMap.get(p.id)
      const sCash = setterCashAgg.get(p.id)  ?? 0
      const deals = setterDealsAgg.get(p.id) ?? 0
      const calls = setterCallsAgg.get(p.id) ?? 0
      const projectedCash = isCurrentMonth && sCash > 0 && dayOfMonth > 0
        ? Math.round(sCash + (sCash / dayOfMonth) * daysLeft)
        : null
      return {
        userId: p.id, nom: p.full_name ?? 'Inconnu', role: 'setter' as const, rank: 0,
        targetCash: g?.target_cash ?? 0, targetCloses: 0,
        targetRdv: g?.target_rdv ?? 0, targetCalls: g?.target_calls ?? 0,
        actualCash: sCash, actualCloses: 0, actualRdv: deals, actualCalls: calls,
        projectedCash, year: selYear, month: selMonth, isAdmin,
      }
    })
    .sort((a, b) => b.actualCash - a.actualCash)
    .map((c, i) => ({ ...c, rank: i + 1 }))

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-sm px-6 py-5 flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-violet-100 shrink-0">
          <Trophy size={20} className="text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900">Équipe</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Classement & objectifs du mois
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href={prevHref}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={16} />
          </Link>
          <span className="text-sm font-semibold text-gray-700 w-36 text-center">
            {MOIS_FR[selMonth - 1]} {selYear}
          </span>
          <Link
            href={isFutureMonth ? '#' : nextHref}
            aria-disabled={isCurrentMonth}
            className={isCurrentMonth
              ? 'p-1.5 rounded-lg text-gray-200 cursor-not-allowed'
              : 'p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors'
            }
          >
            <ChevronRight size={16} />
          </Link>
        </div>

        {/* Month progress (current month only) */}
        {isCurrentMonth && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-gray-400 mb-1">
              Jour {dayOfMonth} · {daysLeft}j restant{daysLeft !== 1 ? 's' : ''}
            </p>
            <div className="w-28">
              <div className="flex justify-end text-xs text-gray-400 mb-1">
                <span>{monthPct} %</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-400 transition-all duration-500"
                  style={{ width: `${monthPct}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {!isCurrentMonth && (
          <div className="shrink-0">
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 font-medium">
              Mois terminé
            </span>
          </div>
        )}
      </div>

      {/* ── Bonus Trimestriel Q3 2026 ─────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bonus Trimestriel — Q3 2026</h2>
          <span className="text-xs bg-amber-50 text-amber-600 ring-1 ring-amber-100 px-2 py-0.5 rounded-full font-medium">Juil – Sep</span>
        </div>

        <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
          {/* Paliers legend */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-6 flex-wrap bg-gray-50/60">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-violet-500">Closers</span>
              <span className="text-xs text-gray-500">Palier 1 : 215 000 $</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-500">Palier 2 : 270 000 $</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-500">Setters</span>
              <span className="text-xs text-gray-500">Palier 1 : 270 000 $</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-500">Palier 2 : 325 000 $</span>
            </div>
          </div>

          {/* Closers */}
          {q3Closers.length > 0 && (
            <div className="divide-y divide-gray-50">
              {q3Closers.map(p => {
                const max      = CLOSER_PALIERS[1]
                const pct      = Math.min(100, Math.round((p.cash / max) * 100))
                const p1done   = p.cash >= CLOSER_PALIERS[0]
                const p2done   = p.cash >= CLOSER_PALIERS[1]
                const manquant = p1done
                  ? p2done ? null : CLOSER_PALIERS[1] - p.cash
                  : CLOSER_PALIERS[0] - p.cash
                const barColor = p2done ? 'bg-emerald-500' : p1done ? 'bg-amber-400' : 'bg-gray-300'
                const p1Pct    = Math.round((CLOSER_PALIERS[0] / max) * 100)
                return (
                  <div key={p.id} className="px-6 py-3.5 flex items-center gap-4">
                    <div className="w-32 shrink-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.nom.split(' ')[0]}</p>
                      <span className="text-[10px] font-medium bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">closer</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold tabular-nums text-gray-900">{p.cash.toLocaleString('fr-FR')} $</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p1done ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                            {p1done ? '✓' : '○'} Palier 1
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p2done ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                            {p2done ? '✓' : '○'} Palier 2
                          </span>
                        </div>
                      </div>
                      <div className="relative w-full h-2 rounded-full bg-gray-100 overflow-visible">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }} />
                        {/* Palier 1 marker */}
                        <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-violet-300 rounded-full" style={{ left: `${p1Pct}%` }} />
                      </div>
                      {manquant !== null && (
                        <p className="text-[10px] text-gray-400">
                          Il manque <span className="font-semibold text-gray-600">{manquant.toLocaleString('fr-FR')} $</span> pour le {p1done ? 'palier 2' : 'palier 1'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Setters */}
          {q3Setters.length > 0 && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {q3Setters.map(p => {
                const max      = SETTER_PALIERS[1]
                const pct      = Math.min(100, Math.round((p.cash / max) * 100))
                const p1done   = p.cash >= SETTER_PALIERS[0]
                const p2done   = p.cash >= SETTER_PALIERS[1]
                const manquant = p1done
                  ? p2done ? null : SETTER_PALIERS[1] - p.cash
                  : SETTER_PALIERS[0] - p.cash
                const barColor = p2done ? 'bg-emerald-500' : p1done ? 'bg-amber-400' : 'bg-gray-300'
                const p1Pct    = Math.round((SETTER_PALIERS[0] / max) * 100)
                return (
                  <div key={p.id} className="px-6 py-3.5 flex items-center gap-4">
                    <div className="w-32 shrink-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.nom.split(' ')[0]}</p>
                      <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">setter</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold tabular-nums text-gray-900">{p.cash.toLocaleString('fr-FR')} $</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p1done ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                            {p1done ? '✓' : '○'} Palier 1
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p2done ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                            {p2done ? '✓' : '○'} Palier 2
                          </span>
                        </div>
                      </div>
                      <div className="relative w-full h-2 rounded-full bg-gray-100 overflow-visible">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }} />
                        <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-blue-300 rounded-full" style={{ left: `${p1Pct}%` }} />
                      </div>
                      {manquant !== null && (
                        <p className="text-[10px] text-gray-400">
                          Il manque <span className="font-semibold text-gray-600">{manquant.toLocaleString('fr-FR')} $</span> pour le {p1done ? 'palier 2' : 'palier 1'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Closers */}
      {closerCards.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Closers</h2>
            <span className="text-xs bg-violet-50 text-violet-600 ring-1 ring-violet-100 px-2 py-0.5 rounded-full font-medium">
              {closerCards.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {closerCards.map(c => (
              <PersonCard key={c.userId} {...c} />
            ))}
          </div>
        </section>
      )}

      {/* Setters */}
      {setterCards.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Setters</h2>
            <span className="text-xs bg-blue-50 text-blue-600 ring-1 ring-blue-100 px-2 py-0.5 rounded-full font-medium">
              {setterCards.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {setterCards.map(c => (
              <PersonCard key={c.userId} {...c} />
            ))}
          </div>
        </section>
      )}

      {closerCards.length === 0 && setterCards.length === 0 && (
        <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-10 text-center">
          <p className="text-sm text-gray-400">Aucun closer ou setter trouvé.</p>
        </div>
      )}

    </div>
  )
}
