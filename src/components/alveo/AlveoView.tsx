'use client'

import { useState, useMemo, useTransition } from 'react'
import { Plus, ChevronDown, ChevronUp, X, Check, Ban, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ajouterDeal,
  modifierCollected,
  toggleRoleComplet,
  annulerDeal,
  supprimerDeal,
} from '@/app/(portal)/alveo/actions'

// ── Types ─────────────────────────────────────────────────────────────

type Payment = {
  id:          string
  deal_id:     string
  person_role: 'setter' | 'closer'
  mois:        1 | 2 | 3
  amount:      number
  paid:        boolean
  paid_at:     string | null
}

type Deal = {
  id:                string
  client_name:       string
  deal_date:         string | null
  montant:           number
  collected:         number
  methode:           string
  setter_name:       string | null
  closer_name:       string | null
  commission_setter: number
  commission_closer: number
  notes:             string | null
  statut:            string
  payments:          Payment[]
}

interface Props {
  deals:   Deal[]
  isAdmin: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────

const dollar = (n: number) =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} $`

function parseMonthLabel(dateStr: string | null): string {
  if (!dateStr) return 'Sans date'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long' })
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
}

const EMPTY_FORM = {
  client_name: '',
  deal_date:   '',
  montant:     '',
  collected:   '0',
  methode:     'Financement',
  setter_name: '',
  closer_name: '',
  notes:       '',
}

// ── Role badge (paiement complet setter ou closer) ────────────────────

function RoleBadge({ deal, role, disabled }: {
  deal:     Deal
  role:     'setter' | 'closer'
  disabled: boolean
}) {
  const [pending, startTransition] = useTransition()

  const payments   = deal.payments.filter(p => p.person_role === role)
  const allPaid    = payments.length > 0 && payments.every(p => p.paid)
  const commission = role === 'setter' ? deal.commission_setter : deal.commission_closer
  const personName = role === 'setter' ? deal.setter_name : deal.closer_name

  if (!personName || commission === 0) return <span className="text-gray-300 text-xs">—</span>

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-[10px] text-gray-500 tabular-nums">{dollar(commission)}</span>
      <button
        disabled={disabled || pending}
        onClick={() => startTransition(() => toggleRoleComplet(deal.id, role, !allPaid))}
        className={cn(
          'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors disabled:opacity-50',
          allPaid
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200',
        )}
      >
        {pending ? '…' : allPaid ? '✓ Payé' : 'Payer →'}
      </button>
    </div>
  )
}

// ── Add form ──────────────────────────────────────────────────────────

function AddDealForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const montant = parseFloat(form.montant) || 0
  const commS = Math.round(montant * 0.05 * 100) / 100
  const commC = Math.round(montant * 0.10 * 100) / 100

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function submit() {
    if (!form.client_name.trim()) { setError('Nom du client requis'); return }
    if (!montant) { setError('Montant requis'); return }

    startTransition(async () => {
      try {
        await ajouterDeal({
          client_name:  form.client_name,
          deal_date:    form.deal_date || null,
          montant,
          collected:    parseFloat(form.collected) || 0,
          methode:      form.methode,
          setter_name:  form.setter_name,
          closer_name:  form.closer_name,
          notes:        form.notes,
        })
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Nouveau deal Alveo</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Client *</label>
          <input
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500"
            placeholder="Prénom Nom"
            value={form.client_name}
            onChange={e => set('client_name', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Date du deal</label>
          <input
            type="date"
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-violet-500"
            value={form.deal_date}
            onChange={e => set('deal_date', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Méthode</label>
          <select
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-violet-500"
            value={form.methode}
            onChange={e => set('methode', e.target.value)}
          >
            <option value="Financement">Financement</option>
            <option value="Interac">Interac</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Montant courant *</label>
          <input
            type="number"
            step="0.01"
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500"
            placeholder="4000"
            value={form.montant}
            onChange={e => set('montant', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Collected</label>
          <input
            type="number"
            step="0.01"
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500"
            placeholder="0"
            value={form.collected}
            onChange={e => set('collected', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Setter</label>
          <input
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500"
            placeholder="Prénom"
            value={form.setter_name}
            onChange={e => set('setter_name', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Closer</label>
          <input
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500"
            placeholder="Prénom"
            value={form.closer_name}
            onChange={e => set('closer_name', e.target.value)}
          />
        </div>

        <div className="col-span-2 md:col-span-4">
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <input
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500"
            placeholder="Optionnel"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>
      </div>

      {montant > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Commission setter : <span className="text-blue-600">{dollar(commS)}</span>
          &nbsp;·&nbsp;
          Commission closer : <span className="text-violet-600">{dollar(commC)}</span>
          &nbsp;·&nbsp;versées en 3 mensualités
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 mt-3">
        <button
          onClick={submit}
          disabled={pending}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus size={14} />
          {pending ? 'Ajout…' : 'Ajouter'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

// ── Deal row ──────────────────────────────────────────────────────────

function DealRow({ deal, isAdmin }: { deal: Deal; isAdmin: boolean }) {
  const [expanded, setExpanded]       = useState(false)
  const [editCollected, setEditCollected] = useState(false)
  const [collectedVal, setCollectedVal]   = useState(String(deal.collected))
  const [pending, startTransition]    = useTransition()

  const aCollecter = deal.montant - deal.collected
  const isCancelled = deal.statut === 'annulé'

  function saveCollected() {
    const val = parseFloat(collectedVal)
    if (!isNaN(val)) {
      startTransition(() => modifierCollected(deal.id, val))
    }
    setEditCollected(false)
  }

  return (
    <>
      <tr className={[
        'border-b border-gray-100 transition-colors',
        isCancelled
          ? 'opacity-40 bg-gray-50'
          : 'hover:bg-gray-50',
      ].join(' ')}>
        {/* Date */}
        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
          {formatDate(deal.deal_date)}
        </td>

        {/* Client */}
        <td className="px-3 py-2.5">
          <span className="text-sm text-gray-900 font-medium">{deal.client_name}</span>
          {deal.notes && (
            <span className="ml-1.5 text-xs text-gray-500">{deal.notes}</span>
          )}
          {isCancelled && (
            <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Annulé</span>
          )}
        </td>

        {/* Setter */}
        <td className="px-3 py-2.5 text-xs text-blue-600">{deal.setter_name ?? '—'}</td>

        {/* Closer */}
        <td className="px-3 py-2.5 text-xs text-violet-600">{deal.closer_name ?? '—'}</td>

        {/* Montant */}
        <td className="px-3 py-2.5 text-xs text-gray-700 text-right font-mono">
          {dollar(deal.montant)}
        </td>

        {/* Collected */}
        <td className="px-3 py-2.5 text-xs text-right">
          {editCollected ? (
            <div className="flex items-center gap-1 justify-end">
              <input
                type="number"
                step="0.01"
                className="w-24 bg-white border border-violet-500 rounded px-2 py-0.5 text-xs text-gray-900 text-right"
                value={collectedVal}
                onChange={e => setCollectedVal(e.target.value)}
                onBlur={saveCollected}
                onKeyDown={e => e.key === 'Enter' && saveCollected()}
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => isAdmin && setEditCollected(true)}
              className={deal.collected >= deal.montant
                ? 'text-emerald-600 font-mono'
                : 'text-amber-600 font-mono hover:text-amber-500'}
              title={isAdmin ? 'Cliquer pour modifier' : undefined}
            >
              {dollar(deal.collected)}
            </button>
          )}
        </td>

        {/* À collecter */}
        <td className={[
          'px-3 py-2.5 text-xs text-right font-mono font-medium',
          aCollecter <= 0 ? 'text-emerald-600' : 'text-red-500',
        ].join(' ')}>
          {aCollecter <= 0 ? '✓' : dollar(aCollecter)}
        </td>

        {/* Setter commission */}
        <td className="px-3 py-2.5">
          <RoleBadge deal={deal} role="setter" disabled={isCancelled} />
        </td>

        {/* Closer commission */}
        <td className="px-3 py-2.5">
          <RoleBadge deal={deal} role="closer" disabled={isCancelled} />
        </td>

        {/* Actions */}
        {isAdmin && (
          <td className="px-2 py-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded transition-colors"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {!isCancelled && (
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => annulerDeal(deal.id))}
                  title="Annuler ce deal"
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-amber-500 rounded transition-colors"
                >
                  <Ban size={12} />
                </button>
              )}
              <button
                disabled={pending}
                onClick={() => {
                  if (confirm(`Supprimer le deal "${deal.client_name}" ?`)) {
                    startTransition(() => supprimerDeal(deal.id))
                  }
                }}
                title="Supprimer"
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 rounded transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </td>
        )}
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={isAdmin ? 10 : 9} className="px-6 py-3">
            <div className="grid grid-cols-3 gap-6 text-xs">
              <div>
                <p className="text-gray-500 mb-1">Commission setter</p>
                <p className="text-blue-600 font-mono">{dollar(deal.commission_setter)}</p>
                <p className="text-gray-400 mt-0.5">5% du montant courant</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Commission closer</p>
                <p className="text-violet-600 font-mono">{dollar(deal.commission_closer)}</p>
                <p className="text-gray-400 mt-0.5">10% du montant courant</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Méthode</p>
                <p className="text-gray-700">{deal.methode}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Month section ─────────────────────────────────────────────────────

function MonthSection({
  label,
  deals,
  isAdmin,
}: {
  label:   string
  deals:   Deal[]
  isAdmin: boolean
}) {
  const totalMontant   = deals.reduce((s, d) => s + d.montant, 0)
  const totalCollected = deals.reduce((s, d) => s + d.collected, 0)
  const totalACollecter = totalMontant - totalCollected

  return (
    <>
      <tr className="bg-gray-100">
        <td
          colSpan={isAdmin ? 10 : 9}
          className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200"
        >
          <span className="capitalize">{label}</span>
          <span className="ml-3 text-gray-500 normal-case font-normal">
            {deals.length} deal{deals.length !== 1 ? 's' : ''}
            &nbsp;·&nbsp;
            Collecté : {dollar(totalCollected)}
            {totalACollecter > 0 && (
              <span className="text-red-500/80"> · À collecter : {dollar(totalACollecter)}</span>
            )}
          </span>
        </td>
      </tr>
      {deals.map(d => (
        <DealRow key={d.id} deal={d} isAdmin={isAdmin} />
      ))}
    </>
  )
}

// ── Main view ─────────────────────────────────────────────────────────

export default function AlveoView({ deals, isAdmin }: Props) {
  const [showForm, setShowForm]   = useState(false)
  const [filterStatut, setFilterStatut] = useState<'tous' | 'actif' | 'annulé'>('actif')
  const [filterPerson, setFilterPerson] = useState('tous')

  const allPersons = useMemo(() => {
    const s = new Set<string>()
    deals.forEach(d => {
      if (d.setter_name) s.add(d.setter_name)
      if (d.closer_name) s.add(d.closer_name)
    })
    return Array.from(s).sort()
  }, [deals])

  const filtered = useMemo(() => {
    return deals.filter(d => {
      if (filterStatut !== 'tous' && d.statut !== filterStatut) return false
      if (filterPerson !== 'tous') {
        if (d.setter_name !== filterPerson && d.closer_name !== filterPerson) return false
      }
      return true
    })
  }, [deals, filterStatut, filterPerson])

  const grouped = useMemo(() => {
    const map = new Map<string, Deal[]>()
    for (const d of filtered) {
      const key = d.deal_date
        ? new Date(d.deal_date).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long' })
        : 'Sans date'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return map
  }, [filtered])

  const stats = useMemo(() => {
    const active = deals.filter(d => d.statut === 'actif')
    const totalMontant    = active.reduce((s, d) => s + d.montant, 0)
    const totalCollected  = active.reduce((s, d) => s + d.collected, 0)
    const pendingPayments = deals.flatMap(d => d.payments).filter(p => !p.paid)
    const pendingSetter   = pendingPayments.filter(p => p.person_role === 'setter').reduce((s, p) => s + p.amount, 0)
    const pendingCloser   = pendingPayments.filter(p => p.person_role === 'closer').reduce((s, p) => s + p.amount, 0)
    return { totalMontant, totalCollected, aCollecter: totalMontant - totalCollected, pendingSetter, pendingCloser }
  }, [deals])

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tracker Alveo</h1>
            <p className="text-sm text-gray-500 mt-0.5">Suivi des financements et commissions</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={15} />
              Nouveau deal
            </button>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Deals actifs',       value: deals.filter(d => d.statut === 'actif').length.toString(), color: 'text-gray-900' },
            { label: 'Montant total',       value: dollar(stats.totalMontant),   color: 'text-gray-900' },
            { label: 'Collecté',            value: dollar(stats.totalCollected),  color: 'text-emerald-600' },
            { label: 'À collecter (Alveo)', value: dollar(stats.aCollecter),      color: stats.aCollecter > 0 ? 'text-red-500' : 'text-emerald-600' },
            { label: 'Comm. en attente',
              value: dollar(stats.pendingSetter + stats.pendingCloser),
              color: (stats.pendingSetter + stats.pendingCloser) > 0 ? 'text-amber-600' : 'text-emerald-600',
            },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`text-lg font-bold font-mono ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Pending commissions per person */}
        {(stats.pendingSetter > 0 || stats.pendingCloser > 0) && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">Commissions en attente par personne</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {allPersons.map(person => {
                const pending = deals
                  .flatMap(d => d.payments.map(p => ({ ...p, deal: d })))
                  .filter(p => !p.paid && (p.deal.setter_name === person || p.deal.closer_name === person))
                  .reduce((s, p) => s + p.amount, 0)
                if (pending === 0) return null
                return (
                  <div key={person} className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">{person}</span>
                    <span className="text-xs font-mono text-amber-700 font-semibold">{dollar(pending)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm && <AddDealForm onClose={() => setShowForm(false)} />}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['actif', 'tous', 'annulé'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatut(s)}
                className={[
                  'px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                  filterStatut === s
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>

          <select
            value={filterPerson}
            onChange={e => setFilterPerson(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-violet-500"
          >
            <option value="tous">Toutes les personnes</option>
            {allPersons.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} deal{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500">Date</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500">Client</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-blue-600">Setter</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-violet-600">Closer</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Montant</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Collecté</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">À coll.</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-blue-600">Comm. setter</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-violet-600">Comm. closer</th>
                  {isAdmin && <th className="px-2 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {grouped.size === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="px-6 py-12 text-center text-sm text-gray-400">
                      Aucun deal trouvé
                    </td>
                  </tr>
                ) : (
                  Array.from(grouped.entries()).map(([label, monthDeals]) => (
                    <MonthSection
                      key={label}
                      label={label}
                      deals={monthDeals}
                      isAdmin={isAdmin}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
          <span>· <span className="text-emerald-600 font-medium">✓ Payé</span> = commission payée et ajoutée à la paie</span>
          <span>· <span className="text-amber-600 font-medium">Payer →</span> = cliquer pour payer la commission complète</span>
          {isAdmin && <span>· Cliquer sur le montant collecté pour le modifier</span>}
        </div>
      </div>
    </div>
  )
}
