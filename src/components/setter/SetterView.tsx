'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Phone, TrendingUp, Target, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ajouterEntreeSetter, modifierEntreeSetter } from '@/app/(portal)/setter/actions'
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

// ── Helpers ───────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

const CHAMPS = [
  { name: 'attempts',     label: 'Tentatives'    },
  { name: 'contacts',     label: 'Contacts'       },
  { name: 'rdv_booked',   label: 'RDV Bookés'    },
  { name: 'showed',       label: 'Présentés'      },
  { name: 'no_show',      label: 'No Show'        },
  { name: 'disqualified', label: 'Disqualifiés'   },
  { name: 'cancelled',    label: 'Annulés'        },
] as const

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

// ── Modal ajout / édition ─────────────────────────────────────────────

function ModalEntree({ entry, userId, onClose }: {
  entry:   SetterEntry | null
  userId:  string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const isEdit = entry !== null
  const today  = new Date().toISOString().slice(0, 10)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (isEdit) {
        await modifierEntreeSetter(entry.id, fd)
      } else {
        fd.set('user_id', userId)
        await ajouterEntreeSetter(fd)
      }
      onClose()
    })
  }

  return (
    <Modal
      titre={isEdit ? "Modifier l'entrée" : 'Nouvelle entrée'}
      onClose={onClose}
      maxWidth="max-w-md"
      scrollable
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input
            name="entry_date" type="date" required
            defaultValue={entry?.entry_date ?? today}
            className={INPUT_CLS}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {CHAMPS.map(f => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{f.label}</label>
              <input
                name={f.name} type="number" min="0"
                defaultValue={entry ? entry[f.name] : 0}
                className={INPUT_CLS}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
          <textarea
            name="notes" rows={2} placeholder="Remarques…"
            defaultValue={entry?.notes ?? ''}
            className={`${INPUT_CLS} resize-none`}
          />
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

export default function SetterView({ entrees, userId, prenom }: {
  entrees: SetterEntry[]
  userId:  string
  prenom:  string
}) {
  const [moisSelect, setMoisSelect] = useState(currentMonthKey)
  const [modalEntry, setModalEntry] = useState<SetterEntry | null | 'new'>(null)

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

  const filtrees = useMemo(() => {
    if (moisSelect === 'tout') return entrees
    const [y, m] = moisSelect.split('-').map(Number)
    return entrees.filter(e => {
      const [ey, em] = e.entry_date.split('-').map(Number)
      return ey === y && em === m
    })
  }, [entrees, moisSelect])

  const kpis = useMemo(() => {
    const attempts = filtrees.reduce((s, e) => s + e.attempts,   0)
    const contacts = filtrees.reduce((s, e) => s + e.contacts,   0)
    const rdv      = filtrees.reduce((s, e) => s + e.rdv_booked, 0)
    const showed   = filtrees.reduce((s, e) => s + e.showed,     0)
    const no_show  = filtrees.reduce((s, e) => s + e.no_show,    0)
    const disqualified = filtrees.reduce((s, e) => s + e.disqualified, 0)
    return {
      attempts, contacts, rdv, showed, no_show, disqualified,
      contactRate: pct(contacts, attempts),
      showRate:    pct(showed, rdv),
    }
  }, [filtrees])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <PageHeader
        titre="Mon Suivi"
        subtitle={`Bienvenue, ${prenom} — votre activité de setting`}
        action={
          <button
            onClick={() => setModalEntry('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Saisir
          </button>
        }
      />

      <MonthFilter selected={moisSelect} onChange={setMoisSelect} options={moisOptions} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="RDV Bookés"     value={kpis.rdv}                 icon={CalendarCheck} color="green"  sub={`${filtrees.length} jour${filtrees.length !== 1 ? 's' : ''} saisi${filtrees.length !== 1 ? 's' : ''}`} />
        <MetricCard label="Taux de show"   value={`${kpis.showRate} %`}     icon={TrendingUp}    color="blue"   sub={`${kpis.showed} présentés / ${kpis.rdv} RDV`} />
        <MetricCard label="Tentatives"     value={kpis.attempts}            icon={Phone}         color="violet" sub={`${kpis.contacts} contacts effectués`} />
        <MetricCard label="Taux de contact" value={`${kpis.contactRate} %`} icon={Target}        color="amber"  sub={`${kpis.contacts} / ${kpis.attempts} tentatives`} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Mon historique</h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {filtrees.length} entrée{filtrees.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filtrees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400">Aucune entrée pour cette période</p>
            <p className="text-xs text-gray-300 mt-1">
              Cliquez sur &ldquo;Saisir&rdquo; pour enregistrer votre activité du jour.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-right">Tentatives</th>
                  <th className="px-4 py-2.5 text-right">Contacts</th>
                  <th className="px-4 py-2.5 text-right">Contact %</th>
                  <th className="px-4 py-2.5 text-right">RDV</th>
                  <th className="px-4 py-2.5 text-right">Présentés</th>
                  <th className="px-4 py-2.5 text-right">Show %</th>
                  <th className="px-4 py-2.5 text-right">No Show</th>
                  <th className="px-4 py-2.5 text-left">Notes</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrees.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(e.entry_date, MOIS_COURT)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.attempts}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.contacts}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(e.contacts, e.attempts)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{e.rdv_booked}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{e.showed}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(e.showed, e.rdv_booked)} bold /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-400">{e.no_show}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{e.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setModalEntry(e)}
                        title="Modifier"
                        className="p-1.5 text-gray-200 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                    </td>
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
                  <td className="px-4 py-3 text-right tabular-nums text-red-400">{kpis.no_show}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {modalEntry !== null && (
        <ModalEntree
          entry={modalEntry === 'new' ? null : modalEntry}
          userId={userId}
          onClose={() => setModalEntry(null)}
        />
      )}
    </div>
  )
}
