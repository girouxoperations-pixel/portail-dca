'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Trash2, DollarSign, Wallet, TrendingDown, Trophy, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  creerCashCollect, modifierCollecte, supprimerCashCollect,
} from '@/app/(portal)/cashcollect/actions'

// ── Types ─────────────────────────────────────────────────────────

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

interface Props {
  entrees: CashEntry[]
  closers: Profil[]
  setters: Profil[]
  isAdmin: boolean
}

// ── Constants ─────────────────────────────────────────────────────

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

const MOIS_COURT = [
  'Jan.','Fév.','Mar.','Avr.','Mai','Juin',
  'Juil.','Août','Sep.','Oct.','Nov.','Déc.',
]

const METHODES = ['Interac', 'Crédit', 'Financement']

const PALIERS = [
  { seuil: 130_000, closer: 1_800, setter:   900 },
  { seuil: 100_000, closer: 1_500, setter:   750 },
  { seuil:  85_000, closer: 1_200, setter:   600 },
  { seuil:  70_000, closer: 1_000, setter:   500 },
  { seuil:  50_000, closer:   700, setter:   350 },
]

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Helpers ───────────────────────────────────────────────────────

function dollar(n: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} $`
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MOIS_COURT[m - 1]} ${y}`
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getPalier(collected: number) {
  return PALIERS.find(p => collected >= p.seuil) ?? null
}

// ── KPI Card ──────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: 'green' | 'blue' | 'red'
}) {
  const c = {
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    blue:  { bg: 'bg-blue-100',  text: 'text-blue-600'  },
    red:   { bg: 'bg-red-100',   text: 'text-red-600'   },
  }[color]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className={cn('inline-flex rounded-lg p-2.5 mb-3', c.bg)}>
        <Icon size={18} className={c.text} />
      </div>
      <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {sub && (
        <p className="text-xs text-gray-400 border-t border-gray-50 pt-2.5 mt-3 truncate">{sub}</p>
      )}
    </div>
  )
}

// ── Barre de progression bonus ─────────────────────────────────────

function BarreBonus({ collected }: { collected: number }) {
  const idx = PALIERS.findIndex(p => collected >= p.seuil)
  let progress: number

  if (idx === -1) {
    progress = Math.min(98, (collected / PALIERS[PALIERS.length - 1].seuil) * 100)
  } else if (idx === 0) {
    progress = 100
  } else {
    const cur  = PALIERS[idx]
    const next = PALIERS[idx - 1]
    progress = Math.min(98, ((collected - cur.seuil) / (next.seuil - cur.seuil)) * 100)
  }

  return (
    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1">
      <div
        className={cn('h-full rounded-full', idx !== -1 ? 'bg-violet-500' : 'bg-gray-300')}
        style={{ width: `${Math.max(2, progress)}%` }}
      />
    </div>
  )
}

// ── Section bonus ──────────────────────────────────────────────────

