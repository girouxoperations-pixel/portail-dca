'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Trash2, Monitor, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ajouterWeeklyPerf,
  modifierWeeklyPerf,
  supprimerWeeklyPerf,
} from '@/app/(portal)/cash/actions'

// ── Types ─────────────────────────────────────────────────────────

export interface WeeklyPerf {
  id: string
  year: number
  quarter: number
  week_number: number
  source_type: 'webi' | 'vsl'
  budget: number
  leads: number
  webinar_att: number  // WEBI: webinar attendees ("Présentés")
  booked: number       // calls booked (both)
  showed: number       // WEBI: Show Up / VSL: Présentés (calls that showed)
  closed: number
  revenue: number
  cash_collect: number
  notes: string | null
}

// ── Helpers ───────────────────────────────────────────────────────

function dollar(n: number) {
  return `$${new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`
}

function dollarBig(n: number) {
  return `${new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 }).format(n)} $`
}

function fmtPct(a: number, b: number): string {
  if (b === 0) return '—'
  return `${((a / b) * 100).toFixed(2)} %`
}

function fmtRatio(num: number, den: number): string {
  if (den === 0) return '—'
  return dollar(num / den)
}

function fmtROAS(cash: number, budget: number): string {
  if (budget === 0) return '—'
  return (cash / budget).toFixed(2)
}

const INPUT_CLS =
  'w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 tabular-nums'

// ── Modal form ────────────────────────────────────────────────────

