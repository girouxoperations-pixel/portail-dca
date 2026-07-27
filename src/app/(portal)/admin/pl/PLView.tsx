'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Trash2, Check, ChevronLeft, ChevronRight, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { savePLMonth } from './actions'

// ── Types ─────────────────────────────────────────────────────────────

type DepenseRow = { id: string; label: string; ht: number; ttc: number }
type PayeRow    = { id: string; name: string; amount: number }

export type PLData = {
  revenu:              number
  cashCollect:         number
  depenses:            DepenseRow[]
  payeEquipe:          PayeRow[]
  tpsTvq:              number
  impotRosa:           number
  impotSam:            number
  rosaPercent:         number
  samPercent:          number
  notes:               string
  netProfitOverride?:  number
}

export type PLMonthRecord = {
  id:    string
  year:  number
  month: number
  data:  PLData
}

// ── Constantes & helpers ──────────────────────────────────────────────

const MOIS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
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
  tpsTvq: 0, impotRosa: 0, impotSam: 0,
  rosaPercent: 0.60, samPercent: 0.40,
  notes: '',
})

function compute(d: PLData) {
  const depHT   = d.depenses.reduce((s, x) => s + (Number(x.ht)     || 0), 0)
  const depTTC  = d.depenses.reduce((s, x) => s + (Number(x.ttc)    || 0), 0)
  const paye    = d.payeEquipe.reduce((s, x) => s + (Number(x.amount) || 0), 0)
  const charges = depHT + paye
  const netAuto = (d.cashCollect || 0) - charges
  const net     = d.netProfitOverride !== undefined ? d.netProfitOverride : netAuto
  const pctNet  = (d.cashCollect || 0) > 0 ? net / d.cashCollect : 0
  const rBrut   = net * (d.rosaPercent || 0.60)
  const sBrut   = net * (d.samPercent  || 0.40)
  const rNet    = rBrut - (d.impotRosa || 0)
  const sNet    = sBrut - (d.impotSam  || 0)
  return { depHT, depTTC, paye, charges, netAuto, net, pctNet, rBrut, sBrut, rNet, sNet }
}

// ── Sub-components ────────────────────────────────────────────────────

function NumInput({
  value, onChange, className,
}: { value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <input
      type="number"
      value={value || ''}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      placeholder="0"
      className={cn(
        'bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-right tabular-nums',
        'focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500',
        'w-full',
        className,
      )}
    />
  )
}

