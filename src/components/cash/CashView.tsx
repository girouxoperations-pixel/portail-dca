'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, DollarSign, Wallet, TrendingDown,
  Zap, Clock, ChevronDown, ChevronRight, RefreshCw, BarChart3,
  Monitor, Film, Globe, Upload,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { creerCash, modifierCash, supprimerCash } from '@/app/(portal)/cash/actions'
import WeeklyPerfSection, { type WeeklyPerf } from '@/components/cash/WeeklyPerfSection'
import ImportModal from '@/components/cash/ImportModal'

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
  source_type: 'webi' | 'vsl' | null
  onboarding_date: string | null
}

interface Profil {
  id: string
  full_name: string | null
  role: string
}

interface CsmStat {
  id: string
  status: string | null
  payment_type: string | null
}

interface Props {
  entrees:          CashEntry[]
  closers:          Profil[]
  setters:          Profil[]
  allProfiles:      Profil[]
  isAdmin:          boolean
  recurringCashIds: string[]
  perfs:            WeeklyPerf[]
  csmClients:       CsmStat[]
}

type SourceType = 'deal' | 'recurrent'

// ── Constants ─────────────────────────────────────────────────────

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

const MOIS_COURT = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc']

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
  if (e.close_type === 'recurring') return 'recurrent'
  if (e.notes?.startsWith('Récurrent')) return 'recurrent'
  return 'deal'
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function addMonths(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

// ── Source badge ──────────────────────────────────────────────────

function SourceBadge({ source }: { source: 'webi' | 'vsl' | null }) {
  if (!source) return null
  return source === 'webi'
    ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 whitespace-nowrap"><Monitor size={8} />Webi</span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 whitespace-nowrap"><Film size={8} />VSL</span>
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
  color: 'green' | 'blue' | 'red' | 'violet' | 'orange' | 'sky'
  icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  const c = {
    green:  { bg: 'bg-green-100',  text: 'text-green-600'  },
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-600'   },
    red:    { bg: 'bg-red-100',    text: 'text-red-600'    },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
    sky:    { bg: 'bg-sky-100',    text: 'text-sky-600'    },
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
  const [sourceType, setSourceType] = useState<'webi' | 'vsl' | ''>(entry?.source_type ?? '')
  const isEdit = entry !== null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (sourceType) fd.set('source_type', sourceType)
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

          <div className="grid grid-cols-2 gap-4">
            <Champ label="Nom du client">
              <input name="client_name" placeholder="Entreprise Dupont" defaultValue={entry?.client_name ?? ''} className={INPUT_CLS} />
            </Champ>
            <Champ label="Date d'onboarding">
              <input name="onboarding_date" type="date" defaultValue={entry?.onboarding_date ?? ''} className={INPUT_CLS} />
            </Champ>
          </div>

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

          {/* Source du deal */}
          <Champ label="Source">
            <div className="grid grid-cols-3 rounded-lg border border-gray-200 overflow-hidden text-sm">
              {([['', 'Non précisé'], ['webi', 'Webi'], ['vsl', 'VSL']] as const).map(([val, label], i) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSourceType(val as typeof sourceType)}
                  className={cn(
                    'py-2.5 font-medium transition-colors text-sm',
                    i > 0 ? 'border-l border-gray-200' : '',
                    sourceType === val
                      ? val === 'webi' ? 'bg-orange-500 text-white'
                        : val === 'vsl' ? 'bg-sky-500 text-white'
                        : 'bg-gray-600 text-white'
                      : 'text-gray-500 hover:bg-gray-50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </Champ>

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
                  <th className="px-4 py-2.5 text-left">Source</th>
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
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[130px] truncate">
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
                      <td className="px-4 py-3">
                        <SourceBadge source={e.source_type} />
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
                  <td colSpan={6} className="px-4 py-3 text-gray-400 uppercase tracking-wide">Total</td>
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

// ── Stats block (Global / Webi / VSL) ─────────────────────────────

function StatsBlock({
  title, color, icon: Icon, stats,
}: {
  title: string
  color: 'violet' | 'orange' | 'sky'
  icon: React.ComponentType<{ size?: number; className?: string }>
  stats: {
    count: number; revenue: number; collected: number
    aCollecter: number; spot: number; fu: number
  }
}) {
  const tauxCollecte = pct(stats.collected, stats.revenue)

  const borderCls = {
    violet: 'border-t-violet-500',
    orange: 'border-t-orange-500',
    sky:    'border-t-sky-500',
  }[color]

  const iconCls = {
    violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
    sky:    { bg: 'bg-sky-100',    text: 'text-sky-600'    },
  }[color]

  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden border-t-2', borderCls)}>
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', iconCls.bg)}>
          <Icon size={16} className={iconCls.text} />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400">Deals signés</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{stats.count}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="text-amber-600">⚡ {stats.spot}</span> · <span className="text-blue-600">🔄 {stats.fu}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Revenue total</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{dollar(stats.revenue)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-400">Cash collecté</p>
            <p className="text-lg font-bold text-blue-700 tabular-nums">{dollar(stats.collected)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">À collecter</p>
            <p className={cn('text-lg font-bold tabular-nums', stats.aCollecter > 0 ? 'text-red-600' : 'text-gray-300')}>
              {dollar(stats.aCollecter)}
            </p>
          </div>
        </div>
        {stats.revenue > 0 && (
          <div className="pt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Taux de collecte</span>
              <span className="font-semibold text-gray-700">{tauxCollecte} %</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', color === 'orange' ? 'bg-orange-500' : color === 'sky' ? 'bg-sky-500' : 'bg-violet-600')}
                style={{ width: `${Math.min(tauxCollecte, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────

export default function CashView({
  entrees, closers, setters, allProfiles, isAdmin, recurringCashIds, perfs, csmClients,
}: Props) {
  const today     = new Date().toISOString().slice(0, 10)
  const yearNow   = new Date().getFullYear()
  const monthNow  = new Date().getMonth()

  const [tab, setTab]               = useState<'entrees' | 'stats' | 'hebdo' | 'pjour'>('entrees')
  const [filterStart, setFilterStart] = useState(`${yearNow}-01-01`)
  const [filterEnd, setFilterEnd]     = useState(today)
  const [modalEntry, setModalEntry]   = useState<CashEntry | null | 'new'>(null)
  const [showImport, setShowImport]   = useState(false)
  const [pending, startTransition]    = useTransition()

  const recurringIds = useMemo(() => new Set(recurringCashIds), [recurringCashIds])

  const profileMap = useMemo(
    () => new Map(allProfiles.map(p => [p.id, p.full_name ?? 'Inconnu'])),
    [allProfiles],
  )

  // ── Period filter presets ─────────────────────────────────────
  const firstOfMonth = `${yearNow}-${String(monthNow + 1).padStart(2, '0')}-01`
  const PRESETS = [
    { label: 'Ce mois',     start: firstOfMonth,                    end: today },
    { label: '3 mois',      start: addMonths(today, -3).slice(0,7) + '-01', end: today },
    { label: 'Cette année', start: `${yearNow}-01-01`,              end: today },
    { label: 'An dernier',  start: `${yearNow - 1}-01-01`,          end: `${yearNow - 1}-12-31` },
    { label: 'Tout',        start: '2020-01-01',                    end: today },
  ]

  // ── Filtered entries ──────────────────────────────────────────
  const filtrees = useMemo(
    () => entrees.filter(e => e.entry_date >= filterStart && e.entry_date <= filterEnd),
    [entrees, filterStart, filterEnd],
  )

  // ── KPIs on filtered data ─────────────────────────────────────
  const totaux = useMemo(() => ({
    montant:    filtrees.reduce((s, e) => s + (e.montant_courant ?? 0), 0),
    collected:  filtrees.reduce((s, e) => s + (e.collected       ?? 0), 0),
    aCollecter: filtrees.reduce((s, e) => s + (e.a_collecter     ?? 0), 0),
  }), [filtrees])

  const nDealsTotal = useMemo(
    () => filtrees.filter(e => getSourceType(e, recurringIds) === 'deal').length,
    [filtrees, recurringIds],
  )
  const nRecTotal = useMemo(
    () => filtrees.filter(e => getSourceType(e, recurringIds) === 'recurrent').length,
    [filtrees, recurringIds],
  )

  const pctCollecte = totaux.montant > 0
    ? Math.round((totaux.collected / totaux.montant) * 100)
    : 0

  // ── Grouped by month for entrees tab ─────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, CashEntry[]>()
    for (const e of filtrees) {
      const key = e.month && e.year
        ? `${e.year}-${String(e.month).padStart(2, '0')}`
        : 'autre'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtrees])

  // ── Stats by source ───────────────────────────────────────────
  const statsBySource = useMemo(() => {
    function compute(rows: CashEntry[]) {
      const deals = rows.filter(e => getSourceType(e, recurringIds) === 'deal')
      return {
        count:      deals.length,
        revenue:    deals.reduce((s, e) => s + (e.montant_courant ?? 0), 0),
        collected:  deals.reduce((s, e) => s + (e.collected       ?? 0), 0),
        aCollecter: deals.reduce((s, e) => s + (e.a_collecter     ?? 0), 0),
        spot:       deals.filter(e => e.close_type === 'on_the_spot').length,
        fu:         deals.filter(e => e.close_type === 'follow_up').length,
      }
    }
    return {
      global: compute(filtrees),
      webi:   compute(filtrees.filter(e => e.source_type === 'webi')),
      vsl:    compute(filtrees.filter(e => e.source_type === 'vsl')),
    }
  }, [filtrees, recurringIds])

  // ── Monthly trend for stats tab chart ────────────────────────
  const trendData = useMemo(() => {
    const map = new Map<string, { webi: number; vsl: number; autre: number }>()
    for (const e of filtrees) {
      if (getSourceType(e, recurringIds) !== 'deal') continue
      const [y, m] = e.entry_date.split('-').map(Number)
      const key = `${y}-${String(m).padStart(2, '0')}`
      const cur = map.get(key) ?? { webi: 0, vsl: 0, autre: 0 }
      if (e.source_type === 'webi')      cur.webi  += e.collected ?? 0
      else if (e.source_type === 'vsl')  cur.vsl   += e.collected ?? 0
      else                               cur.autre += e.collected ?? 0
      map.set(key, cur)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const mIdx = parseInt(key.split('-')[1]) - 1
        const yr   = key.split('-')[0]
        return { mois: `${MOIS_COURT[mIdx]} ${yr.slice(2)}`, ...v }
      })
  }, [filtrees, recurringIds])

  // ── CSM business stats (all time, not period-filtered) ────────
  const csmTotal = csmClients.length
  const csmPct   = (n: number) => csmTotal > 0 ? Math.round(n / csmTotal * 100) : 0
  // Normalize: lowercase + spaces→hyphens so "3 VERS", "3-VERS", "3-vers" all match
  const normPay  = (pt: string | null) => pt?.trim().toLowerCase().replace(/\s+/g, '-') ?? ''
  const csmRefund      = csmClients.filter(c => c.status === 'refund').length
  const csmPif         = csmClients.filter(c => normPay(c.payment_type) === 'pif').length
  const csm2v          = csmClients.filter(c => normPay(c.payment_type) === '2-vers').length
  const csm3v          = csmClients.filter(c => normPay(c.payment_type) === '3-vers').length
  const csmFinancement = csmClients.filter(c => normPay(c.payment_type).startsWith('fin')).length

  // ── Closer breakdown for stats tab ────────────────────────────
  const closerStats = useMemo(() => {
    const map = new Map<string, { name: string; webi: number; vsl: number; autre: number; total: number }>()
    for (const e of filtrees) {
      if (getSourceType(e, recurringIds) !== 'deal') continue
      if (!e.closed_by) continue
      const name = profileMap.get(e.closed_by) ?? 'Inconnu'
      const cur = map.get(e.closed_by) ?? { name, webi: 0, vsl: 0, autre: 0, total: 0 }
      const v = e.collected ?? 0
      if (e.source_type === 'webi')     cur.webi  += v
      else if (e.source_type === 'vsl') cur.vsl   += v
      else                              cur.autre += v
      cur.total += v
      map.set(e.closed_by, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filtrees, recurringIds, profileMap])

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée cash ?')) return
    startTransition(async () => { await supprimerCash(id) })
  }

  // ── Deals par jour de semaine × mois ─────────────────────────
  const DAY_ROWS = [
    { label: 'Lundi',     days: [1] },
    { label: 'Mardi',     days: [2] },
    { label: 'Mercredi',  days: [3] },
    { label: 'Jeudi',     days: [4] },
    { label: 'Vendredi',  days: [5] },
    { label: 'Weekend',   days: [0, 6] },
  ]

  const dealsParJour = useMemo(() => {
    const deals = filtrees.filter(e => !recurringIds.has(e.id))
    const monthSet = new Set<string>()
    deals.forEach(e => monthSet.add(e.entry_date.slice(0, 7)))
    const months = Array.from(monthSet).sort()
    // counts[month][dow] = nb deals
    const counts: Record<string, Record<number, number>> = {}
    months.forEach(m => { counts[m] = {} })
    deals.forEach(e => {
      const m   = e.entry_date.slice(0, 7)
      const dow = new Date(e.entry_date + 'T12:00').getDay()
      counts[m][dow] = (counts[m][dow] ?? 0) + 1
    })
    return { months, counts }
  }, [filtrees, recurringIds])

  const tabCls = (t: typeof tab) => cn(
    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
    tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash / Stats</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivi des encaissements et statistiques business</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Upload size={14} />
            Importer CSV
          </button>
          <button
            onClick={() => setModalEntry('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button className={tabCls('entrees')} onClick={() => setTab('entrees')}>Entrées</button>
        <button className={tabCls('stats')}   onClick={() => setTab('stats')}>Stats</button>
        <button className={tabCls('pjour')}   onClick={() => setTab('pjour')}>Par jour</button>
        <button className={tabCls('hebdo')}   onClick={() => setTab('hebdo')}>Perf hebdo</button>
      </div>

      {/* Period filter + KPIs — entrées + stats + pjour tabs only */}
      {tab !== 'hebdo' && <><div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map(p => {
          const active = filterStart === p.start && filterEnd === p.end
          return (
            <button
              key={p.label}
              onClick={() => { setFilterStart(p.start); setFilterEnd(p.end) }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                active ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {p.label}
            </button>
          )
        })}
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date" value={filterStart}
            onChange={e => setFilterStart(e.target.value)}
            className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <span className="text-gray-400 text-xs">→</span>
          <input
            type="date" value={filterEnd}
            onChange={e => setFilterEnd(e.target.value)}
            className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        {filtrees.length !== entrees.length && (
          <span className="text-xs text-gray-400 ml-1">{filtrees.length} / {entrees.length} entrées</span>
        )}
      </div>

      {/* KPI annuels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Cash collecté"
          value={dollar(totaux.collected)}
          icon={Wallet}
          color="blue"
          subtitle={`${filtrees.length} transactions`}
        />
        <KpiCard
          title="Revenue total"
          value={dollar(totaux.montant)}
          icon={DollarSign}
          color="green"
          subtitle={`${pctCollecte} % encaissé`}
        />
        <KpiCard
          title="À collecter"
          value={dollar(totaux.aCollecter)}
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
      </div></>}

      {/* ── Tab Entrées ─────────────────────────────────────────── */}
      {tab === 'entrees' && (
        grouped.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-12 text-center">
            <p className="text-sm text-gray-400">Aucune entrée sur cette période</p>
            <p className="text-xs text-gray-300 mt-1">Ajustez la période ou ajoutez une entrée.</p>
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
        )
      )}

      {/* ── Tab Stats ───────────────────────────────────────────── */}
      {tab === 'stats' && (
        <div className="space-y-6">

          {/* Source breakdown cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatsBlock title="Global"  color="violet" icon={Globe}   stats={statsBySource.global} />
            <StatsBlock title="Webi"    color="orange" icon={Monitor} stats={statsBySource.webi}   />
            <StatsBlock title="VSL"     color="sky"    icon={Film}    stats={statsBySource.vsl}    />
          </div>

          {/* Monthly trend chart */}
          {trendData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Tendance — Cash collecté par source</h3>
                <p className="text-xs text-gray-400 mt-0.5">Deals uniquement (hors récurrents)</p>
              </div>
              <div className="px-4 py-5">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trendData} barGap={2} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => typeof v === 'number' ? dollar(v) : String(v ?? '')}
                      contentStyle={{ borderRadius: 8, border: '1px solid #f3f4f6', fontSize: 12 }}
                      cursor={{ fill: '#f9fafb' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={v => <span className="text-gray-500">{v}</span>} />
                    <Bar dataKey="webi"  name="Webi"  stackId="a" fill="#f97316" radius={[0,0,0,0]} maxBarSize={48} />
                    <Bar dataKey="vsl"   name="VSL"   stackId="a" fill="#0ea5e9" radius={[0,0,0,0]} maxBarSize={48} />
                    <Bar dataKey="autre" name="Autre" stackId="a" fill="#d1d5db" radius={[4,4,0,0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* CSM business stats */}
          {csmTotal > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Statistiques entreprise</h3>
                <p className="text-xs text-gray-400 mt-0.5">{csmTotal} clientes au total (toutes périodes)</p>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className={cn('rounded-lg p-3 text-center', csmRefund > 0 ? 'bg-red-50' : 'bg-gray-50')}>
                  <p className={cn('text-2xl font-bold tabular-nums', csmRefund > 0 ? 'text-red-600' : 'text-gray-300')}>
                    {csmPct(csmRefund)}%
                  </p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Remboursements</p>
                  <p className="text-[10px] text-gray-400">{csmRefund} deal{csmRefund !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold tabular-nums text-violet-700">{csmPct(csmPif)}%</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">PIF</p>
                  <p className="text-[10px] text-gray-400">{csmPif} cliente{csmPif !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold tabular-nums text-blue-700">{csmPct(csm2v)}%</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">2 Versements</p>
                  <p className="text-[10px] text-gray-400">{csm2v} cliente{csm2v !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold tabular-nums text-indigo-700">{csmPct(csm3v)}%</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">3 Versements</p>
                  <p className="text-[10px] text-gray-400">{csm3v} cliente{csm3v !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold tabular-nums text-emerald-700">{csmPct(csmFinancement)}%</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Financement</p>
                  <p className="text-[10px] text-gray-400">{csmFinancement} cliente{csmFinancement !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          )}

          {/* Closer breakdown */}
          {closerStats.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Par closer — Cash collecté</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-gray-400 border-b border-gray-50">
                      <th className="px-5 py-2.5 text-left">Closer</th>
                      <th className="px-5 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1"><Monitor size={10} className="text-orange-500" />Webi</span>
                      </th>
                      <th className="px-5 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1"><Film size={10} className="text-sky-500" />VSL</span>
                      </th>
                      <th className="px-5 py-2.5 text-right">Autre</th>
                      <th className="px-5 py-2.5 text-right font-semibold text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {closerStats.map(c => (
                      <tr key={c.name} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-orange-600">{c.webi > 0 ? dollar(c.webi) : <span className="text-gray-200">—</span>}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-sky-600">{c.vsl > 0 ? dollar(c.vsl) : <span className="text-gray-200">—</span>}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-gray-500">{c.autre > 0 ? dollar(c.autre) : <span className="text-gray-200">—</span>}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">{dollar(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-700">
                      <td className="px-5 py-3 text-gray-400 uppercase tracking-wide">Total</td>
                      <td className="px-5 py-3 text-right tabular-nums text-orange-600">{dollar(statsBySource.webi.collected)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-sky-600">{dollar(statsBySource.vsl.collected)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-500">
                        {dollar(statsBySource.global.collected - statsBySource.webi.collected - statsBySource.vsl.collected)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-900">{dollar(statsBySource.global.collected)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Tab Par jour ────────────────────────────────────────── */}
      {tab === 'pjour' && (() => {
        const { months, counts } = dealsParJour
        const moisFr = (ym: string) => {
          const [y, m] = ym.split('-')
          return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        }

        // Compute cell value for a row + month
        function cellVal(days: number[], month: string) {
          return days.reduce((s, d) => s + (counts[month]?.[d] ?? 0), 0)
        }

        // Max value for heatmap
        const allVals: number[] = []
        DAY_ROWS.forEach(row => months.forEach(m => allVals.push(cellVal(row.days, m))))
        const maxVal = Math.max(1, ...allVals)

        function heatCls(v: number) {
          if (v === 0) return 'text-gray-300'
          const pct = v / maxVal
          if (pct >= 0.8) return 'bg-violet-600 text-white font-bold'
          if (pct >= 0.6) return 'bg-violet-400 text-white font-semibold'
          if (pct >= 0.4) return 'bg-violet-200 text-violet-900 font-semibold'
          if (pct >= 0.2) return 'bg-violet-100 text-violet-700'
          return 'bg-violet-50 text-violet-500'
        }

        // Monthly totals
        const monthTotals = months.map(m =>
          DAY_ROWS.reduce((s, row) => s + cellVal(row.days, m), 0)
        )

        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Deals par jour de semaine</h3>
              <p className="text-xs text-gray-400 mt-0.5">Nouvelles deals uniquement (hors récurrents) — couleur = intensité relative</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left min-w-[90px]">Jour</th>
                    {months.map(m => (
                      <th key={m} className="px-3 py-2.5 text-center min-w-[52px]">{moisFr(m)}</th>
                    ))}
                    <th className="px-3 py-2.5 text-center border-l border-gray-100 text-violet-400">Moy.</th>
                    <th className="px-3 py-2.5 text-center font-bold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {DAY_ROWS.map(row => {
                    const vals   = months.map(m => cellVal(row.days, m))
                    const total  = vals.reduce((s, v) => s + v, 0)
                    const avg    = months.length > 0 ? (total / months.length) : 0
                    return (
                      <tr key={row.label} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-700">{row.label}</td>
                        {vals.map((v, i) => (
                          <td key={months[i]} className="px-3 py-2.5 text-center">
                            <span className={cn('inline-block w-7 h-7 leading-7 rounded-md text-xs text-center', v === 0 ? '' : heatCls(v))}>
                              {v === 0 ? <span className="text-gray-200">—</span> : v}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center border-l border-gray-100">
                          <span className="text-xs font-semibold text-violet-600 tabular-nums">{avg.toFixed(1)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-sm font-bold text-gray-800 tabular-nums">{total}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-100 bg-gray-50/60 font-semibold">
                    <td className="px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wide">Total</td>
                    {monthTotals.map((t, i) => (
                      <td key={months[i]} className="px-3 py-2.5 text-center text-sm font-bold text-gray-800 tabular-nums">{t}</td>
                    ))}
                    <td className="px-3 py-2.5 text-center border-l border-gray-100">
                      <span className="text-xs font-semibold text-violet-600 tabular-nums">
                        {months.length > 0 ? (monthTotals.reduce((s, t) => s + t, 0) / months.length).toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm font-bold text-violet-700 tabular-nums">
                      {monthTotals.reduce((s, t) => s + t, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      })()}

      {/* ── Tab Perf hebdo ─────────────────────────────────────── */}
      {tab === 'hebdo' && (
        <WeeklyPerfSection perfs={perfs} isAdmin={isAdmin} />
      )}

      {/* Modal entrée */}
      {modalEntry !== null && (
        <ModalForm
          entry={modalEntry === 'new' ? null : modalEntry}
          closers={closers}
          setters={setters}
          onClose={() => setModalEntry(null)}
        />
      )}

      {/* Modal import */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}

    </div>
  )
}
