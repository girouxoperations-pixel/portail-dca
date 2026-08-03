'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Trash2, Check, ChevronLeft, ChevronRight, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { savePLMonth } from './actions'

// ── Types ─────────────────────────────────────────────────────────────

type DepenseRow = { id: string; label: string; ht: number; ttc: number }
type PayeRow    = { id: string; name: string; amount: number }

export type PLData = {
  revenu:             number
  cashCollect:        number
  depenses:           DepenseRow[]
  payeEquipe:         PayeRow[]
  tpsTvq:             number
  impotRosa:          number
  impotSam:           number
  rosaDepensePerso:   number
  samDepensePerso:    number
  rosaPercent:        number
  samPercent:         number
  notes:              string
  netProfitOverride?: number
}

export type PLMonthRecord = {
  id:    string
  year:  number
  month: number
  data:  PLData
}

// ── Helpers ───────────────────────────────────────────────────────────

const MOIS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function pct(n: number) { return `${(n * 100).toFixed(1)} %` }
function uid() { return Math.random().toString(36).slice(2, 8) }

const EMPTY_DATA = (): PLData => ({
  revenu: 0, cashCollect: 0,
  depenses: [
    { id: uid(), label: 'Ads Spend', ht: 0, ttc: 0 },
    { id: uid(), label: 'Brice',     ht: 0, ttc: 0 },
    { id: uid(), label: 'CRM',       ht: 0, ttc: 0 },
    { id: uid(), label: 'Frais TD',  ht: 0, ttc: 0 },
  ],
  payeEquipe: [],
  tpsTvq: 0, impotRosa: 0, impotSam: 0, rosaDepensePerso: 0, samDepensePerso: 0,
  rosaPercent: 0.60, samPercent: 0.40, notes: '',
})

function compute(d: PLData) {
  const depHT   = d.depenses.reduce((s, x) => s + (Number(x.ht)      || 0), 0)
  const depTTC  = d.depenses.reduce((s, x) => s + (Number(x.ttc)     || 0), 0)
  const paye    = d.payeEquipe.reduce((s, x) => s + (Number(x.amount) || 0), 0)
  const charges = depHT + paye
  const netAuto = (d.cashCollect || 0) - charges
  const net     = d.netProfitOverride !== undefined ? d.netProfitOverride : netAuto
  const pctNet  = (d.cashCollect || 0) > 0 ? net / d.cashCollect : 0
  const rBrut       = net * (d.rosaPercent || 0.60)
  const sBrut       = net * (d.samPercent  || 0.40)
  const rTps        = (d.tpsTvq || 0) * (d.rosaPercent || 0.60)
  const sTps        = (d.tpsTvq || 0) * (d.samPercent  || 0.40)
  const rNetPayOut  = rBrut - (d.rosaDepensePerso || 0)
  const sNetPayOut  = sBrut - (d.samDepensePerso  || 0)
  const rNet        = rNetPayOut - (d.impotRosa || 0)
  const sNet        = sNetPayOut - (d.impotSam  || 0)
  return { depHT, depTTC, paye, charges, netAuto, net, pctNet,
           rBrut, sBrut, rTps, sTps, rNetPayOut, sNetPayOut, rNet, sNet }
}

// ── Shared input ──────────────────────────────────────────────────────

function Num({
  value, onChange, placeholder = '0', className,
}: { value: number; onChange: (v: number) => void; placeholder?: string; className?: string }) {
  return (
    <input
      type="number"
      step="0.01"
      value={value || ''}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      placeholder={placeholder}
      className={cn(
        'w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 text-right tabular-nums',
        'focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-colors',
        className,
      )}
    />
  )
}

// ── Annual summary ────────────────────────────────────────────────────

