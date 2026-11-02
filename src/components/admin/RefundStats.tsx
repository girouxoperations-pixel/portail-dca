'use client'

import type { RefundStats } from '@/components/admin/AdminView'

const MONTHS_FR = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function pct(n: number, total: number) {
  if (total === 0) return '—'
  return ((n / total) * 100).toFixed(1) + '%'
}

function PctBar({ value, total, color }: { value: number; total: number; color: string }) {
  const p = total === 0 ? 0 : Math.min(100, (value / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-400 w-14 text-right">{pct(value, total)}</span>
    </div>
  )
}

export default function RefundStats({ stats }: { stats: RefundStats }) {
  const { monthly, delays, totalRefunds } = stats

  const delayBuckets = [
    { label: '≤ 10 jours',  count: delays.d10,     color: 'bg-emerald-500' },
    { label: '11 – 30 jours', count: delays.d30,   color: 'bg-yellow-400'  },
    { label: '31 jours +',  count: delays.d31plus, color: 'bg-red-500'     },
  ]

  return (
    <div className="space-y-8">

      {/* ── Délai de remboursement ───────────────────────────────────── */}
      <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Délai de remboursement</h2>
        <p className="text-xs text-gray-500 mb-5">
          {totalRefunds} remboursement{totalRefunds !== 1 ? 's' : ''} avec date connue
        </p>
        <div className="space-y-4">
          {delayBuckets.map(b => (
            <div key={b.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300">{b.label}</span>
                <span className="text-xs font-semibold text-white tabular-nums">
                  {b.count} ({pct(b.count, totalRefunds)})
                </span>
              </div>
              <PctBar value={b.count} total={totalRefunds} color={b.color} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Taux de remboursement par mois ──────────────────────────── */}
      <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Taux de remboursement par mois</h2>
          <p className="text-xs text-gray-500 mt-0.5">Remboursements classés par mois d'entrée du deal original</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Mois</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400">Deals</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400">Remboursés</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400">Taux</th>
                <th className="px-6 py-3 pr-6 text-right text-xs font-medium text-gray-400 w-48">Barre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {monthly.map(row => {
                const rate = row.totalDeals === 0 ? 0 : (row.totalRefunds / row.totalDeals) * 100
                const barColor = rate === 0 ? 'bg-gray-600'
                  : rate < 5  ? 'bg-emerald-500'
                  : rate < 10 ? 'bg-yellow-400'
                  : rate < 20 ? 'bg-orange-400'
                  : 'bg-red-500'
                return (
                  <tr key={`${row.year}-${row.month}`} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-white">
                      {MONTHS_FR[row.month]} {row.year}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-300">{row.totalDeals}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-300">{row.totalRefunds}</td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      <span className={`font-semibold ${
                        rate === 0 ? 'text-gray-500'
                        : rate < 5  ? 'text-emerald-400'
                        : rate < 10 ? 'text-yellow-400'
                        : rate < 20 ? 'text-orange-400'
                        : 'text-red-400'
                      }`}>
                        {pct(row.totalRefunds, row.totalDeals)}
                      </span>
                    </td>
                    <td className="px-6 py-3 pr-6">
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, rate * 4)}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
