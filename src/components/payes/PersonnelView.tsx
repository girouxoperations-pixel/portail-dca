'use client'

import { CheckCircle2, Clock, Trophy, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dollar } from '@/lib/constants'
import Badge      from '@/components/ui/Badge'
import PageHeader from '@/components/layout/PageHeader'

// ── Types ─────────────────────────────────────────────────────────────

interface PayeEntry {
  id: string
  period_label: string
  month: number
  year: number
  client_name: string
  closer_id: string | null
  setter_id: string | null
  montant: number
  commission: number
  commission_setter: number
  statut: string
  notes: string | null
  cash_entries: { collected: number } | null
}

interface BonusTier {
  seuil:  number
  closer: number
  setter: number
}

interface Props {
  entrees:     PayeEntry[]
  role:        string
  userId:      string
  myCollected: number
  myBonus:     BonusTier | null
  moisLabel:   string
}

// ── Composant ─────────────────────────────────────────────────────────

export default function PersonnelView({
  entrees, role, myCollected, myBonus, moisLabel,
}: Props) {
  const isCloser  = role === 'closer'
  const bonusMois = myBonus ? (isCloser ? myBonus.closer : myBonus.setter) : null

  const totalCommission = entrees.reduce(
    (s, e) => s + (isCloser ? e.commission : e.commission_setter),
    0,
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <PageHeader titre="Mes Payes" subtitle={moisLabel} />

      <div
        className={cn(
          'rounded-xl border p-5 flex items-center gap-4',
          bonusMois !== null
            ? 'bg-amber-50 border-amber-100'
            : 'bg-white border-gray-100 shadow-sm',
        )}
      >
        {bonusMois !== null
          ? <Trophy size={32} className="text-amber-400 shrink-0" />
          : <Award  size={32} className="text-gray-200 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">
            {bonusMois !== null
              ? `Bonus automatique ce mois : +${dollar(bonusMois)}`
              : 'Pas encore de bonus atteint ce mois'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {dollar(myCollected)} collecté
            {myBonus
              ? ` — Palier ${dollar(myBonus.seuil)} atteint`
              : ' — Palier suivant : 50 000 $'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums text-gray-900">{dollar(totalCommission)}</p>
          <p className="text-xs text-gray-400">Commissions totales</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            Historique — {entrees.length} entrée{entrees.length !== 1 ? 's' : ''}
          </h3>
        </div>

        {entrees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">Aucune entrée enregistrée</p>
            <p className="text-xs text-gray-300 mt-1">
              Vos commissions apparaîtront ici une fois saisies par l'administration.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                  <th className="px-4 py-2.5 text-left">Client</th>
                  <th className="px-4 py-2.5 text-left">Période</th>
                  <th className="px-4 py-2.5 text-right">Cash reçu</th>
                  <th className="px-4 py-2.5 text-right">Ma commission</th>
                  <th className="px-4 py-2.5 text-right">Mon bonus</th>
                  <th className="px-4 py-2.5 text-left">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entrees.map(e => {
                  const maComm    = isCloser ? e.commission : e.commission_setter
                  const collected = e.cash_entries?.collected
                    ?? (isCloser
                      ? (e.commission > 0 ? Math.round(e.commission / 0.10) : e.montant)
                      : (e.commission_setter > 0 ? Math.round(e.commission_setter / 0.05) : e.montant))
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[160px] truncate">{e.client_name}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.period_label}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{dollar(collected)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-violet-700">{dollar(maComm)}</td>
                      <td className="px-4 py-3 text-right">
                        {bonusMois !== null
                          ? <span className="text-xs font-semibold text-amber-600">+{dollar(bonusMois)}</span>
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={e.statut === 'Payé' ? 'green' : 'amber'} icon={e.statut === 'Payé' ? <CheckCircle2 size={10} /> : <Clock size={10} />}>
                          {e.statut}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50 font-semibold">
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide" colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-right tabular-nums text-violet-700">{dollar(totalCommission)}</td>
                  <td className="px-4 py-3 text-right">
                    {bonusMois !== null && (
                      <span className="text-xs font-semibold text-amber-600">+{dollar(bonusMois)}</span>
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
