'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, CheckCircle2,
  ChevronDown, ChevronUp, RefreshCw, X, Pencil,
} from 'lucide-react'
import { cn }          from '@/lib/utils'
import { dollar, MOIS_FR, formatDate } from '@/lib/constants'
import Badge           from '@/components/ui/Badge'
import Modal           from '@/components/ui/Modal'
import PageHeader      from '@/components/layout/PageHeader'
import {
  creerRecurringDeal, marquerRecu, marquerRecuAvecSolde, annulerRecu,
  desactiverDeal, reactiverDeal, encaisserProchainVersement,
  modifierRecurringDeal,
} from '@/app/(portal)/recurrents/actions'

// ── Types ─────────────────────────────────────────────────────────────

interface Profile {
  id:        string
  full_name: string | null
  role:      string
}

interface Occurrence {
  id:                string
  recurring_deal_id: string
  mois:              number
  annee:             number
  date_attendue:     string
  montant_attendu:   number
  montant_recu:      number | null
  recu:              boolean
  date_recue:        string | null
  cash_entry_id:     string | null
  paye_entry_id:     string | null
}

interface Deal {
  id:                    string
  client_name:           string
  closer_id:             string | null
  setter_id:             string | null
  montant_mensuel:       number
  date_debut:            string
  versements_total:      number | null
  actif:                 boolean
  notes:                 string | null
  recurring_occurrences: Occurrence[]
}

type Filtre = 'retard' | 'semaine' | 'mois' | 'par_mois' | 'tout'

interface Props {
  deals:         Deal[]
  profiles:      Profile[]
  isAdmin:       boolean
  initialFiltre?: string
}

// ── Styles ────────────────────────────────────────────────────────────

const INPUT =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Modal — Nouveau deal ──────────────────────────────────────────────