function SectionBonus({
  closers, setters, filtrees,
}: {
  closers: Profil[]
  setters: Profil[]
  filtrees: CashEntry[]
}) {
  const closerCash = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of filtrees) {
      if (e.closed_by)
        m.set(e.closed_by, (m.get(e.closed_by) ?? 0) + (e.collected ?? 0))
    }
    return m
  }, [filtrees])

  const setterCash = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of filtrees) {
      if (e.set_by)
        m.set(e.set_by, (m.get(e.set_by) ?? 0) + (e.collected ?? 0))
    }
    return m
  }, [filtrees])

  const bonusClosers = closers
    .map(p => ({
      uid: p.id, nom: p.full_name ?? 'Inconnu',
      collected: closerCash.get(p.id) ?? 0,
      palier: getPalier(closerCash.get(p.id) ?? 0),
    }))
    .sort((a, b) => b.collected - a.collected)

  const bonusSetters = setters
    .map(p => ({
      uid: p.id, nom: p.full_name ?? 'Inconnu',
      collected: setterCash.get(p.id) ?? 0,
      palier: getPalier(setterCash.get(p.id) ?? 0),
    }))
    .sort((a, b) => b.collected - a.collected)

  function LigneBonus({
    item, type,
  }: {
    item: { nom: string; collected: number; palier: typeof PALIERS[number] | null }
    type: 'closer' | 'setter'
  }) {
    const bonus = item.palier
      ? (type === 'closer' ? item.palier.closer : item.palier.setter)
      : null

    return (
      <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
        {bonus !== null
          ? <Trophy size={13} className="text-amber-400 shrink-0" />
          : <Award  size={13} className="text-gray-200 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">{item.nom}</span>
            {bonus !== null && (
              <span className="text-xs font-semibold text-amber-600 shrink-0">
                +{dollar(bonus)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-gray-400">{dollar(item.collected)} collecté</span>
            {item.palier && (
              <span className="text-[11px] text-violet-600">
                Palier {dollar(item.palier.seuil)}
              </span>
            )}
          </div>
          <BarreBonus collected={item.collected} />
        </div>
      </div>
    )
  }

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
            : bonusClosers.map((b, i) => <LigneBonus key={i} item={b} type="closer" />)
          }
        </div>
        <div className="px-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">Setters</p>
          {bonusSetters.length === 0
            ? <p className="text-sm text-gray-400 pb-4">Aucune donnée</p>
            : bonusSetters.map((b, i) => <LigneBonus key={i} item={b} type="setter" />)
          }
        </div>
      </div>
    </div>
  )
}

// ── Modal ajout ───────────────────────────────────────────────────

function ModalAjout({
  closers, setters, onClose,
}: {
  closers: Profil[]
  setters: Profil[]
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await creerCashCollect(fd)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Nouveau deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Date + Méthode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Date du deal</label>
              <input name="entry_date" type="date" required defaultValue={today} className={INPUT_CLS} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Méthode de paiement</label>
              <select name="methode" className={INPUT_CLS}>
                <option value="">— Aucune —</option>
                {METHODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Client */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Nom du client</label>
            <input name="client_name" placeholder="Entreprise Dupont" className={INPUT_CLS} />
          </div>

          {/* Montants */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Montant du deal ($)</label>
              <input name="montant_courant" type="number" min="0" step="0.01" required defaultValue="0" className={INPUT_CLS} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Déjà collecté ($)</label>
              <input name="collected" type="number" min="0" step="0.01" defaultValue="0" className={INPUT_CLS} />
            </div>
          </div>

          {/* Closer + Setter */}
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

          {/* Notes */}
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
      </div>
    </div>
  )
}

// ── Modal modifier collecté ────────────────────────────────────────

function ModalModifierCollecte({
  entry, onClose,
}: {
  entry: CashEntry
  onClose: () => void
}) {
  const [newCollected, setNewCollected] = useState(entry.collected)
  const [pending, startTransition]      = useTransition()
  const newACollecter = Math.max(0, entry.montant_courant - newCollected)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      await modifierCollecte(entry.id, newCollected)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Modifier le collecté</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Contexte read-only */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1">
            <p className="text-sm font-medium text-gray-800">
              {entry.client_name ?? 'Client inconnu'}
            </p>
            <p className="text-xs text-gray-500">
              Deal total : <span className="font-semibold text-gray-700">{dollar(entry.montant_courant)}</span>
            </p>
          </div>

          {/* Nouveau collecté */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Montant collecté ($)</label>
            <input
              type="number" min="0" max={entry.montant_courant} step="0.01"
              value={newCollected}
              onChange={e => setNewCollected(Number(e.target.value))}
              className={INPUT_CLS}
            />
          </div>

          {/* Aperçu à collecter */}
          <div className={cn(
            'rounded-lg px-4 py-3 flex items-center justify-between',
            newACollecter > 0 ? 'bg-red-50' : 'bg-green-50',
          )}>
            <span className="text-xs font-medium text-gray-600">Reste à collecter</span>
            <span className={cn(
              'text-sm font-bold tabular-nums',
              newACollecter > 0 ? 'text-red-600' : 'text-green-600',
            )}>
              {dollar(newACollecter)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={pending}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {pending ? 'Mise à jour…' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────

type ModalState =
  | { type: 'add' }
  | { type: 'edit-collecte'; entry: CashEntry }
  | null

export default function CashCollectView({
  entrees, closers, setters, isAdmin,
}: Props) {
  const [moisSelect,  setMoisSelect]  = useState(currentMonthKey)
  const [modal,       setModal]       = useState<ModalState>(null)
  const [pending, startTransition]    = useTransition()

  const profileMap = useMemo(() => {
    const all = [...closers, ...setters]
    return new Map(all.map(p => [p.id, p.full_name ?? 'Inconnu']))
  }, [closers, setters])

  // Mois disponibles dans les données
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

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Collect</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivi des encaissements et bonus automatiques</p>
        </div>
        <button
          onClick={() => setModal({ type: 'add' })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} />
          Nouveau deal
        </button>
      </div>

      {/* Filtre mois — pilules */}
      {moisOptions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMoisSelect('tout')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              moisSelect === 'tout'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            Tout ({entrees.length})
          </button>
          {moisOptions.map(o => {
            const n = entrees.filter(e => {
              const key = `${e.year}-${String(e.month).padStart(2, '0')}`
              return key === o.value
            }).length
            return (
              <button
                key={o.value}
                onClick={() => setMoisSelect(o.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  moisSelect === o.value
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {o.label} ({n})
              </button>
            )
          })}
        </div>
      )}

      {/* 3 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Montant total des deals"
          value={dollar(totaux.montant)}
          icon={DollarSign}
          color="green"
          sub={`${filtrees.length} deal${filtrees.length !== 1 ? 's' : ''}`}
        />
        <KpiCard
          label="Cash collecté"
          value={dollar(totaux.collected)}
          icon={Wallet}
          color="blue"
          sub={`${pctCollecte} % encaissé`}
        />
        <KpiCard
          label="Solde à collecter"
          value={dollar(totaux.aCollecter)}
          icon={TrendingDown}
          color="red"
          sub="Montants en attente"
        />
      </div>

      {/* Tableau */}
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
            <p className="text-xs text-gray-300 mt-1">
              Cliquez sur &ldquo;Nouveau deal&rdquo; pour commencer.
            </p>
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
                      {formatDate(e.entry_date)}
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
                      <span className={cn(
                        'font-medium',
                        (e.a_collecter ?? 0) > 0 ? 'text-red-600' : 'text-gray-400',
                      )}>
                        {dollar(e.a_collecter ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {e.methode ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {e.set_by    ? (profileMap.get(e.set_by)    ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {e.closed_by ? (profileMap.get(e.closed_by) ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">
                      {e.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Modifier collecté */}
                        <button
                          onClick={() => setModal({ type: 'edit-collecte', entry: e })}
                          disabled={pending}
                          title="Modifier le collecté"
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded transition-colors disabled:opacity-40"
                        >
                          <Pencil size={10} />
                          Collecté
                        </button>
                        {/* Supprimer — admin seulement */}
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

              {/* Pied de tableau — totaux */}
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50 font-semibold text-gray-700">
                  <td
                    className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide"
                    colSpan={2}
                  >
                    Total du mois
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {dollar(totaux.montant)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">
                    {dollar(totaux.collected)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600">
                    {dollar(totaux.aCollecter)}
                  </td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Section bonus */}
      <SectionBonus closers={closers} setters={setters} filtrees={filtrees} />

      {/* Modals */}
      {modal?.type === 'add' && (
        <ModalAjout
          closers={closers}
          setters={setters}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit-collecte' && (
        <ModalModifierCollecte
          entry={modal.entry}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
