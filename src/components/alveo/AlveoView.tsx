'use client'

import { useState, useMemo, useTransition } from 'react'
import { Plus, ChevronDown, ChevronUp, X, Check, Ban, Trash2, CheckCircle2, Circle, AlertTriangle, Search, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ajouterDeal,
  modifierCollected,
  modifierNoms,
  toggleRoleComplet,
  toggleFondsCollectes,
  toggleEnCollection,
  annulerDeal,
  rembourserDeal,
  renverserRemboursementAlveo,
  supprimerDeal,
  ajouterCreance,
  modifierCreance,
  supprimerCreance,
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
  cash_entry_date:   string | null
  cash_entry_id:     string | null
  cash_montant:      number | null
  cash_collected:    number | null
  en_collection:     boolean
  montant:           number
  collected:         number
  methode:           string
  setter_name:       string | null
  closer_name:       string | null
  commission_setter: number
  commission_closer: number
  notes:             string | null
  statut:            string
  fonds_collectes:   boolean
  payments:          Payment[]
}

type Profile = { id: string; full_name: string | null; role: string }

type Creance = {
  id:               string
  client_name:      string
  contenu_consomme: number
  capital_paye:     number
  balance_due:      number
  csm_id:           string | null
  status:           'actif' | 'en_collecte' | 'regle' | 'perdu'
  notes:            string | null
  created_at:       string
}

interface Props {
  deals:      Deal[]
  profiles:   Profile[]
  creances:   Creance[]
  csmMembers: Profile[]
  isAdmin:    boolean
}

// ── Helpers ───────────────────────────────────────────────────────────