function ModalForm({
  entry, source, year, quarter, existingWeeks, onClose,
}: {
  entry: WeeklyPerf | null
  source: 'webi' | 'vsl'
  year: number
  quarter: number
  existingWeeks: number[]
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const isEdit = entry !== null

  const availableWeeks = Array.from({ length: 13 }, (_, i) => i + 1)
    .filter(w => isEdit || !existingWeeks.includes(w))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('source_type', source)
    fd.set('year', String(year))
    fd.set('quarter', String(quarter))
    startTransition(async () => {
      if (isEdit) await modifierWeeklyPerf(entry.id, fd)
      else await ajouterWeeklyPerf(fd)
      onClose()
    })
  }

  const Row = ({ label, name, defaultVal }: { label: string; name: string; defaultVal: number }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        name={name} type="number" min="0" step={name === 'budget' || name === 'revenue' || name === 'cash_collect' ? '0.01' : '1'}
        defaultValue={defaultVal} className={INPUT_CLS}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {isEdit
              ? `Modifier W${entry.week_number} — ${source === 'webi' ? 'Webi' : 'VSL'}`
              : `Saisir semaine — ${source === 'webi' ? 'Webi' : 'VSL'} Q${quarter} ${year}`
            }
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Semaine */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Semaine</label>
            <select
              name="week_number"
              defaultValue={entry?.week_number ?? availableWeeks[0]}
              required
              className={INPUT_CLS}
            >
              {(isEdit ? Array.from({ length: 13 }, (_, i) => i + 1) : availableWeeks).map(w => (
                <option key={w} value={w}>W{w}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-gray-50 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Coûts</p>
            <Row label="Budget ($)" name="budget" defaultVal={entry?.budget ?? 0} />
          </div>

          <div className="border-t border-gray-50 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Funnel</p>
            <div className="space-y-3">
              <Row label="Leads" name="leads" defaultVal={entry?.leads ?? 0} />

              {source === 'webi' && (
                <Row label="Présentés (webinaire)" name="webinar_att" defaultVal={entry?.webinar_att ?? 0} />
              )}

              <Row label="Bookés (appels)" name="booked" defaultVal={entry?.booked ?? 0} />

              <Row
                label={source === 'webi' ? 'Show Up (appels présentés)' : 'Présentés (shows)'}
                name="showed"
                defaultVal={entry?.showed ?? 0}
              />

              <Row label="Closes" name="closed" defaultVal={entry?.closed ?? 0} />
            </div>
          </div>

          <div className="border-t border-gray-50 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Financier</p>
            <div className="space-y-3">
              <Row label="Revenue ($)" name="revenue" defaultVal={entry?.revenue ?? 0} />
              <Row label="Cash Collecté ($)" name="cash_collect" defaultVal={entry?.cash_collect ?? 0} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
            <textarea name="notes" rows={2} defaultValue={entry?.notes ?? ''} className={`${INPUT_CLS} resize-none`} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={pending} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Summary panel (left side) ────────────────────────────────────

function SummaryPanel({
  totals, source, quarter, year,
}: {
  totals: {
    budget: number; leads: number; webinar_att: number
    booked: number; showed: number; closed: number
    revenue: number; cash_collect: number
  }
  source: 'webi' | 'vsl'
  quarter: number
  year: number
}) {
  const row = (label: string, value: string, bold = false, color?: string) => (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className={cn('text-xs tabular-nums text-right', bold ? 'font-semibold' : 'font-medium', color ?? 'text-gray-800')}>
        {value}
      </span>
    </div>
  )

  const sourceCls = source === 'webi'
    ? 'border-t-orange-500 bg-orange-50/30'
    : 'border-t-sky-500 bg-sky-50/30'

  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm p-4 w-full lg:w-52 shrink-0 border-t-2', sourceCls)}>
      <div className="flex items-center gap-2 mb-3">
        {source === 'webi'
          ? <Monitor size={14} className="text-orange-500" />
          : <Film size={14} className="text-sky-500" />
        }
        <p className="text-xs font-semibold text-gray-600">
          {source === 'webi' ? 'Webi' : 'VSL'} — Q{quarter} {year}
        </p>
      </div>

      <div className="space-y-0.5">
        {row('Budget', dollarBig(totals.budget))}
        {row('Leads', String(totals.leads), true)}
        {source === 'webi' && row('Présentés', String(totals.webinar_att), true)}
        {row('Bookés',
          totals.leads > 0
            ? `${fmtPct(totals.booked, totals.leads).replace(' %','%')} · ${totals.booked}`
            : String(totals.booked),
          true,
        )}
        {row(
          source === 'webi' ? 'Show Up' : 'Présentés',
          totals.booked > 0
            ? `${fmtPct(totals.showed, totals.booked).replace(' %','%')} · ${totals.showed}`
            : String(totals.showed),
          true,
        )}
        {row('Closes',
          totals.showed > 0
            ? `${fmtPct(totals.closed, totals.showed).replace(' %','%')} · ${totals.closed}`
            : String(totals.closed),
          true,
        )}
      </div>

      <div className="border-t border-gray-100 mt-3 pt-3 space-y-0.5">
        {row('CPL', fmtRatio(totals.budget, totals.leads))}
        {row('CPA', fmtRatio(totals.budget, totals.showed))}
        {row('CPD', fmtRatio(totals.budget, totals.closed))}
        {source === 'webi' && row('$/Show', fmtRatio(totals.cash_collect, totals.showed))}
      </div>

      <div className="border-t border-gray-100 mt-3 pt-3 space-y-0.5">
        {row('Revenue', dollarBig(totals.revenue))}
        {row(
          'Cash Collect',
          totals.revenue > 0
            ? `${fmtPct(totals.cash_collect, totals.revenue).replace(' %','%')} · ${dollarBig(totals.cash_collect)}`
            : dollarBig(totals.cash_collect),
          true,
          'text-blue-700',
        )}
        {row('ROAS/CASH', fmtROAS(totals.cash_collect, totals.budget), true, 'text-green-700')}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export default function WeeklyPerfSection({
  perfs, isAdmin,
}: {
  perfs: WeeklyPerf[]
  isAdmin: boolean
}) {
  const now = new Date()
  const [source, setSource]   = useState<'webi' | 'vsl'>('webi')
  const [year, setYear]       = useState(now.getFullYear())
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1)
  const [modal, setModal]     = useState<WeeklyPerf | null | 'new'>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(
    () => perfs
      .filter(p => p.source_type === source && p.year === year && p.quarter === quarter)
      .sort((a, b) => a.week_number - b.week_number),
    [perfs, source, year, quarter],
  )

  const existingWeeks = useMemo(() => filtered.map(p => p.week_number), [filtered])

  const totals = useMemo(() => ({
    budget:      filtered.reduce((s, p) => s + (p.budget       ?? 0), 0),
    leads:       filtered.reduce((s, p) => s + (p.leads        ?? 0), 0),
    webinar_att: filtered.reduce((s, p) => s + (p.webinar_att  ?? 0), 0),
    booked:      filtered.reduce((s, p) => s + (p.booked       ?? 0), 0),
    showed:      filtered.reduce((s, p) => s + (p.showed       ?? 0), 0),
    closed:      filtered.reduce((s, p) => s + (p.closed       ?? 0), 0),
    revenue:     filtered.reduce((s, p) => s + (p.revenue      ?? 0), 0),
    cash_collect:filtered.reduce((s, p) => s + (p.cash_collect ?? 0), 0),
  }), [filtered])

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette semaine ?')) return
    startTransition(async () => { await supprimerWeeklyPerf(id) })
  }

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  const srcBtn = (s: 'webi' | 'vsl') => cn(
    'px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5',
    s === 'vsl' ? 'border-l border-gray-200' : '',
    source === s
      ? s === 'webi' ? 'bg-orange-500 text-white' : 'bg-sky-500 text-white'
      : 'text-gray-500 hover:bg-gray-50',
  )

  // shared cell classes
  const th = 'px-3 py-2.5 text-right whitespace-nowrap'
  const td = 'px-3 py-2.5 text-right tabular-nums'

  return (
    <div className="space-y-5">

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Source toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button className={srcBtn('webi')} onClick={() => setSource('webi')}>
            <Monitor size={13} />Webi
          </button>
          <button className={srcBtn('vsl')} onClick={() => setSource('vsl')}>
            <Film size={13} />VSL
          </button>
        </div>

        {/* Year */}
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Quarter */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {[1, 2, 3, 4].map((q, i) => (
            <button
              key={q}
              onClick={() => setQuarter(q)}
              className={cn(
                'px-3 py-2 font-medium transition-colors',
                i > 0 ? 'border-l border-gray-200' : '',
                quarter === q ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50',
              )}
            >
              Q{q}
            </button>
          ))}
        </div>

        <button
          onClick={() => setModal('new')}
          disabled={existingWeeks.length >= 13}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus size={14} />
          Saisir semaine
        </button>
      </div>

      {/* Summary + Table side by side */}
      <div className="flex gap-4 items-start flex-col xl:flex-row">

        {/* Summary panel — always visible once there's data */}
        {filtered.length > 0 && (
          <SummaryPanel totals={totals} source={source} quarter={quarter} year={year} />
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-12 text-center">
            <p className="text-sm text-gray-400">
              Aucune donnée — {source === 'webi' ? 'Webi' : 'VSL'} Q{quarter} {year}
            </p>
            <button
              onClick={() => setModal('new')}
              className="mt-3 text-xs text-violet-600 hover:underline"
            >
              + Saisir la première semaine
            </button>
          </div>
        ) : source === 'webi' ? (

          /* ── WEBI table ── */
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-orange-50/30 text-gray-400 font-semibold uppercase tracking-wide">
                    <th className="px-3 py-2.5 text-left sticky left-0 bg-orange-50/50 z-10">Sem.</th>
                    <th className={th}>Budget</th>
                    <th className={th}>Leads</th>
                    <th className={th}>Présentés</th>
                    <th className={th}>Bookés</th>
                    <th className={th}>Show Up</th>
                    <th className={th}>% Show</th>
                    <th className={th}>Closes</th>
                    <th className={th}>%C/Show</th>
                    <th className={th}>%C/Booké</th>
                    <th className={th}>Revenue</th>
                    <th className={th}>Cash Coll.</th>
                    <th className={th}>ROAS</th>
                    <th className={th}>$/Show</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-gray-700 sticky left-0 bg-white">W{p.week_number}</td>
                      <td className={cn(td, 'text-gray-600')}>{dollar(p.budget)}</td>
                      <td className={cn(td, 'text-gray-700')}>{p.leads}</td>
                      <td className={cn(td, 'text-gray-700')}>{p.webinar_att || '—'}</td>
                      <td className={cn(td, 'text-gray-700')}>{p.booked}</td>
                      <td className={cn(td, 'text-gray-700')}>{p.showed}</td>
                      <td className={td}>{fmtPct(p.showed, p.booked)}</td>
                      <td className={cn(td, 'font-bold text-gray-900')}>{p.closed}</td>
                      <td className={td}>{fmtPct(p.closed, p.showed)}</td>
                      <td className={td}>{fmtPct(p.closed, p.booked)}</td>
                      <td className={cn(td, 'text-gray-700')}>{dollar(p.revenue)}</td>
                      <td className={cn(td, 'text-blue-700 font-semibold')}>{dollar(p.cash_collect)}</td>
                      <td className={cn(td, 'text-green-700 font-semibold')}>{fmtROAS(p.cash_collect, p.budget)}</td>
                      <td className={cn(td, 'text-violet-600')}>{fmtRatio(p.cash_collect, p.showed)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setModal(p)} title="Modifier" className="p-1 text-gray-300 hover:text-violet-600 rounded transition-colors"><Pencil size={12} /></button>
                          {isAdmin && <button onClick={() => handleDelete(p.id)} disabled={pending} title="Supprimer" className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors disabled:opacity-40"><Trash2 size={12} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-orange-50/40 font-bold text-gray-800 text-xs">
                    <td className="px-3 py-2.5 text-gray-500 sticky left-0 bg-orange-50/40">Total</td>
                    <td className={cn(td, 'text-gray-700')}>{dollar(totals.budget)}</td>
                    <td className={cn(td)}>{totals.leads}</td>
                    <td className={cn(td)}>{totals.webinar_att || '—'}</td>
                    <td className={cn(td)}>{totals.booked}</td>
                    <td className={cn(td)}>{totals.showed}</td>
                    <td className={cn(td, 'font-normal')}>{fmtPct(totals.showed, totals.booked)}</td>
                    <td className={cn(td)}>{totals.closed}</td>
                    <td className={cn(td, 'font-normal')}>{fmtPct(totals.closed, totals.showed)}</td>
                    <td className={cn(td, 'font-normal')}>{fmtPct(totals.closed, totals.booked)}</td>
                    <td className={cn(td, 'text-gray-700')}>{dollar(totals.revenue)}</td>
                    <td className={cn(td, 'text-blue-700')}>{dollar(totals.cash_collect)}</td>
                    <td className={cn(td, 'text-green-700')}>{fmtROAS(totals.cash_collect, totals.budget)}</td>
                    <td className={cn(td, 'text-violet-600')}>{fmtRatio(totals.cash_collect, totals.showed)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        ) : (

          /* ── VSL table ── */
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-sky-50/30 text-gray-400 font-semibold uppercase tracking-wide">
                    <th className="px-3 py-2.5 text-left sticky left-0 bg-sky-50/50 z-10">Sem.</th>
                    <th className={th}>Budget</th>
                    <th className={th}>Leads</th>
                    <th className={th}>Bookés</th>
                    <th className={th}>Présentés</th>
                    <th className={th}>Closes</th>
                    <th className={th}>CPL</th>
                    <th className={th}>CPA</th>
                    <th className={th}>CPD</th>
                    <th className={th}>Revenue</th>
                    <th className={th}>Cash Coll.</th>
                    <th className={th}>ROAS</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-sky-50/20 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-gray-700 sticky left-0 bg-white">W{p.week_number}</td>
                      <td className={cn(td, 'text-gray-600')}>{dollar(p.budget)}</td>
                      <td className={cn(td, 'text-gray-700')}>{p.leads}</td>
                      <td className={cn(td, 'text-gray-700')}>{p.booked}</td>
                      <td className={cn(td, 'text-gray-700')}>{p.showed}</td>
                      <td className={cn(td, 'font-bold text-gray-900')}>{p.closed}</td>
                      <td className={td}>{fmtRatio(p.budget, p.leads)}</td>
                      <td className={td}>{fmtRatio(p.budget, p.showed)}</td>
                      <td className={td}>{fmtRatio(p.budget, p.closed)}</td>
                      <td className={cn(td, 'text-gray-700')}>{dollar(p.revenue)}</td>
                      <td className={cn(td, 'text-blue-700 font-semibold')}>{dollar(p.cash_collect)}</td>
                      <td className={cn(td, 'text-green-700 font-semibold')}>{fmtROAS(p.cash_collect, p.budget)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setModal(p)} title="Modifier" className="p-1 text-gray-300 hover:text-violet-600 rounded transition-colors"><Pencil size={12} /></button>
                          {isAdmin && <button onClick={() => handleDelete(p.id)} disabled={pending} title="Supprimer" className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors disabled:opacity-40"><Trash2 size={12} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-sky-50/40 font-bold text-gray-800 text-xs">
                    <td className="px-3 py-2.5 text-gray-500 sticky left-0 bg-sky-50/40">Total</td>
                    <td className={cn(td, 'text-gray-700')}>{dollar(totals.budget)}</td>
                    <td className={cn(td)}>{totals.leads}</td>
                    <td className={cn(td)}>{totals.booked}</td>
                    <td className={cn(td)}>{totals.showed}</td>
                    <td className={cn(td)}>{totals.closed}</td>
                    <td className={cn(td, 'font-normal')}>{fmtRatio(totals.budget, totals.leads)}</td>
                    <td className={cn(td, 'font-normal')}>{fmtRatio(totals.budget, totals.showed)}</td>
                    <td className={cn(td, 'font-normal')}>{fmtRatio(totals.budget, totals.closed)}</td>
                    <td className={cn(td, 'text-gray-700')}>{dollar(totals.revenue)}</td>
                    <td className={cn(td, 'text-blue-700')}>{dollar(totals.cash_collect)}</td>
                    <td className={cn(td, 'text-green-700')}>{fmtROAS(totals.cash_collect, totals.budget)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <ModalForm
          entry={modal === 'new' ? null : modal}
          source={source}
          year={year}
          quarter={quarter}
          existingWeeks={existingWeeks}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
