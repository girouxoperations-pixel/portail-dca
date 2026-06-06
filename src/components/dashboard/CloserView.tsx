import { Trophy, Phone, Target, Wallet, DollarSign } from 'lucide-react'
import KpiCard       from './KpiCard'
import TrendChart    from './TrendChart'
import MonthSelector from './MonthSelector'
import type { TrendPoint }    from './TrendChart'
import type { MonthOption }   from './MonthSelector'
import { PALIERS, dollar, getPalier } from '@/lib/constants'
import { cn } from '@/lib/utils'

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
  const palier      = getPalier(cashCollected)
  const palierIdx   = PALIERS.findIndex(p => cashCollected >= p.seuil)
  const nextPalier  = palierIdx === 0 ? null : PALIERS.slice().reverse().find(p => cashCollected < p.seuil)
  const prevSeuil   = palier ? palier.seuil : 0
  const nextSeuil   = nextPalier ? nextPalier.seuil : PALIERS[PALIERS.length - 1].seuil
  const progress    = nextPalier
    ? Math.min(98, ((cashCollected - prevSeuil) / (nextSeuil - prevSeuil)) * 100)
    : palier ? 100 : Math.min(98, (cashCollected / nextSeuil) * 100)

  return (
    <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-xl p-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-amber-300" />
            <p className="text-sm font-semibold text-violet-100">Ton bonus ce mois</p>
          </div>
          {palier ? (
            <>
              <p className="text-4xl font-bold tabular-nums">+{dollar(palier.closer)}</p>
              <p className="text-violet-200 text-sm mt-1">
                Palier {dollar(palier.seuil)} atteint 🎉
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold tabular-nums text-violet-200">{dollar(cashCollected)}</p>
              <p className="text-violet-300 text-sm mt-1">
                {dollar(nextSeuil - cashCollected)} de plus pour atteindre le 1er palier
              </p>
            </>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-violet-300 mb-1">Cash collecté</p>
          <p className="text-xl font-bold tabular-nums">{dollar(cashCollected)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="flex justify-between text-xs text-violet-300 mb-1.5">
          <span>{dollar(prevSeuil)}</span>
          {nextPalier && (
            <span>{dollar(nextSeuil)} → +{dollar(nextPalier.closer)}</span>
          )}
        </div>
        <div className="w-full h-2.5 rounded-full bg-violet-500/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-300 transition-all duration-700"
            style={{ width: `${Math.max(progress > 0 ? 2 : 0, progress)}%` }}
          />
        </div>
      </div>
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
