'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, Clock, AlertCircle,
  User, Calendar, DollarSign, Pencil, X, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { dollar, MOIS_FR, formatDate } from '@/lib/constants'
import Badge from '@/components/ui/Badge'
import {
  marquerRecu, annulerRecu, modifierRecurringDeal, ajouterPaiementManuel,
  modifierDateOccurrence, supprimerOccurrence, ajouterOccurrencesEnLot,
} from '@/app/(portal)/recurrents/actions'

// ── Types ─────────────────────────────────────────────────────────────

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
  methode_paiement:      string | null
  recurring_occurrences: Occurrence[]
}

interface Profile {
  id:        string
  full_name: string | null
  roles:     string[]
}

const INPUT = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Ligne occurrence ──────────────────────────────────────────────────

function OccurrenceRow({ occ, isAdmin }: { occ: Occurrence; isAdmin: boolean }) {
  const [amount, setAmount]          = useState(String(occ.montant_attendu))
  const [editDate, setEditDate]      = useState(false)
  const [newDate, setNewDate]        = useState(occ.date_attendue)
  const [pending, startTransition]   = useTransition()
  const [datePending, startDateTrans] = useTransition()

  const today   = new Date(); today.setHours(0, 0, 0, 0)
  const dueDate = new Date(occ.date_attendue + 'T00:00:00')
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000)

  const urgency = occ.recu ? 'done'
    : diffDays < 0   ? 'overdue'
    : diffDays === 0 ? 'today'
    : diffDays <= 7  ? 'soon'
    : 'upcoming'

  function handleMarquer() {
    const val = Number(amount)
    if (!val || val <= 0) return
    startTransition(async () => { await marquerRecu(occ.id, val) })
  }

  function handleAnnuler() {
    if (!confirm('Annuler ce paiement ? Les entrées Cash Collect et Paie seront supprimées.')) return
    startTransition(async () => { await annulerRecu(occ.id) })
  }

  function handleSaveDate() {
    if (!newDate || newDate === occ.date_attendue) { setEditDate(false); return }
    startDateTrans(async () => {
      await modifierDateOccurrence(occ.id, newDate)
      setEditDate(false)
    })
  }

  return (
    <tr className={cn(
      'border-b border-gray-50 text-sm',
      occ.recu ? 'bg-green-50/30' : urgency === 'overdue' ? 'bg-red-50/20' : '',
    )}>
      <td className="px-5 py-3">
        <div className="font-medium text-gray-800">
          {MOIS_FR[occ.mois - 1]} {occ.annee}
        </div>
        {!occ.recu && editDate ? (
          <div className="flex items-center gap-1.5 mt-1">
            <input
              type="date" value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="px-1.5 py-0.5 rounded border border-violet-200 text-[11px] focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <button
              onClick={handleSaveDate} disabled={datePending}
              className="text-[10px] font-semibold px-2 py-0.5 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
            >
              {datePending ? '…' : 'OK'}
            </button>
            <button onClick={() => setEditDate(false)} className="text-gray-300 hover:text-gray-500">
              <X size={11} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-gray-400">{formatDate(occ.date_attendue)}</span>
            {!occ.recu && (
              <button
                onClick={() => setEditDate(true)}
                className="text-gray-200 hover:text-violet-400 transition-colors"
                title="Modifier la date"
              >
                <Pencil size={10} />
              </button>
            )}
          </div>
        )}
      </td>

      <td className="px-5 py-3 text-right tabular-nums text-gray-600">
        {dollar(occ.montant_attendu)}
      </td>

      <td className="px-5 py-3 text-right">
        {occ.recu ? (
          <span className="font-semibold tabular-nums text-green-700">{dollar(occ.montant_recu ?? 0)}</span>
        ) : (
          <input
            type="number" value={amount}
            onChange={e => setAmount(e.target.value)}
            min="0" step="0.01"
            className="w-28 px-2 py-1 rounded border border-gray-200 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        )}
      </td>

      <td className="px-5 py-3 text-center">
        {occ.recu ? (
          <span className="text-xs text-gray-500">{occ.date_recue ? formatDate(occ.date_recue) : '—'}</span>
        ) : (
          <span className={cn(
            'text-[11px] font-semibold px-2 py-0.5 rounded-full',
            urgency === 'overdue' ? 'bg-red-100 text-red-700'
            : urgency === 'today' ? 'bg-amber-100 text-amber-700'
            : urgency === 'soon'  ? 'bg-violet-100 text-violet-700'
            : 'bg-gray-100 text-gray-500',
          )}>
            {urgency === 'overdue' ? `${Math.abs(diffDays)}j en retard`
             : urgency === 'today'  ? "Aujourd'hui"
             : urgency === 'soon'   ? `Dans ${diffDays}j`
             : `Dans ${diffDays}j`}
          </span>
        )}
      </td>

      <td className="px-5 py-3 text-center">
        <Badge
          variant={occ.recu ? 'green' : urgency === 'overdue' ? 'red' : 'amber'}
          icon={occ.recu ? <CheckCircle2 size={9} /> : urgency === 'overdue' ? <AlertCircle size={9} /> : <Clock size={9} />}
        >
          {occ.recu ? 'Reçu' : urgency === 'overdue' ? 'En retard' : 'En attente'}
        </Badge>
      </td>

      <td className="px-5 py-3 text-right">
        {!occ.recu ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleMarquer}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={12} />
              {pending ? '…' : 'Marquer reçu'}
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  if (!confirm('Supprimer ce versement du planning ?')) return
                  startTransition(async () => { await supprimerOccurrence(occ.id) })
                }}
                disabled={pending}
                className="text-[11px] text-gray-300 hover:text-red-400 transition-colors"
                title="Supprimer cette occurrence"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ) : isAdmin ? (
          <button
            onClick={handleAnnuler}
            disabled={pending}
            className="text-[11px] text-gray-300 hover:text-red-400 transition-colors"
          >
            Annuler
          </button>
        ) : null}
      </td>
    </tr>
  )
}