const dollar = (n: number) =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} $`

function parseMonthLabel(dateStr: string | null): string {
  if (!dateStr) return 'Sans date'
  const [y, m] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long' })
}

const MOIS_COURT = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.']

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MOIS_COURT[m - 1]}`
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
  versements:  '3',
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
          versements:   Number(form.versements) as 3 | 4,
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

      <div className="mt-3">
        <label className="block text-xs text-gray-500 mb-1">Versements</label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
          {(['3', '4'] as const).map((n, i) => (
            <button
              key={n} type="button"
              onClick={() => set('versements', n)}
              className={cn(
                'px-4 py-1.5 text-xs font-medium transition-colors',
                i > 0 && 'border-l border-gray-200',
                form.versements === n ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50',
              )}
            >{n} versements</button>
          ))}
        </div>
      </div>

      {montant > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Commission setter : <span className="text-blue-600">{dollar(commS)}</span>
          &nbsp;·&nbsp;
          Commission closer : <span className="text-violet-600">{dollar(commC)}</span>
          &nbsp;·&nbsp;versées en {form.versements} mensualités
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

function DealRow({ deal, isAdmin, onRefund, onRestore }: { deal: Deal; isAdmin: boolean; onRefund: (id: string, name: string, closerName: string | null, setterName: string | null) => void; onRestore: (id: string) => void }) {
  const [expanded, setExpanded]       = useState(false)
  const [editCollected, setEditCollected] = useState(false)
  const [collectedVal, setCollectedVal]   = useState(String(deal.collected))
  const [editNoms, setEditNoms]           = useState(false)
  const [setterVal, setSetterVal]         = useState(deal.setter_name ?? '')
  const [closerVal, setCloserVal]         = useState(deal.closer_name ?? '')
  const [pending, startTransition]    = useTransition()

  // Use live montant from cash/stats when linked, otherwise stored value
  const montantEffectif = deal.cash_montant ?? deal.montant
  const collectedEffectif = deal.cash_collected ?? deal.collected
  const commSetterEffectif = deal.cash_montant != null
    ? Math.round(montantEffectif * 0.05 * 100) / 100
    : deal.commission_setter
  const commCloserEffectif = deal.cash_montant != null
    ? Math.round(montantEffectif * 0.10 * 100) / 100
    : deal.commission_closer

  const aCollecter = montantEffectif - collectedEffectif
  const isCancelled  = deal.statut === 'annulé'
  const isRefunded   = deal.statut === 'remboursé'
  const isEnCollection = deal.en_collection

  const effectiveDeal = {
    ...deal,
    commission_setter: commSetterEffectif,
    commission_closer: commCloserEffectif,
  }

  function saveCollected() {
    const val = parseFloat(collectedVal)
    if (!isNaN(val)) {
      startTransition(() => modifierCollected(deal.id, val))
    }
    setEditCollected(false)
  }

  function saveNoms() {
    startTransition(() => modifierNoms(deal.id, setterVal, closerVal))
    setEditNoms(false)
  }

  return (
    <>
      <tr className={cn(
        'border-b transition-colors',
        isCancelled       ? 'opacity-40 bg-gray-50 border-gray-100' :
        isRefunded        ? 'opacity-50 bg-red-50 border-red-100' :
        isEnCollection    ? 'bg-red-50 border-red-200 hover:bg-red-100' :
                            'border-gray-100 hover:bg-gray-50',
      )}>
        {/* Date */}
        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
          {formatDate(deal.cash_entry_date ?? deal.deal_date)}
        </td>

        {/* Client */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm text-gray-900 font-medium">{deal.client_name}</span>
            {isCancelled && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Annulé</span>
            )}
            {isRefunded && (
              <>
                <span className="text-xs bg-red-200 text-red-700 px-1.5 py-0.5 rounded font-semibold">Remboursé</span>
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (confirm(`Remettre "${deal.client_name}" active ?\n\nLes déductions de paie créées seront supprimées.`)) {
                        startTransition(() => onRestore(deal.id))
                      }
                    }}
                    className="text-xs text-red-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
                  >
                    Remettre active
                  </button>
                )}
              </>
            )}
            {isEnCollection && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wide">
                <AlertTriangle size={9} /> En collection
              </span>
            )}
          </div>
          {deal.notes && (
            <span className="text-xs text-gray-500">{deal.notes}</span>
          )}
        </td>

        {/* Fonds collectés */}
        <td className="px-2 py-2.5 text-center">
          <button
            disabled={!isAdmin || pending}
            onClick={() => isAdmin && startTransition(() => toggleFondsCollectes(deal.id, !deal.fonds_collectes))}
            title={deal.fonds_collectes ? 'Fonds collectés' : 'Marquer fonds collectés'}
            className={cn(
              'w-6 h-6 flex items-center justify-center rounded-full mx-auto transition-all',
              isAdmin && !isCancelled ? 'hover:scale-110 cursor-pointer' : 'cursor-default',
              deal.fonds_collectes ? 'text-emerald-500' : 'text-gray-300',
            )}
          >
            {deal.fonds_collectes ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          </button>
        </td>

        {/* Setter */}
        <td className="px-3 py-2.5 text-xs text-blue-600">
          {editNoms ? (
            <input
              autoFocus
              value={setterVal}
              onChange={e => setSetterVal(e.target.value)}
              onBlur={saveNoms}
              onKeyDown={e => { if (e.key === 'Enter') saveNoms(); if (e.key === 'Escape') setEditNoms(false) }}
              className="w-24 bg-white border border-blue-400 rounded px-1.5 py-0.5 text-xs text-gray-900 focus:outline-none"
              placeholder="Prénom"
            />
          ) : (
            <button onClick={() => isAdmin && setEditNoms(true)} title={isAdmin ? 'Cliquer pour modifier' : undefined}
              className={isAdmin ? 'hover:text-blue-400' : ''}>
              {deal.setter_name || <span className="text-gray-300">—</span>}
            </button>
          )}
        </td>

        {/* Closer */}
        <td className="px-3 py-2.5 text-xs text-violet-600">
          {editNoms ? (
            <input
              value={closerVal}
              onChange={e => setCloserVal(e.target.value)}
              onBlur={saveNoms}
              onKeyDown={e => { if (e.key === 'Enter') saveNoms(); if (e.key === 'Escape') setEditNoms(false) }}
              className="w-24 bg-white border border-violet-400 rounded px-1.5 py-0.5 text-xs text-gray-900 focus:outline-none"
              placeholder="Prénom"
            />
          ) : (
            <button onClick={() => isAdmin && setEditNoms(true)} title={isAdmin ? 'Cliquer pour modifier' : undefined}
              className={isAdmin ? 'hover:text-violet-400' : ''}>
              {deal.closer_name || <span className="text-gray-300">—</span>}
            </button>
          )}
        </td>

        {/* Montant */}
        <td className="px-3 py-2.5 text-xs text-gray-700 text-right font-mono">
          {dollar(montantEffectif)}
        </td>

        {/* Collected */}
        <td className="px-3 py-2.5 text-xs text-right">
          {editCollected && !deal.cash_entry_id ? (
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
              onClick={() => isAdmin && !deal.cash_entry_id && setEditCollected(true)}
              className={collectedEffectif >= montantEffectif
                ? 'text-emerald-600 font-mono'
                : 'text-amber-600 font-mono hover:text-amber-500'}
              title={isAdmin && !deal.cash_entry_id ? 'Cliquer pour modifier' : undefined}
            >
              {dollar(collectedEffectif)}
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
          <RoleBadge deal={effectiveDeal} role="setter" disabled={isCancelled || isRefunded} />
        </td>

        {/* Closer commission */}
        <td className="px-3 py-2.5">
          <RoleBadge deal={effectiveDeal} role="closer" disabled={isCancelled || isRefunded} />
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
                  onClick={() => startTransition(() => toggleEnCollection(deal.id, !isEnCollection))}
                  title={isEnCollection ? 'Retirer de collection' : 'Mettre en collection'}
                  className={cn(
                    'w-6 h-6 flex items-center justify-center rounded transition-colors',
                    isEnCollection
                      ? 'text-red-600 hover:text-red-400'
                      : 'text-gray-400 hover:text-red-500',
                  )}
                >
                  <AlertTriangle size={12} />
                </button>
              )}
              {!isCancelled && !isRefunded && (
                <button
                  disabled={pending}
                  onClick={() => onRefund(deal.id, deal.client_name, deal.closer_name, deal.setter_name)}
                  title="Marquer comme remboursé"
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 rounded transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
              )}
              {!isCancelled && !isRefunded && (
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
          <td colSpan={isAdmin ? 11 : 10} className="px-6 py-3">
            <div className="grid grid-cols-3 gap-6 text-xs">
              <div>
                <p className="text-gray-500 mb-1">Commission setter</p>
                <p className="text-blue-600 font-mono">{dollar(commSetterEffectif)}</p>
                <p className="text-gray-400 mt-0.5">5% du montant courant</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Commission closer</p>
                <p className="text-violet-600 font-mono">{dollar(commCloserEffectif)}</p>
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
  onRefund,
  onRestore,
}: {
  label:     string
  deals:     Deal[]
  isAdmin:   boolean
  onRefund:  (id: string, name: string, closerName: string | null, setterName: string | null) => void
  onRestore: (id: string) => void
}) {
  const totalMontant    = deals.reduce((s, d) => s + (d.cash_montant ?? d.montant), 0)
  const totalCollected  = deals.reduce((s, d) => s + (d.cash_collected ?? d.collected), 0)
  const totalACollecter = totalMontant - totalCollected

  // Commissions non payées (tous payments non paid de tous les deals du mois)
  const commImpayees = deals.reduce((s, d) => {
    const unpaid = d.payments.filter(p => !p.paid).reduce((ps, p) => ps + p.amount, 0)
    return s + unpaid
  }, 0)

  return (
    <>
      <tr className="bg-gray-100">
        <td
          colSpan={isAdmin ? 11 : 10}
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
            {commImpayees > 0 && (
              <span className="text-amber-600/90"> · Comm. impayées : {dollar(commImpayees)}</span>
            )}
          </span>
        </td>
      </tr>
      {deals.map(d => (
        <DealRow key={d.id} deal={d} isAdmin={isAdmin} onRefund={(id, name, cn, sn) => onRefund(id, name, cn, sn)} onRestore={onRestore} />
      ))}
    </>
  )
}

// ── Main view ─────────────────────────────────────────────────────────

// ── Créances ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  actif:        'Actif',
  en_collecte:  'En collecte',
  regle:        'Réglé',
  perdu:        'Perdu',
}