function AnnualSummary({ months, currentId, onSelect }: {
  months: PLMonthRecord[]
  currentId: string
  onSelect: (id: string) => void
}) {
  const byYear = useMemo(() => {
    const map = new Map<number, PLMonthRecord[]>()
    for (const m of months) {
      const arr = map.get(m.year) ?? []
      arr.push(m)
      map.set(m.year, arr)
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [months])

  const maxNet = Math.max(...months.map(m => compute(m.data).net), 1)

  if (months.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {byYear.map(([year, rows], yi) => {
        const sorted = [...rows].sort((a, b) => a.month - b.month)
        const totals = {
          revenu: sorted.reduce((s, m) => s + m.data.revenu, 0),
          cash:   sorted.reduce((s, m) => s + m.data.cashCollect, 0),
          net:    sorted.reduce((s, m) => s + compute(m.data).net, 0),
        }
        return (
          <div key={year} className={cn(yi > 0 && 'border-t border-gray-200')}>
            {/* Year header */}
            <div className="px-5 py-2.5 bg-gray-50 flex items-center justify-between border-b border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{year}</span>
              <div className="flex items-center gap-6 text-xs">
                <span className="text-gray-500">
                  Revenu&nbsp;
                  <span className="text-gray-800 font-semibold">{fmt(totals.revenu)}</span>
                </span>
                <span className="text-gray-500">
                  Cash&nbsp;
                  <span className="text-blue-600 font-semibold">{fmt(totals.cash)}</span>
                </span>
                <span className="text-gray-500">
                  Net&nbsp;
                  <span className="text-green-600 font-bold">{fmt(totals.net)}</span>
                </span>
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="px-5 py-2.5 text-left">Mois</th>
                  <th className="px-4 py-2.5 text-right">Revenu signé</th>
                  <th className="px-4 py-2.5 text-right">Cash collecté</th>
                  <th className="px-4 py-2.5 text-right">Net Profit</th>
                  <th className="px-4 py-2.5 text-right">Marge</th>
                  <th className="px-5 py-2.5 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(m => {
                  const c      = compute(m.data)
                  const barW   = maxNet > 0 ? Math.max(0, (c.net / maxNet) * 100) : 0
                  const active = m.id === currentId
                  return (
                    <tr
                      key={m.id}
                      onClick={() => onSelect(m.id)}
                      className={cn(
                        'cursor-pointer transition-colors text-sm',
                        active ? 'bg-violet-50' : 'hover:bg-gray-50',
                      )}
                    >
                      <td className="px-5 py-3">
                        <span className={cn(
                          'font-semibold',
                          active ? 'text-violet-700' : 'text-gray-900',
                        )}>
                          {MOIS[m.month - 1]}
                        </span>
                        {m.data.netProfitOverride !== undefined && (
                          <span className="ml-2 text-[9px] text-amber-500 font-medium">override</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{fmt(m.data.revenu)}</td>
                      <td className="px-4 py-3 text-right text-blue-600 tabular-nums font-medium">{fmt(m.data.cashCollect)}</td>
                      <td className={cn(
                        'px-4 py-3 text-right font-bold tabular-nums',
                        c.net >= 0 ? 'text-green-600' : 'text-red-600',
                      )}>{fmt(c.net)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums text-xs">{pct(c.pctNet)}</td>
                      <td className="px-5 py-3">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-400 rounded-full transition-all"
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

// ── Month detail ──────────────────────────────────────────────────────

function MonthDetail({ data, onChange }: {
  data: PLData
  onChange: (patch: Partial<PLData>) => void
}) {
  const c = compute(data)

  function updDep(id: string, field: keyof DepenseRow, val: number | string) {
    onChange({ depenses: data.depenses.map(d => d.id === id ? { ...d, [field]: val } : d) })
  }
  function updPaye(id: string, field: keyof PayeRow, val: number | string) {
    onChange({ payeEquipe: data.payeEquipe.map(p => p.id === id ? { ...p, [field]: val } : p) })
  }

  const cellNum = cn(
    'w-full bg-transparent px-2 py-1.5 text-sm text-gray-700 tabular-nums text-right',
    'rounded focus:outline-none focus:ring-1 focus:ring-violet-400 focus:bg-violet-50/50 transition-colors',
  )
  const cellLabel = cn(
    'w-full bg-transparent px-2 py-1.5 text-sm text-gray-800',
    'rounded focus:outline-none focus:ring-1 focus:ring-violet-400 focus:bg-violet-50/50 transition-colors',
  )

  return (
    <div className="space-y-5">
      {/* Override banner */}
      {data.netProfitOverride !== undefined && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle size={14} className="shrink-0 text-amber-500" />
          <span>
            Net Profit verrouillé à <strong>{fmt(data.netProfitOverride)}</strong>
            <span className="text-amber-500 ml-2 text-xs">— calcul auto = {fmt(c.netAuto)}</span>
          </span>
          <button
            onClick={() => onChange({ netProfitOverride: undefined })}
            className="ml-auto flex items-center gap-1.5 text-xs font-medium hover:text-amber-900 transition-colors"
          >
            <X size={12} /> Retirer
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Revenu signé</p>
            <p className="text-2xl font-bold tabular-nums text-gray-900 leading-none">{fmt(data.revenu)}</p>
          </div>
          <Num value={data.revenu} onChange={v => onChange({ revenu: v })} className="text-xs py-1" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cash collecté</p>
            <p className="text-2xl font-bold tabular-nums text-blue-600 leading-none">{fmt(data.cashCollect)}</p>
          </div>
          <Num value={data.cashCollect} onChange={v => onChange({ cashCollect: v })} className="text-xs py-1" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Profit</p>
            <p className={cn(
              'text-2xl font-bold tabular-nums leading-none',
              c.net >= 0 ? 'text-green-600' : 'text-red-600',
            )}>{fmt(c.net)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 shrink-0">Override</span>
            <input
              type="number"
              value={data.netProfitOverride ?? ''}
              onChange={e => {
                const v = e.target.value
                onChange({ netProfitOverride: v === '' ? undefined : parseFloat(v) || 0 })
              }}
              placeholder="auto"
              className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-800 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Marge sur cash</p>
            <p className="text-2xl font-bold tabular-nums text-violet-600 leading-none">{pct(c.pctNet)}</p>
          </div>
          <p className="text-xs text-gray-400">{fmt(c.charges)} en charges</p>
        </div>
      </div>

      {/* 3-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_300px] gap-4 items-start">

        {/* Dépenses */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-sm font-semibold text-gray-800">Dépenses opérationnelles</h3>
            <button
              onClick={() => onChange({ depenses: [...data.depenses, { id: uid(), label: '', ht: 0, ttc: 0 }] })}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-violet-600 hover:bg-violet-50 rounded-lg transition-colors font-medium"
            >
              <Plus size={11} /> Ajouter
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] text-gray-500 font-semibold">
                <th className="px-4 py-2.5 text-left">Catégorie</th>
                <th className="px-3 py-2.5 text-right w-24">HT</th>
                <th className="px-3 py-2.5 text-right w-24">TTC</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.depenses.map(d => (
                <tr key={d.id} className="group hover:bg-gray-50/50">
                  <td className="px-3 py-0.5">
                    <input type="text" value={d.label}
                      onChange={e => updDep(d.id, 'label', e.target.value)}
                      placeholder="Catégorie" className={cellLabel} />
                  </td>
                  <td className="px-2 py-0.5">
                    <input type="number" step="0.01" value={d.ht || ''}
                      onChange={e => updDep(d.id, 'ht', parseFloat(e.target.value) || 0)}
                      placeholder="0" className={cellNum} />
                  </td>
                  <td className="px-2 py-0.5">
                    <input type="number" step="0.01" value={d.ttc || ''}
                      onChange={e => updDep(d.id, 'ttc', parseFloat(e.target.value) || 0)}
                      placeholder="0" className={cn(cellNum, 'text-gray-400')} />
                  </td>
                  <td className="px-2 py-0.5">
                    <button
                      onClick={() => onChange({ depenses: data.depenses.filter(x => x.id !== d.id) })}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.depenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">Aucune dépense</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 text-sm font-semibold">
                <td className="px-4 py-3 text-gray-700">Total HT</td>
                <td className="px-3 py-3 text-right text-red-600 tabular-nums">{fmt(c.depHT)}</td>
                <td className="px-3 py-3 text-right text-gray-400 tabular-nums font-normal text-xs">{fmt(c.depTTC)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Paye équipe */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-sm font-semibold text-gray-800">Paye équipe</h3>
            <button
              onClick={() => onChange({ payeEquipe: [...data.payeEquipe, { id: uid(), name: '', amount: 0 }] })}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-violet-600 hover:bg-violet-50 rounded-lg transition-colors font-medium"
            >
              <Plus size={11} /> Ajouter
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] text-gray-500 font-semibold">
                <th className="px-4 py-2.5 text-left">Personne</th>
                <th className="px-3 py-2.5 text-right w-32">Montant</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.payeEquipe.map(p => (
                <tr key={p.id} className="group hover:bg-gray-50/50">
                  <td className="px-3 py-0.5">
                    <input type="text" value={p.name}
                      onChange={e => updPaye(p.id, 'name', e.target.value)}
                      placeholder="Nom" className={cellLabel} />
                  </td>
                  <td className="px-2 py-0.5">
                    <input type="number" value={p.amount || ''}
                      onChange={e => updPaye(p.id, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0" className={cellNum} />
                  </td>
                  <td className="px-2 py-0.5">
                    <button
                      onClick={() => onChange({ payeEquipe: data.payeEquipe.filter(x => x.id !== p.id) })}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.payeEquipe.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">Aucune entrée de paye</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 text-sm font-semibold">
                <td className="px-4 py-3 text-gray-700">Total paye</td>
                <td className="px-3 py-3 text-right text-amber-600 tabular-nums">{fmt(c.paye)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* P&L statement */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <h3 className="text-sm font-semibold text-gray-800">Résultat du mois</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-gray-500">Cash collecté</span>
                <span className="text-blue-600 font-semibold tabular-nums">{fmt(data.cashCollect)}</span>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>− Dépenses HT</span>
                  <span className="tabular-nums">{fmt(c.depHT)}</span>
                </div>
                <div className="flex justify-between">
                  <span>− Paye équipe</span>
                  <span className="tabular-nums">{fmt(c.paye)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-gray-800">NET PROFIT</span>
                  <span className={cn(
                    'text-3xl font-bold tabular-nums',
                    c.net >= 0 ? 'text-green-600' : 'text-red-600',
                  )}>{fmt(c.net)}</span>
                </div>
                <div className="flex justify-end mt-0.5">
                  <span className="text-xs text-violet-600 font-semibold">{pct(c.pctNet)}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500 shrink-0">TPS / TVQ</span>
                <Num value={data.tpsTvq} onChange={v => onChange({ tpsTvq: v })} className="text-xs py-1" />
              </div>
            </div>
          </div>

          {/* Partners */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <h3 className="text-sm font-semibold text-gray-800">Distribution</h3>
            </div>

            {/* Rosalie */}
            <div className="px-5 py-4 space-y-2.5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Rosalie</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={parseFloat(((data.rosaPercent || 0.60) * 100).toFixed(4))}
                    onChange={e => onChange({ rosaPercent: (parseFloat(e.target.value) || 0) / 100 })}
                    className="w-14 bg-gray-50 border border-gray-200 rounded-lg px-1 py-0.5 text-xs text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Brut</span>
                  <span className="tabular-nums text-gray-700 font-medium">{fmt(c.rBrut)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Dépenses perso</span>
                  <Num value={data.rosaDepensePerso} onChange={v => onChange({ rosaDepensePerso: v })} className="w-28 text-xs py-0.5" />
                </div>
                <div className="flex justify-between text-gray-600 font-medium pt-1 border-t border-gray-100">
                  <span>Net pay out</span>
                  <span className="tabular-nums">{fmt(c.rNetPayOut)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>TPS / TVQ</span>
                  <span className="tabular-nums text-red-400">− {fmt(c.rTps)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Impôt</span>
                  <Num value={data.impotRosa} onChange={v => onChange({ impotRosa: v })} className="w-28 text-xs py-0.5" />
                </div>
                <div className="flex justify-between font-semibold text-sm pt-1.5 border-t border-gray-100">
                  <span className="text-gray-700">Net Rosalie</span>
                  <span className="text-green-600 tabular-nums">{fmt(c.rNet)}</span>
                </div>
              </div>
            </div>

            {/* Samuel */}
            <div className="px-5 py-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Samuel</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={parseFloat(((data.samPercent || 0.40) * 100).toFixed(4))}
                    onChange={e => onChange({ samPercent: (parseFloat(e.target.value) || 0) / 100 })}
                    className="w-14 bg-gray-50 border border-gray-200 rounded-lg px-1 py-0.5 text-xs text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Brut</span>
                  <span className="tabular-nums text-gray-700 font-medium">{fmt(c.sBrut)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Dépenses perso</span>
                  <Num value={data.samDepensePerso} onChange={v => onChange({ samDepensePerso: v })} className="w-28 text-xs py-0.5" />
                </div>
                <div className="flex justify-between text-gray-600 font-medium pt-1 border-t border-gray-100">
                  <span>Net pay out</span>
                  <span className="tabular-nums">{fmt(c.sNetPayOut)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>TPS / TVQ</span>
                  <span className="tabular-nums text-red-400">− {fmt(c.sTps)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Impôt</span>
                  <Num value={data.impotSam} onChange={v => onChange({ impotSam: v })} className="w-28 text-xs py-0.5" />
                </div>
                <div className="flex justify-between font-semibold text-sm pt-1.5 border-t border-gray-100">
                  <span className="text-gray-700">Net Samuel</span>
                  <span className="text-green-600 tabular-nums">{fmt(c.sNet)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notes</p>
            <textarea
              value={data.notes || ''}
              onChange={e => onChange({ notes: e.target.value })}
              placeholder="Notes pour ce mois…"
              rows={3}
              className="w-full bg-transparent text-sm text-gray-700 placeholder-gray-300 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────

export default function PLView({ initialMonths }: { initialMonths: PLMonthRecord[] }) {
  const [months,    setMonths]    = useState<PLMonthRecord[]>(initialMonths)
  const [currentId, setCurrentId] = useState<string>(() =>
    initialMonths.length > 0 ? initialMonths[initialMonths.length - 1].id : ''
  )
  const [saved,   setSaved]   = useState(false)
  const [pending, startT]     = useTransition()

  const sorted  = useMemo(() =>
    [...months].sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month)),
  [months])

  const current = sorted.find(m => m.id === currentId) ?? null
  const idx     = sorted.findIndex(m => m.id === currentId)
  const prevId  = idx > 0                ? sorted[idx - 1].id : null
  const nextId  = idx < sorted.length - 1 ? sorted[idx + 1].id : null

  function updateData(patch: Partial<PLData>) {
    if (!currentId) return
    setMonths(ms => ms.map(m =>
      m.id === currentId ? { ...m, data: { ...m.data, ...patch } } : m
    ))
    setSaved(false)
  }

  function addMonth() {
    const last      = sorted[sorted.length - 1]
    const nextMonth = last ? (last.month === 12 ? 1 : last.month + 1) : 7
    const nextYear  = last ? (last.month === 12 ? last.year + 1 : last.year) : 2026
    const id        = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
    if (months.some(m => m.id === id)) { setCurrentId(id); return }
    setMonths(ms => [...ms, { id, year: nextYear, month: nextMonth, data: EMPTY_DATA() }])
    setCurrentId(id)
  }

  function handleSave() {
    if (!current) return
    startT(async () => {
      await savePLMonth(current.year, current.month, current.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-5">
      <AnnualSummary months={sorted} currentId={currentId} onSelect={setCurrentId} />

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            disabled={!prevId}
            onClick={() => prevId && setCurrentId(prevId)}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 min-w-[240px] text-center">
            {current ? `${MOIS[current.month - 1]} ${current.year}` : '—'}
          </h2>
          <button
            disabled={!nextId}
            onClick={() => nextId && setCurrentId(nextId)}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addMonth}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Plus size={12} /> Nouveau mois
          </button>
          <button
            onClick={handleSave}
            disabled={pending || !current}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm',
              saved
                ? 'bg-green-600 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white',
              pending && 'opacity-60 cursor-not-allowed',
            )}
          >
            {saved ? <><Check size={13} /> Sauvegardé</> : pending ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {current
        ? <MonthDetail data={current.data} onChange={updateData} />
        : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-gray-400">Aucun mois P&L disponible.</p>
            <button
              onClick={addMonth}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              <Plus size={14} /> Ajouter le premier mois
            </button>
          </div>
        )
      }
    </div>
  )
}
