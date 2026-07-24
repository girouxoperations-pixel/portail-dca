'use client'

import { useState, useTransition, useMemo } from 'react'
import { CheckCircle2, Clock, ChevronDown, ChevronUp, LayoutGrid, Table2, Pencil, History, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  basculerStatut,
  approuverPeriode, approuverPayesBatch, modifierPaye,
  ajouterBonusManuel, supprimerPaye,
} from '@/app/(portal)/payes/actions'
import { dollar, MOIS_FR } from '@/lib/constants'
import Badge      from '@/components/ui/Badge'
import Modal      from '@/components/ui/Modal'
import PageHeader from '@/components/layout/PageHeader'

// ── Types ─────────────────────────────────────────────────────────────

interface PayeEntry {
  id: string
  period_label: string
  month: number
  year: number
  client_name: string
  closer_id: string | null
  setter_id: string | null
  montant: number
  commission: number
  commission_setter: number
  statut: string
  notes: string | null
  cash_entries: { collected: number } | null
}

interface Profil {
  id: string
  full_name: string | null
  role: string
}

interface Props {
  entrees:         PayeEntry[]
  closers:         Profil[]
  setters:         Profil[]
  allProfiles:     Profil[]
  teamMembers:     Profil[]
  isAdmin:         boolean
  periodesCourant: { label: string; month: number; year: number }[]
  periodeDefaut:   string
}

// ── Helpers ───────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

type DealItem = {
  id: string
  client_name: string
  montant: number
  collected: number
  maCommission: number
  statut: string
  notes: string | null
  type: 'nouveau' | 'recurrent' | 'alveo' | 'bonus'
}

interface EmployeeGroup {
  uid: string
  nom: string
  role: 'closer' | 'setter'
  deals: DealItem[]
  totalCommission: number
  pendingCommission: number
  pendingIds: string[]
}

function StatutBadge({ statut }: { statut: string }) {
  if (statut === 'Remboursé') return (
    <Badge variant="red" icon={<XCircle size={9} />}>{statut}</Badge>
  )
  if (statut === 'Payé') return (
    <Badge variant="green" icon={<CheckCircle2 size={9} />}>{statut}</Badge>
  )
  return <Badge variant="amber" icon={<Clock size={9} />}>{statut}</Badge>
}

function isRecurringNote(notes: string | null): boolean {
  if (!notes) return false
  return notes.startsWith('Récurrent') || notes.startsWith('Versement récurrent')
}

function isAlveoNote(notes: string | null): boolean {
  return notes?.startsWith('Alveo|') ?? false
}

function isBonusNote(notes: string | null): boolean {
  return notes?.startsWith('Bonus') ?? false
}

// ── Section bonus manuel ──────────────────────────────────────────────

