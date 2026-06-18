'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Plus, Trash2, Phone, TrendingUp, Target, CheckCircle2,
  Wallet, DollarSign, ArrowUp, ArrowDown, Minus,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { ajouterEntree, supprimerEntree } from '@/app/(portal)/closer/actions'
import { batchAddFollowups } from '@/app/(portal)/todo/actions'
import { MOIS_COURT, dollar, formatDate } from '@/lib/constants'
import MetricCard   from '@/components/ui/MetricCard'
import PeriodFilter, { usePeriodFilter, computePrevRange } from '@/components/ui/PeriodFilter'
import Modal        from '@/components/ui/Modal'
import PageHeader   from '@/components/layout/PageHeader'

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

interface Profil {
  id: string
  full_name: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500'

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
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

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0 && current === 0) return <span className="text-xs text-gray-300">—</span>
  if (prev === 0) return <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><ArrowUp size={10} />Nouveau</span>
  const delta = Math.round(((current - prev) / prev) * 100)
  if (Math.abs(delta) < 1) return (
    <span className="text-xs text-gray-400 flex items-center gap-0.5"><Minus size={10} />Stable</span>
  )
  const up = delta > 0
  return (
    <span className={cn('text-xs font-medium flex items-center gap-0.5', up ? 'text-green-600' : 'text-red-500')}>
      {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {Math.abs(delta)} %
    </span>
  )
}

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

// ── Modal ajout ───────────────────────────────────────────────────────

type PendingFu = { id: string; name: string; date: string }

