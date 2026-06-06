'use client'

import { useState, useTransition, useMemo } from 'react'
import { CheckCircle2, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  basculerStatut, assignerMVP,
  approuverPeriode, approuverPayesBatch,
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
  cash_entries: { collected: number } | null
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

interface EmployeeGroup {
  uid: string
  nom: string
  role: 'closer' | 'setter'
  deals: Array<{
    id: string
    client_name: string
    montant: number
    collected: number
    maCommission: number
    statut: string
    notes: string | null
  }>
  totalCommission: number
  pendingCommission: number
  pendingIds: string[]
}

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
            <h3 className="text-sm font-semibold text-gray-900">Bonus automatiques — période en cours</h3>
            <p className="text-xs text-gray-400 mt-0.5">Calculés sur le cash collecté cette période</p>
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
          <label className="text-sm font-medium text-gray-700">Membre de l&apos;équipe</label>
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

// ── Carte employé ─────────────────────────────────────────────────────

function CarteEmploye({ group, isAdmin, pending, onApprouver, onToggle }: {
  group:        EmployeeGroup
  isAdmin:      boolean
  pending:      boolean
  onApprouver:  (ids: string[]) => void
  onToggle:     (id: string, statut: string) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const allPaid = group.pendingIds.length === 0

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-sm overflow-hidden transition-all',
      allPaid ? 'border-green-100' : 'border-gray-100',
    )}>
      {/* En-tête */}
      <div className="px-5 py-4 flex items-center gap-4">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
          group.role === 'closer'
            ? 'bg-violet-100 text-violet-700'
            : 'bg-blue-100 text-blue-700',
        )}>
          {group.nom.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{group.nom}</p>
            <span className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide',
              group.role === 'closer'
                ? 'bg-violet-100 text-violet-600'
                : 'bg-blue-100 text-blue-600',
            )}>
              {group.role}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {group.deals.length} deal{group.deals.length !== 1 ? 's' : ''}
            {' · '}
            {allPaid
              ? <span className="text-green-600 font-medium">Tout payé ✓</span>
              : <span className="text-amber-600 font-medium">{dollar(group.pendingCommission)} en attente</span>
            }
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums text-gray-900">{dollar(group.totalCommission)}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Commission totale</p>
        </div>
      </div>

      {/* Actions */}
      {(!allPaid || group.deals.length > 0) && (
        <div className="px-5 pb-3 flex items-center justify-between gap-3">
          <button
            onClick={() => setOuvert(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {ouvert ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {ouvert ? 'Masquer les deals' : 'Voir les deals'}
          </button>
          {!allPaid && isAdmin && (
            <button
              onClick={() => onApprouver(group.pendingIds)}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={12} />
              Approuver la paie
            </button>
          )}
        </div>
      )}

      {/* Détail des deals */}
      {ouvert && (
        <div className="border-t border-gray-50">
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
              {group.deals.map(d => (
                <tr key={d.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 font-medium text-gray-800 max-w-[140px] truncate">{d.client_name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{dollar(d.collected)}</td>
                  <td className={cn(
                    'px-4 py-2.5 text-right tabular-nums font-semibold',
                    group.role === 'closer' ? 'text-violet-700' : 'text-blue-700',
                  )}>
                    {dollar(d.maCommission)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={d.statut === 'Payé' ? 'green' : 'amber'}
                      icon={d.statut === 'Payé' ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                    >
                      {d.statut}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
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
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {group.deals.some(d => d.notes) && (
            <div className="px-5 py-2 border-t border-gray-50">
              {group.deals.filter(d => d.notes).map(d => (
                <p key={d.id} className="text-[11px] text-gray-400 italic">{d.client_name} : {d.notes}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Vue principale admin / CSM ────────────────────────────────────────

export default function AdminView({
  entrees, allProfiles,
  bonusClosers, bonusSetters, teamMembers,
  isAdmin, periodesCourant, periodeDefaut,
}: Props) {
  const [periodeSelect, setPeriodeSelect] = useState<string>(periodeDefaut)
  const [pending, startTransition]        = useTransition()

  const profileMap = useMemo(
    () => new Map(allProfiles.map(p => [p.id, p.full_name ?? 'Inconnu'])),
    [allProfiles],
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
      const collected = e.cash_entries?.collected ?? e.montant

      const addToGroup = (uid: string, role: 'closer' | 'setter', maComm: number) => {
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
          collected,
          maCommission: maComm,
          statut: e.statut,
          notes: e.notes,
        })
        g.totalCommission  += maComm
        if (e.statut !== 'Payé') {
          g.pendingCommission += maComm
          if (!g.pendingIds.includes(e.id)) g.pendingIds.push(e.id)
        }
      }

      if (e.closer_id && e.commission > 0) addToGroup(e.closer_id, 'closer', e.commission)
      if (e.setter_id && e.commission_setter > 0) addToGroup(e.setter_id, 'setter', e.commission_setter)
    }

    return Array.from(map.values()).sort((a, b) => b.totalCommission - a.totalCommission)
  }, [filtrees, profileMap])

  const totalPeriode   = grouped.reduce((s, g) => s + g.totalCommission, 0)
  const pendingPeriode = grouped.reduce((s, g) => s + g.pendingCommission, 0)
  const allPendingIds  = grouped.flatMap(g => g.pendingIds)

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

      {/* Sélecteur de période + résumé */}
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

        {isAdmin && allPendingIds.length > 0 && (
          <button
            onClick={handleApprouverPeriode}
            disabled={pending}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            <CheckCircle2 size={15} />
            Approuver toute la période
          </button>
        )}
      </div>

      {/* Grille employés */}
      {filtrees.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-16 text-center">
          <p className="text-sm text-gray-400">Aucune entrée pour cette période</p>
          <p className="text-xs text-gray-300 mt-1">Sélectionne une autre période ou ajoute des entrées via Cash Collect.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {grouped.map(g => (
            <CarteEmploye
              key={`${g.uid}-${g.role}`}
              group={g}
              isAdmin={isAdmin}
              pending={pending}
              onApprouver={handleApprouverEmploye}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Résumé readonly pour non-admin */}
      {!isAdmin && filtrees.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Contacte un admin pour modifier le statut des paies.
        </p>
      )}

    </div>
  )
}
