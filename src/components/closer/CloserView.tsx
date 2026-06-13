'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Phone, TrendingUp, Target, CheckCircle2, Wallet, DollarSign, ArrowUp, ArrowDown, Minus, Zap, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ajouterEntree, modifierEntree, creerDealCloser } from '@/app/(portal)/closer/actions'
import { addProspectFollowup } from '@/app/(portal)/todo/actions'
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

interface Deal {
  id:              string
  entry_date:      string
  client_name:     string | null
  montant_courant: number
  collected:       number
  methode:         string | null
  close_type:      string | null
  notes:           string | null
}

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

function CloseTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-gray-300 text-xs">—</span>
  return type === 'on_the_spot'
    ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"><Zap size={10} />Spot</span>
    : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200"><RefreshCw size={10} />FU</span>
}

// ── Modal ajout entrée journalière ────────────────────────────────────

function ModalEntree({
  entry, userId, onClose,
}: {
  entry:   CloserEntry | null
  userId:  string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [fuPending, startFuTransition] = useTransition()
  const [fuName, setFuName] = useState('')
  const [fuDate, setFuDate] = useState('')
  const [fuAdded, setFuAdded] = useState<string[]>([])
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

  function handleAddFu(e: React.FormEvent) {
    e.preventDefault()
    if (!fuName.trim() || !fuDate) return
    const name = fuName.trim()
    const date = fuDate
    startFuTransition(async () => {
      const fd = new FormData()
      fd.set('prospect_name', name)
      fd.set('followup_date', date)
      await addProspectFollowup(fd)
      setFuAdded(prev => [...prev, name])
      setFuName('')
      setFuDate('')
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

      {/* Follow ups du jour */}
      <div className="border-t border-gray-100 px-6 pb-6 pt-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Follow ups du jour</p>
        {fuAdded.length > 0 && (
          <div className="mb-3 space-y-1">
            {fuAdded.map((n, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded-lg">
                <CheckCircle2 size={11} /> {n}
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddFu} className="flex gap-2">
          <input
            value={fuName}
            onChange={e => setFuName(e.target.value)}
            placeholder="Nom du prospect"
            className={`${INPUT_CLS} flex-1`}
          />
          <input
            type="date"
            value={fuDate}
            onChange={e => setFuDate(e.target.value)}
            className={`${INPUT_CLS} w-36`}
          />
          <button
            type="submit"
            disabled={fuPending || !fuName.trim() || !fuDate}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </form>
      </div>
    </Modal>
  )
}

// ── Modal ajout deal ──────────────────────────────────────────────────

type PlanPaiement = 'pif' | 'versements_2' | 'versements_3' | 'financement'
const PLAN_LABELS: Record<PlanPaiement, string> = {
  pif:         'PIF',
  versements_2: '2 vers.',
  versements_3: '3 vers.',
  financement: 'Fin. mensuel',
}

function ModalDeal({
  setters,
  onClose,
}: {
  setters: { id: string; full_name: string | null }[]
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError]         = useState<string | null>(null)
  const [plan, setPlan]           = useState<PlanPaiement>('pif')
  const today = new Date().toISOString().slice(0, 10)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('plan_paiement', plan)
    startTransition(async () => {
      try {
        await creerDealCloser(fd)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <Modal titre="Nouveau deal" onClose={onClose} maxWidth="max-w-md" scrollable>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Date + Client */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Date</label>
            <input name="entry_date" type="date" defaultValue={today} required className={INPUT_CLS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Client</label>
            <input name="client_name" type="text" placeholder="Nom du client" className={INPUT_CLS} />
          </div>
        </div>

        {/* Setter */}
        {setters.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Setter (optionnel)</label>
            <select name="set_by" className={INPUT_CLS}>
              <option value="">— Sans setter —</option>
              {setters.map(s => (
                <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>
              ))}
            </select>
          </div>
        )}

        {/* Montant + Cash */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Montant deal ($)</label>
            <input name="montant_courant" type="number" min="0" step="0.01" defaultValue={0} required className={INPUT_CLS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Cash collecté ($)</label>
            <input name="collected" type="number" min="0" step="0.01" defaultValue={0} required className={INPUT_CLS} />
          </div>
        </div>

        {/* Plan de paiement */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Plan de paiement</label>
          <div className="grid grid-cols-4 rounded-lg border border-gray-300 overflow-hidden text-xs">
            {(Object.keys(PLAN_LABELS) as PlanPaiement[]).map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={cn(
                  'py-2.5 font-medium transition-colors',
                  i > 0 ? 'border-l border-gray-300' : '',
                  plan === p ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50',
                )}
              >
                {PLAN_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Versements: date prochain + montant calculé */}
        {(plan === 'versements_2' || plan === 'versements_3') && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Date prochain versement</label>
            <input name="prochain_versement" type="date" required className={INPUT_CLS} />
            <p className="text-xs text-gray-400">
              {plan === 'versements_2' ? '1 versement restant sera créé automatiquement.' : '2 versements restants seront créés (2e = +30 jours).'}
            </p>
          </div>
        )}

        {/* Financement mensuel */}
        {plan === 'financement' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Date 1ère mensualité</label>
              <input name="prochain_versement" type="date" required className={INPUT_CLS} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600">Montant mensuel ($)</label>
                <input name="montant_mensuel" type="number" min="0" step="0.01" defaultValue={0} required className={INPUT_CLS} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600">Durée (mois)</label>
                <input name="nb_mois" type="number" min="1" max="60" defaultValue={12} required className={INPUT_CLS} />
              </div>
            </div>
          </>
        )}

        {/* Type de close */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Type de close</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            {(['on_the_spot', 'follow_up'] as const).map((v, i) => (
              <label key={v} className={cn(
                'flex-1 text-center py-2.5 cursor-pointer font-medium transition-colors',
                i === 0 ? 'border-r border-gray-300' : '',
                'has-[:checked]:bg-violet-600 has-[:checked]:text-white text-gray-500 hover:bg-gray-50',
              )}>
                <input type="radio" name="close_type" value={v} defaultChecked={v === 'on_the_spot'} className="sr-only" />
                {v === 'on_the_spot' ? '⚡ On the spot' : '🔄 Follow up'}
              </label>
            ))}
          </div>
        </div>

        {/* Méthode */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Méthode de paiement</label>
          <select name="methode" className={INPUT_CLS}>
            <option value="">— Non spécifiée —</option>
            <option value="stripe">Stripe</option>
            <option value="virement">Virement</option>
            <option value="cheque">Chèque</option>
            <option value="cash">Cash</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Notes (optionnel)</label>
          <input name="notes" type="text" placeholder="Remarques..." className={INPUT_CLS} />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={pending} className={cn('px-5 py-2 text-sm font-semibold rounded-lg text-white transition-colors', pending ? 'bg-violet-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700')}>
            {pending ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Composant principal ───────────────────────────────────────────────

export default function CloserView({ entrees, deals, setters, recurrents, userId, prenom }: {
  entrees:    CloserEntry[]
  deals:      Deal[]
  setters:    { id: string; full_name: string | null }[]
  recurrents: RecurringDeal[]
  userId:     string
  prenom:     string
}) {
  const { periode, offset, range, onChange: onPeriodChange, onCustomRange, customStart, customEnd } = usePeriodFilter()
  const [tab, setTab]           = useState<'activite' | 'deals' | 'recurrents'>('activite')
  const [modalEntry, setModalEntry] = useState<CloserEntry | null | 'new'>(null)
  const [modalDeal, setModalDeal]   = useState(false)

  const prevRange = useMemo(() => computePrevRange(periode, offset, range), [periode, offset, range])

  // ── Activité ──────────────────────────────────────────────────────
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

  // ── Deals ─────────────────────────────────────────────────────────
  const filteredDeals = useMemo(
    () => !range.start ? [] : deals.filter(d => d.entry_date >= range.start && d.entry_date <= range.end),
    [deals, range],
  )
  const dealKpis = useMemo(() => ({
    total:     filteredDeals.reduce((s, d) => s + d.montant_courant, 0),
    collected: filteredDeals.reduce((s, d) => s + d.collected, 0),
    count:     filteredDeals.length,
    spot:      filteredDeals.filter(d => d.close_type === 'on_the_spot').length,
    fu:        filteredDeals.filter(d => d.close_type === 'follow_up').length,
  }), [filteredDeals])

  // ── Récurrents ────────────────────────────────────────────────
  const allOccs = useMemo(
    () => recurrents.flatMap(d => d.recurring_occurrences.map(o => ({ ...o, client_name: d.client_name }))),
    [recurrents],
  )
  const filteredOccs = useMemo(
    () => !range.start ? [] : allOccs.filter(o => o.date_attendue >= range.start && o.date_attendue <= range.end),
    [allOccs, range],
  )
  const recurKpis = useMemo(() => {
    const activeDeals  = recurrents.filter(d => d.actif)
    const received     = filteredOccs.filter(o => o.recu)
    const pending      = filteredOccs.filter(o => !o.recu)
    return {
      activeCount:    activeDeals.length,
      mensuelTotal:   activeDeals.reduce((s, d) => s + d.montant_mensuel, 0),
      totalReceived:  received.reduce((s, o) => s + (o.montant_recu ?? o.montant_attendu), 0),
      totalPending:   pending.reduce((s, o) => s + o.montant_attendu, 0),
      receivedCount:  received.length,
      pendingCount:   pending.length,
    }
  }, [recurrents, filteredOccs])

  const tabCls = (t: typeof tab) => cn(
    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
    tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <PageHeader
        titre="Mon Suivi Closing"
        subtitle={`Bienvenue, ${prenom} — activité et performance`}
        action={
          <button
            onClick={() => tab === 'deals' ? setModalDeal(true) : setModalEntry('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            {tab === 'deals' ? 'Nouveau deal' : 'Saisir ma journée'}
          </button>
        }
      />

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button className={tabCls('activite')}   onClick={() => setTab('activite')}>Mon Activité</button>
        <button className={tabCls('deals')}      onClick={() => setTab('deals')}>
          Mes Deals
          {deals.length > 0 && <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{deals.length}</span>}
        </button>
        <button className={tabCls('recurrents')} onClick={() => setTab('recurrents')}>
          Récurrents
          {recurrents.length > 0 && <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{recurrents.length}</span>}
        </button>
      </div>

      <PeriodFilter
        periode={periode} offset={offset} onChange={onPeriodChange}
        customStart={customStart} customEnd={customEnd} onCustomRange={onCustomRange}
      />

      {/* ── Tab: Activité ─────────────────────────────────────────── */}
      {tab === 'activite' && (
        <>
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
                <p className="text-xs text-gray-300 mt-1">Clique sur &ldquo;Saisir ma journée&rdquo; pour enregistrer tes stats du jour.</p>
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
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(e.entry_date, MOIS_COURT)}</td>
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
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setModalEntry(e)} title="Modifier" className="p-1.5 text-gray-200 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors">
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
        </>
      )}

      {/* ── Tab: Deals ────────────────────────────────────────────── */}
      {tab === 'deals' && (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Deals signés</p>
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
              <h3 className="text-sm font-semibold text-gray-900">Mes deals</h3>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}</span>
            </div>

            {filteredDeals.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-gray-400">Aucun deal pour cette période</p>
                <button onClick={() => setModalDeal(true)} className="mt-3 text-xs text-violet-600 hover:underline">
                  + Ajouter un deal
                </button>
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
                      <th className="px-4 py-2.5 text-left">Méthode</th>
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
                          <td className="px-4 py-3 text-xs text-gray-500 capitalize">{d.methode ?? <span className="text-gray-300">—</span>}</td>
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

          {/* Occurrences table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Versements sur la période</h3>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{filteredOccs.length} versement{filteredOccs.length !== 1 ? 's' : ''}</span>
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
                      <th className="px-4 py-2.5 text-center">Statut</th>
                      <th className="px-4 py-2.5 text-right">Reçu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...filteredOccs].sort((a, b) => a.date_attendue.localeCompare(b.date_attendue)).map(o => (
                      <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(o.date_attendue, MOIS_COURT)}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{o.client_name}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{dollar(o.montant_attendu)}</td>
                        <td className="px-4 py-3 text-center">
                          {o.recu
                            ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200"><CheckCircle2 size={10} />Reçu</span>
                            : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"><Minus size={10} />En attente</span>
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

          {/* Deals summary */}
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
                      const total   = d.recurring_occurrences.length
                      const recu    = d.recurring_occurrences.filter(o => o.recu).length
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

      {modalEntry !== null && (
        <ModalEntree
          entry={modalEntry === 'new' ? null : modalEntry}
          userId={userId}
          onClose={() => setModalEntry(null)}
        />
      )}
      {modalDeal && <ModalDeal setters={setters} onClose={() => setModalDeal(false)} />}
    </div>
  )
}
