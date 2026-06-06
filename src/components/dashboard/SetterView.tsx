import { Handshake, Wallet, DollarSign } from 'lucide-react'
import KpiCard       from './KpiCard'
import MonthSelector from './MonthSelector'
import type { MonthOption } from './MonthSelector'
import { PALIERS, dollar, getPalier } from '@/lib/constants'
import { cn } from '@/lib/utils'

const PALIERS_ASC = [...PALIERS].reverse()

interface Deal {
  id:              string
  entry_date:      string
  client_name:     string | null
  montant_courant: number
  collected:       number
  closer_name:     string | null
}

interface Props {
  prenom:        string
  moisLabel:     string
  selKey:        string
  isCurrentMonth: boolean
  monthOptions:  MonthOption[]
  dealsSettés:   number
  cashGeneré:    number
  commission:    number
  recentDeals:   Deal[]
}

function BonusPersonnelSetter({ cashGeneré }: { cashGeneré: number }) {
  const palier     = getPalier(cashGeneré)
  const nextPalier = PALIERS_ASC.find(p => cashGeneré < p.seuil)
  const maxReached = palier && !nextPalier

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Bonus ce mois</p>
          {palier ? (
            <>
              <p className="text-3xl font-bold text-green-600 tabular-nums">+{dollar(palier.setter)}</p>
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
          <p className="text-xs text-gray-400 mb-1">Cash généré</p>
          <p className="text-lg font-bold text-gray-800 tabular-nums">{dollar(cashGeneré)}</p>
          {palier && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              Palier {dollar(palier.seuil)}
            </span>
          )}
        </div>
      </div>

      {/* Tier steps */}
      <div className="flex gap-1.5 mb-3">
        {PALIERS_ASC.map(p => {
          const reached = cashGeneré >= p.seuil
          const isNext  = !reached && p.seuil === nextPalier?.seuil
          return (
            <div key={p.seuil} className={cn(
              'flex-1 rounded-lg p-2 text-center border transition-colors',
              reached  ? 'bg-blue-600 border-blue-600 text-white'
              : isNext ? 'bg-blue-50 border-blue-300 text-blue-700'
              :          'bg-gray-50 border-gray-100 text-gray-400',
            )}>
              <p className="text-[10px] font-medium leading-tight">{dollar(p.seuil)}</p>
              <p className="text-[11px] font-bold mt-0.5">+{dollar(p.setter)}</p>
            </div>
          )
        })}
      </div>

      {maxReached && (
        <p className="text-xs text-blue-600 font-medium text-center">Palier maximum atteint — félicitations !</p>
      )}
      {nextPalier && (
        <p className="text-xs text-gray-400 text-center">
          {dollar(nextPalier.seuil - cashGeneré)} de plus pour atteindre{' '}
          <span className="text-blue-600 font-medium">{dollar(nextPalier.seuil)}</span>
          {' '}→ <span className="text-green-600 font-semibold">+{dollar(nextPalier.setter)}</span>
        </p>
      )}
    </div>
  )
}

export default function SetterView({
  prenom, moisLabel, selKey, isCurrentMonth, monthOptions,
  dealsSettés, cashGeneré, commission, recentDeals,
}: Props) {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Deals settés"      value={dealsSettés}        icon={Handshake}   color="violet" subtitle="Ce mois" />
        <KpiCard title="Cash généré"       value={dollar(cashGeneré)} icon={Wallet}      color="blue"   subtitle="Via tes deals" />
        <KpiCard title="Commission setter" value={dollar(commission)}  icon={DollarSign}  color="green"  subtitle="5 % du cash collecté" />
      </div>

      {/* Bonus */}
      <BonusPersonnelSetter cashGeneré={cashGeneré} />

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
                  <th className="px-4 py-3 text-left">Closer</th>
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
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[140px] truncate">{d.client_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{d.closer_name ?? '—'}</td>
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
