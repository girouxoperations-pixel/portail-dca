'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Phone, TrendingUp, CalendarCheck, XCircle, UserX, Ban, ArrowUp, ArrowDown, Minus, Zap, RefreshCw, Wallet, DollarSign, CheckCircle2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '@/lib/utils'
import { ajouterEntreeSetter, modifierEntreeSetter } from '@/app/(portal)/setter/actions'
import { MOIS_COURT, dollar, formatDate } from '@/lib/constants'
import MetricCard   from '@/components/ui/MetricCard'
import PeriodFilter, { usePeriodFilter, computePrevRange } from '@/components/ui/PeriodFilter'
import Modal        from '@/components/ui/Modal'
import PageHeader   from '@/components/layout/PageHeader'
import FunnelCard   from '@/components/dashboard/FunnelCard'

// ── Types ─────────────────────────────────────────────────────────────

interface RecurringOcc {
  id:              string
  mois:            number
  annee:           number
  date_attendue:   string
  montant_attendu: number
  recu:            boolean
  date_recue:      string | null
  montant_recu:    number | null
}

interface RecurringDeal {
  id:                    string
  client_name:           string
  montant_mensuel:       number
  date_debut:            string
  actif:                 boolean
  notes:                 string | null
  recurring_occurrences: RecurringOcc[]
}

interface Deal {
  id:              string
  entry_date:      string
  client_name:     string | null
  montant_courant: number
  collected:       number
  methode:         string | null
  close_type:      string | null
  notes:           string | null
  profiles:        { full_name: string | null }[] | null
}

