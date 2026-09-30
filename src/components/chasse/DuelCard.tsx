'use client'

import { cn } from '@/lib/utils'
import { Trophy, Target, Swords, Crown } from 'lucide-react'

const dollar = (n: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' $'

interface DuelCardProps {
  duel: {
    id:           string
    is_cerf:      boolean
    cerf_target:  number | null
    is_confirmed: boolean
    winner_id:    string | null
    points_p1:    number
    points_p2:    number
    player1_cash_override: number | null
    player2_cash_override: number | null
  }
  player1: { id: string; nom: string; position: string }
  player2?: { id: string; nom: string; position: string } | null
  cash1:   number
  cash2:   number
  showCash: boolean
  isAdmin:  boolean
}

export default function DuelCard({ duel, player1, player2, cash1, cash2, showCash, isAdmin }: DuelCardProps) {
  const isConfirmed = duel.is_confirmed
  const w1 = isConfirmed && duel.winner_id === player1.id
  const w2 = isConfirmed && duel.winner_id === player2?.id
  const draw = isConfirmed && !duel.winner_id && !duel.is_cerf

  if (duel.is_cerf) {
    const cerfWon = isConfirmed && duel.winner_id === player1.id
    const progressPct = duel.cerf_target ? Math.min(100, Math.round((cash1 / duel.cerf_target) * 100)) : 0

    return (
      <div className={cn(
        'rounded-xl border p-4 space-y-3',
        cerfWon ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200',
      )}>
        <div className="flex items-center gap-2">
          <span className="text-base">🦌</span>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Chasse au Cerf</span>
          {cerfWon && <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Abattue 🏹</span>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-stone-800">{player1.nom}</p>
            {showCash || isAdmin ? (
              <p className="text-xs text-stone-500 tabular-nums">{dollar(cash1)}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400">Cible</p>
            <p className="text-sm font-bold text-stone-700 tabular-nums">
              {duel.cerf_target ? dollar(duel.cerf_target) : '—'}
            </p>
          </div>
        </div>

        {duel.cerf_target ? (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', cerfWon ? 'bg-amber-500' : 'bg-stone-400')}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-stone-400 text-right">{progressPct}%</p>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      isConfirmed && !draw ? 'border-emerald-200' : 'border-stone-200',
      !isConfirmed ? 'bg-white' : draw ? 'bg-stone-50' : 'bg-emerald-50/30',
    )}>
      {/* Header */}
      <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
        <Swords size={12} className="text-stone-400" />
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Duel</span>
        {isConfirmed && draw && (
          <span className="ml-auto text-[10px] font-semibold text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">Égalité ½</span>
        )}
        {isConfirmed && !draw && (
          <Crown size={11} className="ml-auto text-amber-500" />
        )}
      </div>

      {/* Joueuses */}
      <div className="divide-y divide-stone-100">
        {[
          { player: player1, cash: cash1, isWinner: w1, points: duel.points_p1 },
          { player: player2, cash: cash2, isWinner: w2, points: duel.points_p2 },
        ].filter(r => r.player).map((row, i) => (
          <div
            key={row.player!.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3',
              row.isWinner && 'bg-emerald-50',
            )}
          >
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
              i === 0 ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700',
            )}>
              {row.player!.position}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-800 truncate">{row.player!.nom}</p>
              {(showCash || isAdmin) && (
                <p className="text-xs text-stone-400 tabular-nums">{dollar(row.cash)}</p>
              )}
            </div>
            {isConfirmed && (
              <div className="shrink-0 text-right">
                {row.isWinner
                  ? <span className="text-xs font-bold text-emerald-700">🏹 +1 pt</span>
                  : draw
                    ? <span className="text-xs text-stone-400">½ pt</span>
                    : <span className="text-xs text-stone-300">0 pt</span>
                }
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
