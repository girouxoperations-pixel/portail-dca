'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Trash2, Phone, TrendingUp, Target, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ajouterEntreeSetter, supprimerEntreeSetter } from '@/app/(portal)/setter/actions'
import { MOIS_FR, MOIS_COURT, currentMonthKey, formatDate } from '@/lib/constants'
import MetricCard  from '@/components/ui/MetricCard'
import MonthFilter from '@/components/ui/MonthFilter'
import Modal       from '@/components/ui/Modal'
import PageHeader  from '@/components/layout/PageHeader'

// ── Types ─────────────────────────────────────────────────────────────

interface SetterEntry {
  id:           string
  user_id:      string
  entry_date:   string
  attempts:     number
  contacts:     number
  rdv_booked:   number
  showed:       number
  no_show:      number
  disqualified: number
  cancelled:    number
  notes:        string | null
}

interface Profil {
  id:        string
  full_name: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function PctBadge({ value, bold = false }: { value: number; bold?: boolean }) {
  const color =
    value >= 50 ? 'text-green-600' :
    value >= 30 ? 'text-amber-500' : 'text-red-500'
  return (
    <span className={cn('tabular-nums', color, bold && 'font-semibold')}>
      {value} %
    </span>
  )
}

// ── Modal ajout ───────────────────────────────────────────────────────

function ModalAjout({ setters, onClose }: { setters: Profil[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await ajouterEntreeSetter(fd)
      onClose()
    })
  }