function ModalNouveauDeal({ profiles, onClose }: {
  profiles: Profile[]
  onClose:  () => void
}) {
  const [pending, startTransition] = useTransition()
  const closers = profiles.filter(p => p.role === 'closer')
  const setters = profiles.filter(p => p.role === 'setter')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await creerRecurringDeal({
        client_name:      fd.get('client_name') as string,
        closer_id:        (fd.get('closer_id') as string) || null,
        setter_id:        (fd.get('setter_id') as string) || null,
        montant_mensuel:  Number(fd.get('montant_mensuel')),
        date_debut:       fd.get('date_debut') as string,
        versements_total: Number(fd.get('versements_total') ?? 3),
        notes:            (fd.get('notes') as string) || null,
      })
      onClose()
    })
  }

  return (
    <Modal titre="Nouvelle entente de paiement" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Nom du client</label>
          <input name="client_name" required className={INPUT} placeholder="ex: Marie Tremblay" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Closer</label>
            <select name="closer_id" className={INPUT}>
              <option value="">— Aucun —</option>
              {closers.map(p => (
                <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Setter</label>
            <select name="setter_id" className={INPUT}>
              <option value="">— Aucun —</option>
              {setters.map(p => (
                <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Montant/versement ($)</label>
            <input
              name="montant_mensuel" type="number" min="0" step="0.01"
              required className={INPUT} placeholder="1333.33"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Nb de versements</label>
            <select name="versements_total" defaultValue="3" className={INPUT}>
              <option value="2">2 versements</option>
              <option value="3">3 versements</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Date du 1er versement</label>
          <input name="date_debut" type="date" required className={INPUT} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea
            name="notes" rows={2}
            className={`${INPUT} resize-none`}
            placeholder="Informations supplémentaires…"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={pending}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
            {pending ? 'Création…' : 'Créer le deal'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Ligne d'occurrence ────────────────────────────────────────────────

function OccurrenceRow({ occ, deal, profileMap, profiles, isAdmin }: {
  occ:        Occurrence
  deal:       Deal
  profileMap: Map<string, string>
  profiles:   Profile[]
  isAdmin:    boolean
}) {
  const [amount, setAmount]        = useState(String(occ.montant_attendu))
  const [dateSolde, setDateSolde]  = useState('')
  const [editOpen, setEditOpen]    = useState(false)
  const [pending, startTransition] = useTransition()

  const montantSolde = Math.max(0, occ.montant_attendu - Number(amount))
  const isPartial    = !occ.recu && Number(amount) > 0 && Number(amount) < occ.montant_attendu

  const closers = profiles.filter(p => p.role === 'closer')
  const setters = profiles.filter(p => p.role === 'setter')

  const closerNom = deal.closer_id ? (profileMap.get(deal.closer_id) ?? '—') : null
  const setterNom = deal.setter_id ? (profileMap.get(deal.setter_id) ?? '—') : null

  function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await modifierRecurringDeal(deal.id, {
        client_name:      fd.get('client_name') as string,
        closer_id:        (fd.get('closer_id') as string) || null,
        setter_id:        (fd.get('setter_id') as string) || null,
        montant_mensuel:  Number(fd.get('montant_mensuel')),
        versements_total: fd.get('versements_total') ? Number(fd.get('versements_total')) : null,
        notes:            (fd.get('notes') as string) || null,
      })
      setEditOpen(false)
    })
  }

  // Calcul du délai en jours
  const today    = new Date(); today.setHours(0,0,0,0)
  const dueDate  = new Date(occ.date_attendue + 'T00:00:00')
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000)

  const urgency = occ.recu      ? 'done'
    : diffDays < 0              ? 'overdue'
    : diffDays === 0            ? 'today'
    : diffDays <= 7             ? 'soon'
    : 'normal'

  const urgencyBadge = {
    done:    null,
    overdue: <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-700 text-white">En retard</span>,
    today:   <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-600 text-white">Aujourd&apos;hui</span>,
    soon:    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Dans {diffDays}j</span>,
    normal:  <span className="text-[10px] text-gray-400">Dans {diffDays}j</span>,
  }[urgency]

  function handleMarquer() {
    const val = Number(amount)
    if (isNaN(val) || val <= 0) return
    startTransition(async () => {
      if (isPartial && dateSolde) {
        await marquerRecuAvecSolde(occ.id, val, montantSolde, dateSolde)
      } else {
        await marquerRecu(occ.id, val)
      }
    })
  }

  function handleAnnuler() {
    if (!confirm('Annuler ce paiement ? Les entrées Cash Collect et Paie seront supprimées.')) return
    startTransition(async () => { await annulerRecu(occ.id) })
  }

  return (
    <>
      <tr className={cn(
        'border-b border-gray-50 transition-colors',
        urgency === 'overdue' ? 'bg-violet-50/40'
        : urgency === 'today'   ? 'bg-violet-50/20'
        : occ.recu              ? 'bg-green-50/40'
        : 'hover:bg-gray-50/50',
      )}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setEditOpen(v => !v)} className="font-medium text-gray-800 text-sm hover:text-violet-600 transition-colors text-left">
              {deal.client_name}
            </button>
            <button onClick={() => setEditOpen(v => !v)} className="text-gray-300 hover:text-violet-500 transition-colors">
              <Pencil size={11} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {closerNom && <span className="text-[11px] text-violet-700 font-medium">{closerNom}</span>}
            {closerNom && setterNom && <span className="text-gray-300 text-[10px]">·</span>}
            {setterNom && <span className="text-[11px] text-blue-600">{setterNom}</span>}
          </div>
        </td>

        {/* Date de contact */}
        <td className="px-4 py-3">
          {!occ.recu ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-gray-800">{formatDate(occ.date_attendue)}</span>
              {urgencyBadge}
            </div>
          ) : (
            <span className="text-xs text-gray-400">{formatDate(occ.date_attendue)}</span>
          )}
        </td>

        {!occ.recu ? (
          <>
            <td className="px-4 py-3">
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                min="0" step="0.01"
                className="w-28 px-2 py-1 rounded border border-gray-200 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {isPartial && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] text-amber-600 font-medium whitespace-nowrap">
                    Solde {dollar(montantSolde)} dû le
                  </span>
                  <input
                    type="date"
                    value={dateSolde}
                    onChange={e => setDateSolde(e.target.value)}
                    className="px-1.5 py-0.5 rounded border border-amber-200 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50 text-amber-800"
                  />
                </div>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              <button
                onClick={handleMarquer}
                disabled={pending || (isPartial && !dateSolde)}
                title={isPartial && !dateSolde ? 'Entrez une date pour le solde restant' : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ml-auto"
              >
                <CheckCircle2 size={12} />
                {pending ? 'Enregistrement…' : isPartial ? 'Partiel + solde' : 'Marquer reçu'}
              </button>
            </td>
          </>
        ) : (
          <>
            <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700">
              {dollar(occ.montant_recu ?? 0)}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-3 justify-end">
                <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                  <CheckCircle2 size={13} />
                  {occ.date_recue ? formatDate(occ.date_recue) : 'Reçu'}
                </div>
                {isAdmin && (
                  <button
                    onClick={handleAnnuler} disabled={pending}
                    className="text-[11px] text-gray-300 hover:text-red-400 transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </td>
          </>
        )}
      </tr>
      {editOpen && (
        <tr>
          <td colSpan={4} className="px-4 pb-3 pt-0">
            <form onSubmit={handleSaveEdit} className="bg-blue-50/40 rounded-lg p-3 space-y-3 border border-blue-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Modifier l&apos;entente</p>
                <button type="button" onClick={() => setEditOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Client</label>
                  <input name="client_name" defaultValue={deal.client_name} required className={INPUT + ' text-sm'} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Montant / versement ($)</label>
                  <input name="montant_mensuel" type="number" step="0.01" min="0" defaultValue={deal.montant_mensuel} required className={INPUT + ' text-sm'} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Closer</label>
                  <select name="closer_id" defaultValue={deal.closer_id ?? ''} className={INPUT + ' text-sm'}>
                    <option value="">— Aucun —</option>
                    {closers.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Setter</label>
                  <select name="setter_id" defaultValue={deal.setter_id ?? ''} className={INPUT + ' text-sm'}>
                    <option value="">— Aucun —</option>
                    {setters.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nb versements</label>
                  <select name="versements_total" defaultValue={deal.versements_total ?? ''} className={INPUT + ' text-sm'}>
                    <option value="">—</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                  <input name="notes" defaultValue={deal.notes ?? ''} className={INPUT + ' text-sm'} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditOpen(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Annuler</button>
                <button type="submit" disabled={pending}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                  {pending ? 'Enregistrement…' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Carte deal (historique complet) ──────────────────────────────────

function DealCard({ deal, profileMap, profiles, isAdmin }: {
  deal:       Deal
  profileMap: Map<string, string>
  profiles:   Profile[]
  isAdmin:    boolean
}) {
  const [ouvert, setOuvert]        = useState(false)
  const [editOpen, setEditOpen]    = useState(false)
  const [pending, startTransition] = useTransition()

  const closers = profiles.filter(p => p.role === 'closer')
  const setters = profiles.filter(p => p.role === 'setter')

  const closerNom = deal.closer_id ? (profileMap.get(deal.closer_id) ?? '—') : null
  const setterNom = deal.setter_id ? (profileMap.get(deal.setter_id) ?? '—') : null

  function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await modifierRecurringDeal(deal.id, {
        client_name:      fd.get('client_name') as string,
        closer_id:        (fd.get('closer_id') as string) || null,
        setter_id:        (fd.get('setter_id') as string) || null,
        montant_mensuel:  Number(fd.get('montant_mensuel')),
        versements_total: fd.get('versements_total') ? Number(fd.get('versements_total')) : null,
        notes:            (fd.get('notes') as string) || null,
      })
      setEditOpen(false)
    })
  }

  const reçues         = deal.recurring_occurrences.filter(o => o.recu)
  const total          = reçues.reduce((s, o) => s + (o.montant_recu ?? 0), 0)
  const nTotal         = deal.versements_total ?? deal.recurring_occurrences.length
  const versProgress   = `${reçues.length}/${nTotal} versement${nTotal > 1 ? 's' : ''}`
  const hasNextVers    = reçues.length < nTotal
  const nextVersNum    = reçues.length + 1
  const [encaisserOpen, setEncaisserOpen]   = useState(false)
  const [encaisserMontant, setEncaisserMontant] = useState(String(deal.montant_mensuel))
  const [encaisserPending, startEncaisser]  = useTransition()

  function handleEncaisser() {
    const val = Number(encaisserMontant)
    if (!val || val <= 0) return
    startEncaisser(async () => {
      await encaisserProchainVersement(deal.id, val)
      setEncaisserOpen(false)
    })
  }

  function handleToggleActif() {
    startTransition(async () => {
      if (deal.actif) await desactiverDeal(deal.id)
      else            await reactiverDeal(deal.id)
    })
  }

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-sm overflow-hidden transition-all',
      deal.actif ? 'border-gray-100' : 'border-gray-100 opacity-60',
    )}>
      <div className="px-5 py-4 flex items-center gap-4">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          deal.actif ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400',
        )}>
          {deal.client_name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditOpen(v => !v)}
              className="text-sm font-semibold text-gray-900 truncate hover:text-violet-600 transition-colors text-left"
            >
              {deal.client_name}
            </button>
            {!deal.actif && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 uppercase">
                Inactif
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {dollar(deal.montant_mensuel)}/versement
            {closerNom && ` · ${closerNom}`}
            {setterNom && ` + ${setterNom}`}
            {' · '}
            <span className={reçues.length === nTotal ? 'text-green-600 font-medium' : 'text-violet-600 font-medium'}>
              {versProgress} reçu{reçues.length > 1 ? 's' : ''}
            </span>
            {reçues.length > 0 && ` · ${dollar(total)} collecté`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {deal.actif && hasNextVers && (
            <button
              onClick={() => setEncaisserOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
            >
              <CheckCircle2 size={11} />
              Versement {nextVersNum}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleToggleActif} disabled={pending}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-40',
                deal.actif
                  ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                  : 'bg-green-50 text-green-600 hover:bg-green-100',
              )}
            >
              {deal.actif ? 'Désactiver' : 'Réactiver'}
            </button>
          )}
          <button
            onClick={() => setOuvert(v => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {ouvert ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Encaisser prochain versement — inline panel */}
      {encaisserOpen && (
        <div className="border-t border-violet-100 bg-violet-50/40 px-5 py-3 flex items-center gap-3">
          <span className="text-sm text-violet-700 font-medium shrink-0">
            Versement {nextVersNum}/{nTotal} —
          </span>
          <input
            type="number" value={encaisserMontant}
            onChange={e => setEncaisserMontant(e.target.value)}
            min="0" step="0.01"
            className="w-32 px-2.5 py-1.5 rounded-lg border border-violet-200 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          />
          <span className="text-sm text-gray-400">$</span>
          <button
            onClick={handleEncaisser} disabled={encaisserPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={12} />
            {encaisserPending ? 'Enregistrement…' : 'Encaisser'}
          </button>
          <button onClick={() => setEncaisserOpen(false)} className="text-gray-300 hover:text-gray-500 ml-auto">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Edit panel */}
      {editOpen && (
        <form onSubmit={handleSaveEdit} className="border-t border-blue-100 bg-blue-50/30 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Modifier l'entente</p>
            <button type="button" onClick={() => setEditOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Client</label>
              <input name="client_name" defaultValue={deal.client_name} required
                className={INPUT + ' text-sm'} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Montant / versement ($)</label>
              <input name="montant_mensuel" type="number" step="0.01" min="0" defaultValue={deal.montant_mensuel} required
                className={INPUT + ' text-sm'} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Closer</label>
              <select name="closer_id" defaultValue={deal.closer_id ?? ''} className={INPUT + ' text-sm'}>
                <option value="">— Aucun —</option>
                {closers.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Setter</label>
              <select name="setter_id" defaultValue={deal.setter_id ?? ''} className={INPUT + ' text-sm'}>
                <option value="">— Aucun —</option>
                {setters.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nb versements</label>
              <select name="versements_total" defaultValue={deal.versements_total ?? ''} className={INPUT + ' text-sm'}>
                <option value="">—</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input name="notes" defaultValue={deal.notes ?? ''} className={INPUT + ' text-sm'} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEditOpen(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Annuler</button>
            <button type="submit" disabled={pending}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
              {pending ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      )}

      {ouvert && (
        <div className="border-t border-gray-50 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/80 text-gray-400 font-medium border-b border-gray-100">
                <th className="px-5 py-2 text-left">Versement</th>
                <th className="px-4 py-2 text-right">Attendu</th>
                <th className="px-4 py-2 text-right">Reçu</th>
                <th className="px-4 py-2 text-left">Date reçu</th>
                <th className="px-4 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deal.recurring_occurrences.map((o, idx) => (
                <tr key={o.id} className={cn('hover:bg-gray-50/50', o.recu && 'bg-green-50/30')}>
                  <td className="px-5 py-2 font-medium text-gray-700">
                    #{idx + 1} <span className="text-gray-400 font-normal text-[11px]">({MOIS_FR[o.mois - 1]} {o.annee})</span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {dollar(o.montant_attendu)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-gray-800">
                    {o.recu ? dollar(o.montant_recu ?? 0) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {o.date_recue ? formatDate(o.date_recue) : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={o.recu ? 'green' : 'amber'}
                      icon={o.recu ? <CheckCircle2 size={9} /> : undefined}
                    >
                      {o.recu ? 'Reçu' : 'En attente'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deal.notes && (
            <p className="px-5 py-2 text-[11px] text-gray-400 italic border-t border-gray-50">{deal.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Vue principale ─────────────────────────────────────────────────────

function toValidFiltre(s: string | undefined): Filtre {
  if (s === 'semaine' || s === 'mois' || s === 'par_mois' || s === 'tout') return s
  return 'retard'
}

export default function RecurrentsView({ deals, profiles, isAdmin, initialFiltre }: Props) {
  const now = new Date()
  const [mois,  setMois]     = useState(now.getMonth() + 1)
  const [annee, setAnnee]    = useState(now.getFullYear())
  const [modalOuvert, setModalOuvert] = useState(false)
  const [showInactifs, setShowInactifs] = useState(false)
  const [filtre, setFiltre]  = useState<Filtre>(() => toValidFiltre(initialFiltre))

  const profileMap = useMemo(
    () => new Map(profiles.map(p => [p.id, p.full_name ?? 'Inconnu'])),
    [profiles],
  )

  const moisLabel = `${MOIS_FR[mois - 1]} ${annee}`

  function navMois(delta: number) {
    let m = mois + delta
    let a = annee
    if (m > 12) { m = 1;  a++ }
    if (m < 1)  { m = 12; a-- }
    setMois(m)
    setAnnee(a)
  }

  // Occurrences en retard (date passée + non reçues, tous deals actifs)
  const enRetard = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const rows: { occ: Occurrence; deal: Deal }[] = []
    for (const d of deals) {
      if (!d.actif) continue
      for (const occ of d.recurring_occurrences) {
        if (!occ.recu && occ.date_attendue < todayStr)
          rows.push({ occ, deal: d })
      }
    }
    return rows.sort((a, b) => a.occ.date_attendue.localeCompare(b.occ.date_attendue))
  }, [deals])

  // Occurrences cette semaine (7 jours à partir d'aujourd'hui, non reçues)
  const occsSemaine = useMemo(() => {
    const todayStr   = new Date().toISOString().split('T')[0]
    const weekEndDate = new Date(now)
    weekEndDate.setDate(now.getDate() + 7)
    const weekEndStr = weekEndDate.toISOString().split('T')[0]
    const rows: { occ: Occurrence; deal: Deal }[] = []
    for (const d of deals) {
      if (!d.actif) continue
      for (const occ of d.recurring_occurrences) {
        if (!occ.recu && occ.date_attendue >= todayStr && occ.date_attendue <= weekEndStr)
          rows.push({ occ, deal: d })
      }
    }
    return rows.sort((a, b) => a.occ.date_attendue.localeCompare(b.occ.date_attendue))
  }, [deals])

  // Occurrences pour le mois sélectionné (tous deals actifs)
  const occsMois = useMemo(() => {
    const rows: { occ: Occurrence; deal: Deal }[] = []
    for (const d of deals) {
      if (!d.actif) continue
      const occ = d.recurring_occurrences.find(o => o.mois === mois && o.annee === annee)
      if (occ) rows.push({ occ, deal: d })
    }
    return rows.sort((a, b) => a.occ.date_attendue.localeCompare(b.occ.date_attendue))
  }, [deals, mois, annee])

  const nbRecus   = occsMois.filter(r => r.occ.recu).length
  const nbAttente = occsMois.length - nbRecus
  const totalMois = occsMois.filter(r => r.occ.recu).reduce((s, r) => s + (r.occ.montant_recu ?? 0), 0)

  // "Ce mois" quick-filter: current month, not received, from today
  const curMoisFilter = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const curM = now.getMonth() + 1
    const curY = now.getFullYear()
    const rows: { occ: Occurrence; deal: Deal }[] = []
    for (const d of deals) {
      if (!d.actif) continue
      for (const occ of d.recurring_occurrences) {
        if (!occ.recu && occ.mois === curM && occ.annee === curY && occ.date_attendue >= todayStr)
          rows.push({ occ, deal: d })
      }
    }
    return rows.sort((a, b) => a.occ.date_attendue.localeCompare(b.occ.date_attendue))
  }, [deals])

  const actifsDeals   = deals.filter(d => d.actif)
  const inactifsDeals = deals.filter(d => !d.actif)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <PageHeader
        titre="Versements"
        subtitle="Suivi des ententes de paiement (2 ou 3 versements)"
        action={
          <button
            onClick={() => setModalOuvert(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={15} />

            Nouvelle entente
          </button>
        }
      />

      {/* ── Filtres rapides ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'retard',    label: 'En retard',     count: enRetard.length      },
          { key: 'semaine',   label: 'Cette semaine',  count: occsSemaine.length   },
          { key: 'mois',      label: 'Ce mois',        count: curMoisFilter.length },
          { key: 'par_mois',  label: 'Par mois',       count: occsMois.length      },
          { key: 'tout',      label: 'Tout voir',      count: 0                    },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key)}
            className={cn(
              'flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-all',
              filtre === f.key
                ? f.key === 'retard'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-violet-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {f.label}
            {f.count > 0 && (
              <span className={cn(
                'text-[11px] font-bold px-1.5 py-0.5 rounded-full',
                filtre === f.key
                  ? f.key === 'retard' ? 'bg-red-500 text-white' : 'bg-violet-100 text-violet-700'
                  : f.key === 'retard' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600',
              )}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Vue filtrée : En retard ── */}
      {filtre === 'retard' && (
        <div className="bg-white rounded-xl border-2 border-red-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-red-800">
                  Versements non reçus — {enRetard.length} en retard
                </h3>
                <p className="text-xs text-red-400 mt-0.5">Ces clients n&apos;ont pas encore payé leur versement dû</p>
              </div>
            </div>
            <span className="text-sm font-bold tabular-nums text-red-700">
              {dollar(enRetard.reduce((s, r) => s + r.occ.montant_attendu, 0))}
            </span>
          </div>
          {enRetard.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">Aucun versement en retard 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-50/60 text-xs font-medium text-red-400 uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left">Client · Équipe</th>
                    <th className="px-4 py-2.5 text-left">Devait être reçu</th>
                    <th className="px-4 py-2.5 text-right">Montant ($)</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {enRetard.map(({ occ, deal }) => (
                    <OccurrenceRow key={occ.id} occ={occ} deal={deal} profileMap={profileMap} profiles={profiles} isAdmin={isAdmin} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Vue filtrée : Cette semaine ── */}
      {filtre === 'semaine' && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-800">
              À encaisser cette semaine — {occsSemaine.length} versement{occsSemaine.length !== 1 ? 's' : ''}
            </h3>
            <span className="text-sm font-bold tabular-nums text-amber-700">
              {dollar(occsSemaine.reduce((s, r) => s + r.occ.montant_attendu, 0))}
            </span>
          </div>
          {occsSemaine.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">Aucun versement attendu cette semaine</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50/60 text-xs font-medium text-amber-400 uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left">Client · Équipe</th>
                    <th className="px-4 py-2.5 text-left">Date attendue</th>
                    <th className="px-4 py-2.5 text-right">Montant ($)</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {occsSemaine.map(({ occ, deal }) => (
                    <OccurrenceRow key={occ.id} occ={occ} deal={deal} profileMap={profileMap} profiles={profiles} isAdmin={isAdmin} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Vue filtrée : Ce mois ── */}
      {filtre === 'mois' && (
        <div className="bg-white rounded-xl border border-violet-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-violet-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-violet-800">
              À encaisser ce mois — {curMoisFilter.length} versement{curMoisFilter.length !== 1 ? 's' : ''}
            </h3>
            <span className="text-sm font-bold tabular-nums text-violet-700">
              {dollar(curMoisFilter.reduce((s, r) => s + r.occ.montant_attendu, 0))}
            </span>
          </div>
          {curMoisFilter.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">Aucun versement à venir ce mois</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-violet-50/60 text-xs font-medium text-violet-400 uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left">Client · Équipe</th>
                    <th className="px-4 py-2.5 text-left">Date attendue</th>
                    <th className="px-4 py-2.5 text-right">Montant ($)</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {curMoisFilter.map(({ occ, deal }) => (
                    <OccurrenceRow key={occ.id} occ={occ} deal={deal} profileMap={profileMap} profiles={profiles} isAdmin={isAdmin} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Vue par mois (filtre = par_mois) ── */}
      {filtre === 'par_mois' && (
        <div className="space-y-4">
          {/* Sélecteur de mois */}
          <div className="bg-white rounded-xl border border-violet-100 shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navMois(-1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-base font-bold text-gray-900 min-w-[160px] text-center">{moisLabel}</span>
              <button
                onClick={() => navMois(+1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">À recevoir</p>
                <p className="text-sm font-bold text-amber-600">
                  {nbAttente} · {dollar(occsMois.filter(r => !r.occ.recu).reduce((s, r) => s + r.occ.montant_attendu, 0))}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Reçus</p>
                <p className="text-sm font-bold text-green-600">{nbRecus} · {dollar(totalMois)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Total mois</p>
                <p className="text-sm font-bold text-gray-800">
                  {dollar(occsMois.reduce((s, r) => s + r.occ.montant_attendu, 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Liste des clients */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">
                Clients récurrents — {moisLabel}
              </h3>
            </div>
            {occsMois.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <RefreshCw size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucun deal récurrent pour ce mois</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-xs font-medium text-gray-400 uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left">Client · Équipe</th>
                      <th className="px-4 py-2.5 text-left">Date de contact</th>
                      <th className="px-4 py-2.5 text-right">Montant ($)</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occsMois.map(({ occ, deal }) => (
                      <OccurrenceRow
                        key={occ.id}
                        occ={occ}
                        deal={deal}
                        profileMap={profileMap}
                        profiles={profiles}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vue complète (filtre = tout) ── */}
      {filtre === 'tout' && enRetard.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-violet-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-violet-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-violet-800">
                  Versements non reçus — {enRetard.length} en retard
                </h3>
                <p className="text-xs text-violet-500 mt-0.5">
                  Ces clients n&apos;ont pas encore payé leur versement dû
                </p>
              </div>
            </div>
            <span className="text-sm font-bold tabular-nums text-violet-700">
              {dollar(enRetard.reduce((s, r) => s + r.occ.montant_attendu, 0))}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-violet-50/50 text-xs font-medium text-violet-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Client · Équipe</th>
                  <th className="px-4 py-2.5 text-left">Devait être reçu</th>
                  <th className="px-4 py-2.5 text-right">Montant ($)</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {enRetard.map(({ occ, deal }) => (
                  <OccurrenceRow
                    key={occ.id}
                    occ={occ}
                    deal={deal}
                    profileMap={profileMap}
                    profiles={profiles}
                    isAdmin={isAdmin}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Vue complète : navigation mois + deals ── */}
      {filtre === 'tout' && <>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navMois(-1)}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-bold text-gray-900 min-w-[160px] text-center">{moisLabel}</span>
          <button
            onClick={() => navMois(+1)}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">À recevoir</p>
            <p className="text-sm font-bold text-amber-600">{nbAttente} paiement{nbAttente !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Reçus</p>
            <p className="text-sm font-bold text-green-600">{nbRecus} · {dollar(totalMois)}</p>
          </div>
        </div>
      </div>

      {/* ── À encaisser ce mois ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            À encaisser — {moisLabel}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Ajuste le montant si besoin avant de cocher
          </p>
        </div>

        {occsMois.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <RefreshCw size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucun deal récurrent pour ce mois</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Client · Équipe</th>
                  <th className="px-4 py-2.5 text-left">Date de contact</th>
                  <th className="px-4 py-2.5 text-right">Montant ($)</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {occsMois.map(({ occ, deal }) => (
                  <OccurrenceRow
                    key={occ.id}
                    occ={occ}
                    deal={deal}
                    profileMap={profileMap}
                    profiles={profiles}
                    isAdmin={isAdmin}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Deals actifs ── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Deals récurrents actifs ({actifsDeals.length})
        </h3>
        {actifsDeals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center">
            <p className="text-sm text-gray-400">Aucun deal actif</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actifsDeals.map(d => (
              <DealCard key={d.id} deal={d} profileMap={profileMap} profiles={profiles} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </div>

      {/* ── Deals inactifs ── */}
      {inactifsDeals.length > 0 && (
        <div>
          <button
            onClick={() => setShowInactifs(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3"
          >
            {showInactifs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Deals inactifs ({inactifsDeals.length})
          </button>
          {showInactifs && (
            <div className="space-y-3">
              {inactifsDeals.map(d => (
                <DealCard key={d.id} deal={d} profileMap={profileMap} profiles={profiles} isAdmin={isAdmin} />
              ))}
            </div>
          )}
        </div>
      )}

      </>}

      {modalOuvert && (
        <ModalNouveauDeal
          profiles={profiles}
          onClose={() => setModalOuvert(false)}
        />
      )}

    </div>
  )
}