function KpiCard({
  label, value, color, children,
}: { label: string; value: string; color: string; children?: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-xl font-bold tabular-nums', color)}>{value}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}

function Row({ label, value, color, bold, sub }: {
  label: string; value: number; color?: string; bold?: boolean; sub?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between', bold && 'font-semibold')}>
      <span className={cn('text-xs', bold ? 'text-gray-200' : 'text-gray-500')}>{label}</span>
      <div className="text-right">
        <span className={cn('text-xs tabular-nums', color ?? 'text-white')}>{fmt(value)}</span>
        {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
      </div>
    </div>
  )
}

// ── Annual summary ────────────────────────────────────────────────────

function AnnualSummary({ months, currentId, onSelect }: {
  months: PLMonthRecord[]; currentId: string; onSelect: (id: string) => void
}) {
  const rows2026 = months.filter(m => m.year === 2026).sort((a, b) => a.month - b.month)
  const maxNet   = Math.max(...rows2026.map(m => compute(m.data).net), 1)
  const totals   = {
    revenu: rows2026.reduce((s, m) => s + m.data.revenu, 0),
    cash:   rows2026.reduce((s, m) => s + m.data.cashCollect, 0),
    net:    rows2026.reduce((s, m) => s + compute(m.data).net, 0),
  }

  if (rows2026.length === 0) return null

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Vue annuelle — 2026</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Total revenu : <span className="text-white font-medium">{fmt(totals.revenu)}</span></span>
          <span>Cash : <span className="text-blue-400 font-medium">{fmt(totals.cash)}</span></span>
          <span>Net profit : <span className="text-green-400 font-medium">{fmt(totals.net)}</span></span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 text-gray-500">
              <th className="px-4 py-2 text-left">Mois</th>
              <th className="px-4 py-2 text-right">Revenu signé</th>
              <th className="px-4 py-2 text-right">Cash collecté</th>
              <th className="px-4 py-2 text-right">Net Profit</th>
              <th className="px-4 py-2 text-right">%</th>
              <th className="px-4 py-2 w-36">Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows2026.map(m => {
              const c    = compute(m.data)
              const barW = maxNet > 0 ? Math.max(0, (c.net / maxNet) * 100) : 0
              return (
                <tr
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    m.id === currentId
                      ? 'bg-violet-500/15'
                      : 'hover:bg-white/5',
                  )}
                >
                  <td className="px-4 py-2.5 font-medium text-white">
                    {MOIS[m.month - 1]}
                    {m.data.netProfitOverride !== undefined && (
                      <span className="ml-1.5 text-[9px] text-amber-400 opacity-60">override</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{fmt(m.data.revenu)}</td>
                  <td className="px-4 py-2.5 text-right text-blue-400  tabular-nums">{fmt(m.data.cashCollect)}</td>
                  <td className={cn(
                    'px-4 py-2.5 text-right font-semibold tabular-nums',
                    c.net >= 0 ? 'text-green-400' : 'text-red-400',
                  )}>
                    {fmt(c.net)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{pct(c.pctNet)}</td>
                  <td className="px-4 py-2.5">
                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${barW}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 bg-white/5 font-semibold">
              <td className="px-4 py-2 text-white text-xs">TOTAL</td>
              <td className="px-4 py-2 text-right text-gray-300 tabular-nums text-xs">{fmt(totals.revenu)}</td>
              <td className="px-4 py-2 text-right text-blue-400 tabular-nums text-xs">{fmt(totals.cash)}</td>
              <td className="px-4 py-2 text-right text-green-400 tabular-nums text-xs">{fmt(totals.net)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Month detail form ─────────────────────────────────────────────────

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

  return (
    <div className="space-y-4">
      {/* Override banner */}
      {data.netProfitOverride !== undefined && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
          <AlertCircle size={13} className="shrink-0" />
          <span>Net Profit en mode override ({fmt(data.netProfitOverride)}). Calcul auto = {fmt(c.netAuto)}.</span>
          <button
            onClick={() => onChange({ netProfitOverride: undefined })}
            className="ml-auto hover:text-amber-100 transition-colors"
          >
            <X size={12} /> Retirer l'override
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Revenu signé" value={fmt(data.revenu)} color="text-gray-200">
          <NumInput value={data.revenu} onChange={v => onChange({ revenu: v })} />
        </KpiCard>
        <KpiCard label="Cash collecté" value={fmt(data.cashCollect)} color="text-blue-400">
          <NumInput value={data.cashCollect} onChange={v => onChange({ cashCollect: v })} />
        </KpiCard>
        <KpiCard label="Net Profit" value={fmt(c.net)} color={c.net >= 0 ? 'text-green-400' : 'text-red-400'}>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-gray-600">Override:</span>
            <input
              type="number"
              value={data.netProfitOverride ?? ''}
              onChange={e => {
                const v = e.target.value
                onChange({ netProfitOverride: v === '' ? undefined : parseFloat(v) || 0 })
              }}
              placeholder="auto"
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[11px] text-white text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </KpiCard>
        <KpiCard label="% Profit" value={pct(c.pctNet)} color="text-violet-400">
          <p className="text-[10px] text-gray-600 mt-1">{fmt(c.charges)} en charges</p>
        </KpiCard>
      </div>

      {/* Dépenses + Paye (2 columns) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Dépenses */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Dépenses opérationnelles</h3>
            <button
              onClick={() => onChange({ depenses: [...data.depenses, { id: uid(), label: '', ht: 0, ttc: 0 }] })}
              className="flex items-center gap-1 px-2 py-1 text-xs text-violet-400 hover:bg-violet-500/10 rounded transition-colors"
            >
              <Plus size={11} /> Ajouter
            </button>
          </div>
          <div className="p-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-white/5">
                  <th className="px-2 py-1 text-left">Catégorie</th>
                  <th className="px-2 py-1 text-right w-24">HT</th>
                  <th className="px-2 py-1 text-right w-24">TTC</th>
                  <th className="w-5" />
                </tr>
              </thead>
              <tbody>
                {data.depenses.map(d => (
                  <tr key={d.id} className="border-b border-white/5 last:border-0">
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={d.label}
                        onChange={e => updDep(d.id, 'label', e.target.value)}
                        placeholder="Catégorie"
                        className="w-full bg-transparent border border-white/10 rounded px-2 py-0.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <NumInput value={d.ht} onChange={v => updDep(d.id, 'ht', v)} className="text-xs py-0.5" />
                    </td>
                    <td className="px-1 py-1">
                      <NumInput value={d.ttc} onChange={v => updDep(d.id, 'ttc', v)} className="text-xs py-0.5" />
                    </td>
                    <td className="px-1 py-1">
                      <button onClick={() => onChange({ depenses: data.depenses.filter(x => x.id !== d.id) })}
                        className="text-gray-700 hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.depenses.length === 0 && (
                  <tr><td colSpan={4} className="px-2 py-4 text-center text-gray-600">Aucune dépense</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 text-xs">
                  <td className="px-2 py-2 font-semibold text-gray-300">Total</td>
                  <td className="px-2 py-2 text-right font-semibold text-red-400 tabular-nums">{fmt(c.depHT)}</td>
                  <td className="px-2 py-2 text-right text-gray-500 tabular-nums">{fmt(c.depTTC)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Paye équipe */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Paye équipe</h3>
            <button
              onClick={() => onChange({ payeEquipe: [...data.payeEquipe, { id: uid(), name: '', amount: 0 }] })}
              className="flex items-center gap-1 px-2 py-1 text-xs text-violet-400 hover:bg-violet-500/10 rounded transition-colors"
            >
              <Plus size={11} /> Ajouter
            </button>
          </div>
          <div className="p-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-white/5">
                  <th className="px-2 py-1 text-left">Personne</th>
                  <th className="px-2 py-1 text-right w-28">Montant</th>
                  <th className="w-5" />
                </tr>
              </thead>
              <tbody>
                {data.payeEquipe.map(p => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={p.name}
                        onChange={e => updPaye(p.id, 'name', e.target.value)}
                        placeholder="Nom"
                        className="w-full bg-transparent border border-white/10 rounded px-2 py-0.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <NumInput value={p.amount} onChange={v => updPaye(p.id, 'amount', v)} className="text-xs py-0.5" />
                    </td>
                    <td className="px-1 py-1">
                      <button onClick={() => onChange({ payeEquipe: data.payeEquipe.filter(x => x.id !== p.id) })}
                        className="text-gray-700 hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.payeEquipe.length === 0 && (
                  <tr><td colSpan={3} className="px-2 py-4 text-center text-gray-600">Aucune entrée de paye</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 text-xs">
                  <td className="px-2 py-2 font-semibold text-gray-300">Total paye</td>
                  <td className="px-2 py-2 text-right font-semibold text-amber-400 tabular-nums">{fmt(c.paye)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Résultats + Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Résultats */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-3">Résultats</h3>
          <Row label="Dépenses HT" value={c.depHT} color="text-red-400" />
          <Row label="Paye équipe" value={c.paye} color="text-amber-400" />
          <Row label="Total charges" value={c.charges} color="text-red-400" bold />
          <div className="border-t border-white/10 pt-3 space-y-2">
            <Row label="Cash collecté" value={data.cashCollect} color="text-blue-400" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-white">NET PROFIT</span>
              <span className={cn('text-2xl font-bold tabular-nums', c.net >= 0 ? 'text-green-400' : 'text-red-400')}>
                {fmt(c.net)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Marge sur cash</span>
              <span className="text-xs text-violet-400 font-semibold">{pct(c.pctNet)}</span>
            </div>
          </div>
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">TPS / TVQ (à remettre)</span>
              <div className="w-32">
                <NumInput value={data.tpsTvq} onChange={v => onChange({ tpsTvq: v })} className="text-xs py-0.5" />
              </div>
            </div>
          </div>
          {/* Notes */}
          <div className="border-t border-white/10 pt-3">
            <label className="text-[11px] text-gray-500 mb-1 block">Notes</label>
            <textarea
              value={data.notes || ''}
              onChange={e => onChange({ notes: e.target.value })}
              placeholder="Notes pour ce mois…"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
            />
          </div>
        </div>

        {/* Distribution partenaires */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Distribution partenaires</h3>

          {/* Rosalie */}
          <div className="space-y-2 p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Rosalie</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={Math.round((data.rosaPercent || 0.60) * 100)}
                  onChange={e => onChange({ rosaPercent: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Brut ({Math.round((data.rosaPercent || 0.60) * 100)}%)</span>
                <span className="text-white tabular-nums font-medium">{fmt(c.rBrut)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Impôt</span>
                  <div className="w-24">
                    <NumInput value={data.impotRosa} onChange={v => onChange({ impotRosa: v })} className="text-[11px] py-0.5" />
                  </div>
                </div>
                <span className="text-red-400 tabular-nums">−{fmt(data.impotRosa)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-1.5 font-semibold">
                <span className="text-gray-200">NET Rosalie</span>
                <span className="text-green-400 tabular-nums">{fmt(c.rNet)}</span>
              </div>
            </div>
          </div>

          {/* Samuel */}
          <div className="space-y-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Samuel</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={Math.round((data.samPercent || 0.40) * 100)}
                  onChange={e => onChange({ samPercent: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Brut ({Math.round((data.samPercent || 0.40) * 100)}%)</span>
                <span className="text-white tabular-nums font-medium">{fmt(c.sBrut)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Impôt</span>
                  <div className="w-24">
                    <NumInput value={data.impotSam} onChange={v => onChange({ impotSam: v })} className="text-[11px] py-0.5" />
                  </div>
                </div>
                <span className="text-red-400 tabular-nums">−{fmt(data.impotSam)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-1.5 font-semibold">
                <span className="text-gray-200">NET Samuel</span>
                <span className="text-green-400 tabular-nums">{fmt(c.sNet)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────

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
  const prevId  = idx > 0               ? sorted[idx - 1].id : null
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
    const nextMonth = last ? (last.month === 12 ? 1  : last.month + 1) : 7
    const nextYear  = last ? (last.month === 12 ? last.year + 1 : last.year) : 2026
    const id = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
    if (months.some(m => m.id === id)) { setCurrentId(id); return }
    const rec: PLMonthRecord = { id, year: nextYear, month: nextMonth, data: EMPTY_DATA() }
    setMonths(ms => [...ms, rec])
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
        <div className="flex items-center gap-2">
          <button
            disabled={!prevId}
            onClick={() => prevId && setCurrentId(prevId)}
            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} className="text-gray-400" />
          </button>
          <span className="text-base font-bold text-white min-w-[200px] text-center">
            {current ? `${MOIS[current.month - 1]} ${current.year}` : '—'}
          </span>
          <button
            disabled={!nextId}
            onClick={() => nextId && setCurrentId(nextId)}
            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addMonth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Plus size={12} /> Nouveau mois
          </button>
          <button
            onClick={handleSave}
            disabled={pending || !current}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all',
              saved   ? 'bg-green-600 text-white'
                      : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-900',
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
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-gray-500 text-sm">Aucun mois P&L disponible.</p>
            <button onClick={addMonth}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
              <Plus size={14} /> Ajouter le premier mois
            </button>
          </div>
        )
      }
    </div>
  )
}