function SectionBonus({ isAdmin, teamMembers, periodes }: {
  isAdmin:      boolean
  teamMembers:  Profil[]
  periodes:     { label: string; month: number; year: number }[]
}) {
  const [periodeIdx, setPeriodeIdx] = useState(0)
  const [personId,   setPersonId]   = useState(teamMembers[0]?.id ?? '')
  const [montant,    setMontant]     = useState('')
  const [label,      setLabel]       = useState('')
  const [pending,    startTransition] = useTransition()
  const [msg,        setMsg]          = useState<string | null>(null)

  const periode = periodes[periodeIdx]
  const person  = teamMembers.find(m => m.id === personId)

  function handleAjouter() {
    if (!person || !montant || Number(montant) <= 0 || !periode) return
    startTransition(async () => {
      await ajouterBonusManuel({
        personId:    person.id,
        role:        person.role as 'closer' | 'setter',
        periodLabel: periode.label,
        month:       periode.month,
        year:        periode.year,
        montant:     Number(montant),
        label:       label.trim() || 'Bonus',
      })
      setMontant('')
      setLabel('')
      setMsg('Bonus ajouté à la paie')
      setTimeout(() => setMsg(null), 4000)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Bonus</h3>
        <p className="text-xs text-gray-400 mt-0.5">Ajouter un bonus manuel à la paie d&apos;un employé</p>
      </div>

      {isAdmin && (
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Employé</label>
              <select value={personId} onChange={e => setPersonId(e.target.value)} className={INPUT_CLS}>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name ?? m.id} ({m.role})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Période</label>
              <select value={periodeIdx} onChange={e => setPeriodeIdx(Number(e.target.value))} className={INPUT_CLS}>
                {periodes.map((p, i) => (
                  <option key={p.label} value={i}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Montant ($)</label>
              <input
                type="number" min="1" step="0.01" placeholder="500"
                value={montant} onChange={e => setMontant(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Description</label>
              <input
                type="text" placeholder="ex. MVP du mois"
                value={label} onChange={e => setLabel(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleAjouter}
              disabled={pending || !montant || Number(montant) <= 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              {pending ? 'Ajout…' : 'Ajouter à la paie'}
            </button>
            {msg && <p className="text-xs text-green-600 font-medium">{msg}</p>}
          </div>
        </div>
      )}

    </div>
  )
}


// ── Deal table (shared between sections) ─────────────────────────────

function DealTable({ deals, role, isAdmin, pending, onEdit, onToggle, onDelete }: {
  deals:    DealItem[]
  role:     'closer' | 'setter'
  isAdmin:  boolean
  pending:  boolean
  onEdit:   (id: string) => void
  onToggle: (id: string, statut: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-gray-50/80 text-gray-400 font-medium">
          <th className="px-5 py-2 text-left">Client</th>
          <th className="px-4 py-2 text-right">Cash reçu</th>
          <th className="px-4 py-2 text-right">Commission</th>
          <th className="px-4 py-2 text-left">Statut</th>
          {isAdmin && <th className="px-4 py-2 text-right">Action</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {deals.map(d => (
          <tr key={d.id} className="hover:bg-gray-50/50">
            <td className="px-5 py-2.5 font-medium text-gray-800 max-w-[140px] truncate">{d.client_name}</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
              {d.type === 'bonus' ? '—' : dollar(d.collected)}
            </td>
            <td className={cn(
              'px-4 py-2.5 text-right tabular-nums font-semibold',
              role === 'closer' ? 'text-violet-700' : 'text-blue-700',
            )}>
              {dollar(d.maCommission)}
            </td>
            <td className="px-4 py-2.5">
              <StatutBadge statut={d.statut} />
            </td>
            {isAdmin && (
              <td className="px-4 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {d.statut !== 'Remboursé' && (
                    <button
                      onClick={() => onEdit(d.id)}
                      className="p-1 rounded text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-colors"
                      title="Modifier"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                  {d.statut !== 'Remboursé' && (
                    <button
                      onClick={() => onToggle(d.id, d.statut)}
                      disabled={pending}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-medium transition-colors disabled:opacity-40',
                        d.statut === 'Payé'
                          ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100',
                      )}
                    >
                      {d.statut === 'Payé' ? '↩ En attente' : '✓ Payé'}
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(d.id)}
                    disabled={pending}
                    className="p-1 rounded text-gray-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Supprimer la commission"
                  >
                    <X size={11} />
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Carte employé ─────────────────────────────────────────────────────

function SectionDeals({ label, labelCls, headerCls, deals, role, isAdmin, pending, onEdit, onToggle, onDelete }: {
  label:    string
  labelCls: string
  headerCls: string
  deals:    DealItem[]
  role:     'closer' | 'setter'
  isAdmin:  boolean
  pending:  boolean
  onEdit:   (id: string) => void
  onToggle: (id: string, statut: string) => void
  onDelete: (id: string) => void
}) {
  if (deals.length === 0) return null
  const total = deals.reduce((s, d) => s + d.maCommission, 0)
  return (
    <div className="border-t border-gray-100">
      <div className={cn('px-5 py-2.5 flex items-center justify-between', headerCls)}>
        <span className={cn('text-[11px] font-bold uppercase tracking-wider', labelCls)}>{label}</span>
        <span className={cn('text-xs font-bold tabular-nums', labelCls)}>{dollar(total)}</span>
      </div>
      <DealTable deals={deals} role={role} isAdmin={isAdmin} pending={pending} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
    </div>
  )
}

function CarteEmploye({ group, isAdmin, pending, onApprouver, onToggle, onEdit, onDelete }: {
  group:        EmployeeGroup
  isAdmin:      boolean
  pending:      boolean
  onApprouver:  (ids: string[]) => void
  onToggle:     (id: string, statut: string) => void
  onEdit:       (id: string) => void
  onDelete:     (id: string) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const allPaid = group.pendingIds.length === 0

  const nouveaux   = group.deals.filter(d => d.type === 'nouveau')
  const recurrents = group.deals.filter(d => d.type === 'recurrent')
  const alveos     = group.deals.filter(d => d.type === 'alveo')
  const bonus      = group.deals.filter(d => d.type === 'bonus')

  const salaire         = getSalaire(group.nom)
  const totalAvecSalaire = group.totalCommission + salaire

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-sm overflow-hidden',
      allPaid ? 'border-green-100' : 'border-gray-100',
    )}>
      {/* En-tête cliquable */}
      <button
        onClick={() => setOuvert(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors text-left"
      >
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
          group.role === 'closer' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700',
        )}>
          {group.nom.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{group.nom}</p>
            <span className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide',
              group.role === 'closer' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600',
            )}>
              {group.role}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {allPaid
              ? <span className="text-green-600 font-medium">Tout payé ✓</span>
              : <span className="text-amber-600 font-medium">{dollar(group.pendingCommission)} en attente</span>
            }
          </p>
        </div>
        <div className="shrink-0 text-right flex items-center gap-3">
          <div>
            <p className="text-xl font-bold tabular-nums text-gray-900">{dollar(totalAvecSalaire)}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide text-right">
              {salaire > 0
                ? `salaire + ${group.deals.length} commission${group.deals.length !== 1 ? 's' : ''}`
                : `${group.deals.length} transaction${group.deals.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          {ouvert
            ? <ChevronUp size={16} className="text-gray-300 shrink-0" />
            : <ChevronDown size={16} className="text-gray-300 shrink-0" />
          }
        </div>
      </button>

      {/* Détail inline — visible après clic */}
      {ouvert && (
        <>
          {!allPaid && isAdmin && (
            <div className="px-5 pb-3 flex justify-end border-t border-gray-50 pt-3">
              <button
                onClick={e => { e.stopPropagation(); onApprouver(group.pendingIds) }}
                disabled={pending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={12} />
                Approuver la paie
              </button>
            </div>
          )}
          {salaire > 0 && (
            <SectionSalaire montant={salaire} isAdmin={isAdmin} />
          )}
          <SectionDeals
            label="Nouvelles deals" labelCls="text-violet-700" headerCls="bg-gray-50/60"
            deals={nouveaux} role={group.role} isAdmin={isAdmin} pending={pending}
            onEdit={onEdit} onToggle={onToggle} onDelete={onDelete}
          />
          <SectionDeals
            label="Récurrents" labelCls="text-blue-600" headerCls="bg-blue-50/30"
            deals={recurrents} role={group.role} isAdmin={isAdmin} pending={pending}
            onEdit={onEdit} onToggle={onToggle} onDelete={onDelete}
          />
          <SectionDeals
            label="Financement Alveo" labelCls="text-amber-600" headerCls="bg-amber-50/30"
            deals={alveos} role={group.role} isAdmin={isAdmin} pending={pending}
            onEdit={onEdit} onToggle={onToggle} onDelete={onDelete}
          />
          <SectionDeals
            label="Bonus" labelCls="text-emerald-600" headerCls="bg-emerald-50/30"
            deals={bonus} role={group.role} isAdmin={isAdmin} pending={pending}
            onEdit={onEdit} onToggle={onToggle} onDelete={onDelete}
          />
        </>
      )}
    </div>
  )
}

// ── Modale d'édition d'une paye ──────────────────────────────────────

const INPUT_EDIT =
  'w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500'

function ModalEditionPaye({ entree, onClose }: {
  entree:  PayeEntry
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [clientName, setClientName]     = useState(entree.client_name)
  const [commission, setCommission]     = useState(String(entree.commission))
  const [commSetter, setCommSetter]     = useState(String(entree.commission_setter))
  const [montant,    setMontant]        = useState(String(entree.montant))
  const [notes,      setNotes]          = useState(entree.notes ?? '')

  function handleSave() {
    startTransition(async () => {
      await modifierPaye(entree.id, {
        client_name:       clientName.trim() || entree.client_name,
        commission:        Number(commission),
        commission_setter: Number(commSetter),
        montant:           Number(montant),
        notes:             notes.trim() || null,
      })
      onClose()
    })
  }

  return (
    <Modal titre="Modifier l'entrée de paie" onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Nom du client</label>
          <input
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            className={INPUT_EDIT}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Montant deal <span className="text-gray-400 font-normal">($)</span>
            </label>
            <input
              type="number" min="0" step="0.01"
              value={montant}
              onChange={e => setMontant(e.target.value)}
              className={INPUT_EDIT}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Cash reçu <span className="text-gray-400 font-normal text-xs">(via Cash Collect)</span>
            </label>
            <div className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 tabular-nums">
              {dollar(entree.cash_entries?.collected ?? Math.round(entree.commission / 0.10))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-violet-700">
              Commission closer <span className="text-gray-400 font-normal">($)</span>
            </label>
            <input
              type="number" min="0" step="0.01"
              value={commission}
              onChange={e => setCommission(e.target.value)}
              className={INPUT_EDIT}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-blue-700">
              Commission setter <span className="text-gray-400 font-normal">($)</span>
            </label>
            <input
              type="number" min="0" step="0.01"
              value={commSetter}
              onChange={e => setCommSetter(e.target.value)}
              className={INPUT_EDIT}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Remarques, ajustements…"
            className={`${INPUT_EDIT} resize-none`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={pending}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Vue client (tableau par deal) ────────────────────────────────────

interface PersonCol {
  id:   string
  nom:  string
  role: 'closer' | 'setter'
}

function VueClient({ filtrees, profileMap, isAdmin, pending, onToggle, onEdit }: {
  filtrees:   PayeEntry[]
  profileMap: Map<string, string>
  isAdmin:    boolean
  pending:    boolean
  onToggle:   (id: string, statut: string) => void
  onEdit:     (id: string) => void
}) {
  const [selectedPersonId, setSelectedPersonId] = useState('')

  const personCols = useMemo<PersonCol[]>(() => {
    const closers = new Map<string, string>()
    const setters = new Map<string, string>()
    for (const e of filtrees) {
      if (e.closer_id && e.commission > 0)        closers.set(e.closer_id, profileMap.get(e.closer_id) ?? e.closer_id)
      if (e.setter_id && e.commission_setter > 0)  setters.set(e.setter_id, profileMap.get(e.setter_id) ?? e.setter_id)
    }
    const sortByNom = (a: PersonCol, b: PersonCol) => a.nom.localeCompare(b.nom, 'fr')
    return [
      ...[...closers.entries()].map(([id, nom]) => ({ id, nom, role: 'closer' as const })).sort(sortByNom),
      ...[...setters.entries()].map(([id, nom]) => ({ id, nom, role: 'setter' as const })).sort(sortByNom),
    ].filter(p => !EXCLUDED_FROM_PAYES.includes(p.nom.trim().toLowerCase()))
  }, [filtrees, profileMap])

  const vue = useMemo(() => {
    if (!selectedPersonId) return filtrees
    return filtrees.filter(e =>
      (e.closer_id === selectedPersonId && e.commission > 0) ||
      (e.setter_id === selectedPersonId && e.commission_setter > 0),
    )
  }, [filtrees, selectedPersonId])

  const totaux = useMemo(() => {
    const map = new Map<string, number>()
    let totalCollected = 0, totalNet = 0
    for (const e of vue) {
      const collected = e.cash_entries?.collected
        ?? (e.commission > 0 ? Math.round(e.commission / 0.10) : e.montant)
      totalCollected += collected
      totalNet += collected - e.commission - e.commission_setter
      if (e.closer_id && e.commission > 0) {
        const nom = (profileMap.get(e.closer_id) ?? '').trim().toLowerCase()
        if (!EXCLUDED_FROM_PAYES.includes(nom))
          map.set(e.closer_id, (map.get(e.closer_id) ?? 0) + e.commission)
      }
      if (e.setter_id && e.commission_setter > 0) {
        const nom = (profileMap.get(e.setter_id) ?? '').trim().toLowerCase()
        if (!EXCLUDED_FROM_PAYES.includes(nom))
          map.set(e.setter_id, (map.get(e.setter_id) ?? 0) + e.commission_setter)
      }
    }
    return { perPerson: map, totalCollected, totalNet }
  }, [vue, profileMap])

  const nouvelles   = vue.filter(e => !isRecurringNote(e.notes) && !isAlveoNote(e.notes) && !isBonusNote(e.notes))
  const recurrentes = vue.filter(e => isRecurringNote(e.notes) || isAlveoNote(e.notes))
  const totalCols   = 4 + personCols.length + (isAdmin ? 1 : 0)

  if (filtrees.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-16 text-center">
        <p className="text-sm text-gray-400">Aucune entrée pour cette période</p>
      </div>
    )
  }

  const selectedPerson = personCols.find(p => p.id === selectedPersonId)

  const colHeaders = (
    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
      <th className="px-4 py-3 text-left min-w-[160px]">Client</th>
      <th className="px-4 py-3 text-right min-w-[100px]">Cash reçu</th>
      {personCols.map(p => (
        <th key={`${p.id}-${p.role}`} className="px-4 py-3 text-right min-w-[100px]">
          <span>{p.nom.split(' ')[0]}</span>
          <span className={cn(
            'ml-1 text-[9px] font-bold px-1 py-px rounded uppercase',
            p.role === 'closer' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600',
          )}>
            {p.role === 'closer' ? 'C' : 'S'}
          </span>
        </th>
      ))}
      <th className="px-4 py-3 text-right min-w-[100px] text-gray-700">NET</th>
      <th className="px-4 py-3 text-left min-w-[100px]">Statut</th>
      {isAdmin && <th className="px-4 py-3 text-right min-w-[80px]" />}
    </tr>
  )

  const renderRows = (entries: PayeEntry[]) => entries.map(e => {
    const collected = e.cash_entries?.collected
      ?? (e.commission > 0 ? Math.round(e.commission / 0.10) : e.montant)
    const net = collected - e.commission - e.commission_setter
    return (
      <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
        <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{e.client_name}</td>
        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{dollar(collected)}</td>
        {personCols.map(p => {
          const comm = (p.role === 'closer' && e.closer_id === p.id) ? e.commission
                     : (p.role === 'setter' && e.setter_id === p.id) ? e.commission_setter
                     : null
          return (
            <td key={`${p.id}-${p.role}`} className={cn(
              'px-4 py-3 text-right tabular-nums',
              comm && comm > 0
                ? p.role === 'closer' ? 'font-medium text-violet-700' : 'font-medium text-blue-700'
                : 'text-gray-200',
            )}>
              {comm && comm > 0 ? dollar(comm) : '—'}
            </td>
          )
        })}
        <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{dollar(net)}</td>
        <td className="px-4 py-3">
          <StatutBadge statut={e.statut} />
        </td>
        {isAdmin && (
          <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1.5">
              {e.statut !== 'Remboursé' && (
                <button
                  onClick={() => onEdit(e.id)}
                  className="p-1 rounded text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-colors"
                  title="Modifier"
                >
                  <Pencil size={12} />
                </button>
              )}
              {e.statut !== 'Remboursé' && (
                <button
                  onClick={() => onToggle(e.id, e.statut)}
                  disabled={pending}
                  className={cn(
                    'px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-40',
                    e.statut === 'Payé'
                      ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100',
                  )}
                >
                  {e.statut === 'Payé' ? '↩' : '✓ Payé'}
                </button>
              )}
            </div>
          </td>
        )}
      </tr>
    )
  })

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Sélecteur d'employé */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500">Voir les paies de :</span>
        <button
          onClick={() => setSelectedPersonId('')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            !selectedPersonId ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          Tous
        </button>
        {personCols.map(p => (
          <button
            key={`${p.id}-${p.role}`}
            onClick={() => setSelectedPersonId(p.id === selectedPersonId ? '' : p.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5',
              selectedPersonId === p.id
                ? p.role === 'closer' ? 'bg-violet-600 text-white' : 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {p.nom.split(' ')[0]}
            <span className={cn(
              'text-[9px] font-bold px-1 py-px rounded uppercase',
              selectedPersonId === p.id
                ? 'bg-white/20 text-white'
                : p.role === 'closer' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600',
            )}>
              {p.role === 'closer' ? 'C' : 'S'}
            </span>
          </button>
        ))}
        {selectedPerson && (
          <span className="ml-auto text-xs text-gray-400">
            {vue.length} deal{vue.length !== 1 ? 's' : ''} · {dollar(totaux.perPerson.get(selectedPersonId) ?? 0)} de commission
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>{colHeaders}</thead>

          {nouvelles.length > 0 && (
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td colSpan={totalCols} className="px-4 py-2 bg-violet-50/40 border-b border-violet-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600">Nouvelles deals</span>
                  <span className="ml-2 text-[10px] text-violet-400">{nouvelles.length}</span>
                </td>
              </tr>
              {renderRows(nouvelles)}
            </tbody>
          )}

          {recurrentes.length > 0 && (
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td colSpan={totalCols} className="px-4 py-2 bg-blue-50/40 border-t border-b border-blue-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Récurrents</span>
                  <span className="ml-2 text-[10px] text-blue-400">{recurrentes.length}</span>
                </td>
              </tr>
              {renderRows(recurrentes)}
            </tbody>
          )}

          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide">
                Total · {vue.length} deal{vue.length !== 1 ? 's' : ''}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                {dollar(totaux.totalCollected)}
              </td>
              {personCols.map(p => (
                <td key={`${p.id}-${p.role}`} className={cn(
                  'px-4 py-3 text-right tabular-nums',
                  p.role === 'closer' ? 'text-violet-700' : 'text-blue-700',
                )}>
                  {dollar(totaux.perPerson.get(p.id) ?? 0)}
                </td>
              ))}
              <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                {dollar(totaux.totalNet)}
              </td>
              <td colSpan={isAdmin ? 2 : 1} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Historique groupé accordion ───────────────────────────────────────

function HistGroupSection({ label, totalComm, payeComm, employees }: {
  label:      string
  totalComm:  number
  payeComm:   number
  employees:  { nom: string; role: string; comm: number }[]
}) {
  const [open, setOpen] = useState(false)
  const attente = totalComm - payeComm
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          <span className="text-xs text-gray-400">{employees.length} employé{employees.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-sm font-bold tabular-nums text-violet-700">{dollar(totalComm)}</span>
            {attente > 0 && (
              <span className="ml-2 text-xs text-amber-500">({dollar(attente)} en attente)</span>
            )}
          </div>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {employees.map((emp, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">{emp.nom}</span>
                <span className="ml-2 text-xs text-gray-400 capitalize">{emp.role}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-violet-700">{dollar(emp.comm)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Payroll split ─────────────────────────────────────────────────────

const EXCLUDED_FROM_PAYES = ['samuel giroux']

const PAYROLL_PRENOMS = ['emma', 'kalianna', 'jacinthe']

const PAYROLL_SALAIRES: Record<string, number> = {
  emma:     750,
  kalianna: 500,
  jacinthe: 2000,
}

function isPayroll(nom: string): boolean {
  const prenom = nom.trim().toLowerCase().split(' ')[0]
  return PAYROLL_PRENOMS.includes(prenom)
}

function getSalaire(nom: string): number {
  const prenom = nom.trim().toLowerCase().split(' ')[0]
  return PAYROLL_SALAIRES[prenom] ?? 0
}

function SectionSalaire({ montant, isAdmin }: { montant: number; isAdmin: boolean }) {
  return (
    <div className="border-t border-gray-100">
      <div className="px-5 py-2.5 flex items-center justify-between bg-gray-50/40">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Salaire fixe</span>
        <span className="text-xs font-bold tabular-nums text-gray-700">{dollar(montant)}</span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          <tr className="hover:bg-gray-50/50">
            <td className="px-5 py-2.5 font-medium text-gray-800">Salaire de base</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-gray-400">—</td>
            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-700">{dollar(montant)}</td>
            <td className="px-4 py-2.5">
              <Badge variant="green">Fixe</Badge>
            </td>
            {isAdmin && <td className="px-4 py-2.5" />}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Vue principale admin / CSM ────────────────────────────────────────

export default function AdminView({
  entrees, allProfiles, teamMembers,
  isAdmin, periodesCourant, periodeDefaut,
}: Props) {
  const [modeGlobal, setModeGlobal]             = useState<'periode' | 'historique'>('periode')
  const [periodeSelect, setPeriodeSelect]       = useState<string>(periodeDefaut)
  const [vue, setVue]                           = useState<'employe' | 'client'>('employe')
  const [groupModeHist, setGroupModeHist]       = useState<'mois' | 'trimestre' | 'annee' | 'perso'>('mois')
  const [dateDebutHist, setDateDebutHist]       = useState('')
  const [dateFinHist, setDateFinHist]           = useState('')
  const [pending, startTransition]              = useTransition()
  const [entreeEnEdition, setEntreeEnEdition]   = useState<PayeEntry | null>(null)

  const profileMap = useMemo(
    () => new Map(allProfiles.map(p => [p.id, p.full_name ?? 'Inconnu'])),
    [allProfiles],
  )

  const periodeActuelle = useMemo(
    () => periodesCourant.find(p => p.label === periodeDefaut) ?? { label: periodeDefaut, month: 0, year: 0 },
    [periodesCourant, periodeDefaut],
  )

  // Périodes qui ont au moins une entrée
  const periodesAvecEntrees = useMemo(() => {
    const labels = new Set(entrees.map(e => e.period_label))
    const found = periodesCourant.filter(p => labels.has(p.label))
    if (!found.some(p => p.label === periodeDefaut)) {
      found.unshift({ label: periodeDefaut, month: 0, year: 0 })
    }
    return found
  }, [entrees, periodesCourant, periodeDefaut])

  const filtrees = useMemo(
    () => entrees.filter(e => e.period_label === periodeSelect),
    [entrees, periodeSelect],
  )

  // Grouper par employé
  const grouped = useMemo(() => {
    const map = new Map<string, EmployeeGroup>()

    for (const e of filtrees) {
      // Prefer actual collected from cash_entries join, fallback to derivation
      const actualCollected     = e.cash_entries?.collected ?? null
      const collectedFromCloser = actualCollected ?? (e.commission > 0 ? Math.round(e.commission / 0.10) : e.montant)
      const collectedFromSetter = actualCollected ?? (e.commission_setter > 0 ? Math.round(e.commission_setter / 0.05) : e.montant)

      const addToGroup = (uid: string, role: 'closer' | 'setter', maComm: number, entryCollected: number) => {
        if (!map.has(uid)) {
          map.set(uid, {
            uid,
            nom: profileMap.get(uid) ?? '—',
            role,
            deals: [],
            totalCommission: 0,
            pendingCommission: 0,
            pendingIds: [],
          })
        }
        const g = map.get(uid)!
        g.deals.push({
          id: e.id,
          client_name: e.client_name,
          montant: e.montant,
          collected: entryCollected,
          maCommission: maComm,
          statut: e.statut,
          notes: e.notes,
          type: isAlveoNote(e.notes) ? 'alveo' : isRecurringNote(e.notes) ? 'recurrent' : isBonusNote(e.notes) ? 'bonus' : 'nouveau',
        })
        g.totalCommission  += maComm
        if (e.statut !== 'Payé') {
          g.pendingCommission += maComm
          if (!g.pendingIds.includes(e.id)) g.pendingIds.push(e.id)
        }
      }

      if (e.closer_id && e.commission > 0) addToGroup(e.closer_id, 'closer', e.commission, collectedFromCloser)
      if (e.setter_id && e.commission_setter > 0) addToGroup(e.setter_id, 'setter', e.commission_setter, collectedFromSetter)
    }

    return Array.from(map.values())
      .filter(g => !EXCLUDED_FROM_PAYES.includes(g.nom.trim().toLowerCase()))
      .sort((a, b) => b.totalCommission - a.totalCommission)
  }, [filtrees, profileMap])

  const payrollGroups    = grouped.filter(g => isPayroll(g.nom))
  const nonPayrollGroups = grouped.filter(g => !isPayroll(g.nom))

  const totalPeriode   = grouped.reduce((s, g) => s + g.totalCommission, 0)
  const pendingPeriode = grouped.reduce((s, g) => s + g.pendingCommission, 0)
  const allPendingIds  = grouped.flatMap(g => g.pendingIds)

  const bonusEntrees = useMemo(
    () => entrees.filter(e => e.notes?.startsWith('Bonus')),
    [entrees],
  )

  // ── Historique groupé ──────────────────────────────────────────────
  const entreesHist = useMemo(() => {
    if (groupModeHist !== 'perso') return entrees
    const toYM = (s: string) => { const d = new Date(s + 'T00:00:00'); return d.getFullYear() * 100 + (d.getMonth() + 1) }
    const startNum = dateDebutHist ? toYM(dateDebutHist) : 0
    const endNum   = dateFinHist   ? toYM(dateFinHist)   : 999999
    return entrees.filter(e => { const n = e.year * 100 + e.month; return n >= startNum && n <= endNum })
  }, [entrees, groupModeHist, dateDebutHist, dateFinHist])

  const histGrouped = useMemo(() => {
    const histKey = (e: PayeEntry) => {
      if (groupModeHist === 'annee')     return `${e.year}`
      if (groupModeHist === 'trimestre') return `T${Math.ceil(e.month / 3)} ${e.year}`
      return `${MOIS_FR[e.month - 1]} ${e.year}`
    }
    const map = new Map<string, { key: string; totalComm: number; payeComm: number; byEmployee: Map<string, { nom: string; role: string; comm: number }> }>()
    for (const e of entreesHist) {
      const key = histKey(e)
      if (!map.has(key)) map.set(key, { key, totalComm: 0, payeComm: 0, byEmployee: new Map() })
      const g = map.get(key)!
      const addEmp = (uid: string, role: string, comm: number) => {
        if (!g.byEmployee.has(uid)) g.byEmployee.set(uid, { nom: profileMap.get(uid) ?? '—', role, comm: 0 })
        g.byEmployee.get(uid)!.comm += comm
        g.totalComm += comm
        if (e.statut === 'Payé') g.payeComm += comm
      }
      if (e.closer_id && e.commission > 0)        addEmp(e.closer_id, 'closer', e.commission)
      if (e.setter_id && e.commission_setter > 0) addEmp(e.setter_id, 'setter', e.commission_setter)
    }
    return Array.from(map.values())
  }, [entreesHist, groupModeHist, profileMap])

  const histKpis = useMemo(() => {
    const total = entreesHist.reduce((s, e) => s + e.commission + e.commission_setter, 0)
    const paye  = entreesHist.filter(e => e.statut === 'Payé').reduce((s, e) => s + e.commission + e.commission_setter, 0)
    return { total, paye, attente: total - paye }
  }, [entreesHist])

  function handleApprouverPeriode() {
    if (!confirm(`Approuver toutes les paies de la période "${periodeSelect}" ?`)) return
    startTransition(async () => { await approuverPeriode(periodeSelect) })
  }

  function handleApprouverEmploye(ids: string[]) {
    startTransition(async () => { await approuverPayesBatch(ids) })
  }

  function handleToggle(id: string, statut: string) {
    startTransition(async () => { await basculerStatut(id, statut) })
  }

  function handleEdit(id: string) {
    const e = filtrees.find(e => e.id === id)
    if (e) setEntreeEnEdition(e)
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette commission ? Cette action est irréversible.')) return
    startTransition(async () => { await supprimerPaye(id) })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <PageHeader titre="Paies" subtitle="Gestion des commissions et bonus" />

      {/* Toggle mode global */}
      <div className="flex gap-2">
        <button
          onClick={() => setModeGlobal('periode')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            modeGlobal === 'periode' ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
          )}
        >
          Par période
        </button>
        <button
          onClick={() => setModeGlobal('historique')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            modeGlobal === 'historique' ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
          )}
        >
          <History size={14} />
          Historique
        </button>
      </div>

      <SectionBonus
        isAdmin={isAdmin}
        teamMembers={teamMembers}
        periodes={periodesCourant}
      />

      {/* ── Historique groupé ─────────────────────────────────────────── */}
      {modeGlobal === 'historique' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500">Regrouper par :</span>
              {(['mois', 'trimestre', 'annee', 'perso'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setGroupModeHist(m)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    groupModeHist === m ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100',
                  )}
                >
                  {m === 'mois' ? 'Mois' : m === 'trimestre' ? 'Trimestre' : m === 'annee' ? 'Année' : 'Personnalisé'}
                </button>
              ))}
            </div>
            {groupModeHist === 'perso' && (
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Du</label>
                  <input type="date" value={dateDebutHist} onChange={e => setDateDebutHist(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Au</label>
                  <input type="date" value={dateFinHist} onChange={e => setDateFinHist(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-6 pt-1 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-400">{groupModeHist === 'perso' ? 'Total plage' : 'Total all-time'}</p>
                <p className="text-base font-bold tabular-nums text-gray-900">{dollar(histKpis.total)}</p>
              </div>
              <div>
                <p className="text-xs text-green-500">Payé</p>
                <p className="text-base font-bold tabular-nums text-green-600">{dollar(histKpis.paye)}</p>
              </div>
              {histKpis.attente > 0 && (
                <div>
                  <p className="text-xs text-amber-500">En attente</p>
                  <p className="text-base font-bold tabular-nums text-amber-600">{dollar(histKpis.attente)}</p>
                </div>
              )}
            </div>
          </div>

          {histGrouped.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-12 text-center">
              <p className="text-sm text-gray-400">
                {groupModeHist === 'perso' && (!dateDebutHist || !dateFinHist)
                  ? 'Sélectionne une plage de dates pour filtrer'
                  : 'Aucune entrée'}
              </p>
            </div>
          ) : (
            histGrouped.map(g => {
              const employees = Array.from(g.byEmployee.values()).sort((a, b) => b.comm - a.comm)
              return (
                <HistGroupSection
                  key={g.key}
                  label={g.key}
                  totalComm={g.totalComm}
                  payeComm={g.payeComm}
                  employees={employees}
                />
              )
            })
          )}
        </div>
      )}

      {/* Sélecteur de période + résumé */}
      {modeGlobal === 'periode' && (<>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Période</label>
            <select
              value={periodeSelect}
              onChange={e => setPeriodeSelect(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {periodesAvecEntrees.map(p => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
              {/* fallback si aucune entrée pour les autres périodes */}
              {periodesCourant
                .filter(p => !periodesAvecEntrees.some(q => q.label === p.label))
                .map(p => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))
              }
            </select>
          </div>

          <div className="flex items-center gap-6 pt-4">
            <div>
              <p className="text-xs text-gray-400">Total période</p>
              <p className="text-lg font-bold tabular-nums text-gray-900">{dollar(totalPeriode)}</p>
            </div>
            {pendingPeriode > 0 && (
              <div>
                <p className="text-xs text-amber-500">En attente</p>
                <p className="text-lg font-bold tabular-nums text-amber-600">{dollar(pendingPeriode)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Toggle de vue */}
          <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setVue('employe')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                vue === 'employe' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <LayoutGrid size={12} />
              Par employé
            </button>
            <button
              onClick={() => setVue('client')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                vue === 'client' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Table2 size={12} />
              Vue client
            </button>
          </div>

          {isAdmin && allPendingIds.length > 0 && (
            <button
              onClick={handleApprouverPeriode}
              disabled={pending}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              Approuver toute la période
            </button>
          )}
        </div>
      </div>

      {/* Contenu selon la vue */}
      {vue === 'employe' ? (
        filtrees.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-16 text-center">
            <p className="text-sm text-gray-400">Aucune entrée pour cette période</p>
            <p className="text-xs text-gray-300 mt-1">Sélectionne une autre période ou ajoute des entrées via Cash Collect.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {payrollGroups.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Payroll</h3>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-medium text-gray-400 tabular-nums">
                    {dollar(payrollGroups.reduce((s, g) => s + g.totalCommission, 0))}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {payrollGroups.map(g => (
                    <CarteEmploye
                      key={`${g.uid}-${g.role}`}
                      group={g}
                      isAdmin={isAdmin}
                      pending={pending}
                      onApprouver={handleApprouverEmploye}
                      onToggle={handleToggle}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}

            {nonPayrollGroups.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Commissions (hors payroll)</h3>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-medium text-gray-400 tabular-nums">
                    {dollar(nonPayrollGroups.reduce((s, g) => s + g.totalCommission, 0))}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {nonPayrollGroups.map(g => (
                    <CarteEmploye
                      key={`${g.uid}-${g.role}`}
                      group={g}
                      isAdmin={isAdmin}
                      pending={pending}
                      onApprouver={handleApprouverEmploye}
                      onToggle={handleToggle}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <VueClient
          filtrees={filtrees}
          profileMap={profileMap}
          isAdmin={isAdmin}
          pending={pending}
          onToggle={handleToggle}
          onEdit={handleEdit}
        />
      )}

      {!isAdmin && filtrees.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Contacte un admin pour modifier le statut des paies.
        </p>
      )}
      </>)}

      {entreeEnEdition && (
        <ModalEditionPaye
          entree={entreeEnEdition}
          onClose={() => setEntreeEnEdition(null)}
        />
      )}

    </div>
  )
}