interface SetterEntry {
  id:           string
  user_id:      string
  entry_date:   string
  attempts:     number
  contacts:     number
  rdv_booked:   number
  rdv_agenda:   number
  showed:       number
  no_show:      number
  disqualified: number
  cancelled:    number
  deals:        number
  notes:        string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500'

const CHAMPS_ACTIVITE = [
  { name: 'attempts',   label: 'Tentatives'        },
  { name: 'contacts',   label: 'Contacts'           },
  { name: 'rdv_booked', label: 'RDV Bookés'        },
  { name: 'rdv_agenda', label: 'RDV/DAY à l\'agenda' },
  { name: 'showed',     label: 'Présentés'          },
  { name: 'deals',      label: 'Deals'              },
] as const

const CHAMPS_PERTES = [
  { name: 'no_show',      label: 'No Show'       },
  { name: 'disqualified', label: 'Disqualifiés'  },
  { name: 'cancelled',    label: 'Annulés'       },
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

function CloseTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-gray-300 text-xs">—</span>
  return type === 'on_the_spot'
    ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"><Zap size={10} />Spot</span>
    : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200"><RefreshCw size={10} />FU</span>
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

// ── Modal ajout / édition ─────────────────────────────────────────────

function ModalEntree({ entry, userId, onClose }: {
  entry:   SetterEntry | null
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
        await modifierEntreeSetter(entry.id, fd)
      } else {
        fd.set('user_id', userId)
        await ajouterEntreeSetter(fd)
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
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Activité</p>
          <div className="grid grid-cols-2 gap-3">
            {CHAMPS_ACTIVITE.map(f => (
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
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pertes</p>
          <div className="grid grid-cols-3 gap-3">
            {CHAMPS_PERTES.map(f => (
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

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
          <textarea
            name="notes" rows={2} placeholder="Remarques…"
            defaultValue={entry?.notes ?? ''}
            className={`${INPUT_CLS} resize-none`}
          />
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

export default function SetterView({ entrees, deals, recurrents, userId, prenom }: {
  entrees:    SetterEntry[]
  deals:      Deal[]
  recurrents: RecurringDeal[]
  userId:     string
  prenom:     string
}) {
  const { periode, offset, range, onChange: onPeriodChange, onCustomRange, customStart, customEnd } = usePeriodFilter()
  const [tab, setTab]               = useState<'activite' | 'deals' | 'recurrents'>('activite')
  const [modalEntry, setModalEntry] = useState<SetterEntry | null | 'new'>(null)

  const prevRange = useMemo(() => computePrevRange(periode, offset, range), [periode, offset, range])

  const filtrees     = useMemo(
    () => !range.start ? [] : entrees.filter(e => e.entry_date >= range.start && e.entry_date <= range.end),
    [entrees, range],
  )
  const filtreesPrev = useMemo(
    () => !prevRange.start ? [] : entrees.filter(e => e.entry_date >= prevRange.start && e.entry_date <= prevRange.end),
    [entrees, prevRange],
  )

  function computeKpis(rows: SetterEntry[]) {
    const attempts     = rows.reduce((s, e) => s + e.attempts,     0)
    const contacts     = rows.reduce((s, e) => s + e.contacts,     0)
    const rdv          = rows.reduce((s, e) => s + e.rdv_booked,   0)
    const rdv_agenda   = rows.reduce((s, e) => s + e.rdv_agenda,   0)
    const showed       = rows.reduce((s, e) => s + e.showed,       0)
    const no_show      = rows.reduce((s, e) => s + e.no_show,      0)
    const disqualified = rows.reduce((s, e) => s + e.disqualified, 0)
    const cancelled    = rows.reduce((s, e) => s + e.cancelled,    0)
    const deals        = rows.reduce((s, e) => s + e.deals,        0)
    return {
      attempts, contacts, rdv, rdv_agenda, showed, no_show, disqualified, cancelled, deals,
      contactRate: pct(contacts, attempts),
      bookRate:    pct(rdv, contacts),
      showRate:    pct(showed, rdv),
      dealRate:    pct(deals, showed),
    }
  }

  const kpis     = useMemo(() => computeKpis(filtrees),     [filtrees])
  const kpisPrev = useMemo(() => computeKpis(filtreesPrev), [filtreesPrev])

  // ── Deals ─────────────────────────────────────────────────────────
  const filteredDeals = useMemo(
    () => !range.start ? [] : deals.filter(d => d.entry_date >= range.start && d.entry_date <= range.end),
    [deals, range],
  )
  const dealKpis = useMemo(() => ({
    count:     filteredDeals.length,
    total:     filteredDeals.reduce((s, d) => s + d.montant_courant, 0),
    collected: filteredDeals.reduce((s, d) => s + d.collected, 0),
    spot:      filteredDeals.filter(d => d.close_type === 'on_the_spot').length,
    fu:        filteredDeals.filter(d => d.close_type === 'follow_up').length,
  }), [filteredDeals])

  // ── Récurrents ────────────────────────────────────────────────────
  const allOccs = useMemo(
    () => recurrents.flatMap(d => d.recurring_occurrences.map(o => ({ ...o, client_name: d.client_name }))),
    [recurrents],
  )
  const filteredOccs = useMemo(
    () => !range.start ? [] : allOccs.filter(o => o.date_attendue >= range.start && o.date_attendue <= range.end),
    [allOccs, range],
  )
  const recurKpis = useMemo(() => {
    const activeDeals = recurrents.filter(d => d.actif)
    const received    = filteredOccs.filter(o => o.recu)
    const pending     = filteredOccs.filter(o => !o.recu)
    return {
      activeCount:   activeDeals.length,
      mensuelTotal:  activeDeals.reduce((s, d) => s + d.montant_mensuel, 0),
      totalReceived: received.reduce((s, o) => s + (o.montant_recu ?? o.montant_attendu), 0),
      totalPending:  pending.reduce((s, o) => s + o.montant_attendu, 0),
      receivedCount: received.length,
      pendingCount:  pending.length,
    }
  }, [recurrents, filteredOccs])

  const chartData = useMemo(() => [
    { name: 'Tentatives',  current: kpis.attempts,   prev: kpisPrev.attempts   },
    { name: 'Contacts',    current: kpis.contacts,   prev: kpisPrev.contacts   },
    { name: 'RDV',         current: kpis.rdv,         prev: kpisPrev.rdv         },
    { name: 'Agenda',      current: kpis.rdv_agenda,  prev: kpisPrev.rdv_agenda  },
    { name: 'Présentés',   current: kpis.showed,     prev: kpisPrev.showed     },
    { name: 'Deals',       current: kpis.deals,      prev: kpisPrev.deals      },
  ], [kpis, kpisPrev])

  const trendData = useMemo(() => {
    const map = new Map<string, { contacts: number; rdv: number; showed: number }>()
    for (const e of entrees) {
      const [y, m] = e.entry_date.split('-').map(Number)
      const key = `${y}-${String(m).padStart(2, '0')}`
      const cur = map.get(key) ?? { contacts: 0, rdv: 0, showed: 0 }
      map.set(key, { contacts: cur.contacts + e.contacts, rdv: cur.rdv + e.rdv_booked, showed: cur.showed + e.showed })
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, v]) => {
        const mIdx = parseInt(key.split('-')[1])
        return { mois: MOIS_COURT[mIdx - 1], ...v }
      })
  }, [entrees])

  const funnelSteps = [
    { label: 'Tentatives', value: kpis.attempts,   pct: 100,                                   convRate: 100 },
    { label: 'Contacts',   value: kpis.contacts,   pct: pct(kpis.contacts,   kpis.attempts),   convRate: pct(kpis.contacts,   kpis.attempts) },
    { label: 'RDV',        value: kpis.rdv,         pct: pct(kpis.rdv,         kpis.attempts),   convRate: pct(kpis.rdv,         kpis.contacts) },
    { label: 'Présentés',  value: kpis.showed,     pct: pct(kpis.showed,     kpis.attempts),   convRate: pct(kpis.showed,     kpis.rdv) },
    { label: 'Deals',      value: kpis.deals,      pct: pct(kpis.deals,      kpis.attempts),   convRate: pct(kpis.deals,      kpis.showed) },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <PageHeader
        titre="Mon Suivi Setting"
        subtitle={`Bienvenue, ${prenom} — activité et performance`}
        action={
          tab === 'activite' ? (
            <button
              onClick={() => setModalEntry('new')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={15} />
              Saisir ma journée
            </button>
          ) : undefined
        }
      />

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('activite')}
          className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors', tab === 'activite' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}
        >
          Mon Activité
        </button>
        <button
          onClick={() => setTab('deals')}
          className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors', tab === 'deals' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}
        >
          Mes Deals
          {deals.length > 0 && <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{deals.length}</span>}
        </button>
        <button
          onClick={() => setTab('recurrents')}
          className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors', tab === 'recurrents' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}
        >
          Récurrents
          {recurrents.length > 0 && <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{recurrents.length}</span>}
        </button>
      </div>

      <PeriodFilter
        periode={periode} offset={offset} onChange={onPeriodChange}
        customStart={customStart} customEnd={customEnd} onCustomRange={onCustomRange}
      />

      {tab === 'activite' && (<>

      {/* KPIs activité */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Activité</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Tentatives"         value={kpis.attempts}            icon={Phone}         color="violet" sub={`${filtrees.length} jour${filtrees.length !== 1 ? 's' : ''} saisi${filtrees.length !== 1 ? 's' : ''}`} />
            <DeltaBadge current={kpis.attempts} prev={kpisPrev.attempts} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Taux de contact"    value={`${kpis.contactRate} %`}  icon={TrendingUp}    color="blue"   sub={`${kpis.contacts} / ${kpis.attempts}`} />
            <DeltaBadge current={kpis.contactRate} prev={kpisPrev.contactRate} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="RDV Bookés"         value={kpis.rdv}                  icon={CalendarCheck} color="green"  sub={`Taux book : ${kpis.bookRate} %`} />
            <DeltaBadge current={kpis.rdv} prev={kpisPrev.rdv} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="RDV/DAY à l'agenda" value={kpis.rdv_agenda}           icon={CalendarCheck} color="blue"   sub="Slots planifiés dans le calendrier" />
            <DeltaBadge current={kpis.rdv_agenda} prev={kpisPrev.rdv_agenda} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Taux de show"       value={`${kpis.showRate} %`}      icon={TrendingUp}    color="amber"  sub={`${kpis.showed} / ${kpis.rdv} RDV`} />
            <DeltaBadge current={kpis.showRate} prev={kpisPrev.showRate} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1">
            <MetricCard label="Deals"              value={kpis.deals}                icon={DollarSign}    color="green"  sub={`Taux deal : ${kpis.dealRate} %`} />
            <DeltaBadge current={kpis.deals} prev={kpisPrev.deals} />
          </div>
        </div>
      </div>

      {/* KPIs pertes */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pertes</p>
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

      {/* ── Funnel + Tendance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Funnel de conversion</p>
          <FunnelCard steps={funnelSteps} />
        </div>
        {trendData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Tendance</h3>
              <p className="text-xs text-gray-400 mt-0.5">Contacts, RDV et présentés par mois</p>
            </div>
            <div className="px-4 py-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData} barGap={2} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #f3f4f6', fontSize: 12 }} cursor={{ fill: '#f9fafb' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={(v) => <span className="text-gray-500">{v}</span>} />
                  <Bar dataKey="contacts" name="Contacts"  fill="#7c3aed" radius={[4,4,0,0]} maxBarSize={32} />
                  <Bar dataKey="rdv"      name="RDV"       fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={32} />
                  <Bar dataKey="showed"   name="Présentés" fill="#10b981" radius={[4,4,0,0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
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
                  <th className="px-4 py-2.5 text-right">Tent.</th>
                  <th className="px-4 py-2.5 text-right">Contacts</th>
                  <th className="px-4 py-2.5 text-right">Contact %</th>
                  <th className="px-4 py-2.5 text-right">RDV</th>
                  <th className="px-4 py-2.5 text-right">Agenda</th>
                  <th className="px-4 py-2.5 text-right">Book %</th>
                  <th className="px-4 py-2.5 text-right">Présentés</th>
                  <th className="px-4 py-2.5 text-right">Show %</th>
                  <th className="px-4 py-2.5 text-right">Deals</th>
                  <th className="px-4 py-2.5 text-right">No Show</th>
                  <th className="px-4 py-2.5 text-right">Disq.</th>
                  <th className="px-4 py-2.5 text-right">Annulés</th>
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
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.attempts}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.contacts}</td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={pct(e.contacts, e.attempts)} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{e.rdv_booked}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-blue-700 font-medium">{e.rdv_agenda}</td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={pct(e.rdv_booked, e.contacts)} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.showed}</td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={pct(e.showed, e.rdv_booked)} bold />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700">{e.deals > 0 ? e.deals : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-400">{e.no_show}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-400">{e.disqualified}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-400">{e.cancelled}</td>
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
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.attempts}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.contacts}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.contactRate} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.rdv}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">{kpis.rdv_agenda}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.bookRate} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.showed}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.showRate} bold /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700 font-semibold">{kpis.deals}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-400">{kpis.no_show}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.disqualified}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.cancelled}</td>
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

      </>)}

      {/* ── Tab: Mes Deals ──────────────────────────────────────────── */}
      {tab === 'deals' && (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Deals settés</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{dealKpis.count}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="text-amber-600">⚡ {dealKpis.spot}</span> · <span className="text-blue-600">🔄 {dealKpis.fu}</span>
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Valeur totale</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{dollar(dealKpis.total)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Montant des deals</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Cash collecté</p>
              <p className="text-2xl font-bold text-blue-700 tabular-nums">{dollar(dealKpis.collected)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Reçu en caisse</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">À collecter</p>
              <p className={cn('text-2xl font-bold tabular-nums', dealKpis.total - dealKpis.collected > 0 ? 'text-amber-600' : 'text-gray-300')}>
                {dollar(Math.max(0, dealKpis.total - dealKpis.collected))}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Reste à encaisser</p>
            </div>
          </div>

          {/* Deals table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Mes deals settés</h3>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filteredDeals.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Wallet size={28} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Aucun deal pour cette période</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-left">Client</th>
                      <th className="px-4 py-2.5 text-right">Montant</th>
                      <th className="px-4 py-2.5 text-right">Cash collecté</th>
                      <th className="px-4 py-2.5 text-right">Reste</th>
                      <th className="px-4 py-2.5 text-center">Type</th>
                      <th className="px-4 py-2.5 text-left">Closer</th>
                      <th className="px-4 py-2.5 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredDeals.map(d => {
                      const reste = Math.max(0, d.montant_courant - d.collected)
                      return (
                        <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(d.entry_date, MOIS_COURT)}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{d.client_name ?? <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-700">{dollar(d.montant_courant)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-blue-700 font-medium">{dollar(d.collected)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {reste > 0 ? <span className="text-amber-600 font-medium">{dollar(reste)}</span> : <span className="text-green-600 text-xs">✓ Payé</span>}
                          </td>
                          <td className="px-4 py-3 text-center"><CloseTypeBadge type={d.close_type} /></td>
                          <td className="px-4 py-3 text-xs text-gray-600">{d.profiles?.[0]?.full_name ?? <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">{d.notes ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-700">
                      <td colSpan={2} className="px-4 py-3 text-gray-500 uppercase tracking-wide">Totaux</td>
                      <td className="px-4 py-3 text-right tabular-nums">{dollar(dealKpis.total)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-blue-700">{dollar(dealKpis.collected)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-600">{dollar(Math.max(0, dealKpis.total - dealKpis.collected))}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Tab: Récurrents ───────────────────────────────────────── */}
      {tab === 'recurrents' && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Deals actifs</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{recurKpis.activeCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">{recurrents.length} au total</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Mensuel total</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{dollar(recurKpis.mensuelTotal)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Deals actifs</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Reçu</p>
              <p className="text-2xl font-bold text-green-700 tabular-nums">{dollar(recurKpis.totalReceived)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{recurKpis.receivedCount} versement{recurKpis.receivedCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">En attente</p>
              <p className={cn('text-2xl font-bold tabular-nums', recurKpis.totalPending > 0 ? 'text-amber-600' : 'text-gray-300')}>
                {dollar(recurKpis.totalPending)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{recurKpis.pendingCount} versement{recurKpis.pendingCount !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Versements sur la période */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Versements sur la période</h3>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                {filteredOccs.length} versement{filteredOccs.length !== 1 ? 's' : ''}
              </span>
            </div>
            {filteredOccs.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-gray-400">Aucun versement pour cette période</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left">Date attendue</th>
                      <th className="px-4 py-2.5 text-left">Client</th>
                      <th className="px-4 py-2.5 text-right">Montant</th>
                      <th className="px-4 py-2.5 text-left">Statut</th>
                      <th className="px-4 py-2.5 text-right">Reçu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...filteredOccs].sort((a, b) => a.date_attendue.localeCompare(b.date_attendue)).map(o => (
                      <tr key={o.id} className={cn('transition-colors', o.recu ? 'bg-green-50/30' : 'hover:bg-gray-50/50')}>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(o.date_attendue, MOIS_COURT)}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{o.client_name}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{dollar(o.montant_attendu)}</td>
                        <td className="px-4 py-3">
                          {o.recu
                            ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">
                                <CheckCircle2 size={10} />Reçu
                              </span>
                            : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                                En attente
                              </span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {o.recu
                            ? <span className="text-green-700 font-medium">{dollar(o.montant_recu ?? o.montant_attendu)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-700">
                      <td colSpan={2} className="px-4 py-3 text-gray-500 uppercase tracking-wide">Totaux</td>
                      <td className="px-4 py-3 text-right tabular-nums">{dollar(filteredOccs.reduce((s, o) => s + o.montant_attendu, 0))}</td>
                      <td />
                      <td className="px-4 py-3 text-right tabular-nums text-green-700">{dollar(recurKpis.totalReceived)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Deals récurrents summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Mes deals récurrents</h3>
            </div>
            {recurrents.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">Aucun deal récurrent</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left">Client</th>
                      <th className="px-4 py-2.5 text-right">$/mois</th>
                      <th className="px-4 py-2.5 text-right">Début</th>
                      <th className="px-4 py-2.5 text-right">Progression</th>
                      <th className="px-4 py-2.5 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recurrents.map(d => {
                      const total = d.recurring_occurrences.length
                      const recu  = d.recurring_occurrences.filter(o => o.recu).length
                      return (
                        <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800">{d.client_name}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-700">{dollar(d.montant_mensuel)}</td>
                          <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">{formatDate(d.date_debut, MOIS_COURT)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: total > 0 ? `${(recu / total) * 100}%` : '0%' }} />
                              </div>
                              <span className="text-xs text-gray-500 tabular-nums">{recu}/{total}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {d.actif
                              ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">Actif</span>
                              : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 ring-1 ring-gray-200">Terminé</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  )
}
