'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, DollarSign, Wallet, TrendingDown,
  Zap, Clock, ChevronDown, ChevronRight, RefreshCw, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { creerCash, modifierCash, supprimerCash } from '@/app/(portal)/cash/actions'

// ── Types ─────────────────────────────────────────────────────────

interface CashEntry {
  id: string
  entry_date: string
  client_name: string | null
  montant_courant: number
  collected: number
  a_collecter: number
  methode: string | null
  close_type: string | null
  set_by: string | null
  closed_by: string | null
  month: number | null
  year: number | null
  notes: string | null
}

interface Profil {
  id: string
  full_name: string | null
  role: string
}

interface Props {
  entrees:          CashEntry[]
  closers:          Profil[]
  setters:          Profil[]
  allProfiles:      Profil[]
  isAdmin:          boolean
  recurringCashIds: string[]
}

type SourceType = 'deal' | 'recurrent'

// ── Constants ─────────────────────────────────────────────────────

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

const METHODES = ['Virement', 'Stripe', 'Interac', 'Chèque', 'Espèces', 'Autre']

// ── Helpers ───────────────────────────────────────────────────────

function dollar(n: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} $`
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const court = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.']
  return `${d} ${court[m - 1]} ${y}`
}

function getSourceType(e: CashEntry, recurringIds: Set<string>): SourceType {
  if (recurringIds.has(e.id)) return 'recurrent'
  if (e.notes?.startsWith('Récurrent')) return 'recurrent'
  return 'deal'
}

// ── Type badge ────────────────────────────────────────────────────

function TypeBadge({ type, closeType }: { type: SourceType; closeType?: string | null }) {
  if (type === 'recurrent') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
        <RefreshCw size={9} />Récurrent
      </span>
    )
  }
  if (closeType === 'on_the_spot') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 whitespace-nowrap">
        <Zap size={9} />On the spot
      </span>
    )
  }
  if (closeType === 'follow_up') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 whitespace-nowrap">
        <Clock size={9} />Follow up
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 whitespace-nowrap">
      <DollarSign size={9} />Nouvelle deal
    </span>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────

function KpiCard({
  title, value, subtitle, color, icon: Icon,
}: {
  title: string
  value: string
  subtitle?: string
  color: 'green' | 'blue' | 'red' | 'violet'
  icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  const c = {
    green:  { bg: 'bg-green-100',  text: 'text-green-600'  },
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-600'   },
    red:    { bg: 'bg-red-100',    text: 'text-red-600'    },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
  }[color]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className={cn('inline-flex rounded-lg p-2.5 mb-3', c.bg)}>
        <Icon size={18} className={c.text} />
      </div>
      <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 border-t border-gray-50 pt-2.5 mt-3 truncate">
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ── Champ formulaire ─────────────────────────────────────────────

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Modal formulaire ──────────────────────────────────────────────

function ModalForm({
  entry, closers, setters, onClose,
}: {
  entry: CashEntry | null
  closers: Profil[]
  setters: Profil[]
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const isEdit = entry !== null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (isEdit) await modifierCash(entry.id, fd)
      else await creerCash(fd)
      onClose()
    })
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {isEdit ? "Modifier l'entrée" : 'Nouvelle entrée cash'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Date">
              <input name="entry_date" type="date" required defaultValue={entry?.entry_date ?? today} className={INPUT_CLS} />
            </Champ>
            <Champ label="Méthode">
              <select name="methode" defaultValue={entry?.methode ?? ''} className={INPUT_CLS}>
                <option value="">— Aucune —</option>
                {METHODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Champ>
          </div>

          <Champ label="Nom du client">
            <input name="client_name" placeholder="Entreprise Dupont" defaultValue={entry?.client_name ?? ''} className={INPUT_CLS} />
          </Champ>

          <div className="grid grid-cols-2 gap-4">
            <Champ label="Closer">
              <select name="closed_by" defaultValue={entry?.closed_by ?? ''} className={INPUT_CLS}>
                <option value="">— Aucun —</option>
                {closers.map(c => <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>)}
              </select>
            </Champ>
            <Champ label="Setter">
              <select name="set_by" defaultValue={entry?.set_by ?? ''} className={INPUT_CLS}>
                <option value="">— Aucun —</option>
                {setters.map(s => <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>)}
              </select>
            </Champ>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Champ label="Montant total ($)">
              <input name="montant_courant" type="number" min="0" step="0.01" required defaultValue={entry?.montant_courant ?? 0} className={INPUT_CLS} />
            </Champ>
            <Champ label="Collecté ($)">
              <input name="collected" type="number" min="0" step="0.01" defaultValue={entry?.collected ?? 0} className={INPUT_CLS} />
            </Champ>
          </div>

          <Champ label="Type de close">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {(['on_the_spot', 'follow_up'] as const).map((v, i) => (
                <label key={v} className={cn(
                  'flex-1 text-center py-2.5 cursor-pointer font-medium transition-colors',
                  i === 0 ? 'border-r border-gray-200' : '',
                  'has-[:checked]:bg-violet-600 has-[:checked]:text-white text-gray-500 hover:bg-gray-50',
                )}>
                  <input type="radio" name="close_type" value={v} defaultChecked={entry?.close_type === v || (!entry && v === 'on_the_spot')} className="sr-only" />
                  {v === 'on_the_spot' ? 'On the spot' : 'Follow up'}
                </label>
              ))}
            </div>
          </Champ>

          <Champ label="Notes (optionnel)">
            <textarea name="notes" rows={2} placeholder="Remarques..." defaultValue={entry?.notes ?? ''} className={`${INPUT_CLS} resize-none`} />
          </Champ>

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

// ── Month section ─────────────────────────────────────────────────

function MonthSection({
  monthKey, entries, profileMap, recurringIds, isAdmin,
  onEdit, onDelete, pending, defaultOpen,
}: {
  monthKey:    string
  entries:     CashEntry[]
  profileMap:  Map<string, string>
  recurringIds: Set<string>
  isAdmin:     boolean
  onEdit:      (e: CashEntry) => void
  onDelete:    (id: string) => void
  pending:     boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const [year, month] = monthKey.split('-').map(Number)
  const label = `${MOIS_FR[month - 1]} ${year}`

  const totaux = {
    montant:    entries.reduce((s, e) => s + (e.montant_courant ?? 0), 0),
    collected:  entries.reduce((s, e) => s + (e.collected       ?? 0), 0),
    aCollecter: entries.reduce((s, e) => s + (e.a_collecter     ?? 0), 0),
  }

  const nDeals = entries.filter(e => getSourceType(e, recurringIds) === 'deal').length
  const nRec   = entries.filter(e => getSourceType(e, recurringIds) === 'recurrent').length

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Month header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50/60 transition-colors text-left"
      >
        <span className="text-gray-400 flex-shrink-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="font-semibold text-gray-900 text-sm">{label}</span>

        <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
          {nDeals > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
              <Zap size={8} />{nDeals} deal{nDeals > 1 ? 's' : ''}
            </span>
          )}
          {nRec > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              <RefreshCw size={8} />{nRec} récurrent{nRec > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-sm font-bold text-gray-800 tabular-nums">{dollar(totaux.collected)}</span>
          <span className="text-xs text-gray-400">collecté</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100">

          {/* Mini KPIs strip */}
          <div className="px-5 py-3 flex items-center gap-6 bg-gray-50/40 border-b border-gray-50 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Montant total</span>
              <span className="font-semibold text-gray-800 tabular-nums">{dollar(totaux.montant)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Collecté</span>
              <span className="font-semibold text-blue-600 tabular-nums">{dollar(totaux.collected)}</span>
            </div>
            {totaux.aCollecter > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">À collecter</span>
                <span className="font-semibold text-red-600 tabular-nums">{dollar(totaux.aCollecter)}</span>
              </div>
            )}
            <span className="text-xs text-gray-300 ml-auto">
              {entries.length} entrée{entries.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-gray-400 border-b border-gray-50">
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                  <th className="px-4 py-2.5 text-left">Client</th>
                  <th className="px-4 py-2.5 text-left">Closer</th>
                  <th className="px-4 py-2.5 text-left">Setter</th>
                  <th className="px-4 py-2.5 text-left">Type</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Montant</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Collecté</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">À collecter</th>
                  <th className="px-4 py-2.5 text-left">Méthode</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map(e => {
                  const type = getSourceType(e, recurringIds)
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formatDate(e.entry_date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[150px] truncate">
                        {e.client_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {e.closed_by ? (profileMap.get(e.closed_by) ?? '—') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {e.set_by ? (profileMap.get(e.set_by) ?? '—') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={type} closeType={e.close_type} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-800">
                        {dollar(e.montant_courant)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-blue-700">
                        {dollar(e.collected)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={cn('font-medium', (e.a_collecter ?? 0) > 0 ? 'text-red-600' : 'text-gray-300')}>
                          {dollar(e.a_collecter ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {e.methode ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEdit(e)}
                            disabled={pending}
                            title="Modifier"
                            className="p-1.5 text-gray-300 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors disabled:opacity-40"
                          >
                            <Pencil size={13} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => onDelete(e.id)}
                              disabled={pending}
                              title="Supprimer"
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
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
                <tr className="border-t border-gray-100 bg-gray-50/50 font-semibold text-gray-700 text-xs">
                  <td colSpan={5} className="px-4 py-3 text-gray-400 uppercase tracking-wide">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{dollar(totaux.montant)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">{dollar(totaux.collected)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600">
                    {totaux.aCollecter > 0 ? dollar(totaux.aCollecter) : '—'}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────

export default function CashView({
  entrees, closers, setters, allProfiles, isAdmin, recurringCashIds,
}: Props) {
  const [modalEntry, setModalEntry] = useState<CashEntry | null | 'new'>(null)
  const [pending, startTransition]  = useTransition()

  const recurringIds = useMemo(() => new Set(recurringCashIds), [recurringCashIds])

  const profileMap = useMemo(
    () => new Map(allProfiles.map(p => [p.id, p.full_name ?? 'Inconnu'])),
    [allProfiles],
  )

  // Annual KPIs
  const totauxAnnuels = useMemo(() => ({
    montant:    entrees.reduce((s, e) => s + (e.montant_courant ?? 0), 0),
    collected:  entrees.reduce((s, e) => s + (e.collected       ?? 0), 0),
    aCollecter: entrees.reduce((s, e) => s + (e.a_collecter     ?? 0), 0),
  }), [entrees])

  const nDealsTotal = useMemo(
    () => entrees.filter(e => getSourceType(e, recurringIds) === 'deal').length,
    [entrees, recurringIds],
  )
  const nRecTotal = useMemo(
    () => entrees.filter(e => getSourceType(e, recurringIds) === 'recurrent').length,
    [entrees, recurringIds],
  )

  const pctCollecte = totauxAnnuels.montant > 0
    ? Math.round((totauxAnnuels.collected / totauxAnnuels.montant) * 100)
    : 0

  // Group by month, newest first
  const grouped = useMemo(() => {
    const map = new Map<string, CashEntry[]>()
    for (const e of entrees) {
      const key = e.month && e.year
        ? `${e.year}-${String(e.month).padStart(2, '0')}`
        : 'autre'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [entrees])

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée cash ?')) return
    startTransition(async () => { await supprimerCash(id) })
  }

  const annee = new Date().getFullYear()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivi des encaissements {annee}</p>
        </div>
        <button
          onClick={() => setModalEntry('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} />
          Ajouter
        </button>
      </div>

      {/* KPI annuels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Montant total"
          value={dollar(totauxAnnuels.montant)}
          icon={DollarSign}
          color="green"
          subtitle={`${entrees.length} transactions`}
        />
        <KpiCard
          title="Cash collecté"
          value={dollar(totauxAnnuels.collected)}
          icon={Wallet}
          color="blue"
          subtitle={`${pctCollecte} % encaissé`}
        />
        <KpiCard
          title="À collecter"
          value={dollar(totauxAnnuels.aCollecter)}
          icon={TrendingDown}
          color="red"
          subtitle="Solde en attente"
        />
        <KpiCard
          title="Transactions"
          value={String(nDealsTotal + nRecTotal)}
          icon={BarChart3}
          color="violet"
          subtitle={`${nDealsTotal} deals · ${nRecTotal} récurrents`}
        />
      </div>

      {/* Sections par mois */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-12 text-center">
          <p className="text-sm text-gray-400">Aucune entrée pour {annee}</p>
          <p className="text-xs text-gray-300 mt-1">Ajoutez votre première entrée avec le bouton ci-dessus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([key, entries], idx) => (
            <MonthSection
              key={key}
              monthKey={key}
              entries={entries}
              profileMap={profileMap}
              recurringIds={recurringIds}
              isAdmin={isAdmin}
              onEdit={setModalEntry}
              onDelete={handleDelete}
              pending={pending}
              defaultOpen={idx === 0}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalEntry !== null && (
        <ModalForm
          entry={modalEntry === 'new' ? null : modalEntry}
          closers={closers}
          setters={setters}
          onClose={() => setModalEntry(null)}
        />
      )}

    </div>
  )
}
