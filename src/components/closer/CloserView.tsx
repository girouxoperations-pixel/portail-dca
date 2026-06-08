'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Phone, TrendingUp, Target, CheckCircle2, Wallet, DollarSign, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ajouterEntree, modifierEntree } from '@/app/(portal)/closer/actions'
import { MOIS_COURT, dollar, formatDate } from '@/lib/constants'
import MetricCard   from '@/components/ui/MetricCard'
import PeriodFilter, { usePeriodFilter, computePrevRange } from '@/components/ui/PeriodFilter'
import Modal        from '@/components/ui/Modal'
import PageHeader   from '@/components/layout/PageHeader'
import { cn }      from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────

interface CloserEntry {
  id:              string
  user_id:         string
  entry_date:      string
  scheduled_calls: number
  show_calls:      number
  pitch_calls:     number
  closes:          number
  cash_collected:  number
  revenue:         number
  notes:           string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500'

const CHAMPS_APPELS = [
  { name: 'scheduled_calls', label: 'Schedulés'  },
  { name: 'show_calls',      label: 'Shows'      },
  { name: 'pitch_calls',     label: 'Pitches'    },
  { name: 'closes',          label: 'Closes'     },
] as const

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0 && current === 0) return <span className="text-xs text-gray-300">—</span>
  if (prev === 0) return <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><ArrowUp size={10} />Nouveau</span>
  const delta = Math.round(((current - prev) / prev) * 100)
  if (Math.abs(delta) < 1) return <span className="text-xs text-gray-400 flex items-center gap-0.5"><Minus size={10} />Stable</span>
  const up = delta > 0
  return (
    <span className={cn('text-xs font-medium flex items-center gap-0.5', up ? 'text-green-600' : 'text-red-500')}>
      {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{Math.abs(delta)} %
    </span>
  )
}

function PctBadge({ value, bold = false }: { value: number; bold?: boolean }) {
  const cls =
    value >= 40 ? 'bg-green-50 text-green-700 ring-1 ring-green-200' :
    value >= 20 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
                  'bg-red-50 text-red-600 ring-1 ring-red-200'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums', cls, bold && 'font-bold')}>
      {value} %
    </span>
  )
}

// ── Modal ajout / édition ─────────────────────────────────────────────