// ── Composant principal ───────────────────────────────────────────────

export default function RecurringClientDetail({
  deal,
  profiles,
  isAdmin,
}: {
  deal:     Deal
  profiles: Profile[]
  isAdmin:  boolean
}) {
  const [editOpen, setEditOpen]         = useState(false)
  const [payOpen, setPayOpen]           = useState(false)
  const [addOccsOpen, setAddOccsOpen]   = useState(false)
  const [pending, startTransition]      = useTransition()
  const [payPending, startPayTrans]     = useTransition()
  const [addPending, startAddTrans]     = useTransition()

  const today = new Date().toISOString().split('T')[0]

  const profileMap = new Map(profiles.map(p => [p.id, p.full_name ?? 'Inconnu']))
  const closers    = profiles.filter(p => p.roles?.includes('closer'))
  const setters    = profiles.filter(p => p.roles?.includes('setter'))

  const closerNom  = deal.closer_id ? (profileMap.get(deal.closer_id) ?? '—') : null
  const setterNom  = deal.setter_id ? (profileMap.get(deal.setter_id) ?? '—') : null

  const occs       = [...deal.recurring_occurrences].sort((a, b) => a.date_attendue.localeCompare(b.date_attendue))
  const reçues     = occs.filter(o => o.recu)
  const nTotal     = deal.versements_total ?? occs.length
  const totalReçu  = reçues.reduce((s, o) => s + (o.montant_recu ?? 0), 0)
  const totalAttendu = nTotal * deal.montant_mensuel
  const reste      = Math.max(0, totalAttendu - totalReçu)
  const pct        = totalAttendu > 0 ? Math.round((totalReçu / totalAttendu) * 100) : 0

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
        methode_paiement: (fd.get('methode_paiement') as string) || null,
      })
      setEditOpen(false)
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Retour */}
      <Link
        href="/recurrents"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        Retour aux versements
      </Link>

      {/* En-tête client */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0',
            deal.actif ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400',
          )}>
            {deal.client_name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{deal.client_name}</h1>
              {!deal.actif && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-400 uppercase">Inactif</span>
              )}
              <button
                onClick={() => setEditOpen(v => !v)}
                className="text-gray-300 hover:text-violet-500 transition-colors ml-1"
                title="Modifier l'entente"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => setAddOccsOpen(v => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors ml-1"
                title="Ajouter des versements au planning"
              >
                <Plus size={10} />
                Versements
              </button>
            </div>

            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              {closerNom && (
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-violet-400" />
                  Closer : <span className="text-violet-700 font-medium">{closerNom}</span>
                </span>
              )}
              {setterNom && (
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-blue-400" />
                  Setter : <span className="text-blue-700 font-medium">{setterNom}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400" />
                Début : {formatDate(deal.date_debut)}
              </span>
              <span className="flex items-center gap-1.5">
                <DollarSign size={13} className="text-gray-400" />
                {dollar(deal.montant_mensuel)} / versement
              </span>
              {deal.methode_paiement && (
                <span className={cn(
                  'flex items-center text-xs font-semibold px-2 py-0.5 rounded-full',
                  deal.methode_paiement === 'carte' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-700',
                )}>
                  {deal.methode_paiement === 'carte' ? '💳 Carte de crédit' : '🏦 Virement'}
                </span>
              )}
            </div>

            {deal.notes && (
              <p className="text-xs text-gray-400 italic mt-2">{deal.notes}</p>
            )}
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{reçues.length}/{nTotal} versements reçus</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pct === 100 ? 'bg-green-500' : 'bg-violet-500',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-medium mt-1">
            <span className="text-green-700">{dollar(totalReçu)} reçu</span>
            {reste > 0
              ? <span className="text-amber-700">{dollar(reste)} restant</span>
              : <span className="text-green-700">Complété ✓</span>
            }
          </div>
        </div>
      </div>

      {/* Formulaire d'édition */}
      {editOpen && (
        <form onSubmit={handleSaveEdit} className="bg-white rounded-xl border border-blue-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-blue-700">Modifier l&apos;entente</p>
            <button type="button" onClick={() => setEditOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Client</label>
              <input name="client_name" defaultValue={deal.client_name} required className={INPUT} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Montant / versement ($)</label>
              <input name="montant_mensuel" type="number" step="0.01" min="0" defaultValue={deal.montant_mensuel} required className={INPUT} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Closer</label>
              <select name="closer_id" defaultValue={deal.closer_id ?? ''} className={INPUT}>
                <option value="">— Aucun —</option>
                {closers.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Setter</label>
              <select name="setter_id" defaultValue={deal.setter_id ?? ''} className={INPUT}>
                <option value="">— Aucun —</option>
                {setters.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nb versements</label>
              <select name="versements_total" defaultValue={deal.versements_total ?? ''} className={INPUT}>
                <option value="">—</option>
                {[2, 3, 4, 5, 6, 12].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Méthode de paiement</label>
              <select name="methode_paiement" defaultValue={deal.methode_paiement ?? ''} className={INPUT}>
                <option value="">— Non spécifié —</option>
                <option value="carte">💳 Carte de crédit</option>
                <option value="virement">🏦 Virement</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input name="notes" defaultValue={deal.notes ?? ''} className={INPUT} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditOpen(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Annuler</button>
            <button type="submit" disabled={pending}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
              {pending ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      )}

      {/* Panneau — Ajouter des versements au planning */}
      {addOccsOpen && (
        <form
          onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const versements = Number(fd.get('versements'))
            const montant    = Number(fd.get('montant'))
            const date_debut = fd.get('date_debut') as string
            const frequence  = fd.get('frequence') as 'mensuel' | 'hebdomadaire'
            if (!versements || !montant || !date_debut) return
            startAddTrans(async () => {
              await ajouterOccurrencesEnLot(deal.id, { date_debut, versements, montant, frequence })
              setAddOccsOpen(false)
            })
          }}
          className="bg-white rounded-xl border border-violet-100 shadow-sm p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-700">Ajouter des versements au planning</p>
              <p className="text-xs text-gray-400 mt-0.5">Les versements déjà reçus ne sont pas touchés</p>
            </div>
            <button type="button" onClick={() => setAddOccsOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fréquence</label>
              <select name="frequence" defaultValue="hebdomadaire" className={INPUT}>
                <option value="mensuel">Mensuel</option>
                <option value="hebdomadaire">Hebdomadaire (chaque semaine)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre de versements</label>
              <input name="versements" type="number" min="1" step="1" defaultValue="4" required className={INPUT} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date du 1er versement</label>
              <input name="date_debut" type="date" defaultValue={today} required className={INPUT} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Montant / versement ($)</label>
              <input name="montant" type="number" step="0.01" min="0" defaultValue={deal.montant_mensuel} required className={INPUT} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAddOccsOpen(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Annuler</button>
            <button type="submit" disabled={addPending}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
              {addPending ? 'Ajout…' : 'Ajouter au planning'}
            </button>
          </div>
        </form>
      )}

      {/* Historique des paiements */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Historique des paiements</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {dollar(deal.montant_mensuel)} × {nTotal} versements = {dollar(totalAttendu)} total
            </p>
          </div>
          <button
            onClick={() => setPayOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            <Plus size={12} />
            Ajouter un paiement
          </button>
        </div>

        {/* Panneau ajout paiement */}
        {payOpen && (
          <div className="border-b border-violet-100 bg-violet-50/30 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Nouveau paiement</p>
              <button onClick={() => setPayOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={14} /></button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const occId = (fd.get('occurrence_id') as string) || null
                const montant = Number(fd.get('montant'))
                const dateRecue = fd.get('date_recue') as string
                if (!montant || !dateRecue) return
                startPayTrans(async () => {
                  await ajouterPaiementManuel(deal.id, occId, montant, dateRecue)
                  setPayOpen(false)
                })
              }}
              className="grid grid-cols-3 gap-3 items-end"
            >
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Versement concerné</label>
                <select name="occurrence_id" className={INPUT}>
                  <option value="">— Nouveau (hors planning) —</option>
                  {occs.filter(o => !o.recu).map(o => (
                    <option key={o.id} value={o.id}>
                      {MOIS_FR[o.mois - 1]} {o.annee} — {dollar(o.montant_attendu)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Montant reçu ($)</label>
                <input
                  name="montant" type="number" step="0.01" min="0"
                  defaultValue={deal.montant_mensuel}
                  required
                  className={INPUT}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date reçu</label>
                <input name="date_recue" type="date" defaultValue={today} required className={INPUT} />
              </div>
              <div className="col-span-3 flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setPayOpen(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Annuler</button>
                <button
                  type="submit" disabled={payPending}
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {payPending ? 'Enregistrement…' : 'Enregistrer le paiement'}
                </button>
              </div>
            </form>
          </div>
        )}


        {occs.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Aucun versement enregistré</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-5 py-2.5 text-left">Période</th>
                  <th className="px-5 py-2.5 text-right">Attendu</th>
                  <th className="px-5 py-2.5 text-right">Reçu</th>
                  <th className="px-5 py-2.5 text-center">Délai</th>
                  <th className="px-5 py-2.5 text-center">Statut</th>
                  <th className="px-5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {occs.map(o => (
                  <OccurrenceRow key={o.id} occ={o} isAdmin={isAdmin} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50 font-semibold text-sm">
                  <td className="px-5 py-3 text-gray-500">Total</td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-600">{dollar(totalAttendu)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-green-700">{dollar(totalReçu)}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-right">
                    {reste > 0
                      ? <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-full text-xs">{dollar(reste)} restant</span>
                      : <span className="text-green-700 text-xs">Complété ✓</span>
                    }
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
