'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, CheckCircle2, Clock, Trash2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  creerPaye, basculerStatut, supprimerPaye, assignerMVP,
} from '@/app/(portal)/payes/actions'
import { PALIERS, dollar, getPalier } from '@/lib/constants'
import BonusCard  from '@/components/ui/BonusCard'
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
}

interface Profil {
  id: string
  full_name: string | null
  role: string
}

interface BonusItem {
  uid:      string
  nom:      string
  role:     'closer' | 'setter'
  collected: number
  palier:   typeof PALIERS[number] | null
}

interface Props {
  entrees:         PayeEntry[]
  closers:         Profil[]
  setters:         Profil[]
  allProfiles:     Profil[]
  bonusClosers:    BonusItem[]
  bonusSetters:    BonusItem[]
  teamMembers:     Profil[]
  isAdmin:         boolean
  periodesCourant: { label: string; month: number; year: number }[]
  periodeDefaut:   string
}

// ── Helpers ───────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Section bonus ─────────────────────────────────────────────────────

function SectionBonus({ bonusClosers, bonusSetters, isAdmin, teamMembers, periodes }: {
  bonusClosers:  BonusItem[]
  bonusSetters:  BonusItem[]
  isAdmin:       boolean
  teamMembers:   Profil[]
  periodes:      { label: string; month: number; year: number }[]
}) {
  const [mvpOuvert, setMvpOuvert] = useState(false)

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Bonus automatiques — ce mois</h3>
            <p className="text-xs text-gray-400 mt-0.5">Calculés sur le cash collecté via cash_entries</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setMvpOuvert(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <Star size={13} />
              Assigner MVP du mois
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-50">
          <div className="px-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">Closers</p>
            {bonusClosers.length === 0
              ? <p className="text-sm text-gray-400 pb-4">Aucune donnée</p>
              : bonusClosers.map(b => (
                  <BonusCard key={b.uid} nom={b.nom} collected={b.collected} palier={b.palier} type="closer" />
                ))
            }
          </div>
          <div className="px-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">Setters</p>
            {bonusSetters.length === 0
              ? <p className="text-sm text-gray-400 pb-4">Aucune donnée</p>
              : bonusSetters.map(b => (
                  <BonusCard key={b.uid} nom={b.nom} collected={b.collected} palier={b.palier} type="setter" />
                ))
            }
          </div>
        </div>
      </div>

      {mvpOuvert && (
        <ModalMVP
          teamMembers={teamMembers}
          periodes={periodes}
          onClose={() => setMvpOuvert(false)}
        />
      )}
    </>
  )
}

// ── Modal MVP ─────────────────────────────────────────────────────────

