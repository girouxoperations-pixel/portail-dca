'use client'

import { useState, useMemo, useTransition } from 'react'
import { Plus, ChevronDown, ChevronUp, X, Check, Ban, Trash2 } from 'lucide-react'
import {
  ajouterDeal,
  modifierCollected,
  togglePaiement,
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
  n.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

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

// ── Payment badge ─────────────────────────────────────────────────────

function PayBadge({
  payment,
  disabled,
}: {
  payment: Payment | undefined
  disabled: boolean
}) {
  const [pending, startTransition] = useTransition()

  if (!payment) {
    return <span className="text-gray-700 text-xs">—</span>
  }

  const isPaid = payment.paid

  return (
    <button
      disabled={disabled || pending}
      title={isPaid ? `Payé ${payment.amount.toLocaleString('fr-CA')} $` : `En attente ${payment.amount.toLocaleString('fr-CA')} $`}
      onClick={() =>
        startTransition(() => togglePaiement(payment.id, !isPaid))
      }
      className={[
        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
        isPaid
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
          : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25',
        pending ? 'opacity-50 cursor-wait' : 'cursor-pointer',
      ].join(' ')}
    >
      {isPaid ? <Check size={11} /> : <X size={11} />}
    </button>
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
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Nouveau deal Alveo</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Client *</label>
          <input
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            placeholder="Prénom Nom"
            value={form.client_name}
            onChange={e => set('client_name', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Date du deal</label>
          <input
            type="date"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            value={form.deal_date}
            onChange={e => set('deal_date', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Méthode</label>
          <select
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
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
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
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
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            placeholder="0"
            value={form.collected}
            onChange={e => set('collected', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Setter</label>
          <input
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            placeholder="Prénom"
            value={form.setter_name}
            onChange={e => set('setter_name', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Closer</label>
          <input
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            placeholder="Prénom"
            value={form.closer_name}
            onChange={e => set('closer_name', e.target.value)}
          />
        </div>

        <div className="col-span-2 md:col-span-4">
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <input
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            placeholder="Optionnel"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>
      </div>

      {montant > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Commission setter : <span className="text-blue-400">{dollar(commS)}</span>
          &nbsp;·&nbsp;
          Commission closer : <span className="text-violet-400">{dollar(commC)}</span>
          &nbsp;·&nbsp;versées en 3 mensualités
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

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
          className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
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

  function getPayment(role: 'setter' | 'closer', mois: 1 | 2 | 3) {
    return deal.payments.find(p => p.person_role === role && p.mois === mois)
  }

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
        'border-b border-white/5 transition-colors',
        isCancelled
          ? 'opacity-40 bg-white/[0.01]'
          : 'hover:bg-white/[0.02]',
      ].join(' ')}>
        {/* Date */}
        <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
          {formatDate(deal.deal_date)}
        </td>

        {/* Client */}
        <td className="px-3 py-2.5">
          <span className="text-sm text-white font-medium">{deal.client_name}</span>
          {deal.notes && (
            <span className="ml-1.5 text-xs text-gray-600">{deal.notes}</span>
          )}
          {isCancelled && (
            <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Annulé</span>
          )}
        </td>

        {/* Setter */}
        <td className="px-3 py-2.5 text-xs text-blue-300">{deal.setter_name ?? '—'}</td>

        {/* Closer */}
        <td className="px-3 py-2.5 text-xs text-violet-300">{deal.closer_name ?? '—'}</td>

        {/* Montant */}
        <td className="px-3 py-2.5 text-xs text-gray-300 text-right font-mono">
          {dollar(deal.montant)}
        </td>

        {/* Collected */}
        <td className="px-3 py-2.5 text-xs text-right">
          {editCollected ? (
            <div className="flex items-center gap-1 justify-end">
              <input
                type="number"
                step="0.01"
                className="w-24 bg-white/10 border border-violet-500 rounded px-2 py-0.5 text-xs text-white text-right"
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
                ? 'text-emerald-400 font-mono'
                : 'text-amber-400 font-mono hover:text-amber-300'}
              title={isAdmin ? 'Cliquer pour modifier' : undefined}
            >
              {dollar(deal.collected)}
            </button>
          )}
        </td>

        {/* À collecter */}
        <td className={[
          'px-3 py-2.5 text-xs text-right font-mono font-medium',
          aCollecter <= 0 ? 'text-emerald-500' : 'text-red-400',
        ].join(' ')}>
          {aCollecter <= 0 ? '✓' : dollar(aCollecter)}
        </td>

        {/* Setter payments M1/M2/M3 */}
        <td className="px-2 py-2.5">
          <div className="flex items-center gap-1">
            {([1, 2, 3] as const).map(m => (
              <PayBadge key={m} payment={getPayment('setter', m)} disabled={isCancelled} />
            ))}
          </div>
        </td>

        {/* Closer payments M1/M2/M3 */}
        <td className="px-2 py-2.5">
          <div className="flex items-center gap-1">
            {([1, 2, 3] as const).map(m => (
              <PayBadge key={m} payment={getPayment('closer', m)} disabled={isCancelled} />
            ))}
          </div>
        </td>

        {/* Actions */}
        {isAdmin && (
          <td className="px-2 py-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-300 rounded transition-colors"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {!isCancelled && (
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => annulerDeal(deal.id))}
                  title="Annuler ce deal"
                  className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-amber-400 rounded transition-colors"
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
                className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-red-400 rounded transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </td>
        )}
      </tr>

      {expanded && (
        <tr className="border-b border-white/5 bg-white/[0.01]">
          <td colSpan={isAdmin ? 10 : 9} className="px-6 py-3">
            <div className="grid grid-cols-3 gap-6 text-xs">
              <div>
                <p className="text-gray-500 mb-1">Commission setter</p>
                <p className="text-blue-300 font-mono">{dollar(deal.commission_setter)}</p>
                <p className="text-gray-600 mt-0.5">({dollar(deal.commission_setter / 3)} × 3 mois)</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Commission closer</p>
                <p className="text-violet-300 font-mono">{dollar(deal.commission_closer)}</p>
                <p className="text-gray-600 mt-0.5">({dollar(deal.commission_closer / 3)} × 3 mois)</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Méthode</p>
                <p className="text-gray-300">{deal.methode}</p>
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
      <tr className="bg-white/[0.02]">
        <td
          colSpan={isAdmin ? 10 : 9}
          className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-white/5"
        >
          <span className="capitalize">{label}</span>
          <span className="ml-3 text-gray-600 normal-case font-normal">
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
    <div className="min-h-screen" style={{ backgroundColor: '#0d0d14', color: '#e5e7eb' }}>
      <div className="max-w-[1400px] mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Tracker Alveo</h1>
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
            { label: 'Deals actifs',          value: deals.filter(d => d.statut === 'actif').length.toString(), color: 'text-white' },
            { label: 'Montant total',          value: dollar(stats.totalMontant),   color: 'text-white' },
            { label: 'Collecté',               value: dollar(stats.totalCollected),  color: 'text-emerald-400' },
            { label: 'À collecter (Alveo)',    value: dollar(stats.aCollecter),      color: stats.aCollecter > 0 ? 'text-red-400' : 'text-emerald-400' },
            { label: 'Comm. en attente',
              value: dollar(stats.pendingSetter + stats.pendingCloser),
              color: (stats.pendingSetter + stats.pendingCloser) > 0 ? 'text-amber-400' : 'text-emerald-400',
            },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`text-lg font-bold font-mono ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Pending commissions per person */}
        {(stats.pendingSetter > 0 || stats.pendingCloser > 0) && (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
            <p className="text-xs font-semibold text-amber-400 mb-2">Commissions en attente par personne</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {allPersons.map(person => {
                const pending = deals
                  .flatMap(d => d.payments.map(p => ({ ...p, deal: d })))
                  .filter(p => !p.paid && (p.deal.setter_name === person || p.deal.closer_name === person))
                  .reduce((s, p) => s + p.amount, 0)
                if (pending === 0) return null
                return (
                  <div key={person} className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{person}</span>
                    <span className="text-xs font-mono text-amber-400">{dollar(pending)}</span>
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
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {(['actif', 'tous', 'annulé'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatut(s)}
                className={[
                  'px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                  filterStatut === s
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>

          <select
            value={filterPerson}
            onChange={e => setFilterPerson(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
          >
            <option value="tous">Toutes les personnes</option>
            {allPersons.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <span className="text-xs text-gray-600 ml-auto">
            {filtered.length} deal{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500">Date</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500">Client</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-blue-500">Setter</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-violet-500">Closer</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Montant</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Collecté</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">À coll.</th>
                  <th className="px-2 py-2.5 text-xs font-semibold text-blue-500">
                    Setter M1 M2 M3
                  </th>
                  <th className="px-2 py-2.5 text-xs font-semibold text-violet-500">
                    Closer M1 M2 M3
                  </th>
                  {isAdmin && <th className="px-2 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {grouped.size === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="px-6 py-12 text-center text-sm text-gray-600">
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
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Check size={9} className="text-emerald-400" />
            </span>
            Payé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <X size={9} className="text-red-400" />
            </span>
            En attente
          </span>
          <span className="text-gray-700">· Cliquer sur M1/M2/M3 pour marquer comme payé</span>
          {isAdmin && <span className="text-gray-700">· Cliquer sur le montant collecté pour le modifier</span>}
        </div>
      </div>
    </div>
  )
}
