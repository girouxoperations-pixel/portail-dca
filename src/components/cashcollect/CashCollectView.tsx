'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Trash2, DollarSign, Wallet, TrendingDown } from 'lucide-react'
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

  const [hasRecurring,   setHasRecurring]   = useState(false)
  const [entryDate,      setEntryDate]      = useState(today)
  const [montantDeal,    setMontantDeal]    = useState('0')
  const [recurringMontant, setRecurringMontant] = useState('0')

  // Premier paiement récurrent = mois suivant
  const defaultRecurringDate = useMemo(() => {
    const d = new Date(entryDate + 'T00:00:00')
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().split('T')[0]
  }, [entryDate])

  function handleToggleRecurring() {
    if (!hasRecurring) setRecurringMontant(montantDeal)
    setHasRecurring(v => !v)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('has_recurring', hasRecurring ? 'true' : 'false')
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
          <input name="client_name" placeholder="Entreprise Dupont" className={INPUT_CLS} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Montant du deal ($)</label>
            <input
              name="montant_courant" type="number" min="0" step="0.01" required
              value={montantDeal} onChange={e => setMontantDeal(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Déjà collecté ($)</label>
            <input name="collected" type="number" min="0" step="0.01" defaultValue="0" className={INPUT_CLS} />
          </div>
        </div>

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

        {/* ── Toggle récurrents ── */}
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <button
            type="button"
            onClick={handleToggleRecurring}
            className="flex items-center gap-3 w-full text-left"
          >
            <div className={cn(
              'relative w-10 h-5 rounded-full transition-colors shrink-0',
              hasRecurring ? 'bg-violet-600' : 'bg-gray-200',
            )}>
              <div className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                hasRecurring ? 'translate-x-5' : 'translate-x-0.5',
              )} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Deal avec paiements récurrents</p>
              <p className="text-xs text-gray-400">Crée automatiquement le suivi dans l&apos;onglet Récurrents</p>
            </div>
          </button>

          {hasRecurring && (
            <div className="pl-4 border-l-2 border-violet-100 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Montant mensuel récurrent ($)
                </label>
                <input
                  name="recurring_montant" type="number" min="0" step="0.01"
                  value={recurringMontant}
                  onChange={e => setRecurringMontant(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Premier paiement récurrent
                </label>
                <input
                  name="recurring_date_debut" type="date"
                  defaultValue={defaultRecurringDate}
                  key={defaultRecurringDate}
                  className={INPUT_CLS}
                />
              </div>
            </div>
          )}
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

export default function CashCollectView({
  entrees, closers, setters, isAdmin,
}: {
  entrees:  CashEntry[]
  closers:  Profil[]
  setters:  Profil[]
  isAdmin:  boolean
}) {
  const [moisSelect, setMoisSelect] = useState(currentMonthKey)
  const [modal,      setModal]      = useState<ModalState>(null)
  const [pending, startTransition]  = useTransition()

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

  const totaux = useMemo(() => ({
    montant:    filtrees.reduce((s, e) => s + (e.montant_courant ?? 0), 0),
    collected:  filtrees.reduce((s, e) => s + (e.collected       ?? 0), 0),
    aCollecter: filtrees.reduce((s, e) => s + (e.a_collecter     ?? 0), 0),
  }), [filtrees])

  const pctCollecte = totaux.montant > 0
    ? Math.round((totaux.collected / totaux.montant) * 100)
    : 0

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Montant total des deals" value={dollar(totaux.montant)}    icon={DollarSign}  color="green" sub={`${filtrees.length} deal${filtrees.length !== 1 ? 's' : ''}`} />
        <MetricCard label="Cash collecté"           value={dollar(totaux.collected)}  icon={Wallet}      color="blue"  sub={`${pctCollecte} % encaissé`} />
        <MetricCard label="Solde à collecter"       value={dollar(totaux.aCollecter)} icon={TrendingDown} color="red"   sub="Montants en attente" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Deals</h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {filtrees.length} deal{filtrees.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filtrees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">Aucun deal pour cette période</p>
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
                {filtrees.map(e => (
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
                          <Pencil size={10} />
                          Modifier
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
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide" colSpan={2}>Total du mois</td>
                  <td className="px-4 py-3 text-right tabular-nums">{dollar(totaux.montant)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">{dollar(totaux.collected)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600">{dollar(totaux.aCollecter)}</td>
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
