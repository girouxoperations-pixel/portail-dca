'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
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
  'w-full px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 tabular-nums'

// Top accent strip color per rank
const RANK_STRIP: Record<number, string> = {
  1: 'bg-gradient-to-r from-yellow-400 to-amber-300',
  2: 'bg-gradient-to-r from-gray-300 to-gray-200',
  3: 'bg-gradient-to-r from-orange-300 to-amber-200',
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

const RANK_BADGE: Record<number, string> = {
  1: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  2: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  3: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
}

function initials(nom: string) {
  return nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function ProgressBar({
  value, goal, label, format,
}: {
  value: number; goal: number; label: string; format: (n: number) => string
}) {
  const pct      = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  const pctColor = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-base font-bold text-gray-900 tabular-nums leading-none">{format(value)}</span>
          {goal > 0 && (
            <span className={cn('text-xs font-semibold tabular-nums', pctColor)}>{pct}%</span>
          )}
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {goal > 0 ? `Objectif : ${format(goal)}` : <span className="italic">Pas d&apos;objectif fixé</span>}
      </p>
    </div>
  )
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

  const stripCls = RANK_STRIP[rank] ?? 'bg-gray-100'
  const badgeCls = RANK_BADGE[rank] ?? 'bg-gray-50 text-gray-400 ring-1 ring-gray-100'
  const medal    = RANK_MEDAL[rank]
  const isTop3   = rank <= 3

  // Projection on-track status
  const onTrack = projectedCash !== null && targetCash > 0
    ? projectedCash >= targetCash
    : null

  return (
    <div className={cn(
      'bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
      rank === 1 && 'shadow-yellow-100',
    )}>
      {/* Rank accent strip */}
      {isTop3 && <div className={cn('h-1', stripCls)} />}

      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        {/* Avatar */}
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          role === 'closer'
            ? 'bg-violet-100 text-violet-700'
            : 'bg-blue-100 text-blue-700',
        )}>
          {initials(nom)}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{nom}</p>
          <span className={cn(
            'inline-flex mt-0.5 text-xs px-1.5 py-0.5 rounded-md font-medium',
            role === 'closer'
              ? 'bg-violet-50 text-violet-600'
              : 'bg-blue-50 text-blue-600',
          )}>
            {role}
          </span>
        </div>

        {/* Rank badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums',
            badgeCls,
          )}>
            {medal ? `${medal} ` : ''}{rank === 1 || rank === 2 || rank === 3 ? `#${rank}` : `#${rank}`}
          </span>

          {isAdmin && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-gray-300 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
              title="Définir les objectifs"
            >
              <Pencil size={11} />
            </button>
          )}
          {isAdmin && editing && (
            <div className="flex items-center gap-1">
              <button onClick={handleCancel} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={11} />
              </button>
              <button onClick={handleSave} disabled={pending} className="p-1.5 text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60">
                <Check size={11} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-gray-100 mx-5" />

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {role === 'closer' ? (
          editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Obj. cash ($)</label>
                <input type="number" min="0" step="1000" value={cash}
                  onChange={e => setCash(Number(e.target.value))} className={INPUT_CLS} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Obj. closes (nb)</label>
                <input type="number" min="0" step="1" value={closes}
                  onChange={e => setCloses(Number(e.target.value))} className={INPUT_CLS} />
              </div>
            </div>
          ) : (
            <>
              <ProgressBar value={actualCash}   goal={targetCash}   label="Cash collecté" format={dollar} />
              <ProgressBar value={actualCloses} goal={targetCloses} label="Closes"         format={n => String(n)} />

              {projectedCash !== null && projectedCash > 0 && (
                <div className="mt-1 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-violet-400 shrink-0" />
                    <span className="text-xs text-gray-400">Projection fin de mois</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-gray-900 tabular-nums">{dollar(projectedCash)}</span>
                    {onTrack !== null && (
                      <span className={cn(
                        'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
                        onTrack
                          ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                          : 'bg-red-50 text-red-500 ring-1 ring-red-200',
                      )}>
                        {onTrack ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                        {onTrack ? 'En route' : 'En retard'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Obj. cash ($)</label>
                <input type="number" min="0" step="1000" value={cash}
                  onChange={e => setCash(Number(e.target.value))} className={INPUT_CLS} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Obj. RDV (nb)</label>
                <input type="number" min="0" step="1" value={rdv}
                  onChange={e => setRdv(Number(e.target.value))} className={INPUT_CLS} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Obj. appels (nb)</label>
                <input type="number" min="0" step="10" value={calls}
                  onChange={e => setCalls(Number(e.target.value))} className={INPUT_CLS} />
              </div>
            </div>
          ) : (
            <>
              <ProgressBar value={actualCash}  goal={targetCash}  label="Cash collecté"    format={dollar} />
              <ProgressBar value={actualRdv}   goal={targetRdv}   label="RDV bookés"       format={n => String(n)} />
              <ProgressBar value={actualCalls} goal={targetCalls} label="Appels tentatives" format={n => String(n)} />
            </>
          )
        )}
      </div>
    </div>
  )
}
