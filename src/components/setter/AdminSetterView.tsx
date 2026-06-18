'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Plus, Trash2, Pencil, Phone, TrendingUp, CalendarCheck, XCircle, UserX, Ban,
  ArrowUp, ArrowDown, Minus,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { ajouterEntreeSetter, modifierEntreeSetter, supprimerEntreeSetter } from '@/app/(portal)/setter/actions'
import { MOIS_COURT, formatDate } from '@/lib/constants'
import MetricCard   from '@/components/ui/MetricCard'
import PeriodFilter, { usePeriodFilter, computePrevRange } from '@/components/ui/PeriodFilter'
import Modal        from '@/components/ui/Modal'
import PageHeader   from '@/components/layout/PageHeader'

// ── Types ─────────────────────────────────────────────────────────────

interface SetterEntry {
  id:           string
  user_id:      string
  entry_date:   string
  attempts:     number
  contacts:     number
  rdv_booked:   number
  showed:       number
  no_show:      number
  disqualified: number
  cancelled:    number
  notes:        string | null
}

interface Profil {
  id:        string
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
    value >= 50 ? 'bg-green-50 text-green-700 ring-1 ring-green-200' :
    value >= 30 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
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

function computeKpis(rows: SetterEntry[]) {
  const attempts     = rows.reduce((s, e) => s + e.attempts,     0)
  const contacts     = rows.reduce((s, e) => s + e.contacts,     0)
  const rdv          = rows.reduce((s, e) => s + e.rdv_booked,   0)
  const showed       = rows.reduce((s, e) => s + e.showed,       0)
  const no_show      = rows.reduce((s, e) => s + e.no_show,      0)
  const disqualified = rows.reduce((s, e) => s + e.disqualified, 0)
  const cancelled    = rows.reduce((s, e) => s + e.cancelled,    0)
  return {
    attempts, contacts, rdv, showed, no_show, disqualified, cancelled,
    contactRate: pct(contacts, attempts),
    bookRate:    pct(rdv, contacts),
    showRate:    pct(showed, rdv),
  }
}

// ── Modal ajout ───────────────────────────────────────────────────────

function ModalAjout({ setters, onClose }: { setters: Profil[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await ajouterEntreeSetter(fd)
      onClose()
    })
  }

