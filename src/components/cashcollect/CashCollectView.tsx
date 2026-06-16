'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Trash2, DollarSign, Wallet, TrendingDown, Zap, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  creerCashCollect, modifierCashEntry, supprimerCashCollect,
} from '@/app/(portal)/cashcollect/actions'
import { MOIS_FR, MOIS_COURT, PALIERS, dollar, currentMonthKey, formatDate, getPalier } from '@/lib/constants'
import MetricCard  from '@/components/ui/MetricCard'
import MonthFilter from '@/components/ui/MonthFilter'
import Modal       from '@/components/ui/Modal'
import BonusCard   from '@/components/ui/BonusCard'
import PageHeader  from '@/components/layout/PageHeader'

// ── Types ─────────────────────────────────────────────────────────────

interface CashEntry {
  id: string
  entry_date: string
  client_name: string | null
  montant_courant: number
  collected: number
  a_collecter: number
  methode: string | null
  set_by: string | null
  closed_by: string | null
  month: number | null
  year: number | null
  notes: string | null
}

interface Profil {
  id: string
  full_name: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

const METHODES = ['Interac', 'Crédit', 'Financement']

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Section bonus ──────────────────────────────────────────────────────

function SectionBonus({
  closers, setters, filtrees,
}: {
  closers:  Profil[]
  setters:  Profil[]
  filtrees: CashEntry[]
}) {
  const closerCash = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of filtrees) {
      if (e.closed_by) m.set(e.closed_by, (m.get(e.closed_by) ?? 0) + (e.collected ?? 0))
    }
    return m
  }, [filtrees])

  const setterCash = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of filtrees) {
      if (e.set_by) m.set(e.set_by, (m.get(e.set_by) ?? 0) + (e.collected ?? 0))
    }
    return m
  }, [filtrees])

  const bonusClosers = closers
    .map(p => ({ id: p.id, nom: p.full_name ?? 'Inconnu', collected: closerCash.get(p.id) ?? 0, palier: getPalier(closerCash.get(p.id) ?? 0) }))
    .sort((a, b) => b.collected - a.collected)

  const bonusSetters = setters
    .map(p => ({ id: p.id, nom: p.full_name ?? 'Inconnu', collected: setterCash.get(p.id) ?? 0, palier: getPalier(setterCash.get(p.id) ?? 0) }))
    .sort((a, b) => b.collected - a.collected)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Bonus automatiques — ce mois</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Paliers : 50 k$ → 700$/350$ · 70 k$ → 1 000$/500$ · 85 k$ → 1 200$/600$ ·
          100 k$ → 1 500$/750$ · 130 k$ → 1 800$/900$
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-50">
        <div className="px-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">Closers</p>
          {bonusClosers.length === 0
            ? <p className="text-sm text-gray-400 pb-4">Aucune donnée</p>
            : bonusClosers.map(b => (
                <BonusCard key={b.id} nom={b.nom} collected={b.collected} palier={b.palier} type="closer" />
              ))
          }
        </div>
        <div className="px-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">Setters</p>
          {bonusSetters.length === 0
            ? <p className="text-sm text-gray-400 pb-4">Aucune donnée</p>
            : bonusSetters.map(b => (
                <BonusCard key={b.id} nom={b.nom} collected={b.collected} palier={b.palier} type="setter" />
              ))
          }
        </div>
      </div>
    </div>
  )
}

// ── Modal ajout ───────────────────────────────────────────────────────

