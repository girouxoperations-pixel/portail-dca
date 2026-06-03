'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Phone, TrendingUp, Target, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ajouterEntree, modifierEntree } from '@/app/(portal)/closer/actions'

// ── Types ─────────────────────────────────────────────────────────

interface CloserEntry {
  id: string
  user_id: string
  entry_date: string
  scheduled_calls: number
  show_calls: number
  pitch_calls: number
  closes: number
  notes: string | null
}

interface Props {
  entrees: CloserEntry[]
  userId:  string
  prenom:  string
}

// ── Constants ─────────────────────────────────────────────────────

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

const MOIS_COURT = [
  'Jan.','Fév.','Mar.','Avr.','Mai','Juin',
  'Juil.','Août','Sep.','Oct.','Nov.','Déc.',
]

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

const CHAMPS_NUMEROS = [
  { name: 'scheduled_calls', label: 'Schedulés'  },
  { name: 'show_calls',      label: 'Shows'      },
  { name: 'pitch_calls',     label: 'Pitches'    },
  { name: 'closes',          label: 'Closes'     },
] as const

// ── Helpers ───────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MOIS_COURT[m - 1]} ${y}`
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ── Badge % ───────────────────────────────────────────────────────

function PctBadge({ value, bold = false }: { value: number; bold?: boolean }) {
  const color =
    value >= 40 ? 'text-green-600' :
    value >= 20 ? 'text-amber-500' : 'text-red-500'
  return (
    <span className={cn('tabular-nums', color, bold && 'font-semibold')}>
      {value} %
    </span>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: 'violet' | 'blue' | 'green' | 'amber'
}) {
  const c = {
    violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-600'   },
    green:  { bg: 'bg-green-100',  text: 'text-green-600'  },
    amber:  { bg: 'bg-amber-100',  text: 'text-amber-600'  },
  }[color]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className={cn('inline-flex rounded-lg p-2.5 mb-3', c.bg)}>
        <Icon size={18} className={c.text} />
      </div>
      <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {sub && (
        <p className="text-xs text-gray-400 border-t border-gray-50 pt-2.5 mt-3">{sub}</p>
      )}
    </div>
  )
}

// ── Modal ajout / édition ─────────────────────────────────────────

function ModalEntree({
  entry, userId, onClose,
}: {
  entry: CloserEntry | null
  userId: string
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
        await modifierEntree(entry.id, fd)
      } else {
        fd.set('user_id', userId)
        await ajouterEntree(fd)
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {isEdit ? "Modifier l'entrée" : "Nouvelle entrée"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input
              name="entry_date" type="date" required
              defaultValue={entry?.entry_date ?? today}
              className={INPUT_CLS}
            />
          </div>

          {/* Chiffres */}
          <div className="grid grid-cols-2 gap-4">
            {CHAMPS_NUMEROS.map(f => (
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

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
            <textarea
              name="notes" rows={2} placeholder="Remarques..."
              defaultValue={entry?.notes ?? ''}
              className={`${INPUT_CLS} resize-none`}
            />
          </div>

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

export default function CloserView({ entrees, userId, prenom }: Props) {
  const [moisSelect,  setMoisSelect]  = useState(currentMonthKey)
  const [modalEntry,  setModalEntry]  = useState<CloserEntry | null | 'new'>(null)

  // Mois disponibles
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
    const scheduled = filtrees.reduce((s, e) => s + e.scheduled_calls, 0)
    const shows     = filtrees.reduce((s, e) => s + e.show_calls, 0)
    const pitches   = filtrees.reduce((s, e) => s + e.pitch_calls, 0)
    const closes    = filtrees.reduce((s, e) => s + e.closes, 0)
    return {
      scheduled, shows, pitches, closes,
      showRate:  pct(shows, scheduled),
      closeRate: pct(closes, shows),
    }
  }, [filtrees])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Suivi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bienvenue, {prenom} — votre activité de closing</p>
        </div>
        <button
          onClick={() => setModalEntry('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} />
          Saisir
        </button>
      </div>

      {/* Filtre mois — pilules */}
      {moisOptions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMoisSelect('tout')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              moisSelect === 'tout'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            Tout
          </button>
          {moisOptions.map(o => (
            <button
              key={o.value}
              onClick={() => setMoisSelect(o.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                moisSelect === o.value
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Schedulés"
          value={kpis.scheduled}
          icon={Phone}
          color="violet"
          sub={`${filtrees.length} jour${filtrees.length !== 1 ? 's' : ''} saisi${filtrees.length !== 1 ? 's' : ''}`}
        />
        <KpiCard
          label="Taux de show"
          value={`${kpis.showRate} %`}
          icon={TrendingUp}
          color="blue"
          sub={`${kpis.shows} shows`}
        />
        <KpiCard
          label="Pitches"
          value={kpis.pitches}
          icon={Target}
          color="amber"
          sub={`sur ${kpis.shows} shows`}
        />
        <KpiCard
          label="Closes"
          value={kpis.closes}
          icon={CheckCircle2}
          color="green"
          sub={kpis.shows > 0 ? `Close rate : ${kpis.closeRate} %` : 'Ce mois'}
        />
      </div>

      {/* Tableau historique */}
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
                  <th className="px-4 py-2.5 text-right">Schedulés</th>
                  <th className="px-4 py-2.5 text-right">Shows</th>
                  <th className="px-4 py-2.5 text-right">Show %</th>
                  <th className="px-4 py-2.5 text-right">Pitches</th>
                  <th className="px-4 py-2.5 text-right">Closes</th>
                  <th className="px-4 py-2.5 text-right">Close %</th>
                  <th className="px-4 py-2.5 text-left">Notes</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrees.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(e.entry_date)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {e.scheduled_calls}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {e.show_calls}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={pct(e.show_calls, e.scheduled_calls)} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {e.pitch_calls}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">
                      {e.closes}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={pct(e.closes, e.show_calls)} bold />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">
                      {e.notes ?? '—'}
                    </td>
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
              {/* Totaux */}
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50 font-semibold text-gray-700">
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide">Totaux</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.scheduled}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.shows}</td>
                  <td className="px-4 py-3 text-right">
                    <PctBadge value={kpis.showRate} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.pitches}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{kpis.closes}</td>
                  <td className="px-4 py-3 text-right">
                    <PctBadge value={kpis.closeRate} bold />
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
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