  return (
    <Modal titre="Nouvelle entrée setter" onClose={onClose} maxWidth="max-w-lg" scrollable>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Setter</label>
          <select name="user_id" className={INPUT_CLS}>
            {setters.map(s => (
              <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input name="entry_date" type="date" required defaultValue={today} className={INPUT_CLS} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Activité</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'attempts',   label: 'Tentatives'  },
              { name: 'contacts',   label: 'Contacts'     },
              { name: 'rdv_booked', label: 'RDV Bookés'  },
              { name: 'showed',     label: 'Présentés'    },
            ].map(f => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{f.label}</label>
                <input name={f.name} type="number" min="0" defaultValue="0" className={INPUT_CLS} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pertes</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'no_show',      label: 'No Show'      },
              { name: 'disqualified', label: 'Disqualifiés' },
              { name: 'cancelled',    label: 'Annulés'      },
            ].map(f => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{f.label}</label>
                <input name={f.name} type="number" min="0" defaultValue="0" className={INPUT_CLS} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
          <textarea name="notes" rows={2} placeholder="Remarques…" className={`${INPUT_CLS} resize-none`} />
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

// ── Modal modifier entrée setter ──────────────────────────────────────

function ModalModifier({ entry, setterName, onClose }: {
  entry:      SetterEntry
  setterName: string
  onClose:    () => void
}) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await modifierEntreeSetter(entry.id, fd)
      onClose()
    })
  }

  return (
    <Modal titre="Modifier l'entrée" onClose={onClose} maxWidth="max-w-lg" scrollable>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Setter</label>
          <p className="text-sm text-gray-800 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">{setterName}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input name="entry_date" type="date" required defaultValue={entry.entry_date} className={INPUT_CLS} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Activité</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { name: 'attempts',   label: 'Tentatives', value: entry.attempts   },
              { name: 'contacts',   label: 'Contacts',    value: entry.contacts   },
              { name: 'rdv_booked', label: 'RDV Bookés', value: entry.rdv_booked },
              { name: 'showed',     label: 'Présentés',   value: entry.showed     },
            ] as const).map(f => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{f.label}</label>
                <input name={f.name} type="number" min="0" defaultValue={f.value} className={INPUT_CLS} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pertes</p>
          <div className="grid grid-cols-3 gap-3">
            {([
              { name: 'no_show',      label: 'No Show',      value: entry.no_show      },
              { name: 'disqualified', label: 'Disqualifiés', value: entry.disqualified },
              { name: 'cancelled',    label: 'Annulés',      value: entry.cancelled    },
            ] as const).map(f => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{f.label}</label>
                <input name={f.name} type="number" min="0" defaultValue={f.value} className={INPUT_CLS} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
          <textarea name="notes" rows={2} placeholder="Remarques…" defaultValue={entry.notes ?? ''} className={`${INPUT_CLS} resize-none`} />
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

export default function AdminSetterView({ entrees, setters, isAdmin }: {
  entrees:  SetterEntry[]
  setters:  Profil[]
  isAdmin:  boolean
}) {
  const { periode, offset, range, onChange: onPeriodChange, onCustomRange, customStart, customEnd } = usePeriodFilter()
  const [setterFilter, setSetterFilter] = useState<string>('tout')
  const [modalOuverte, setModalOuverte] = useState(false)
  const [entreeEnEdit, setEntreeEnEdit] = useState<SetterEntry | null>(null)
  const [pending, startTransition]      = useTransition()

  const profileMap = useMemo(
    () => new Map(setters.map(s => [s.id, s.full_name ?? 'Inconnu'])),
    [setters],
  )

  const prevRange = useMemo(() => computePrevRange(periode, offset, range), [periode, offset, range])

  const filtreePeriode = useMemo(
    () => !range.start ? [] : entrees.filter(e => e.entry_date >= range.start && e.entry_date <= range.end),
    [entrees, range],
  )

  const filtrees = useMemo(() => {
    if (setterFilter === 'tout') return filtreePeriode
    return filtreePeriode.filter(e => e.user_id === setterFilter)
  }, [filtreePeriode, setterFilter])

  const filtreesPrev = useMemo(() => {
    const base = entrees.filter(e => e.entry_date >= prevRange.start && e.entry_date <= prevRange.end)
    if (setterFilter === 'tout') return base
    return base.filter(e => e.user_id === setterFilter)
  }, [entrees, prevRange, setterFilter])

  const kpis     = useMemo(() => computeKpis(filtrees),     [filtrees])
  const kpisPrev = useMemo(() => computeKpis(filtreesPrev), [filtreesPrev])

  const statsParSetter = useMemo(() => {
    const agg = new Map<string, {
      attempts: number; contacts: number; rdv: number;
      showed: number; no_show: number; disqualified: number; cancelled: number
    }>()
    for (const e of filtreePeriode) {
      const cur = agg.get(e.user_id) ?? {
        attempts: 0, contacts: 0, rdv: 0, showed: 0, no_show: 0, disqualified: 0, cancelled: 0,
      }
      agg.set(e.user_id, {
        attempts:     cur.attempts     + e.attempts,
        contacts:     cur.contacts     + e.contacts,
        rdv:          cur.rdv          + e.rdv_booked,
        showed:       cur.showed       + e.showed,
        no_show:      cur.no_show      + e.no_show,
        disqualified: cur.disqualified + e.disqualified,
        cancelled:    cur.cancelled    + e.cancelled,
      })
    }
    return Array.from(agg.entries())
      .map(([uid, s]) => ({ uid, nom: profileMap.get(uid) ?? 'Inconnu', ...s }))
      .sort((a, b) => b.rdv - a.rdv)
  }, [filtreePeriode, profileMap])

  const chartData = useMemo(() => [
    { name: 'Tentatives', current: kpis.attempts,  prev: kpisPrev.attempts  },
    { name: 'Contacts',   current: kpis.contacts,  prev: kpisPrev.contacts  },
    { name: 'RDV',        current: kpis.rdv,        prev: kpisPrev.rdv        },
    { name: 'Présentés',  current: kpis.showed,    prev: kpisPrev.showed    },
  ], [kpis, kpisPrev])

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return
    startTransition(async () => { await supprimerEntreeSetter(id) })
  }

  const nomSetter = setterFilter === 'tout' ? null : (profileMap.get(setterFilter) ?? null)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <PageHeader
        titre="Suivi Setters"
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
          value={setterFilter}
          onChange={e => setSetterFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="tout">Tous les setters</option>
          {setters.map(s => (
            <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>
          ))}
        </select>
      </div>

      {nomSetter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-lg border border-violet-100 w-fit">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-sm font-medium text-violet-800">{nomSetter}</span>
          <button onClick={() => setSetterFilter('tout')} className="text-violet-400 hover:text-violet-700 ml-1 text-xs">✕</button>
        </div>
      )}

      {/* KPIs activité */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Activité{nomSetter ? ` — ${nomSetter}` : ' équipe'}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Tentatives"      value={kpis.attempts}           icon={Phone}        color="violet" sub={`${kpis.contacts} contacts`} />
            <DeltaBadge current={kpis.attempts} prev={kpisPrev.attempts} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Taux de contact" value={`${kpis.contactRate} %`} icon={TrendingUp}   color="blue"   sub={`${kpis.contacts} / ${kpis.attempts}`} />
            <DeltaBadge current={kpis.contactRate} prev={kpisPrev.contactRate} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="RDV Bookés"      value={kpis.rdv}                icon={CalendarCheck} color="green"  sub={`Taux book : ${kpis.bookRate} %`} />
            <DeltaBadge current={kpis.rdv} prev={kpisPrev.rdv} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Taux de show"    value={`${kpis.showRate} %`}    icon={TrendingUp}   color="amber"  sub={`${kpis.showed} / ${kpis.rdv} RDV`} />
            <DeltaBadge current={kpis.showRate} prev={kpisPrev.showRate} />
          </div>
        </div>
      </div>

      {/* KPIs pertes */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pertes équipe</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="No Show"      value={kpis.no_show}      icon={XCircle} color="violet" sub="RDV non honorés" />
            <DeltaBadge current={kpis.no_show} prev={kpisPrev.no_show} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Disqualifiés" value={kpis.disqualified} icon={UserX}   color="amber"  sub="Prospects écartés" />
            <DeltaBadge current={kpis.disqualified} prev={kpisPrev.disqualified} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Annulés"      value={kpis.cancelled}    icon={Ban}     color="violet" sub="RDV annulés" />
            <DeltaBadge current={kpis.cancelled} prev={kpisPrev.cancelled} />
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

      {/* Stats par setter */}
      {setterFilter === 'tout' && statsParSetter.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Performance par setter</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Setter</th>
                  <th className="px-4 py-2.5 text-right">Tent.</th>
                  <th className="px-4 py-2.5 text-right">Contacts</th>
                  <th className="px-4 py-2.5 text-right">Contact %</th>
                  <th className="px-4 py-2.5 text-right">RDV</th>
                  <th className="px-4 py-2.5 text-right">Book %</th>
                  <th className="px-4 py-2.5 text-right">Présentés</th>
                  <th className="px-4 py-2.5 text-right">Show %</th>
                  <th className="px-4 py-2.5 text-right">No Show</th>
                  <th className="px-4 py-2.5 text-right">Disq.</th>
                  <th className="px-4 py-2.5 text-right">Annulés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {statsParSetter.map(s => (
                  <tr
                    key={s.uid}
                    className="hover:bg-violet-50/30 transition-colors cursor-pointer"
                    onClick={() => setSetterFilter(s.uid)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">{s.nom}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.attempts}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.contacts}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(s.contacts, s.attempts)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{s.rdv}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(s.rdv, s.contacts)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.showed}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(s.showed, s.rdv)} bold /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-400">{s.no_show}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-400">{s.disqualified}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-400">{s.cancelled}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50 font-semibold text-gray-700 text-xs">
                  <td className="px-4 py-3 text-gray-500 uppercase tracking-wide">Totaux</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.attempts}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.contacts}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.contactRate} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.rdv}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.bookRate} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.showed}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.showRate} bold /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-400">{kpis.no_show}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.disqualified}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.cancelled}</td>
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
                  <th className="px-4 py-2.5 text-left">Setter</th>
                  <th className="px-4 py-2.5 text-right">Tent.</th>
                  <th className="px-4 py-2.5 text-right">Contacts</th>
                  <th className="px-4 py-2.5 text-right">Contact %</th>
                  <th className="px-4 py-2.5 text-right">RDV</th>
                  <th className="px-4 py-2.5 text-right">Book %</th>
                  <th className="px-4 py-2.5 text-right">Présentés</th>
                  <th className="px-4 py-2.5 text-right">Show %</th>
                  <th className="px-4 py-2.5 text-right">No Show</th>
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
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.attempts}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.contacts}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(e.contacts, e.attempts)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{e.rdv_booked}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(e.rdv_booked, e.contacts)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.showed}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(e.showed, e.rdv_booked)} bold /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-400">{e.no_show}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">{e.notes ?? '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEntreeEnEdit(e)}
                            title="Modifier"
                            className="p-1.5 text-gray-200 hover:text-violet-500 hover:bg-violet-50 rounded transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            disabled={pending}
                            title="Supprimer"
                            className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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
        <ModalAjout setters={setters} onClose={() => setModalOuverte(false)} />
      )}
      {entreeEnEdit && (
        <ModalModifier
          entry={entreeEnEdit}
          setterName={profileMap.get(entreeEnEdit.user_id) ?? 'Inconnu'}
          onClose={() => setEntreeEnEdit(null)}
        />
      )}
    </div>
  )
}
