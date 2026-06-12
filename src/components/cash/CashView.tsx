'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Trash2, DollarSign, Wallet, TrendingDown, Zap, Clock } from 'lucide-react'
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
  entrees:     CashEntry[]
  closers:     Profil[]
  setters:     Profil[]
  allProfiles: Profil[]
  isAdmin:     boolean
}

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
  const moisCourt = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.']
  return `${d} ${moisCourt[m - 1]} ${y}`
}

// ── KPI Card ──────────────────────────────────────────────────────

function KpiCard({
  title, value, subtitle, color, icon: Icon,
}: {
  title: string
  value: string
  subtitle?: string
  color: 'green' | 'blue' | 'red'
  icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  const c = {
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    blue:  { bg: 'bg-blue-100',  text: 'text-blue-600'  },
    red:   { bg: 'bg-red-100',   text: 'text-red-600'   },
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

function Champ({
  label, children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Modal formulaire (ajout + modification) ───────────────────────

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
      if (isEdit) {
        await modifierCash(entry.id, fd)
      } else {
        await creerCash(fd)
      }
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
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Date">
              <input
                name="entry_date" type="date" required
                defaultValue={entry?.entry_date ?? today}
                className={INPUT_CLS}
              />
            </Champ>
            <Champ label="Méthode">
              <select
                name="methode"
                defaultValue={entry?.methode ?? ''}
                className={INPUT_CLS}
              >
                <option value="">— Aucune —</option>
                {METHODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Champ>
          </div>

          <Champ label="Nom du client">
            <input
              name="client_name"
              placeholder="Entreprise Dupont"
              defaultValue={entry?.client_name ?? ''}
              className={INPUT_CLS}
            />
          </Champ>

          <div className="grid grid-cols-2 gap-4">
            <Champ label="Closer">
              <select
                name="closed_by"
                defaultValue={entry?.closed_by ?? ''}
                className={INPUT_CLS}
              >
                <option value="">— Aucun —</option>
                {closers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
                ))}
              </select>
            </Champ>
            <Champ label="Setter">
              <select
                name="set_by"
                defaultValue={entry?.set_by ?? ''}
                className={INPUT_CLS}
              >
                <option value="">— Aucun —</option>
                {setters.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>
                ))}
              </select>
            </Champ>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Champ label="Montant total ($)">
              <input
                name="montant_courant" type="number" min="0" step="0.01" required
                defaultValue={entry?.montant_courant ?? 0}
                className={INPUT_CLS}
              />
            </Champ>
            <Champ label="Collecté ($)">
              <input
                name="collected" type="number" min="0" step="0.01"
                defaultValue={entry?.collected ?? 0}
                className={INPUT_CLS}
              />
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
                  <input
                    type="radio" name="close_type" value={v}
                    defaultChecked={entry?.close_type === v || (!entry && v === 'on_the_spot')}
                    className="sr-only"
                  />
                  {v === 'on_the_spot' ? 'On the spot' : 'Follow up'}
                </label>
              ))}
            </div>
          </Champ>

          <Champ label="Notes (optionnel)">
            <textarea
              name="notes" rows={2} placeholder="Remarques..."
              defaultValue={entry?.notes ?? ''}
              className={`${INPUT_CLS} resize-none`}
            />
          </Champ>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={pending}
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

// ── Composant principal ───────────────────────────────────────────

export default function CashView({
  entrees, closers, setters, allProfiles, isAdmin,
}: Props) {
  const [moisSelect, setMoisSelect]   = useState<string>('tout')
  const [modalEntry,  setModalEntry]  = useState<CashEntry | null | 'new'>(null)
  const [pending, startTransition]    = useTransition()

  const profileMap = useMemo(
    () => new Map(allProfiles.map(p => [p.id, p.full_name ?? 'Inconnu'])),
    [allProfiles],
  )

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

  const nOnTheSpot = filtrees.filter(e => e.close_type === 'on_the_spot').length
  const nFollowUp  = filtrees.filter(e => e.close_type === 'follow_up').length
  const nTyped     = nOnTheSpot + nFollowUp
  const pctSpot    = nTyped > 0 ? Math.round((nOnTheSpot / nTyped) * 100) : 0
  const pctFU      = nTyped > 0 ? Math.round((nFollowUp  / nTyped) * 100) : 0

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée cash ?')) return
    startTransition(async () => { await supprimerCash(id) })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivi des encaissements</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={moisSelect}
            onChange={e => setMoisSelect(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="tout">Tous les mois</option>
            {moisOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setModalEntry('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Ajouter
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <KpiCard
          title="Montant total"
          value={dollar(totaux.montant)}
          icon={DollarSign}
          color="green"
          subtitle={`${filtrees.length} entrée${filtrees.length !== 1 ? 's' : ''}`}
        />
        <KpiCard
          title="Cash collecté"
          value={dollar(totaux.collected)}
          icon={Wallet}
          color="blue"
          subtitle={`${pctCollecte} % encaissé`}
        />
        <KpiCard
          title="Solde à collecter"
          value={dollar(totaux.aCollecter)}
          icon={TrendingDown}
          color="red"
          subtitle="Montants en attente"
        />
        <KpiCard
          title="On the spot"
          value={String(nOnTheSpot)}
          icon={Zap}
          color="green"
          subtitle={nTyped > 0 ? `${pctSpot} % des closes` : 'Aucune donnée'}
        />
        <KpiCard
          title="Follow up"
          value={String(nFollowUp)}
          icon={Clock}
          color="blue"
          subtitle={nTyped > 0 ? `${pctFU} % des closes` : 'Aucune donnée'}
        />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Entrées cash</h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {filtrees.length} entrée{filtrees.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filtrees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">Aucune entrée pour cette période</p>
            <p className="text-xs text-gray-300 mt-1">
              Ajoutez votre première entrée avec le bouton ci-dessus.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Client</th>
                  <th className="px-4 py-2.5 text-left">Closer</th>
                  <th className="px-4 py-2.5 text-left">Setter</th>
                  <th className="px-4 py-2.5 text-left">Type</th>
                  <th className="px-4 py-2.5 text-right">Montant</th>
                  <th className="px-4 py-2.5 text-right">Collecté</th>
                  <th className="px-4 py-2.5 text-right">À collecter</th>
                  <th className="px-4 py-2.5 text-left">Méthode</th>
                  <th className="px-4 py-2.5 text-left">Notes</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrees.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {formatDate(e.entry_date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[140px] truncate">
                      {e.client_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.closed_by ? (profileMap.get(e.closed_by) ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.set_by ? (profileMap.get(e.set_by) ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {e.close_type === 'on_the_spot' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                          <Zap size={9} />On the spot
                        </span>
                      )}
                      {e.close_type === 'follow_up' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          <Clock size={9} />Follow up
                        </span>
                      )}
                      {!e.close_type && <span className="text-gray-300 text-xs">—</span>}
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
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {e.methode ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">
                      {e.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModalEntry(e)}
                          disabled={pending}
                          title="Modifier"
                          className="p-1.5 text-gray-300 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors disabled:opacity-40"
                        >
                          <Pencil size={13} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(e.id)}
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
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50 font-semibold text-gray-700">
                  <td
                    className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide"
                    colSpan={5}
                  >
                    Totaux
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
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

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
