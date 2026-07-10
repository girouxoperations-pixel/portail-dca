'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X, TrendingUp, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dollar } from '@/lib/constants'
import { definirObjectifUser, getHistoriqueUser, type MonthStat } from '@/app/(portal)/equipe/actions'

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

const MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']

function initials(nom: string) {
  return nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function PctBadge({ value, goal }: { value: number; goal: number }) {
  if (goal <= 0) return <span className="text-gray-300 text-xs">—</span>
  const p = pct(value, goal)
  const cls = p >= 100 ? 'bg-emerald-50 text-emerald-700' : p >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
  return <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded tabular-nums', cls)}>{p}%</span>
}

function ProgressBar({
  value, goal, label, format,
}: {
  value: number; goal: number; label: string; format: (n: number) => string
}) {
  const p       = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  const barColor = p >= 80 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-400' : 'bg-red-400'
  const pctColor = p >= 80 ? 'text-emerald-600' : p >= 50 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-base font-bold text-gray-900 tabular-nums leading-none">{format(value)}</span>
          {goal > 0 && (
            <span className={cn('text-xs font-semibold tabular-nums', pctColor)}>{p}%</span>
          )}
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${Math.max(p > 0 ? 3 : 0, p)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {goal > 0 ? `Objectif : ${format(goal)}` : <span className="italic">Pas d&apos;objectif fixé</span>}
      </p>
    </div>
  )
}

function HistoriqueCloser({ rows }: { rows: MonthStat[] }) {
  const totCash      = rows.reduce((s, r) => s + r.cashCollected, 0)
  const totCashDeals = rows.reduce((s, r) => s + r.cashDeals, 0)
  const totDeals     = rows.reduce((s, r) => s + r.nDeals, 0)
  const avgCash      = totDeals > 0 ? Math.round(totCashDeals / totDeals) : 0

  return (
    <div className="px-5 pb-5 space-y-4">
      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Cash total',        val: dollar(totCash) },
          { label: 'Cash new deals',    val: dollar(totCashDeals) },
          { label: 'Deals total',       val: String(totDeals) },
          { label: 'Moy. cash/deal',    val: avgCash > 0 ? dollar(avgCash) : '—' },
        ].map(({ label, val }) => (
          <div key={label} className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-bold text-gray-900 tabular-nums mt-0.5">{val}</p>
          </div>
        ))}
      </div>

      {/* Monthly table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-3 py-2 text-left">Mois</th>
              <th className="px-3 py-2 text-right">Deals</th>
              <th className="px-3 py-2 text-right">Cash deals</th>
              <th className="px-3 py-2 text-right">Moy./deal</th>
              <th className="px-3 py-2 text-right">Cash total</th>
              <th className="px-3 py-2 text-right">Obj.</th>
              <th className="px-3 py-2 text-right">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => {
              const avg = r.nDeals > 0 ? Math.round(r.cashDeals / r.nDeals) : 0
              return (
                <tr key={`${r.year}-${r.month}`} className="hover:bg-violet-50/20">
                  <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                    {MOIS_FR[r.month - 1]} {r.year}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.nDeals || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-violet-700">
                    {r.cashDeals > 0 ? dollar(r.cashDeals) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                    {avg > 0 ? dollar(avg) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {r.cashCollected > 0 ? dollar(r.cashCollected) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-400">
                    {r.targetCash > 0 ? dollar(r.targetCash) : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <PctBadge value={r.cashCollected} goal={r.targetCash} />
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-gray-700">
              <td className="px-3 py-2 text-[10px] uppercase tracking-wide text-gray-400">Total</td>
              <td className="px-3 py-2 text-right tabular-nums">{totDeals}</td>
              <td className="px-3 py-2 text-right tabular-nums text-violet-700">{dollar(totCashDeals)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{avgCash > 0 ? dollar(avgCash) : '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums">{dollar(totCash)}</td>
              <td className="px-3 py-2 text-right" colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function HistoriqueSetter({ rows }: { rows: MonthStat[] }) {
  const totCash      = rows.reduce((s, r) => s + r.cashCollected, 0)
  const totCashDeals = rows.reduce((s, r) => s + r.cashDeals, 0)
  const totDeals     = rows.reduce((s, r) => s + r.nDeals, 0)
  const totRdv       = rows.reduce((s, r) => s + r.rdv, 0)
  const totCalls     = rows.reduce((s, r) => s + r.calls, 0)
  const avgCash      = totDeals > 0 ? Math.round(totCashDeals / totDeals) : 0
  const avgBook      = totCalls > 0 ? Math.round((totRdv / totCalls) * 100) : 0

  return (
    <div className="px-5 pb-5 space-y-4">
      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Cash total',     val: dollar(totCash) },
          { label: 'Cash new deals', val: dollar(totCashDeals) },
          { label: 'Deals total',    val: String(totDeals) },
          { label: 'Moy. cash/deal', val: avgCash > 0 ? dollar(avgCash) : '—' },
          { label: 'RDV total',      val: String(totRdv) },
          { label: 'Book rate',      val: avgBook > 0 ? `${avgBook}%` : '—' },
        ].map(({ label, val }) => (
          <div key={label} className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-bold text-gray-900 tabular-nums mt-0.5">{val}</p>
          </div>
        ))}
      </div>

      {/* Monthly table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-3 py-2 text-left">Mois</th>
              <th className="px-3 py-2 text-right">Deals</th>
              <th className="px-3 py-2 text-right">Cash deals</th>
              <th className="px-3 py-2 text-right">Moy./deal</th>
              <th className="px-3 py-2 text-right">Cash total</th>
              <th className="px-3 py-2 text-right">RDV</th>
              <th className="px-3 py-2 text-right">Book%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => {
              const avg      = r.nDeals > 0 ? Math.round(r.cashDeals / r.nDeals) : 0
              const bookRate = r.calls  > 0 ? Math.round((r.rdv / r.calls) * 100) : 0
              return (
                <tr key={`${r.year}-${r.month}`} className="hover:bg-blue-50/20">
                  <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                    {MOIS_FR[r.month - 1]} {r.year}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.nDeals || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-blue-700">
                    {r.cashDeals > 0 ? dollar(r.cashDeals) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                    {avg > 0 ? dollar(avg) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {r.cashCollected > 0 ? dollar(r.cashCollected) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700 font-semibold">{r.rdv || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                    {bookRate > 0 ? `${bookRate}%` : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-gray-700">
              <td className="px-3 py-2 text-[10px] uppercase tracking-wide text-gray-400">Total</td>
              <td className="px-3 py-2 text-right tabular-nums">{totDeals}</td>
              <td className="px-3 py-2 text-right tabular-nums text-blue-700">{dollar(totCashDeals)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{avgCash > 0 ? dollar(avgCash) : '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums">{dollar(totCash)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{totRdv}</td>
              <td className="px-3 py-2 text-right tabular-nums">{avgBook > 0 ? `${avgBook}%` : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
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
  const [editing,    setEditing]    = useState(false)
  const [cash,       setCash]       = useState(targetCash)
  const [closes,     setCloses]     = useState(targetCloses)
  const [rdv,        setRdv]        = useState(targetRdv)
  const [calls,      setCalls]      = useState(targetCalls)
  const [pending,    startT]        = useTransition()
  const [showHisto,  setShowHisto]  = useState(false)
  const [histoPending, startHisto]  = useTransition()
  const [histoRows,  setHistoRows]  = useState<MonthStat[] | null>(null)

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

  function toggleHisto() {
    if (showHisto) { setShowHisto(false); return }
    setShowHisto(true)
    if (histoRows !== null) return
    startHisto(async () => {
      const rows = await getHistoriqueUser(userId, role)
      setHistoRows(rows)
    })
  }

  const stripCls = RANK_STRIP[rank] ?? 'bg-gray-100'
  const badgeCls = RANK_BADGE[rank] ?? 'bg-gray-50 text-gray-400 ring-1 ring-gray-100'
  const medal    = RANK_MEDAL[rank]
  const isTop3   = rank <= 3

  const onTrack = projectedCash !== null && targetCash > 0
    ? projectedCash >= targetCash
    : null

  return (
    <div className={cn(
      'bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md',
      rank === 1 && 'shadow-yellow-100',
    )}>
      {/* Rank accent strip */}
      {isTop3 && <div className={cn('h-1', stripCls)} />}

      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          role === 'closer' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700',
        )}>
          {initials(nom)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{nom}</p>
          <span className={cn(
            'inline-flex mt-0.5 text-xs px-1.5 py-0.5 rounded-md font-medium',
            role === 'closer' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600',
          )}>
            {role}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums', badgeCls)}>
            {medal ? `${medal} ` : ''}#{rank}
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

      {/* Historique toggle */}
      {!editing && (
        <>
          <div className="h-px bg-gray-100 mx-5" />
          <button
            onClick={toggleHisto}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium">Historique</span>
            {histoPending
              ? <Loader2 size={12} className="animate-spin" />
              : showHisto ? <ChevronUp size={12} /> : <ChevronDown size={12} />
            }
          </button>

          {showHisto && (
            histoRows === null ? (
              <div className="flex justify-center py-6">
                <Loader2 size={16} className="animate-spin text-gray-300" />
              </div>
            ) : histoRows.length === 0 ? (
              <p className="text-xs text-gray-400 text-center pb-5">Aucune donnée historique</p>
            ) : role === 'closer' ? (
              <HistoriqueCloser rows={histoRows} />
            ) : (
              <HistoriqueSetter rows={histoRows} />
            )
          )}
        </>
      )}
    </div>
  )
}
