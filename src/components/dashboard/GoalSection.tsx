'use client'

import { useState, useTransition } from 'react'
import { Target, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { definirObjectifs } from '@/app/(portal)/dashboard/actions'

export interface GoalData {
  targetCash:    number
  targetCloses:  number
  targetRevenue: number
  actualCash:    number
  actualCloses:  number
  actualRevenue: number
  year:          number
  month:         number
  isAdmin:       boolean
}

const INPUT_CLS =
  'w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 tabular-nums'

function ProgressBar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  const barColor =
    pct >= 80 ? 'bg-green-500' :
    pct >= 50 ? 'bg-amber-400' : 'bg-red-400'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={cn('font-semibold tabular-nums', pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500')}>
          {pct} %
        </span>
        <span className="text-gray-400">{goal > 0 ? `/ ${goal >= 1000 ? `${(goal/1000).toFixed(0)}k` : goal}` : '—'}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }}
        />
      </div>
    </div>
  )
}

function fmt$(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(0)} k$` : `${n} $`
}

export default function GoalSection({
  targetCash, targetCloses, targetRevenue,
  actualCash, actualCloses, actualRevenue,
  year, month, isAdmin,
}: GoalData) {
  const [editing, setEditing]   = useState(false)
  const [cash,    setCash]      = useState(targetCash)
  const [closes,  setCloses]    = useState(targetCloses)
  const [revenue, setRevenue]   = useState(targetRevenue)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await definirObjectifs(year, month, cash, closes, revenue)
      setEditing(false)
    })
  }

  function handleCancel() {
    setCash(targetCash)
    setCloses(targetCloses)
    setRevenue(targetRevenue)
    setEditing(false)
  }

  const hasGoals = targetCash > 0 || targetCloses > 0 || targetRevenue > 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-violet-500" />
          <h3 className="text-sm font-semibold text-gray-900">Objectifs du mois</h3>
        </div>
        {isAdmin && (
          editing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
              >
                <X size={12} /> Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={pending}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60"
              >
                <Check size={12} /> {pending ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-violet-600 border border-gray-200 hover:border-violet-300 rounded-lg transition-colors"
            >
              <Pencil size={12} /> Modifier
            </button>
          )
        )}
      </div>

      {!hasGoals && !editing ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">Aucun objectif défini pour ce mois.</p>
          {isAdmin && (
            <button
              onClick={() => setEditing(true)}
              className="mt-2 text-xs text-violet-600 hover:underline"
            >
              Définir les objectifs →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-50">

          {/* Cash collecté */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cash collecté</p>
              <span className="text-sm font-bold text-gray-800 tabular-nums">{fmt$(actualCash)}</span>
            </div>
            {editing ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Objectif ($)</label>
                <input type="number" min="0" step="1000" value={cash}
                  onChange={e => setCash(Number(e.target.value))} className={INPUT_CLS} />
              </div>
            ) : (
              <ProgressBar value={actualCash} goal={targetCash} color="blue" />
            )}
          </div>

          {/* Closes */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Closes</p>
              <span className="text-sm font-bold text-gray-800 tabular-nums">{actualCloses}</span>
            </div>
            {editing ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Objectif (nb)</label>
                <input type="number" min="0" step="1" value={closes}
                  onChange={e => setCloses(Number(e.target.value))} className={INPUT_CLS} />
              </div>
            ) : (
              <ProgressBar value={actualCloses} goal={targetCloses} color="green" />
            )}
          </div>

          {/* Revenue */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</p>
              <span className="text-sm font-bold text-gray-800 tabular-nums">{fmt$(actualRevenue)}</span>
            </div>
            {editing ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Objectif ($)</label>
                <input type="number" min="0" step="1000" value={revenue}
                  onChange={e => setRevenue(Number(e.target.value))} className={INPUT_CLS} />
              </div>
            ) : (
              <ProgressBar value={actualRevenue} goal={targetRevenue} color="violet" />
            )}
          </div>

        </div>
      )}
    </div>
  )
}