function ModalEntree({
  entry, userId, onClose,
}: {
  entry:   CloserEntry | null
  userId:  string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const isEdit = entry !== null
  const today  = new Date().toISOString().slice(0, 10)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (isEdit) {
        await modifierEntree(entry.id, fd)
      } else {
        fd.set('user_id', userId)
        await ajouterEntree(fd)
      }
      onClose()
    })
  }

  return (
    <Modal
      titre={isEdit ? "Modifier l'entrée" : 'Saisie de fin de journée'}
      onClose={onClose}
      maxWidth="max-w-lg"
      scrollable
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input
            name="entry_date" type="date" required
            defaultValue={entry?.entry_date ?? today}
            className={INPUT_CLS}
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Appels</p>
          <div className="grid grid-cols-2 gap-3">
            {CHAMPS_APPELS.map(f => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{f.label}</label>
                <input
                  name={f.name} type="number" min="0"
                  defaultValue={entry ? entry[f.name] : 0}
                  className={INPUT_CLS}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Financier</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Cash collecté ($)</label>
              <input
                name="cash_collected" type="number" min="0" step="0.01"
                defaultValue={entry?.cash_collected ?? 0}
                className={INPUT_CLS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Revenue ($)</label>
              <input
                name="revenue" type="number" min="0" step="0.01"
                defaultValue={entry?.revenue ?? 0}
                className={INPUT_CLS}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
          <textarea
            name="notes" rows={2} placeholder="Remarques..."
            defaultValue={entry?.notes ?? ''}
            className={`${INPUT_CLS} resize-none`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit" disabled={pending}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Composant principal ───────────────────────────────────────────────

export default function CloserView({ entrees, userId, prenom }: {
  entrees: CloserEntry[]
  userId:  string
  prenom:  string
}) {
  const { periode, offset, range, onChange: onPeriodChange, onCustomRange, customStart, customEnd } = usePeriodFilter()
  const [modalEntry, setModalEntry] = useState<CloserEntry | null | 'new'>(null)

  const prevRange = useMemo(() => computePrevRange(periode, offset, range), [periode, offset, range])

  const filtrees     = useMemo(
    () => !range.start ? [] : entrees.filter(e => e.entry_date >= range.start && e.entry_date <= range.end),
    [entrees, range],
  )
  const filtreesPrev = useMemo(
    () => !prevRange.start ? [] : entrees.filter(e => e.entry_date >= prevRange.start && e.entry_date <= prevRange.end),
    [entrees, prevRange],
  )

  function computeKpis(rows: CloserEntry[]) {
    const scheduled      = rows.reduce((s, e) => s + e.scheduled_calls, 0)
    const shows          = rows.reduce((s, e) => s + e.show_calls,      0)
    const pitches        = rows.reduce((s, e) => s + e.pitch_calls,     0)
    const closes         = rows.reduce((s, e) => s + e.closes,          0)
    const cash_collected = rows.reduce((s, e) => s + e.cash_collected,  0)
    const revenue        = rows.reduce((s, e) => s + e.revenue,         0)
    return {
      scheduled, shows, pitches, closes, cash_collected, revenue,
      showRate:  pct(shows, scheduled),
      pitchRate: pct(pitches, shows),
      closeRate: pct(closes, shows),
    }
  }

  const kpis     = useMemo(() => computeKpis(filtrees),     [filtrees])
  const kpisPrev = useMemo(() => computeKpis(filtreesPrev), [filtreesPrev])

  const chartData = useMemo(() => [
    { name: 'Schedulés', current: kpis.scheduled, prev: kpisPrev.scheduled },
    { name: 'Shows',     current: kpis.shows,      prev: kpisPrev.shows      },
    { name: 'Pitches',   current: kpis.pitches,    prev: kpisPrev.pitches    },
    { name: 'Closes',    current: kpis.closes,     prev: kpisPrev.closes     },
  ], [kpis, kpisPrev])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <PageHeader
        titre="Mon Suivi Closing"
        subtitle={`Bienvenue, ${prenom} — activité et performance`}
        action={
          <button
            onClick={() => setModalEntry('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Saisir ma journée
          </button>
        }
      />

      <PeriodFilter
        periode={periode} offset={offset} onChange={onPeriodChange}
        customStart={customStart} customEnd={customEnd} onCustomRange={onCustomRange}
      />

      {/* Appels */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Activité</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Schedulés"  value={kpis.scheduled}        icon={Phone}        color="violet" sub={`${filtrees.length} jour${filtrees.length !== 1 ? 's' : ''} saisi${filtrees.length !== 1 ? 's' : ''}`} />
            <DeltaBadge current={kpis.scheduled} prev={kpisPrev.scheduled} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Show rate"  value={`${kpis.showRate} %`}  icon={TrendingUp}   color="blue"   sub={`${kpis.shows} / ${kpis.scheduled}`} />
            <DeltaBadge current={kpis.showRate} prev={kpisPrev.showRate} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Pitch rate" value={`${kpis.pitchRate} %`} icon={Target}       color="amber"  sub={`${kpis.pitches} / ${kpis.shows}`} />
            <DeltaBadge current={kpis.pitchRate} prev={kpisPrev.pitchRate} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Close rate" value={`${kpis.closeRate} %`} icon={CheckCircle2} color="green"  sub={`${kpis.closes} closes`} />
            <DeltaBadge current={kpis.closeRate} prev={kpisPrev.closeRate} />
          </div>
        </div>
      </div>

      {/* Financier */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Financier</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Cash collecté" value={dollar(kpis.cash_collected)} icon={Wallet}     color="blue"  sub={`${kpis.closes} close${kpis.closes !== 1 ? 's' : ''}`} />
            <DeltaBadge current={kpis.cash_collected} prev={kpisPrev.cash_collected} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Revenue"       value={dollar(kpis.revenue)}        icon={DollarSign} color="green" sub="Valeur deals signés" />
            <DeltaBadge current={kpis.revenue} prev={kpisPrev.revenue} />
          </div>
        </div>
      </div>

      {/* Graphique comparatif */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Comparatif période précédente</h3>
            <p className="text-xs text-gray-400 mt-0.5">{range.label} vs {prevRange.label}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-violet-600" />{range.label}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-gray-200" />{prevRange.label}</span>
          </div>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #f3f4f6', fontSize: 12 }} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="current" name={range.label}    fill="#831e3e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="prev"    name={prevRange.label} fill="#e5e7eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historique */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Mon historique</h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {filtrees.length} jour{filtrees.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filtrees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">Aucune entrée pour cette période</p>
            <p className="text-xs text-gray-300 mt-1">
              Clique sur &ldquo;Saisir ma journée&rdquo; pour enregistrer tes stats du jour.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-right">Sched.</th>
                  <th className="px-4 py-2.5 text-right">Shows</th>
                  <th className="px-4 py-2.5 text-right">Show %</th>
                  <th className="px-4 py-2.5 text-right">Pitches</th>
                  <th className="px-4 py-2.5 text-right">Pitch %</th>
                  <th className="px-4 py-2.5 text-right">Closes</th>
                  <th className="px-4 py-2.5 text-right">Close %</th>
                  <th className="px-4 py-2.5 text-right">Cash</th>
                  <th className="px-4 py-2.5 text-right">Revenue</th>
                  <th className="px-4 py-2.5 text-left">Notes</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrees.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(e.entry_date, MOIS_COURT)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.scheduled_calls}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.show_calls}</td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={pct(e.show_calls, e.scheduled_calls)} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.pitch_calls}</td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={pct(e.pitch_calls, e.show_calls)} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{e.closes}</td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={pct(e.closes, e.show_calls)} bold />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-blue-700 font-medium">
                      {e.cash_collected > 0 ? dollar(e.cash_collected) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {e.revenue > 0 ? dollar(e.revenue) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">{e.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setModalEntry(e)}
                        title="Modifier"
                        className="p-1.5 text-gray-200 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50 font-semibold text-gray-700 text-xs">
                  <td className="px-4 py-3 text-gray-500 uppercase tracking-wide">Totaux</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.scheduled}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.shows}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.showRate} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.pitches}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.pitchRate} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.closes}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.closeRate} bold /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">{dollar(kpis.cash_collected)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{dollar(kpis.revenue)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {modalEntry !== null && (
        <ModalEntree
          entry={modalEntry === 'new' ? null : modalEntry}
          userId={userId}
          onClose={() => setModalEntry(null)}
        />
      )}
    </div>
  )
}
