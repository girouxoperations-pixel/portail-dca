'use client'

import { cn } from '@/lib/utils'
import { Skull } from 'lucide-react'

const dollar = (n: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' $'

interface StandingRow {
  playerId:     string
  nom:          string
  position:     string
  points:       number
  cash:         number
  rank:         number
  isEliminated: boolean
  totalPoints?: number
  totalCash?:   number
  isThreatened?: boolean
  groupe?:      string
}

interface StandingsProps {
  groupe:    'closer' | 'setter'
  rows:      StandingRow[]
  showCash:  boolean
  month:     string
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function Standings({ groupe, rows, showCash, month }: StandingsProps) {
  const actifs    = rows.filter(r => !r.isEliminated)
  const eliminees = rows.filter(r => r.isEliminated)

  const color = groupe === 'closer' ? 'violet' : 'blue'

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{groupe === 'closer' ? '🏹' : '📞'}</span>
          <span className="text-sm font-bold text-stone-800 capitalize">{groupe}s</span>
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
            color === 'violet' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700',
          )}>
            {month}
          </span>
        </div>
        <span className="text-xs text-stone-400">{actifs.length} actives</span>
      </div>

      <div className="divide-y divide-stone-50">
        {actifs.map((row) => (
          <div
            key={row.playerId}
            className={cn(
              'flex items-center gap-3 px-4 py-3',
              row.rank === actifs.length && actifs.length > 1 && 'bg-red-50',
            )}
          >
            <div className="w-6 text-center shrink-0">
              <span className="text-sm">{MEDALS[row.rank] ?? `#${row.rank}`}</span>
            </div>

            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
              color === 'violet' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700',
            )}>
              {row.position}
            </div>

            <p className="flex-1 text-sm font-semibold text-stone-800 truncate">{row.nom}</p>

            <div className="shrink-0 text-right space-y-0.5">
              <p className="text-sm font-bold tabular-nums text-stone-900">
                {row.points % 1 === 0 ? row.points : row.points.toFixed(1)} pt{row.points !== 1 ? 's' : ''}
              </p>
              {showCash && (
                <p className="text-[10px] text-stone-400 tabular-nums">{dollar(row.cash)}</p>
              )}
            </div>

            {row.rank === actifs.length && actifs.length > 1 && (
              <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                ⚠️
              </span>
            )}
          </div>
        ))}
      </div>

      {eliminees.length > 0 && (
        <div className="border-t border-stone-100">
          {eliminees.map(row => (
            <div key={row.playerId} className="flex items-center gap-3 px-4 py-2.5 opacity-50">
              <Skull size={13} className="text-stone-400 shrink-0" />
              <p className="flex-1 text-sm text-stone-500 line-through truncate">{row.nom}</p>
              <p className="text-xs text-stone-400 tabular-nums">
                {row.points % 1 === 0 ? row.points : row.points.toFixed(1)} pts
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