const STATUS_COLORS: Record<string, string> = {
  actif:       'bg-red-100 text-red-700',
  en_collecte: 'bg-orange-100 text-orange-700',
  regle:       'bg-emerald-100 text-emerald-700',
  perdu:       'bg-gray-100 text-gray-500',
}

const EMPTY_CREANCE = { client_name: '', contenu_consomme: '', capital_paye: '', csm_id: '', notes: '', status: 'actif' }

function CreancesSection({ creances, csmMembers, isAdmin }: { creances: Creance[]; csmMembers: Profile[]; isAdmin: boolean }) {
  const [filterStatus, setFilterStatus] = useState<'tous' | 'actif' | 'en_collecte' | 'regle' | 'perdu'>('actif')
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<Creance | null>(null)
  const [form, setForm]                 = useState(EMPTY_CREANCE)
  const [pending, startT]               = useTransition()

  function openAdd() { setForm(EMPTY_CREANCE); setEditing(null); setShowForm(true) }
  function openEdit(c: Creance) {
    setForm({
      client_name:      c.client_name,
      contenu_consomme: String(c.contenu_consomme),
      capital_paye:     String(c.capital_paye),
      csm_id:           c.csm_id ?? '',
      notes:            c.notes ?? '',
      status:           c.status,
    })
    setEditing(c)
    setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      client_name:      form.client_name.trim(),
      contenu_consomme: parseFloat(form.contenu_consomme) || 0,
      capital_paye:     parseFloat(form.capital_paye) || 0,
      csm_id:           form.csm_id || null,
      notes:            form.notes,
      status:           form.status,
    }
    if (!data.client_name) return
    startT(async () => {
      if (editing) await modifierCreance(editing.id, data)
      else await ajouterCreance(data)
      closeForm()
    })
  }

  const filtered = filterStatus === 'tous' ? creances : creances.filter(c => c.status === filterStatus)
  const totalBalance = filtered.reduce((s, c) => s + c.balance_due, 0)

  const csmMap = new Map(csmMembers.map(m => [m.id, m.full_name ?? '?']))

  const INPUT = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white'

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['actif', 'en_collecte', 'tous', 'regle', 'perdu'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn('px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                filterStatus === s ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50')}>
              {STATUS_LABELS[s] ?? 'Tous'}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={15} />
            Ajouter une créance
          </button>
        )}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500 mb-1">Nombre</p>
            <p className="text-lg font-bold text-gray-900">{filtered.length}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs text-gray-500 mb-1">Balance totale due</p>
            <p className="text-lg font-bold text-red-600 font-mono">{dollar(totalBalance)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500 mb-1">En collecte</p>
            <p className="text-lg font-bold text-orange-600">{creances.filter(c => c.status === 'en_collecte').length}</p>
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-violet-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {editing ? 'Modifier la créance' : 'Nouvelle créance'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">Nom de la cliente</label>
                <input required value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="Prénom Nom" className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Contenu consommé ($)</label>
                <input type="number" min="0" step="0.01" required value={form.contenu_consomme}
                  onChange={e => setForm(f => ({ ...f, contenu_consomme: e.target.value }))}
                  placeholder="3000" className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Capital payé ($)</label>
                <input type="number" min="0" step="0.01" required value={form.capital_paye}
                  onChange={e => setForm(f => ({ ...f, capital_paye: e.target.value }))}
                  placeholder="800" className={INPUT} />
              </div>
              {form.contenu_consomme && form.capital_paye && (
                <div className="col-span-2 rounded-lg bg-red-50 border border-red-100 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Balance due</span>
                  <span className="text-sm font-bold text-red-600 font-mono">
                    {dollar((parseFloat(form.contenu_consomme) || 0) - (parseFloat(form.capital_paye) || 0))}
                  </span>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">CSM assignée</label>
                <select value={form.csm_id} onChange={e => setForm(f => ({ ...f, csm_id: e.target.value }))} className={INPUT}>
                  <option value="">— Aucune —</option>
                  {csmMembers.map(m => <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>)}
                </select>
              </div>
              {editing && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Statut</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={INPUT}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Détails, contexte…" className={INPUT + ' resize-none'} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeForm}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={pending}
                className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {editing ? 'Sauvegarder' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center">
          <p className="text-sm text-gray-400">Aucune créance pour ce statut</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Cliente</th>
                  <th className="px-4 py-2.5 text-right">Contenu consommé</th>
                  <th className="px-4 py-2.5 text-right">Capital payé</th>
                  <th className="px-4 py-2.5 text-right">Balance due</th>
                  <th className="px-4 py-2.5 text-left">CSM</th>
                  <th className="px-4 py-2.5 text-left">Statut</th>
                  <th className="px-4 py-2.5 text-left">Notes</th>
                  {isAdmin && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.client_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{dollar(c.contenu_consomme)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{dollar(c.capital_paye)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-red-600">{dollar(c.balance_due)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.csm_id ? (csmMap.get(c.csm_id) ?? '?') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[c.status])}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[180px] truncate">{c.notes ?? '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(c)} title="Modifier"
                            className="p-1.5 text-gray-300 hover:text-violet-500 hover:bg-violet-50 rounded transition-colors">
                            <Check size={13} className="rotate-0 hidden" />
                            <span className="text-xs">✏️</span>
                          </button>
                          <button onClick={() => { if (confirm('Supprimer cette créance ?')) startT(() => supprimerCreance(c.id)) }}
                            disabled={pending} title="Supprimer"
                            className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AlveoView({ deals, profiles, creances, csmMembers, isAdmin }: Props) {
  const [mainTab, setMainTab]     = useState<'deals' | 'creances'>('deals')
  const [showForm, setShowForm]   = useState(false)
  const [filterYear, setFilterYear]     = useState('2026')
  const [filterStatut, setFilterStatut] = useState<'tous' | 'actif' | 'annulé' | 'remboursé'>('actif')
  const [filterPerson, setFilterPerson] = useState('tous')
  const [search, setSearch]             = useState('')
  const [refundTarget, setRefundTarget]   = useState<{ id: string; name: string; closerName: string | null; setterName: string | null } | null>(null)
  const [refundMontant, setRefundMontant] = useState('')
  const [refundCloserId, setRefundCloserId] = useState<string>('')
  const [refundSetterId, setRefundSetterId] = useState<string>('')
  const [, startRefundTrans] = useTransition()

  const closers = profiles.filter(p => p.role === 'closer')
  const setters = profiles.filter(p => p.role === 'setter')

  function resolveProfileId(name: string | null): string {
    if (!name) return ''
    const needle = name.toLowerCase().trim()
    const firstName = needle.split(/[\s\-–]/)[0]
    const match = profiles.find(p => {
      const hay = (p.full_name ?? '').toLowerCase().trim()
      return hay === needle || hay.startsWith(firstName + ' ')
    })
    return match?.id ?? ''
  }

  const TEAM_NAMES = new Set(['shanny', 'jacinthe', 'kalianna', 'kim', 'melika', 'audrey'])
  const norm = (s: string) =>
    s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const allYears = useMemo(() => {
    const s = new Set<string>()
    deals.forEach(d => {
      const date = d.cash_entry_date ?? d.deal_date
      if (date) s.add(date.slice(0, 4))
    })
    return Array.from(s).sort((a, b) => b.localeCompare(a))
  }, [deals])

  const allPersons = useMemo(() => {
    const s = new Set<string>()
    deals.forEach(d => {
      if (d.setter_name) s.add(d.setter_name)
      if (d.closer_name) s.add(d.closer_name)
    })
    return Array.from(s)
      .filter(p => TEAM_NAMES.has(norm(p)))
      .sort()
  }, [deals])

  const yearActive = useMemo(() => {
    return deals.filter(d => {
      const date = d.cash_entry_date ?? d.deal_date
      return date?.slice(0, 4) === filterYear && d.statut === 'actif'
    })
  }, [deals, filterYear])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deals
      .filter(d => {
        const date = d.cash_entry_date ?? d.deal_date
        if (date?.slice(0, 4) !== filterYear) return false
        if (filterStatut !== 'tous' && d.statut !== filterStatut) return false
        if (filterPerson !== 'tous') {
          if (d.setter_name !== filterPerson && d.closer_name !== filterPerson) return false
        }
        if (q) {
          const hay = [d.client_name, d.setter_name, d.closer_name, d.notes].join(' ').toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const da = a.cash_entry_date ?? a.deal_date ?? ''
        const db2 = b.cash_entry_date ?? b.deal_date ?? ''
        return db2.localeCompare(da)
      })
  }, [deals, filterYear, filterStatut, filterPerson, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Deal[]>()
    for (const d of filtered) {
      const effectiveDate = d.cash_entry_date ?? d.deal_date
      let key = 'Sans date'
      if (effectiveDate) {
        const [y, m] = effectiveDate.split('-').map(Number)
        key = new Date(y, m - 1, 1).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long' })
      }
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return map
  }, [filtered])

  const stats = useMemo(() => {
    const totalCollected  = yearActive.filter(d => d.fonds_collectes).reduce((s, d) => s + (d.cash_montant ?? d.montant), 0)
    const aCollecter      = yearActive.filter(d => !d.fonds_collectes).reduce((s, d) => s + (d.cash_montant ?? d.montant), 0)
    const totalMontant    = totalCollected + aCollecter
    const pendingPayments = yearActive.flatMap(d => d.payments).filter(p => !p.paid)
    const pendingSetter   = pendingPayments.filter(p => p.person_role === 'setter').reduce((s, p) => s + p.amount, 0)
    const pendingCloser   = pendingPayments.filter(p => p.person_role === 'closer').reduce((s, p) => s + p.amount, 0)
    return { totalMontant, totalCollected, aCollecter, pendingSetter, pendingCloser, count: yearActive.length }
  }, [yearActive])

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tracker Alveo</h1>
            <p className="text-sm text-gray-500 mt-0.5">Suivi des financements et commissions</p>
          </div>
          {isAdmin && mainTab === 'deals' && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={15} />
              Nouveau deal
            </button>
          )}
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {([
            ['deals', 'Deals'],
            ['creances', `Créances${creances.filter(c => c.status !== 'regle' && c.status !== 'perdu').length > 0 ? ` (${creances.filter(c => c.status !== 'regle' && c.status !== 'perdu').length})` : ''}`],
          ] as [string, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setMainTab(key as 'deals' | 'creances')}
              className={cn('px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                mainTab === key ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300')}>
              {label}
            </button>
          ))}
        </div>

        {mainTab === 'creances' && (
          <CreancesSection creances={creances} csmMembers={csmMembers} isAdmin={isAdmin} />
        )}

        {mainTab === 'deals' && (<>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: `Deals actifs ${filterYear}`,  value: stats.count.toString(),           color: 'text-gray-900' },
            { label: 'Montant total',                value: dollar(stats.totalMontant),       color: 'text-gray-900' },
            { label: 'Fonds collectés ✓',            value: dollar(stats.totalCollected),     color: 'text-emerald-600' },
            { label: 'Fonds à recevoir',             value: dollar(stats.aCollecter),         color: stats.aCollecter > 0 ? 'text-red-500' : 'text-emerald-600' },
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
                const pending = yearActive
                  .flatMap(d => d.payments.map(p => ({ ...p, deal: d })))
                  .filter(p => !p.paid && (
                    (p.person_role === 'setter' && p.deal.setter_name === person) ||
                    (p.person_role === 'closer' && p.deal.closer_name === person)
                  ))
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

        {/* Year tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
          {allYears.map(year => (
            <button
              key={year}
              onClick={() => setFilterYear(year)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                filterYear === year
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300',
              )}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher client, setter, closer…"
              className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-56 focus:outline-none focus:border-violet-500 bg-white"
            />
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['actif', 'tous', 'annulé', 'remboursé'] as const).map(s => (
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
                  <th className="px-2 py-2.5 text-xs font-semibold text-gray-500 text-center" title="Fonds collectés par la business">Fonds</th>
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
                    <td colSpan={isAdmin ? 11 : 10} className="px-6 py-12 text-center text-sm text-gray-400">
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
                      onRefund={(id, name, closerName, setterName) => {
                        setRefundTarget({ id, name, closerName, setterName })
                        setRefundMontant('')
                        setRefundCloserId(resolveProfileId(closerName))
                        setRefundSetterId(resolveProfileId(setterName))
                      }}
                      onRestore={(id) => startRefundTrans(() => renverserRemboursementAlveo(id))}
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
        </>)}
      </div>

      {/* ── Modal remboursement ──────────────────────────────────── */}
      {refundTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><RotateCcw size={16} className="text-red-600" /></div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Remboursement Alveo</h2>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{refundTarget.name}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Montant remboursé ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundMontant}
                onChange={e => setRefundMontant(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-violet-600 mb-1.5">Closer</label>
                <select
                  value={refundCloserId}
                  onChange={e => setRefundCloserId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-900 focus:outline-none focus:border-violet-400"
                >
                  <option value="">— Aucun —</option>
                  {closers.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-600 mb-1.5">Setter</label>
                <select
                  value={refundSetterId}
                  onChange={e => setRefundSetterId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-400"
                >
                  <option value="">— Aucun —</option>
                  {setters.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {refundMontant && parseFloat(refundMontant) > 0 && (
              <div className="bg-red-50 rounded-lg p-3 text-xs space-y-1.5">
                <p className="text-gray-500">Déductions dans la paie courante :</p>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Closer (10%){refundCloserId ? ` · ${closers.find(p => p.id === refundCloserId)?.full_name ?? ''}` : ' · non assigné'}
                  </span>
                  <span className={refundCloserId ? 'font-semibold text-red-600' : 'text-gray-400'}>
                    {refundCloserId
                      ? `-${(parseFloat(refundMontant) * 0.10).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Setter (5%){refundSetterId ? ` · ${setters.find(p => p.id === refundSetterId)?.full_name ?? ''}` : ' · non assigné'}
                  </span>
                  <span className={refundSetterId ? 'font-semibold text-red-600' : 'text-gray-400'}>
                    {refundSetterId
                      ? `-${(parseFloat(refundMontant) * 0.05).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $`
                      : '—'}
                  </span>
                </div>
              </div>
            )}

            {!refundCloserId && !refundSetterId && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Sélectionne au moins un closer ou setter pour que la déduction s'applique.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setRefundTarget(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={!refundMontant || parseFloat(refundMontant) <= 0 || (!refundCloserId && !refundSetterId)}
                onClick={() => {
                  const montant = parseFloat(refundMontant)
                  if (!montant || montant <= 0) return
                  const cid = refundCloserId || null
                  const sid = refundSetterId || null
                  setRefundTarget(null)
                  startRefundTrans(() => rembourserDeal(refundTarget.id, montant, cid, sid))
                }}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