function fmtFuDate(d: string) {
  return new Date(d + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function ModalAjout({ closers, onClose }: { closers: Profil[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [pendingFus, setPendingFus] = useState<PendingFu[]>([])
  const [newFuName, setNewFuName]   = useState('')
  const [newFuDate, setNewFuDate]   = useState('')
  const today = new Date().toISOString().slice(0, 10)

  function handleAddFu() {
    if (!newFuName.trim() || !newFuDate) return
    setPendingFus(prev => [...prev, { id: Math.random().toString(36), name: newFuName.trim(), date: newFuDate }])
    setNewFuName('')
    setNewFuDate('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const closerId = fd.get('user_id') as string
    startTransition(async () => {
      await ajouterEntree(fd)
      if (pendingFus.length > 0 && closerId) {
        await batchAddFollowups(pendingFus.map(f => ({ closer_id: closerId, prospect_name: f.name, followup_date: f.date })))
      }
      onClose()
    })
  }

  return (
    <Modal titre="Nouvelle entrée closer" onClose={onClose} maxWidth="max-w-lg" scrollable>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Closer</label>
          <select name="user_id" className={INPUT_CLS}>
            {closers.map(c => (
              <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input name="entry_date" type="date" required defaultValue={today} className={INPUT_CLS} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Appels</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'scheduled_calls', label: 'Schedulés' },
              { name: 'show_calls',      label: 'Shows'     },
              { name: 'pitch_calls',     label: 'Pitches'   },
              { name: 'closes',          label: 'Closes'    },
            ].map(f => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{f.label}</label>
                <input name={f.name} type="number" min="0" defaultValue="0" className={INPUT_CLS} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Financier</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Cash collecté ($)</label>
              <input name="cash_collected" type="number" min="0" step="0.01" defaultValue="0" className={INPUT_CLS} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Revenue ($)</label>
              <input name="revenue" type="number" min="0" step="0.01" defaultValue="0" className={INPUT_CLS} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
          <textarea name="notes" rows={2} placeholder="Remarques..." className={`${INPUT_CLS} resize-none`} />
        </div>

        {/* Follow ups */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Follow ups</p>
          {pendingFus.length > 0 && (
            <div className="mb-2 space-y-1.5">
              {pendingFus.map(f => (
                <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-lg text-xs">
                  <span className="flex-1 font-medium text-violet-800 truncate">{f.name}</span>
                  <span className="text-violet-500 shrink-0">{fmtFuDate(f.date)}</span>
                  <button
                    type="button"
                    onClick={() => setPendingFus(prev => prev.filter(x => x.id !== f.id))}
                    className="text-violet-300 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newFuName}
              onChange={e => setNewFuName(e.target.value)}
              placeholder="Nom du prospect"
              className={`${INPUT_CLS} flex-1`}
            />
            <input
              type="date"
              value={newFuDate}
              onChange={e => setNewFuDate(e.target.value)}
              className={`${INPUT_CLS} w-36`}
            />
            <button
              type="button"
              onClick={handleAddFu}
              disabled={!newFuName.trim() || !newFuDate}
              className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={pending}
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

export default function AdminView({ entrees, closers, isAdmin }: {
  entrees:  CloserEntry[]
  closers:  Profil[]
  isAdmin:  boolean
}) {
  const { periode, offset, range, onChange: onPeriodChange, onCustomRange, customStart, customEnd } = usePeriodFilter()
  const [closerFilter, setCloserFilter] = useState<string>('tout')
  const [modalOuverte, setModalOuverte] = useState(false)
  const [pending, startTransition]      = useTransition()

  const profileMap = useMemo(
    () => new Map(closers.map(c => [c.id, c.full_name ?? 'Inconnu'])),
    [closers],
  )

  const prevRange = useMemo(() => computePrevRange(periode, offset, range), [periode, offset, range])

  // Period filter only (for per-closer breakdown table)
  const filtreePeriode = useMemo(
    () => !range.start ? [] : entrees.filter(e => e.entry_date >= range.start && e.entry_date <= range.end),
    [entrees, range],
  )

  // Period + closer (for KPIs + detail table)
  const filtrees = useMemo(() => {
    if (closerFilter === 'tout') return filtreePeriode
    return filtreePeriode.filter(e => e.user_id === closerFilter)
  }, [filtreePeriode, closerFilter])

  // Previous period (same closer filter)
  const filtreesPrev = useMemo(() => {
    const base = entrees.filter(e => e.entry_date >= prevRange.start && e.entry_date <= prevRange.end)
    if (closerFilter === 'tout') return base
    return base.filter(e => e.user_id === closerFilter)
  }, [entrees, prevRange, closerFilter])

  const kpis     = useMemo(() => computeKpis(filtrees),     [filtrees])
  const kpisPrev = useMemo(() => computeKpis(filtreesPrev), [filtreesPrev])

  const statsParCloser = useMemo(() => {
    const agg = new Map<string, {
      scheduled: number; shows: number; pitches: number; closes: number;
      cash_collected: number; revenue: number
    }>()
    for (const e of filtreePeriode) {
      const cur = agg.get(e.user_id) ?? { scheduled: 0, shows: 0, pitches: 0, closes: 0, cash_collected: 0, revenue: 0 }
      agg.set(e.user_id, {
        scheduled:      cur.scheduled      + e.scheduled_calls,
        shows:          cur.shows          + e.show_calls,
        pitches:        cur.pitches        + e.pitch_calls,
        closes:         cur.closes         + e.closes,
        cash_collected: cur.cash_collected + e.cash_collected,
        revenue:        cur.revenue        + e.revenue,
      })
    }
    return Array.from(agg.entries())
      .map(([uid, s]) => ({ uid, nom: profileMap.get(uid) ?? 'Inconnu', ...s }))
      .sort((a, b) => b.closes - a.closes)
  }, [filtreePeriode, profileMap])

  const chartData = useMemo(() => [
    { name: 'Schedulés', current: kpis.scheduled,    prev: kpisPrev.scheduled    },
    { name: 'Shows',     current: kpis.shows,         prev: kpisPrev.shows         },
    { name: 'Pitches',   current: kpis.pitches,       prev: kpisPrev.pitches       },
    { name: 'Closes',    current: kpis.closes,        prev: kpisPrev.closes        },
  ], [kpis, kpisPrev])

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return
    startTransition(async () => { await supprimerEntree(id) })
  }

  const nomCloser = closerFilter === 'tout' ? null : (profileMap.get(closerFilter) ?? null)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <PageHeader
        titre="Suivi Closers"
        subtitle="Performance et activité de l'équipe"
        action={
          <button
            onClick={() => setModalOuverte(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Ajouter
          </button>
        }
      />

      {/* Filters row */}
      <div className="flex items-center gap-4 flex-wrap">
        <PeriodFilter
          periode={periode} offset={offset} onChange={onPeriodChange}
          customStart={customStart} customEnd={customEnd} onCustomRange={onCustomRange}
        />
        <select
          value={closerFilter}
          onChange={e => setCloserFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="tout">Tous les closers</option>
          {closers.map(c => (
            <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
          ))}
        </select>
      </div>

      {nomCloser && (
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-lg border border-violet-100 w-fit">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-sm font-medium text-violet-800">{nomCloser}</span>
          <button onClick={() => setCloserFilter('tout')} className="text-violet-400 hover:text-violet-700 ml-1 text-xs">✕</button>
        </div>
      )}

      {/* KPIs activité */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Activité{nomCloser ? ` — ${nomCloser}` : ' équipe'}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Schedulés"  value={kpis.scheduled}          icon={Phone}        color="violet" sub={`${kpis.shows} shows réalisés`} />
            <DeltaBadge current={kpis.scheduled} prev={kpisPrev.scheduled} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Show rate"  value={`${kpis.showRate} %`}    icon={TrendingUp}   color="blue"   sub={`${kpis.shows} / ${kpis.scheduled}`} />
            <DeltaBadge current={kpis.showRate} prev={kpisPrev.showRate} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Pitch rate" value={`${kpis.pitchRate} %`}   icon={Target}       color="amber"  sub={`${kpis.pitches} / ${kpis.shows}`} />
            <DeltaBadge current={kpis.pitchRate} prev={kpisPrev.pitchRate} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Close rate" value={`${kpis.closeRate} %`}   icon={CheckCircle2} color="green"  sub={`${kpis.closes} closes`} />
            <DeltaBadge current={kpis.closeRate} prev={kpisPrev.closeRate} />
          </div>
        </div>
      </div>

      {/* KPIs financier */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Financier</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Cash collecté" value={dollar(kpis.cash_collected)} icon={Wallet}     color="blue"  sub="Total EOD" />
            <DeltaBadge current={kpis.cash_collected} prev={kpisPrev.cash_collected} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Revenue" value={dollar(kpis.revenue)} icon={DollarSign} color="green" sub="Valeur deals signés" />
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
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-violet-600" />{range.label}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-gray-200" />{prevRange.label}</span>
          </div>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #f3f4f6', fontSize: 12 }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar dataKey="current" name={range.label}    fill="#831e3e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="prev"    name={prevRange.label} fill="#e5e7eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats par closer — toujours toute l'équipe pour la période */}
      {closerFilter === 'tout' && statsParCloser.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Performance par closer</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Closer</th>
                  <th className="px-4 py-2.5 text-right">Sched.</th>
                  <th className="px-4 py-2.5 text-right">Shows</th>
                  <th className="px-4 py-2.5 text-right">Show %</th>
                  <th className="px-4 py-2.5 text-right">Pitches</th>
                  <th className="px-4 py-2.5 text-right">Pitch %</th>
                  <th className="px-4 py-2.5 text-right">Closes</th>
                  <th className="px-4 py-2.5 text-right">Close %</th>
                  <th className="px-4 py-2.5 text-right">Cash</th>
                  <th className="px-4 py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {statsParCloser.map(s => (
                  <tr
                    key={s.uid}
                    className="hover:bg-violet-50/30 transition-colors cursor-pointer"
                    onClick={() => setCloserFilter(s.uid)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">{s.nom}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.scheduled}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.shows}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(s.shows, s.scheduled)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.pitches}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(s.pitches, s.shows)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{s.closes}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(s.closes, s.shows)} bold /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-blue-700 font-medium">{dollar(s.cash_collected)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{dollar(s.revenue)}</td>
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
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Entrées détaillées */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Entrées détaillées</h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {filtrees.length} entrée{filtrees.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filtrees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">Aucune entrée pour cette sélection</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Closer</th>
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
                  {isAdmin && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrees.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(e.entry_date, MOIS_COURT)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{profileMap.get(e.user_id) ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.scheduled_calls}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.show_calls}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(e.show_calls, e.scheduled_calls)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.pitch_calls}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(e.pitch_calls, e.show_calls)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{e.closes}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(e.closes, e.show_calls)} bold /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-blue-700 font-medium">
                      {e.cash_collected > 0 ? dollar(e.cash_collected) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {e.revenue > 0 ? dollar(e.revenue) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">{e.notes ?? '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          disabled={pending}
                          title="Supprimer"
                          className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOuverte && (
        <ModalAjout closers={closers} onClose={() => setModalOuverte(false)} />
      )}
    </div>
  )
}
