'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, Clock, Trophy, Award, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dollar, MOIS_FR } from '@/lib/constants'
import type { PeriodeItem } from '@/lib/payroll'
import Badge      from '@/components/ui/Badge'
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

interface BonusTier {
  seuil:  number
  closer: number
  setter: number
}

interface Props {
  entrees:         PayeEntry[]
  role:            string
  userId:          string
  myCollected:     number
  myBonus:         BonusTier | null
  moisLabel:       string
  periodesCourant: PeriodeItem[]
  periodeDefaut:   string
}

type GroupMode = 'mois' | 'trimestre' | 'annee' | 'perso'

function groupKey(e: PayeEntry, mode: GroupMode): string {
  if (mode === 'annee')     return `${e.year}`
  if (mode === 'trimestre') return `T${Math.ceil(e.month / 3)} ${e.year}`
  return `${MOIS_FR[e.month - 1]} ${e.year}`
}

function dateToYM(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getFullYear() * 100 + (d.getMonth() + 1)
}

// ── Group accordion ────────────────────────────────────────────────────

function GroupSection({
  group, isCloser,
}: {
  group: { key: string; entries: PayeEntry[]; total: number; paye: number }
  isCloser: boolean
}) {
  const [open, setOpen] = useState(false)
  const attente = group.total - group.paye

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-900">{group.key}</span>
          <span className="text-xs text-gray-400">{group.entries.length} deal{group.entries.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-sm font-bold tabular-nums text-violet-700">{dollar(group.total)}</span>
            {attente > 0 && (
              <span className="ml-2 text-xs text-amber-500">({dollar(attente)} en attente)</span>
            )}
          </div>
          {open
            ? <ChevronUp size={16} className="text-gray-400" />
            : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                <th className="px-4 py-2.5 text-left">Client</th>
                <th className="px-4 py-2.5 text-left">Période</th>
                <th className="px-4 py-2.5 text-right">Ma commission</th>
                <th className="px-4 py-2.5 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {group.entries.map(e => {
                const maComm = isCloser ? e.commission : e.commission_setter
                return (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[160px] truncate">{e.client_name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{e.period_label}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-violet-700">{dollar(maComm)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={e.statut === 'Payé' ? 'green' : 'amber'}
                        icon={e.statut === 'Payé' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      >
                        {e.statut}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────

export default function PersonnelView({
  entrees, role, myCollected, myBonus,
  periodesCourant, periodeDefaut,
}: Props) {
  const isCloser = role === 'closer'
  const bonusMois = myBonus ? (isCloser ? myBonus.closer : myBonus.setter) : null

  const [vue, setVue]               = useState<'periode' | 'historique'>('periode')
  const [periodeSelect, setPeriode] = useState<string>(periodeDefaut)
  const [groupMode, setGroupMode]   = useState<GroupMode>('mois')
  const [dateDebut, setDateDebut]   = useState('')
  const [dateFin, setDateFin]       = useState('')

  // Périodes ayant au moins une entrée
  const periodesAvecEntrees = useMemo(() => {
    const labels = new Set(entrees.map(e => e.period_label))
    const found  = periodesCourant.filter(p => labels.has(p.label))
    if (!found.some(p => p.label === periodeDefaut)) {
      found.unshift({ label: periodeDefaut, month: 0, year: 0, start: '', end: '' })
    }
    return found
  }, [entrees, periodesCourant, periodeDefaut])

  // Entrées filtrées pour la période sélectionnée (bi-weekly)
  const filtrees = useMemo(
    () => entrees.filter(e => e.period_label === periodeSelect),
    [entrees, periodeSelect],
  )

  // Entrées filtrées pour l'historique (date range si perso)
  const entreesHist = useMemo(() => {
    if (groupMode !== 'perso') return entrees
    const startNum = dateDebut ? dateToYM(dateDebut) : 0
    const endNum   = dateFin   ? dateToYM(dateFin)   : 999999
    return entrees.filter(e => {
      const eNum = e.year * 100 + e.month
      return eNum >= startNum && eNum <= endNum
    })
  }, [entrees, groupMode, dateDebut, dateFin])

  // KPIs période bi-weekly
  const periodeKpis = useMemo(() => {
    const total = filtrees.reduce((s, e) => s + (isCloser ? e.commission : e.commission_setter), 0)
    const paye  = filtrees.filter(e => e.statut === 'Payé').reduce((s, e) => s + (isCloser ? e.commission : e.commission_setter), 0)
    return { total, paye, attente: total - paye, count: filtrees.length }
  }, [filtrees, isCloser])

  // KPIs globaux (all-time)
  const globalKpis = useMemo(() => {
    const total = entrees.reduce((s, e) => s + (isCloser ? e.commission : e.commission_setter), 0)
    const paye  = entrees.filter(e => e.statut === 'Payé').reduce((s, e) => s + (isCloser ? e.commission : e.commission_setter), 0)
    return { total, paye, attente: total - paye }
  }, [entrees, isCloser])

  // KPIs pour la plage filtrée (historique)
  const histKpis = useMemo(() => {
    const total = entreesHist.reduce((s, e) => s + (isCloser ? e.commission : e.commission_setter), 0)
    const paye  = entreesHist.filter(e => e.statut === 'Payé').reduce((s, e) => s + (isCloser ? e.commission : e.commission_setter), 0)
    return { total, paye, attente: total - paye }
  }, [entreesHist, isCloser])

  // Groupement pour l'historique
  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; entries: PayeEntry[]; total: number; paye: number }>()
    for (const e of entreesHist) {
      const key  = groupKey(e, groupMode)
      if (!map.has(key)) map.set(key, { key, entries: [], total: 0, paye: 0 })
      const g    = map.get(key)!
      const comm = isCloser ? e.commission : e.commission_setter
      g.entries.push(e)
      g.total += comm
      if (e.statut === 'Payé') g.paye += comm
    }
    return Array.from(map.values())
  }, [entreesHist, groupMode, isCloser])

  const GROUP_LABELS: Record<GroupMode, string> = {
    mois:      'Mois',
    trimestre: 'Trimestre',
    annee:     'Année',
    perso:     'Personnalisé',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <PageHeader titre="Ma Paie" subtitle="Commissions et historique" />

      {/* Bonus / résumé global */}
      <div className={cn(
        'rounded-xl border p-5 flex items-center gap-4',
        bonusMois !== null ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100 shadow-sm',
      )}>
        {bonusMois !== null
          ? <Trophy size={32} className="text-amber-400 shrink-0" />
          : <Award  size={32} className="text-gray-200 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">
            {bonusMois !== null
              ? `Bonus automatique ce mois : +${dollar(bonusMois)}`
              : 'Pas encore de bonus atteint ce mois'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {dollar(myCollected)} collecté
            {myBonus ? ` — Palier ${dollar(myBonus.seuil)} atteint` : ' — Palier suivant : 50 000 $'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums text-gray-900">{dollar(globalKpis.total)}</p>
          <p className="text-xs text-gray-400">Commissions totales</p>
        </div>
      </div>

      {/* Toggle vue */}
      <div className="flex gap-2">
        {(['periode', 'historique'] as const).map(v => (
          <button
            key={v}
            onClick={() => setVue(v)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              vue === v
                ? 'bg-violet-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {v === 'periode' ? 'Par période' : 'Historique complet'}
          </button>
        ))}
      </div>

      {/* ── Vue Période ──────────────────────────────────────────────── */}
      {vue === 'periode' && (
        <div className="space-y-4">

          {/* Sélecteur + KPIs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-6 flex-wrap">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Période</label>
              <select
                value={periodeSelect}
                onChange={e => setPeriode(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {periodesAvecEntrees.map(p => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
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
                <p className="text-xs text-gray-400">Générées</p>
                <p className="text-lg font-bold tabular-nums text-gray-900">{dollar(periodeKpis.total)}</p>
              </div>
              <div>
                <p className="text-xs text-green-500">Payées</p>
                <p className="text-lg font-bold tabular-nums text-green-600">{dollar(periodeKpis.paye)}</p>
              </div>
              {periodeKpis.attente > 0 && (
                <div>
                  <p className="text-xs text-amber-500">En attente</p>
                  <p className="text-lg font-bold tabular-nums text-amber-600">{dollar(periodeKpis.attente)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Deals</p>
                <p className="text-lg font-bold tabular-nums text-gray-900">{periodeKpis.count}</p>
              </div>
            </div>
          </div>

          {/* Table deals de la période */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                Commissions — {filtrees.length} deal{filtrees.length !== 1 ? 's' : ''}
              </h3>
            </div>

            {filtrees.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-gray-400">Aucune commission pour cette période</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                      <th className="px-4 py-2.5 text-left">Client</th>
                      <th className="px-4 py-2.5 text-right">Cash reçu</th>
                      <th className="px-4 py-2.5 text-right">Ma commission</th>
                      <th className="px-4 py-2.5 text-left">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtrees.map(e => {
                      const maComm    = isCloser ? e.commission : e.commission_setter
                      const collected = e.cash_entries?.collected
                        ?? (isCloser
                          ? (e.commission > 0 ? Math.round(e.commission / 0.10) : e.montant)
                          : (e.commission_setter > 0 ? Math.round(e.commission_setter / 0.05) : e.montant))
                      return (
                        <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800 max-w-[160px] truncate">{e.client_name}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-700">{dollar(collected)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-violet-700">{dollar(maComm)}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={e.statut === 'Payé' ? 'green' : 'amber'}
                              icon={e.statut === 'Payé' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            >
                              {e.statut}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-100 bg-gray-50/50 font-semibold">
                      <td className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-right tabular-nums text-violet-700">{dollar(periodeKpis.total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vue Historique ────────────────────────────────────────────── */}
      {vue === 'historique' && (
        <div className="space-y-4">

          {/* Sélecteur de regroupement + KPIs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500">Regrouper par :</span>
              {(['mois', 'trimestre', 'annee', 'perso'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setGroupMode(m)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    groupMode === m ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100',
                  )}
                >
                  {GROUP_LABELS[m]}
                </button>
              ))}
            </div>

            {/* Date inputs pour le mode personnalisé */}
            {groupMode === 'perso' && (
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Du</label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={e => setDateDebut(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Au</label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={e => setDateFin(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-6 pt-1 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-400">{groupMode === 'perso' ? 'Total plage' : 'Total all-time'}</p>
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

          {grouped.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-12 text-center">
              <p className="text-sm text-gray-400">
                {groupMode === 'perso' && (!dateDebut || !dateFin)
                  ? 'Sélectionne une plage de dates pour filtrer'
                  : 'Aucune commission enregistrée'}
              </p>
            </div>
          ) : (
            grouped.map(g => (
              <GroupSection key={g.key} group={g} isCloser={isCloser} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
