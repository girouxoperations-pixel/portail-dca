import { redirect } from 'next/navigation'
import { Trophy, Calendar } from 'lucide-react'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nowQC }             from '@/lib/dates'
import PersonCard            from '@/components/equipe/PersonCard'
import type { PersonGoal }   from '@/components/equipe/PersonCard'

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

export default async function EquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles').select('roles').eq('id', user.id).single()
  const myRoles = (me?.roles ?? []) as string[]
  const isAdmin = myRoles.some(r => ['admin', 'csm'].includes(r))

  const db          = createAdminClient()
  const { year, month, day: dayOfMonth } = nowQC()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysLeft    = daysInMonth - dayOfMonth
  const monthPct    = Math.round((dayOfMonth / daysInMonth) * 100)
  const dateMin     = `${year}-${String(month).padStart(2, '0')}-01`
  const dateMax     = new Date(year, month, 1).toISOString().split('T')[0]

  const [
    { data: profiles },
    { data: goals },
    { data: closerEntries },
    { data: setterEntries },
    { data: cashEntries },
  ] = await Promise.all([
    db.from('profiles')
      .select('id, full_name, role')
      .in('role', ['closer', 'setter'])
      .order('full_name'),
    db.from('user_goals')
      .select('user_id, target_cash, target_closes, target_rdv, target_calls')
      .eq('year', year)
      .eq('month', month),
    db.from('closer_entries')
      .select('user_id, cash_collected, closes')
      .gte('entry_date', dateMin)
      .lt('entry_date', dateMax),
    db.from('setter_entries')
      .select('user_id, rdv_booked, attempts')
      .gte('entry_date', dateMin)
      .lt('entry_date', dateMax),
    db.from('cash_entries')
      .select('closed_by, set_by, collected')
      .gte('entry_date', dateMin)
      .lt('entry_date', dateMax),
  ])

  const goalMap = new Map((goals ?? []).map(g => [g.user_id, g]))

  // Closes count only (cash now comes from cash_entries)
  const closerClosesAgg = new Map<string, number>()
  for (const e of closerEntries ?? []) {
    closerClosesAgg.set(e.user_id, (closerClosesAgg.get(e.user_id) ?? 0) + (e.closes ?? 0))
  }

  const setterAgg = new Map<string, { rdv: number; calls: number }>()
  for (const e of setterEntries ?? []) {
    const cur = setterAgg.get(e.user_id) ?? { rdv: 0, calls: 0 }
    setterAgg.set(e.user_id, {
      rdv:   cur.rdv   + (e.rdv_booked ?? 0),
      calls: cur.calls + (e.attempts   ?? 0),
    })
  }

  // Cash total (récurrents + nouveaux deals) par closer et setter
  const closerCashAgg = new Map<string, number>()
  const setterCashAgg = new Map<string, number>()
  for (const e of cashEntries ?? []) {
    if (e.closed_by) closerCashAgg.set(e.closed_by, (closerCashAgg.get(e.closed_by) ?? 0) + (e.collected ?? 0))
    if (e.set_by)    setterCashAgg.set(e.set_by,    (setterCashAgg.get(e.set_by)    ?? 0) + (e.collected ?? 0))
  }

  const closerCards: PersonGoal[] = (profiles ?? [])
    .filter(p => p.role === 'closer')
    .map(p => {
      const g      = goalMap.get(p.id)
      const cash   = closerCashAgg.get(p.id) ?? 0
      const closes = closerClosesAgg.get(p.id) ?? 0
      const projectedCash =
        cash > 0 && dayOfMonth > 0
          ? Math.round(cash + (cash / dayOfMonth) * daysLeft)
          : null
      return {
        userId:        p.id,
        nom:           p.full_name ?? 'Inconnu',
        role:          'closer' as const,
        rank:          0,
        targetCash:    g?.target_cash   ?? 0,
        targetCloses:  g?.target_closes ?? 0,
        targetRdv:     0,
        targetCalls:   0,
        actualCash:    cash,
        actualCloses:  closes,
        actualRdv:     0,
        actualCalls:   0,
        projectedCash,
        year,
        month,
        isAdmin,
      }
    })
    .sort((a, b) => b.actualCash - a.actualCash)
    .map((c, i) => ({ ...c, rank: i + 1 }))

  const setterCards: PersonGoal[] = (profiles ?? [])
    .filter(p => p.role === 'setter')
    .map(p => {
      const g = goalMap.get(p.id)
      const a = setterAgg.get(p.id) ?? { rdv: 0, calls: 0 }
      const sCash = setterCashAgg.get(p.id) ?? 0
      return {
        userId:        p.id,
        nom:           p.full_name ?? 'Inconnu',
        role:          'setter' as const,
        rank:          0,
        targetCash:    g?.target_cash  ?? 0,
        targetCloses:  0,
        targetRdv:     g?.target_rdv   ?? 0,
        targetCalls:   g?.target_calls ?? 0,
        actualCash:    sCash,
        actualCloses:  0,
        actualRdv:     a.rdv,
        actualCalls:   a.calls,
        projectedCash: null,
        year,
        month,
        isAdmin,
      }
    })
    .sort((a, b) => b.actualRdv - a.actualRdv)
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
            Classement & objectifs du mois — {MOIS_FR[month - 1]} {year}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 justify-end mb-2">
            <Calendar size={11} />
            <span>{daysLeft} jour{daysLeft !== 1 ? 's' : ''} restant{daysLeft !== 1 ? 's' : ''}</span>
          </div>
          <div className="w-32">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Jour {dayOfMonth}</span>
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
      </div>

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