function ModalMVP({ teamMembers, periodes, onClose }: {
  teamMembers: Profil[]
  periodes:    { label: string; month: number; year: number }[]
  onClose:     () => void
}) {
  const [periodeIdx, setPeriodeIdx] = useState(0)
  const [personId,   setPersonId]   = useState(teamMembers[0]?.id ?? '')
  const [pending, startTransition]  = useTransition()

  const person = teamMembers.find(m => m.id === personId)

  function handleAssigner() {
    if (!person) return
    const p = periodes[periodeIdx]
    startTransition(async () => {
      await assignerMVP(person.id, person.role, p.label, p.month, p.year)
      onClose()
    })
  }

  return (
    <Modal titre="Assigner le MVP du mois" onClose={onClose} maxWidth="max-w-sm">
      <div className="p-6 space-y-4">
        <div className="bg-amber-50 rounded-lg px-4 py-3 flex items-center gap-3">
          <Star size={18} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Bonus MVP</p>
            <p className="text-xs text-amber-600">+500 $ — une seule attribution par période</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Membre de l'équipe</label>
          <select value={personId} onChange={e => setPersonId(e.target.value)} className={INPUT_CLS}>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name ?? m.id} ({m.role})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Période</label>
          <select value={periodeIdx} onChange={e => setPeriodeIdx(Number(e.target.value))} className={INPUT_CLS}>
            {periodes.map((p, i) => (
              <option key={p.label} value={i}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Annuler
          </button>
          <button
            onClick={handleAssigner} disabled={pending || !person}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {pending ? 'Attribution…' : 'Assigner 500 $'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal ajout ───────────────────────────────────────────────────────

function ModalAjout({ closers, setters, periodes, onClose }: {
  closers:  Profil[]
  setters:  Profil[]
  periodes: { label: string; month: number; year: number }[]
  onClose:  () => void
}) {
  const [periodeIdx, setPeriodeIdx] = useState(0)
  const [pending, startTransition]  = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const p  = periodes[periodeIdx]
    fd.set('period_label', p.label)
    fd.set('month', String(p.month))
    fd.set('year',  String(p.year))
    startTransition(async () => {
      await creerPaye(fd)
      onClose()
    })
  }

  return (
    <Modal titre="Nouvelle entrée de paie" onClose={onClose} scrollable>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Période</label>
          <select value={periodeIdx} onChange={e => setPeriodeIdx(Number(e.target.value))} className={INPUT_CLS}>
            {periodes.map((p, i) => (
              <option key={p.label} value={i}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Nom du client</label>
          <input name="client_name" required placeholder="Entreprise Dupont" className={INPUT_CLS} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Closer</label>
            <select name="closer_id" className={INPUT_CLS}>
              <option value="">— Aucun —</option>
              {closers.map(c => <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Setter</label>
            <select name="setter_id" className={INPUT_CLS}>
              <option value="">— Aucun —</option>
              {setters.map(s => <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { name: 'montant',          label: 'Montant vente ($)'     },
            { name: 'commission',       label: 'Commission closer ($)' },
            { name: 'commission_setter', label: 'Commission setter ($)' },
          ].map(f => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{f.label}</label>
              <input name={f.name} type="number" min="0" step="0.01" defaultValue="0" className={INPUT_CLS} />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Statut</label>
          <select name="statut" defaultValue="En attente" className={INPUT_CLS}>
            <option>En attente</option>
            <option>Payé</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
          <textarea name="notes" rows={2} placeholder="Remarques..." className={`${INPUT_CLS} resize-none`} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">Annuler</button>
          <button type="submit" disabled={pending}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Vue principale admin / CSM ────────────────────────────────────────

export default function AdminView({
  entrees, closers, setters, allProfiles,
  bonusClosers, bonusSetters, teamMembers,
  isAdmin, periodesCourant, periodeDefaut,
}: Props) {
  const [periodeSelect, setPeriodeSelect] = useState<string>('tout')
  const [modalOuverte,  setModalOuverte]  = useState(false)
  const [pending, startTransition]        = useTransition()

  const profileMap = useMemo(
    () => new Map(allProfiles.map(p => [p.id, p.full_name ?? 'Inconnu'])),
    [allProfiles],
  )

  const filtrees = useMemo(
    () => periodeSelect === 'tout' ? entrees : entrees.filter(e => e.period_label === periodeSelect),
    [entrees, periodeSelect],
  )

  const totaux = useMemo(() => ({
    montant:          filtrees.reduce((s, e) => s + (e.montant ?? 0), 0),
    commission:       filtrees.reduce((s, e) => s + (e.commission ?? 0), 0),
    commissionSetter: filtrees.reduce((s, e) => s + (e.commission_setter ?? 0), 0),
  }), [filtrees])

  function handleToggle(id: string, statut: string) {
    startTransition(async () => { await basculerStatut(id, statut) })
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée de paie ?')) return
    startTransition(async () => { await supprimerPaye(id) })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <PageHeader titre="Paies" subtitle="Gestion des commissions et bonus" />

      <SectionBonus
        bonusClosers={bonusClosers}
        bonusSetters={bonusSetters}
        isAdmin={isAdmin}
        teamMembers={teamMembers}
        periodes={periodesCourant}
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Entrées de paie</h3>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              {filtrees.length} entrée{filtrees.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={periodeSelect}
              onChange={e => setPeriodeSelect(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="tout">Toutes les périodes</option>
              {periodesCourant.map(p => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
            {isAdmin && (
              <button
                onClick={() => setModalOuverte(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={15} />
                Ajouter
              </button>
            )}
          </div>
        </div>

        {filtrees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">Aucune entrée pour cette période</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                  <th className="px-4 py-2.5 text-left">Client</th>
                  <th className="px-4 py-2.5 text-left">Période</th>
                  <th className="px-4 py-2.5 text-left">Closer</th>
                  <th className="px-4 py-2.5 text-left">Setter</th>
                  <th className="px-4 py-2.5 text-right">Montant vente</th>
                  <th className="px-4 py-2.5 text-right">Comm. closer</th>
                  <th className="px-4 py-2.5 text-right">Comm. setter</th>
                  <th className="px-4 py-2.5 text-left">Statut</th>
                  <th className="px-4 py-2.5 text-left">Notes</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrees.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[140px] truncate">{e.client_name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.period_label}</td>
                    <td className="px-4 py-3 text-gray-600">{e.closer_id ? profileMap.get(e.closer_id) ?? '—' : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{e.setter_id ? profileMap.get(e.setter_id) ?? '—' : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-800">{dollar(e.montant)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-violet-700">{dollar(e.commission)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-blue-700">{dollar(e.commission_setter)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={e.statut === 'Payé' ? 'green' : 'amber'} icon={e.statut === 'Payé' ? <CheckCircle2 size={10} /> : <Clock size={10} />}>
                        {e.statut}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">{e.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(e.id, e.statut)}
                          disabled={pending}
                          title={e.statut === 'Payé' ? 'Marquer En attente' : 'Marquer Payé'}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-40',
                            e.statut === 'Payé'
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100',
                          )}
                        >
                          {e.statut === 'Payé' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                          {e.statut === 'Payé' ? 'En attente' : 'Payé'}
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
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide" colSpan={4}>Totaux</td>
                  <td className="px-4 py-3 text-right tabular-nums">{dollar(totaux.montant)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-violet-700">{dollar(totaux.commission)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">{dollar(totaux.commissionSetter)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {modalOuverte && (
        <ModalAjout
          closers={closers}
          setters={setters}
          periodes={periodesCourant}
          onClose={() => setModalOuverte(false)}
        />
      )}
    </div>
  )
}