  return (
    <Modal titre="Nouvelle entrée setter" onClose={onClose} maxWidth="max-w-md" scrollable>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Setter</label>
          <select name="user_id" className={INPUT_CLS}>
            {setters.map(s => (
              <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input name="entry_date" type="date" required defaultValue={today} className={INPUT_CLS} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'attempts',     label: 'Tentatives'   },
            { name: 'contacts',     label: 'Contacts'      },
            { name: 'rdv_booked',   label: 'RDV Bookés'   },
            { name: 'showed',       label: 'Présentés'     },
            { name: 'no_show',      label: 'No Show'       },
            { name: 'disqualified', label: 'Disqualifiés'  },
            { name: 'cancelled',    label: 'Annulés'       },
          ].map(f => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{f.label}</label>
              <input name={f.name} type="number" min="0" defaultValue="0" className={INPUT_CLS} />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
          <textarea name="notes" rows={2} placeholder="Remarques…" className={`${INPUT_CLS} resize-none`} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Annuler
          </button>
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

// ── Composant principal ───────────────────────────────────────────────

export default function AdminSetterView({ entrees, setters, isAdmin }: {
  entrees:  SetterEntry[]
  setters:  Profil[]
  isAdmin:  boolean
}) {
  const [moisSelect,   setMoisSelect]   = useState(currentMonthKey)
  const [setterFilter, setSetterFilter] = useState<string>('tout')
  const [modalOuverte, setModalOuverte] = useState(false)
  const [pending, startTransition]      = useTransition()

  const profileMap = useMemo(
    () => new Map(setters.map(s => [s.id, s.full_name ?? 'Inconnu'])),
    [setters],
  )

  const moisOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const e of entrees) {
      const [y, m] = e.entry_date.split('-').map(Number)
      const key = `${y}-${String(m).padStart(2, '0')}`
      if (!seen.has(key)) {
        seen.add(key)
        opts.push({ value: key, label: `${MOIS_FR[m - 1]} ${y}` })
      }
    }
    return opts.sort((a, b) => b.value.localeCompare(a.value))
  }, [entrees])

  const filtreesMois = useMemo(() => {
    if (moisSelect === 'tout') return entrees
    const [y, m] = moisSelect.split('-').map(Number)
    return entrees.filter(e => {
      const [ey, em] = e.entry_date.split('-').map(Number)
      return ey === y && em === m
    })
  }, [entrees, moisSelect])

  const filtrees = useMemo(() => {
    if (setterFilter === 'tout') return filtreesMois
    return filtreesMois.filter(e => e.user_id === setterFilter)
  }, [filtreesMois, setterFilter])

  const kpis = useMemo(() => {
    const attempts = filtreesMois.reduce((s, e) => s + e.attempts,   0)
    const contacts = filtreesMois.reduce((s, e) => s + e.contacts,   0)
    const rdv      = filtreesMois.reduce((s, e) => s + e.rdv_booked, 0)
    const showed   = filtreesMois.reduce((s, e) => s + e.showed,     0)
    return { attempts, contacts, rdv, showed,
      contactRate: pct(contacts, attempts),
      showRate:    pct(showed, rdv),
    }
  }, [filtreesMois])

  const statsParSetter = useMemo(() => {
    const agg = new Map<string, {
      attempts: number; contacts: number; rdv: number;
      showed: number; no_show: number; disqualified: number
    }>()
    for (const e of filtreesMois) {
      const cur = agg.get(e.user_id) ?? {
        attempts: 0, contacts: 0, rdv: 0, showed: 0, no_show: 0, disqualified: 0,
      }
      agg.set(e.user_id, {
        attempts:     cur.attempts     + e.attempts,
        contacts:     cur.contacts     + e.contacts,
        rdv:          cur.rdv          + e.rdv_booked,
        showed:       cur.showed       + e.showed,
        no_show:      cur.no_show      + e.no_show,
        disqualified: cur.disqualified + e.disqualified,
      })
    }
    return Array.from(agg.entries())
      .map(([uid, s]) => ({ uid, nom: profileMap.get(uid) ?? 'Inconnu', ...s }))
      .sort((a, b) => b.rdv - a.rdv)
  }, [filtreesMois, profileMap])

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return
    startTransition(async () => { await supprimerEntreeSetter(id) })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <PageHeader
        titre="Suivi Setters"
        subtitle="Performance et activité de l'équipe"
        action={
          <button
            onClick={() => setModalOuverte(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Ajouter
          </button>
        }
      />

      <MonthFilter selected={moisSelect} onChange={setMoisSelect} options={moisOptions} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="RDV Bookés"      value={kpis.rdv}                 icon={CalendarCheck} color="green"  sub={`${kpis.showed} présentés`} />
        <MetricCard label="Taux de show"    value={`${kpis.showRate} %`}     icon={TrendingUp}    color="blue"   sub={`${kpis.showed} / ${kpis.rdv} RDV`} />
        <MetricCard label="Tentatives"      value={kpis.attempts}            icon={Phone}         color="violet" sub={`${kpis.contacts} contacts`} />
        <MetricCard label="Taux de contact" value={`${kpis.contactRate} %`}  icon={Target}        color="amber"  sub={`${kpis.contacts} / ${kpis.attempts}`} />
      </div>

      {statsParSetter.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Performance par setter</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                  <th className="px-4 py-2.5 text-left">Setter</th>
                  <th className="px-4 py-2.5 text-right">Tentatives</th>
                  <th className="px-4 py-2.5 text-right">Contacts</th>
                  <th className="px-4 py-2.5 text-right">Contact %</th>
                  <th className="px-4 py-2.5 text-right">RDV Bookés</th>
                  <th className="px-4 py-2.5 text-right">Présentés</th>
                  <th className="px-4 py-2.5 text-right">Show %</th>
                  <th className="px-4 py-2.5 text-right">No Show</th>
                  <th className="px-4 py-2.5 text-right">Disq.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {statsParSetter.map(s => (
                  <tr key={s.uid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.nom}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.attempts}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.contacts}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(s.contacts, s.attempts)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{s.rdv}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.showed}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(s.showed, s.rdv)} bold /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-400">{s.no_show}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-400">{s.disqualified}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50 font-semibold text-gray-700">
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide">Totaux</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.attempts}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.contacts}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.contactRate} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.rdv}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.showed}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={kpis.showRate} bold /></td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Entrées détaillées</h3>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              {filtrees.length} entrée{filtrees.length !== 1 ? 's' : ''}
            </span>
          </div>
          <select
            value={setterFilter}
            onChange={e => setSetterFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="tout">Tous les setters</option>
            {setters.map(s => (
              <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>
            ))}
          </select>
        </div>

        {filtrees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">Aucune entrée pour cette sélection</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Setter</th>
                  <th className="px-4 py-2.5 text-right">Tent.</th>
                  <th className="px-4 py-2.5 text-right">Contacts</th>
                  <th className="px-4 py-2.5 text-right">Contact %</th>
                  <th className="px-4 py-2.5 text-right">RDV</th>
                  <th className="px-4 py-2.5 text-right">Présentés</th>
                  <th className="px-4 py-2.5 text-right">Show %</th>
                  <th className="px-4 py-2.5 text-right">No Show</th>
                  <th className="px-4 py-2.5 text-left">Notes</th>
                  {isAdmin && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrees.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(e.entry_date, MOIS_COURT)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{profileMap.get(e.user_id) ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.attempts}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.contacts}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(e.contacts, e.attempts)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{e.rdv_booked}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.showed}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(e.showed, e.rdv_booked)} bold /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-400">{e.no_show}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{e.notes ?? '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          disabled={pending}
                          title="Supprimer"
                          className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOuverte && (
        <ModalAjout setters={setters} onClose={() => setModalOuverte(false)} />
      )}
    </div>
  )
}
