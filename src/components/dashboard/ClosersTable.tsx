'use client'

import { useState } from 'react'
import { Users, ChevronDown, ChevronUp, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { dollar } from '@/lib/constants'

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

interface TrendPoint { mois: string; closes: number; cash: number }
interface CloserHistory { userId: string; points: TrendPoint[] }
interface Props { rows: CloserRow[]; history: CloserHistory[] }

function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

function PctBadge({ value }: { value: number }) {
  const cls = value >= 40
    ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
    : value >= 20
    ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
    : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums', cls)}>
      {value} %
    </span>
  )
}

function PerfIndicator({ closePct }: { closePct: number }) {
  if (closePct >= 40) return <span className="inline-block w-1.5 h-5 rounded-full bg-emerald-400" />
  if (closePct >= 20) return <span className="inline-block w-1.5 h-5 rounded-full bg-amber-400" />
  return <span className="inline-block w-1.5 h-5 rounded-full bg-red-400" />
}

export default function ClosersTable({ rows, history }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const totals = rows.reduce(
    (acc, r) => ({
      scheduled: acc.scheduled + r.scheduled, show: acc.show + r.show,
      pitch: acc.pitch + r.pitch, closes: acc.closes + r.closes,
      cash: acc.cash + r.cash, revenue: acc.revenue + r.revenue,
    }),
    { scheduled: 0, show: 0, pitch: 0, closes: 0, cash: 0, revenue: 0 },
  )

  const selectedCloser  = rows.find(r => r.userId === selectedId)
  const selectedHistory = history.find(h => h.userId === selectedId)

  if (rows.length === 0) {
    return (
      <div className="bg-[#13131a] border border-white/[0.07] rounded-2xl shadow-xl p-10 text-center">
        <p className="text-sm text-gray-600">Aucune stat closer pour cette période</p>
      </div>
    )
  }

  return (
    <div className="bg-[#13131a] border border-white/[0.07] rounded-2xl shadow-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
        <Users size={15} className="text-violet-400" />
        <h3 className="text-sm font-semibold text-gray-200">Performance closers</h3>
        <span className="ml-auto text-xs text-gray-600">Cliquer sur un closer pour voir son historique</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-xs font-medium text-gray-600 uppercase tracking-wider">
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
              <th className="px-3 py-3 w-6" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map(r => {
              const isSelected = r.userId === selectedId
              return (
                <tr
                  key={r.userId}
                  onClick={() => setSelectedId(isSelected ? null : r.userId)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isSelected ? 'bg-violet-500/10' : 'hover:bg-white/[0.02]',
                  )}
                >
                  <td className="px-3 py-3 text-center"><PerfIndicator closePct={r.closePct} /></td>
                  <td className="px-4 py-3 font-semibold text-white">{r.nom}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-400">{r.scheduled}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-400">{r.show}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={r.showPct} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-400">{r.pitch}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={r.pitchPct} /></td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">{r.closes}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={r.closePct} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-400 font-medium">{dollar(r.cash)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-500">{dollar(r.revenue)}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {isSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/[0.06] bg-white/[0.02] font-semibold text-gray-400 text-xs">
              <td className="px-3 py-3" />
              <td className="px-4 py-3 text-gray-600 uppercase tracking-wide">Total équipe</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.scheduled}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.show}</td>
              <td className="px-4 py-3 text-right"><PctBadge value={pct(totals.show, totals.scheduled)} /></td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.pitch}</td>
              <td className="px-4 py-3 text-right"><PctBadge value={pct(totals.pitch, totals.show)} /></td>
              <td className="px-4 py-3 text-right tabular-nums text-white">{totals.closes}</td>
              <td className="px-4 py-3 text-right"><PctBadge value={pct(totals.closes, totals.pitch)} /></td>
              <td className="px-4 py-3 text-right tabular-nums text-blue-400">{dollar(totals.cash)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{dollar(totals.revenue)}</td>
              <td className="px-3 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      {selectedCloser && selectedHistory && (
        <div className="border-t border-white/[0.06] bg-white/[0.02] px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-200">Historique — {selectedCloser.nom}</p>
              <p className="text-xs text-gray-500 mt-0.5">Closes et cash mois par mois</p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/[0.05] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {selectedHistory.points.length < 2 ? (
            <p className="text-xs text-gray-600 py-4 text-center">Pas encore assez de données historiques</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedHistory.points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a24', color: '#e5e7eb' }}
                    formatter={(v, name) =>
                      name === 'cash' ? [`${dollar(Number(v))}`, 'Cash'] : [Number(v), 'Closes']
                    }
                  />
                  <Bar dataKey="closes" name="closes" fill="#7c3aed" radius={[3,3,0,0]} />
                  <Bar dataKey="cash"   name="cash"   fill="#4338ca50" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