function ModalAjout({ closers, setters, onClose }: { closers: Profil[]; setters: Profil[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)

  const [versements, setVersements] = useState<1 | 2 | 3>(1)
  const [entryDate,  setEntryDate]  = useState(today)
  const [montant,    setMontant]    = useState(0)

  const versementAmount = versements > 1 && montant > 0
    ? Math.round((montant / versements) * 100) / 100
    : 0

  const versementDates = useMemo(() => {
    const base = new Date(entryDate + 'T00:00:00')
    return Array.from({ length: versements }, (_, i) => {
      const d = new Date(base)
      d.setMonth(d.getMonth() + i)
      return {
        label: i === 0 ? "Aujourd'hui" : `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`,
        date:  d.toISOString().split('T')[0],
      }
    })
  }, [entryDate, versements])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (versements > 1) {
      fd.set('collected',     String(versementAmount))
      fd.set('versements',    String(versements))
    }
    startTransition(async () => {
      await creerCashCollect(fd)
      onClose()
    })
  }

  return (
    <Modal titre="Nouveau deal" onClose={onClose} scrollable>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Date du deal</label>
            <input
              name="entry_date" type="date" required
              value={entryDate} onChange={e => setEntryDate(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Méthode de paiement</label>
            <select name="methode" className={INPUT_CLS}>
              <option value="">— Aucune —</option>
              {METHODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Nom du client</label>
          <input name="client_name" placeholder="Marie Tremblay" className={INPUT_CLS} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Montant du deal ($)</label>
            <input
              name="montant_courant" type="number" min="0" step="0.01" required
              value={montant || ''}
              onChange={e => setMontant(Number(e.target.value))}
              placeholder="4000"
              className={INPUT_CLS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Versements</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {([1, 2, 3] as const).map((n, i) => (
                <button
                  key={n} type="button"
                  onClick={() => setVersements(n)}
                  className={cn(
                    'flex-1 py-2.5 font-medium transition-colors',
                    i > 0 && 'border-l border-gray-200',
                    versements === n
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-500 hover:bg-gray-50',
                  )}
                >
                  {n === 1 ? 'Unique' : `${n}×`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Plan de versements */}
        {versements > 1 && (
          <div className="rounded-lg bg-violet-50 border border-violet-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
              Plan de paiement — {dollar(versementAmount)} × {versements}
            </p>

            {/* Versement 1 : aujourd'hui */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span className="font-medium text-violet-800">
                  Aujourd&apos;hui ({versementDates[0]?.label ?? entryDate})
                </span>
              </div>
              <span className="font-semibold tabular-nums text-violet-900">{dollar(versementAmount)}</span>
            </div>

            {/* Versements suivants — date à choisir */}
            {Array.from({ length: versements - 1 }, (_, i) => {
              const n = i + 2
              return (
                <div key={n} className="flex items-center gap-3">
                  <span className="text-violet-400 text-base shrink-0">◷</span>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="text-[11px] text-violet-600 font-medium">
                      Versement {n} — date de contact client
                    </label>
                    <input
                      name={`versement_date_${n}`}
                      type="date"
                      defaultValue={versementDates[i + 1]?.date ?? ''}
                      required
                      className="px-2 py-1.5 rounded border border-violet-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <span className="font-semibold tabular-nums text-violet-900 shrink-0 pt-4">
                    {dollar(versementAmount)}
                  </span>
                </div>
              )
            })}

            <p className="text-[11px] text-violet-500 pt-1 border-t border-violet-100">
              Ces dates apparaîtront dans l&apos;onglet Récurrents comme rappel de contact.
            </p>
          </div>
        )}

        {versements === 1 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Déjà collecté ($)</label>
            <input name="collected" type="number" min="0" step="0.01" defaultValue="0" className={INPUT_CLS} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Closer</label>
            <select name="closed_by" className={INPUT_CLS}>
              <option value="">— Aucun —</option>
              {closers.map(c => <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Setter</label>
            <select name="set_by" className={INPUT_CLS}>
              <option value="">— Aucun —</option>
              {setters.map(s => <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
          <textarea name="notes" rows={2} placeholder="Remarques..." className={`${INPUT_CLS} resize-none`} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={pending}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal modifier deal complet ────────────────────────────────────────

function ModalModifier({ entry, closers, setters, onClose }: { entry: CashEntry; closers: Profil[]; setters: Profil[]; onClose: () => void }) {
  const [collected, setCollected] = useState(entry.collected)
  const [montant,   setMontant]   = useState(entry.montant_courant)
  const [pending, startTransition] = useTransition()
  const aCollecter = Math.max(0, montant - collected)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await modifierCashEntry(entry.id, fd)
      onClose()
    })
  }

  return (
    <Modal titre="Modifier le deal" onClose={onClose} scrollable>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Date du deal</label>
            <input name="entry_date" type="date" required defaultValue={entry.entry_date?.slice(0, 10)} className={INPUT_CLS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Méthode de paiement</label>
            <select name="methode" defaultValue={entry.methode ?? ''} className={INPUT_CLS}>
              <option value="">— Aucune —</option>
              {METHODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Nom du client</label>
          <input name="client_name" defaultValue={entry.client_name ?? ''} className={INPUT_CLS} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Montant du deal ($)</label>
            <input name="montant_courant" type="number" min="0" step="0.01" required
              value={montant} onChange={e => setMontant(Number(e.target.value))} className={INPUT_CLS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Déjà collecté ($)</label>
            <input name="collected" type="number" min="0" step="0.01"
              value={collected} onChange={e => setCollected(Number(e.target.value))} className={INPUT_CLS} />
          </div>
        </div>

        <div className={cn(
          'rounded-lg px-4 py-3 flex items-center justify-between',
          aCollecter > 0 ? 'bg-red-50' : 'bg-green-50',
        )}>
          <span className="text-xs font-medium text-gray-600">Reste à collecter</span>
          <span className={cn('text-sm font-bold tabular-nums', aCollecter > 0 ? 'text-red-600' : 'text-green-600')}>
            {dollar(aCollecter)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Closer</label>
            <select name="closed_by" defaultValue={entry.closed_by ?? ''} className={INPUT_CLS}>
              <option value="">— Aucun —</option>
              {closers.map(c => <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Setter</label>
            <select name="set_by" defaultValue={entry.set_by ?? ''} className={INPUT_CLS}>
              <option value="">— Aucun —</option>
              {setters.map(s => <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
          <textarea name="notes" rows={2} defaultValue={entry.notes ?? ''} className={`${INPUT_CLS} resize-none`} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">Annuler</button>
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

type ModalState = { type: 'add' } | { type: 'edit'; entry: CashEntry } | null

function isRecurring(e: CashEntry, recurringIds: Set<string>) {
  return recurringIds.has(e.id) || (e.notes?.startsWith('Récurrent') ?? false)
}

export default function CashCollectView({
  entrees, closers, setters, isAdmin, recurringCashIds,
}: {
  entrees:          CashEntry[]
  closers:          Profil[]
  setters:          Profil[]
  isAdmin:          boolean
  recurringCashIds: string[]
}) {
  const [moisSelect, setMoisSelect] = useState(currentMonthKey)
  const [modal,      setModal]      = useState<ModalState>(null)
  const [pending, startTransition]  = useTransition()

  const recurringIds = useMemo(() => new Set(recurringCashIds), [recurringCashIds])

  const profileMap = useMemo(() => {
    const all = [...closers, ...setters]
    return new Map(all.map(p => [p.id, p.full_name ?? 'Inconnu']))
  }, [closers, setters])

  const moisOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const e of entrees) {
      if (e.month && e.year) {
        const key = `${e.year}-${String(e.month).padStart(2, '0')}`
        if (!seen.has(key)) {
          seen.add(key)
          opts.push({ value: key, label: `${MOIS_FR[e.month - 1]} ${e.year}` })
        }
      }
    }
    return opts.sort((a, b) => b.value.localeCompare(a.value))
  }, [entrees])

  const moisOptionsWithCount = useMemo(() => moisOptions.map(o => ({
    ...o,
    count: entrees.filter(e => {
      const key = `${e.year}-${String(e.month).padStart(2, '0')}`
      return key === o.value
    }).length,
  })), [moisOptions, entrees])

  const filtrees = useMemo(() => {
    if (moisSelect === 'tout') return entrees
    const [y, m] = moisSelect.split('-').map(Number)
    return entrees.filter(e => e.year === y && e.month === m)
  }, [entrees, moisSelect])

  const { deals, recurrents } = useMemo(() => {
    const deals:      CashEntry[] = []
    const recurrents: CashEntry[] = []
    for (const e of filtrees) {
      if (isRecurring(e, recurringIds)) recurrents.push(e)
      else deals.push(e)
    }
    return { deals, recurrents }
  }, [filtrees, recurringIds])

  const totauxDeals = useMemo(() => ({
    montant:    deals.reduce((s, e) => s + (e.montant_courant ?? 0), 0),
    collected:  deals.reduce((s, e) => s + (e.collected       ?? 0), 0),
    aCollecter: deals.reduce((s, e) => s + (e.a_collecter     ?? 0), 0),
  }), [deals])

  const totauxRec = useMemo(() => ({
    collected: recurrents.reduce((s, e) => s + (e.collected ?? 0), 0),
  }), [recurrents])

  const totalCollecte = totauxDeals.collected + totauxRec.collected

  function handleDelete(id: string) {
    if (!confirm('Supprimer ce deal ?')) return
    startTransition(async () => { await supprimerCashCollect(id) })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <PageHeader
        titre="Cash Collect"
        subtitle="Suivi des encaissements et bonus automatiques"
        action={
          <button
            onClick={() => setModal({ type: 'add' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Nouveau deal
          </button>
        }
      />

      <MonthFilter
        selected={moisSelect}
        onChange={setMoisSelect}
        options={moisOptionsWithCount}
        allCount={entrees.length}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Total cash collecté"
          value={dollar(totalCollecte)}
          icon={Wallet}
          color="blue"
          sub={`${deals.length} deal${deals.length !== 1 ? 's' : ''} · ${recurrents.length} récurrent${recurrents.length !== 1 ? 's' : ''}`}
        />
        <MetricCard
          label="Deals — montant"
          value={dollar(totauxDeals.montant)}
          icon={Zap}
          color="green"
          sub={totauxDeals.montant > 0 ? `${Math.round(totauxDeals.collected / totauxDeals.montant * 100)} % encaissé` : '—'}
        />
        <MetricCard
          label="Récurrents reçus"
          value={dollar(totauxRec.collected)}
          icon={RefreshCw}
          color="violet"
          sub={`${recurrents.length} paiement${recurrents.length !== 1 ? 's' : ''}`}
        />
        <MetricCard
          label="Solde à collecter"
          value={dollar(totauxDeals.aCollecter)}
          icon={TrendingDown}
          color="red"
          sub={`Total reçu : ${dollar(totalCollecte)}`}
        />
      </div>

      {/* ── Section Nouvelles deals ───────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-green-100">
            <Zap size={13} className="text-green-600" />
          </span>
          <h3 className="text-sm font-semibold text-gray-900">Nouvelles deals</h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {deals.length} deal{deals.length !== 1 ? 's' : ''}
          </span>
          {deals.length > 0 && (
            <div className="ml-auto flex items-center gap-4 text-xs">
              <span className="text-gray-400">Collecté <span className="font-semibold text-blue-600 tabular-nums">{dollar(totauxDeals.collected)}</span></span>
              {totauxDeals.aCollecter > 0 && (
                <span className="text-gray-400">Reste <span className="font-semibold text-red-600 tabular-nums">{dollar(totauxDeals.aCollecter)}</span></span>
              )}
            </div>
          )}
        </div>

        {deals.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">Aucune nouvelle deal pour cette période</p>
            <p className="text-xs text-gray-300 mt-1">Cliquez sur &ldquo;Nouveau deal&rdquo; pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                  <th className="px-4 py-2.5 text-left">Client</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Deal ($)</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Collecté ($)</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Reste ($)</th>
                  <th className="px-4 py-2.5 text-left">Méthode</th>
                  <th className="px-4 py-2.5 text-left">Setter</th>
                  <th className="px-4 py-2.5 text-left">Closer</th>
                  <th className="px-4 py-2.5 text-left">Notes</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deals.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(e.entry_date, MOIS_COURT)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[140px] truncate">
                      {e.client_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-800">
                      {dollar(e.montant_courant)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-blue-700">
                      {dollar(e.collected)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={cn('font-medium', (e.a_collecter ?? 0) > 0 ? 'text-red-600' : 'text-gray-400')}>
                        {dollar(e.a_collecter ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{e.methode ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {e.set_by    ? (profileMap.get(e.set_by)    ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {e.closed_by ? (profileMap.get(e.closed_by) ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">{e.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModal({ type: 'edit', entry: e })}
                          disabled={pending}
                          title="Modifier"
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded transition-colors disabled:opacity-40"
                        >
                          <Pencil size={10} />Modifier
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(e.id)}
                            disabled={pending}
                            title="Supprimer"
                            className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50 font-semibold text-gray-700">
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{dollar(totauxDeals.montant)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">{dollar(totauxDeals.collected)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600">
                    {totauxDeals.aCollecter > 0 ? dollar(totauxDeals.aCollecter) : '—'}
                  </td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Section Récurrents collectés ──────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-100">
            <RefreshCw size={13} className="text-blue-600" />
          </span>
          <h3 className="text-sm font-semibold text-gray-900">Récurrents collectés</h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {recurrents.length} paiement{recurrents.length !== 1 ? 's' : ''}
          </span>
          {recurrents.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">
              Total reçu <span className="font-semibold text-blue-600 tabular-nums">{dollar(totauxRec.collected)}</span>
            </span>
          )}
        </div>

        {recurrents.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">Aucun paiement récurrent reçu ce mois</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Date reçue</th>
                  <th className="px-4 py-2.5 text-left">Client</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Montant reçu</th>
                  <th className="px-4 py-2.5 text-left">Méthode</th>
                  <th className="px-4 py-2.5 text-left">Setter</th>
                  <th className="px-4 py-2.5 text-left">Closer</th>
                  <th className="px-4 py-2.5 text-left">Période</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recurrents.map(e => {
                  const periodeNote = e.notes?.replace('Récurrent — ', '') ?? null
                  return (
                    <tr key={e.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(e.entry_date, MOIS_COURT)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[150px] truncate">
                        {e.client_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-blue-700">
                        {dollar(e.collected)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.methode ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {e.set_by    ? (profileMap.get(e.set_by)    ?? '—') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {e.closed_by ? (profileMap.get(e.closed_by) ?? '—') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {periodeNote && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            <RefreshCw size={8} />{periodeNote}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModal({ type: 'edit', entry: e })}
                            disabled={pending}
                            title="Modifier"
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded transition-colors disabled:opacity-40"
                          >
                            <Pencil size={10} />Modifier
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(e.id)}
                              disabled={pending}
                              title="Supprimer"
                              className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-blue-50/30 font-semibold">
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide" colSpan={2}>Total récurrents</td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">{dollar(totauxRec.collected)}</td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <SectionBonus closers={closers} setters={setters} filtrees={filtrees} />

      {modal?.type === 'add' && (
        <ModalAjout closers={closers} setters={setters} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <ModalModifier entry={modal.entry} closers={closers} setters={setters} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
