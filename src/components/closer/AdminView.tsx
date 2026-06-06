'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Trash2, Phone, TrendingUp, Target, CheckCircle2, Wallet, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ajouterEntree, supprimerEntree } from '@/app/(portal)/closer/actions'
import { MOIS_FR, MOIS_COURT, dollar, currentMonthKey, formatDate } from '@/lib/constants'
import MetricCard  from '@/components/ui/MetricCard'
import MonthFilter from '@/components/ui/MonthFilter'
import Modal       from '@/components/ui/Modal'
import PageHeader  from '@/components/layout/PageHeader'

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
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

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

// ── Modal ajout ───────────────────────────────────────────────────────

function ModalAjout({ closers, onClose }: { closers: Profil[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await ajouterEntree(fd)
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
  const [moisSelect,   setMoisSelect]   = useState(currentMonthKey)
  const [closerFilter, setCloserFilter] = useState<string>('tout')
  const [modalOuverte, setModalOuverte] = useState(false)
  const [pending, startTransition]      = useTransition()

  const profileMap = useMemo(
    () => new Map(closers.map(c => [c.id, c.full_name ?? 'Inconnu'])),
    [closers],
  )

  const moisOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const e of entrees) {
      const [y, m] = e.entry_date.split('-').map(Number)
      const key = `${y}-${String(m).padStart(2, '0')}`
      if (!seen.has(key)) {
        seen.add(key)
        opts.push({ value: key, label: `${MOIS_FR[m - 1]} ${y}` })
      }
    }
    return opts.sort((a, b) => b.value.localeCompare(a.value))
  }, [entrees])

  const filtreesMois = useMemo(() => {
    if (moisSelect === 'tout') return entrees
    const [y, m] = moisSelect.split('-').map(Number)
    return entrees.filter(e => {
      const [ey, em] = e.entry_date.split('-').map(Number)
      return ey === y && em === m
    })
  }, [entrees, moisSelect])

  const filtrees = useMemo(() => {
    if (closerFilter === 'tout') return filtreesMois
    return filtreesMois.filter(e => e.user_id === closerFilter)
  }, [filtreesMois, closerFilter])

  const kpis = useMemo(() => {
    const scheduled      = filtreesMois.reduce((s, e) => s + e.scheduled_calls, 0)
    const shows          = filtreesMois.reduce((s, e) => s + e.show_calls,      0)
    const pitches        = filtreesMois.reduce((s, e) => s + e.pitch_calls,     0)
    const closes         = filtreesMois.reduce((s, e) => s + e.closes,          0)
    const cash_collected = filtreesMois.reduce((s, e) => s + e.cash_collected,  0)
    const revenue        = filtreesMois.reduce((s, e) => s + e.revenue,         0)
    return {
      scheduled, shows, pitches, closes, cash_collected, revenue,
      showRate:  pct(shows, scheduled),
      pitchRate: pct(pitches, shows),
      closeRate: pct(closes, shows),
    }
  }, [filtreesMois])

  const statsParCloser = useMemo(() => {
    const agg = new Map<string, {
      scheduled: number; shows: number; pitches: number; closes: number;
      cash_collected: number; revenue: number
    }>()
    for (const e of filtreesMois) {
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
  }, [filtreesMois, profileMap])

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return
    startTransition(async () => { await supprimerEntree(id) })
  }

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

      <MonthFilter
        selected={moisSelect}
        onChange={setMoisSelect}
        options={moisOptions}
      />

      {/* KPIs activité */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Activité équipe</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Schedulés"    value={kpis.scheduled}          icon={Phone}        color="violet" sub={`${kpis.shows} shows réalisés`} />
          <MetricCard label="Show rate"    value={`${kpis.showRate} %`}    icon={TrendingUp}   color="blue"   sub={`${kpis.shows} / ${kpis.scheduled} appels`} />
          <MetricCard label="Pitch rate"   value={`${kpis.pitchRate} %`}   icon={Target}       color="amber"  sub={`${kpis.pitches} / ${kpis.shows} shows`} />
          <MetricCard label="Close rate"   value={`${kpis.closeRate} %`}   icon={CheckCircle2} color="green"  sub={`${kpis.closes} closes`} />
        </div>
      </div>

      {/* KPIs financier */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Financier équipe</p>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Cash collecté" value={dollar(kpis.cash_collected)} icon={Wallet}     color="blue"  sub="Total saisi dans les EOD" />
          <MetricCard label="Revenue"       value={dollar(kpis.revenue)}        icon={DollarSign} color="green" sub="Valeur des deals signés" />
        </div>
      </div>

      {/* Stats par closer */}
      {statsParCloser.length > 0 && (
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
                  <tr key={s.uid} className="hover:bg-gray-50/50 transition-colors">
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
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Entrées détaillées</h3>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              {filtrees.length} entrée{filtrees.length !== 1 ? 's' : ''}
            </span>
          </div>
          <select
            value={closerFilter}
            onChange={e => setCloserFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="tout">Tous les closers</option>
            {closers.map(c => (
              <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
            ))}
          </select>
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
