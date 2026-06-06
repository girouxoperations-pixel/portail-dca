import { Phone, Target, Wallet, DollarSign } from 'lucide-react'
import KpiCard       from './KpiCard'
import TrendChart    from './TrendChart'
import MonthSelector from './MonthSelector'
import type { TrendPoint }    from './TrendChart'
import type { MonthOption }   from './MonthSelector'
import { PALIERS, dollar, getPalier } from '@/lib/constants'
import { cn } from '@/lib/utils'

const PALIERS_ASC = [...PALIERS].reverse()

interface Deal {
  id:              string
  entry_date:      string
  client_name:     string | null
  montant_courant: number
  collected:       number
}

interface Props {
  prenom:       string
  moisLabel:    string
  selKey:       string
  isCurrentMonth: boolean
  monthOptions: MonthOption[]
  closes:       number
  cashCollected: number
  revenue:      number
  scheduled:    number
  shows:        number
  chartData:    TrendPoint[]
  recentDeals:  Deal[]
}

function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

function BonusPersonnel({ cashCollected }: { cashCollected: number }) {
  const palier     = getPalier(cashCollected)
  const nextPalier = PALIERS_ASC.find(p => cashCollected < p.seuil)
  const maxReached = palier && !nextPalier

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Bonus ce mois</p>
          {palier ? (
            <>
              <p className="text-3xl font-bold text-green-600 tabular-nums">+{dollar(palier.closer)}</p>
              <p className="text-sm text-gray-500 mt-1">Palier {dollar(palier.seuil)} atteint</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-200 tabular-nums">—</p>
              <p className="text-sm text-gray-400 mt-1">Aucun palier atteint</p>
            </>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400 mb-1">Cash collecté</p>
          <p className="text-lg font-bold text-gray-800 tabular-nums">{dollar(cashCollected)}</p>
          {palier && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
              Palier {dollar(palier.seuil)}
            </span>
          )}
        </div>
      </div>

      {/* Tier steps */}
      <div className="flex gap-1.5 mb-3">
        {PALIERS_ASC.map(p => {
          const reached = cashCollected >= p.seuil
          const isNext  = !reached && p.seuil === nextPalier?.seuil
          return (
            <div key={p.seuil} className={cn(
              'flex-1 rounded-lg p-2 text-center border transition-colors',
              reached  ? 'bg-violet-600 border-violet-600 text-white'
              : isNext ? 'bg-violet-50 border-violet-300 text-violet-700'
              :          'bg-gray-50 border-gray-100 text-gray-400',
            )}>
              <p className="text-[10px] font-medium leading-tight">{dollar(p.seuil)}</p>
              <p className="text-[11px] font-bold mt-0.5">+{dollar(p.closer)}</p>
            </div>
          )
        })}
      </div>

      {maxReached && (
        <p className="text-xs text-violet-600 font-medium text-center">Palier maximum atteint — félicitations !</p>
      )}
      {nextPalier && (
        <p className="text-xs text-gray-400 text-center">
          {dollar(nextPalier.seuil - cashCollected)} de plus pour atteindre{' '}
          <span className="text-violet-600 font-medium">{dollar(nextPalier.seuil)}</span>
          {' '}→ <span className="text-green-600 font-semibold">+{dollar(nextPalier.closer)}</span>
        </p>
      )}
    </div>
  )
}

export default function CloserView({
  prenom, moisLabel, selKey, isCurrentMonth, monthOptions,
  closes, cashCollected, revenue, scheduled, shows,
  chartData, recentDeals,
}: Props) {
  const closeRate  = pct(closes, shows)
  const showRate   = pct(shows, scheduled)
  const commission = Math.round(cashCollected * 0.10)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isCurrentMonth ? `Bonjour, ${prenom} 👋` : moisLabel}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isCurrentMonth ? `Mes stats · ${moisLabel}` : 'Mes stats — historique'}
          </p>
        </div>
        <MonthSelector options={monthOptions} selected={selKey} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Closes"         value={closes}           icon={Target}   color="green"  subtitle={`${showRate} % show rate`} />
        <KpiCard title="Cash collecté"  value={dollar(cashCollected)} icon={Wallet}  color="blue"   subtitle={`Revenue : ${dollar(revenue)}`} />
        <KpiCard title="Taux de closing" value={`${closeRate} %`} icon={Phone}    color="violet" subtitle={`${shows} shows / ${scheduled} schedulés`} />
        <KpiCard title="Commission"     value={dollar(commission)} icon={DollarSign} color="amber" subtitle="10 % du cash collecté" />
      </div>

      {/* Bonus personnel */}
      <BonusPersonnel cashCollected={cashCollected} />

      {/* Trend perso */}
      {chartData.length > 1 && <TrendChart data={chartData} />}

      {/* Deals récents */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Mes deals récents</h3>
        </div>
        {recentDeals.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">
            Aucun deal trouvé — les deals apparaîtront ici une fois ton compte lié.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-right">Deal</th>
                  <th className="px-4 py-3 text-right">Collecté</th>
                  <th className="px-4 py-3 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentDeals.map(d => {
                  const reste = Math.max(0, d.montant_courant - d.collected)
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(d.entry_date + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[160px] truncate">{d.client_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{dollar(d.montant_courant)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-blue-700">{dollar(d.collected)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          reste === 0 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600',
                        )}>
                          {reste === 0 ? 'Payé' : `${dollar(reste)} restant`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
