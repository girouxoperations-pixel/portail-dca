'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dollar } from '@/lib/constants'
import { definirObjectifUser } from '@/app/(portal)/equipe/actions'

export interface PersonGoal {
  userId:        string
  nom:           string
  role:          'closer' | 'setter'
  rank:          number
  targetCash:    number
  targetCloses:  number
  targetRdv:     number
  targetCalls:   number
  actualCash:    number
  actualCloses:  number
  actualRdv:     number
  actualCalls:   number
  projectedCash: number | null
  year:          number
  month:         number
  isAdmin:       boolean
}

const INPUT_CLS =
  'w-full px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 tabular-nums placeholder-gray-400'

function ProgressBar({
  value, goal, label, format,
}: {
  value: number; goal: number; label: string; format: (n: number) => string
}) {
  const pct      = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'
  const pctColor = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-900 tabular-nums">{format(value)}</span>
          {goal > 0 && (
            <span className={cn('text-xs font-semibold tabular-nums', pctColor)}>{pct} %</span>
          )}
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }}
        />
      </div>
      {goal > 0 ? (
        <p className="text-xs text-gray-400">Objectif : {format(goal)}</p>
      ) : (
        <p className="text-xs text-gray-300 italic">Pas d&apos;objectif fixé</p>
      )}
    </div>
  )
}

const RANK_RING: Record<number, string> = {
  1: 'ring-2 ring-yellow-300',
  2: 'ring-2 ring-gray-300',
  3: 'ring-2 ring-orange-300',
}

const RANK_BADGE: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200',
  2: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  3: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
}

const RANK_LABEL: Record<number, string> = {
  1: '#1',
  2: '#2',
  3: '#3',
}

export default function PersonCard({
  userId, nom, role, rank,
  targetCash, targetCloses, targetRdv, targetCalls,
  actualCash, actualCloses, actualRdv, actualCalls,
  projectedCash,
  year, month, isAdmin,
}: PersonGoal) {
  const [editing, setEditing] = useState(false)
  const [cash,    setCash]    = useState(targetCash)
  const [closes,  setCloses]  = useState(targetCloses)
  const [rdv,     setRdv]     = useState(targetRdv)
  const [calls,   setCalls]   = useState(targetCalls)
  const [pending, startT]     = useTransition()

  function handleSave() {
    startT(async () => {
      await definirObjectifUser(userId, year, month, cash, closes, rdv, calls)
      setEditing(false)
    })
  }

  function handleCancel() {
    setCash(targetCash); setCloses(targetCloses)
    setRdv(targetRdv);  setCalls(targetCalls)
    setEditing(false)
  }

  const ringCls  = RANK_RING[rank]  ?? ''
  const badgeCls = RANK_BADGE[rank] ?? 'bg-gray-50 text-gray-400 ring-1 ring-gray-100'
  const rankLabel = RANK_LABEL[rank] ?? `#${rank}`

  return (
    <div className={cn(
      'bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md',
      ringCls,
    )}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{nom}</p>
          <span className={cn(
            'inline-flex mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium',
            role === 'closer'
              ? 'bg-violet-100 text-violet-700'
              : 'bg-blue-100 text-blue-700',
          )}>
            {role}
          </span>
        </div>

        <span className={cn('text-xs px-2.5 py-1 rounded-full font-bold shrink-0 tabular-nums', badgeCls)}>
          {rankLabel}
        </span>

        {isAdmin && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
            title="Définir les objectifs"
          >
            <Pencil size={12} />
          </button>
        )}
        {isAdmin && editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCancel}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={12} />
            </button>
            <button
              onClick={handleSave}
              disabled={pending}
              className="p-1.5 text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60"
            >
              <Check size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {role === 'closer' ? (
          editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Obj. cash ($)</label>
                <input
                  type="number" min="0" step="1000" value={cash}
                  onChange={e => setCash(Number(e.target.value))}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Obj. closes (nb)</label>
                <input
                  type="number" min="0" step="1" value={closes}
                  onChange={e => setCloses(Number(e.target.value))}
                  className={INPUT_CLS}
                />
              </div>
            </div>
          ) : (
            <>
              <ProgressBar value={actualCash}   goal={targetCash}   label="Cash collecté" format={dollar} />
              <ProgressBar value={actualCloses} goal={targetCloses} label="Closes"         format={n => `${n}`} />
              {projectedCash !== null && projectedCash > 0 && (
                <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-violet-400" />
                    <span className="text-xs text-gray-400">Projection fin de mois</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{dollar(projectedCash)}</span>
                </div>
              )}
            </>
          )
        ) : (
          editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Obj. RDV (nb)</label>
                <input
                  type="number" min="0" step="1" value={rdv}
                  onChange={e => setRdv(Number(e.target.value))}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Obj. appels (nb)</label>
                <input
                  type="number" min="0" step="10" value={calls}
                  onChange={e => setCalls(Number(e.target.value))}
                  className={INPUT_CLS}
                />
              </div>
            </div>
          ) : (
            <>
              <ProgressBar value={actualRdv}   goal={targetRdv}   label="RDV bookés"       format={n => `${n}`} />
              <ProgressBar value={actualCalls} goal={targetCalls} label="Appels tentatives" format={n => `${n}`} />
            </>
          )
        )}
      </div>
    </div>
  )
}
