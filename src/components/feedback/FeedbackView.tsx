'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Plus, Trash2,
  CheckCircle2, AlertCircle, Clock, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ajouterFeedback, supprimerFeedback } from '@/app/(portal)/feedback/actions'

// ── Types ─────────────────────────────────────────────────────────

interface FeedbackEntry {
  id: string
  user_id: string
  call_date: string
  duration: number | null
  score: number | null
  forts: string[] | null
  ameliorer: string[] | null
  statut: string
}

interface Profil {
  id: string
  full_name: string | null
}

interface Props {
  feedbacks: FeedbackEntry[]
  closers:   Profil[]
  userId:    string
  role:      string
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

const STATUTS = ['Closed', 'Suivi requis', 'No Show', 'Refus'] as const

type StatutType = typeof STATUTS[number]

interface StatutStyle {
  bg: string
  text: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const STATUT_STYLE: Record<StatutType, StatutStyle> = {
  'Closed':       { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
  'Suivi requis': { bg: 'bg-blue-50',  text: 'text-blue-700',  icon: AlertCircle  },
  'No Show':      { bg: 'bg-gray-100', text: 'text-gray-500',  icon: Clock        },
  'Refus':        { bg: 'bg-red-50',   text: 'text-red-700',   icon: XCircle      },
}

const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MOIS_FR[m - 1]} ${y}`
}

function scoreStyle(score: number) {
  if (score >= 80) return { bar: 'bg-green-500', text: 'text-green-600' }
  if (score >= 65) return { bar: 'bg-blue-500',  text: 'text-blue-600'  }
  return                  { bar: 'bg-red-500',   text: 'text-red-600'   }
}

// ── Badge statut ──────────────────────────────────────────────────

function BadgeStatut({ statut }: { statut: string }) {
  const s: StatutStyle = STATUT_STYLE[statut as StatutType] ?? {
    bg: 'bg-gray-100', text: 'text-gray-500', icon: Clock,
  }
  const Icon = s.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
        s.bg, s.text,
      )}
    >
      <Icon size={10} />
      {statut}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({
  label, value, sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

// ── Carte feedback ────────────────────────────────────────────────

function FeedbackCard({
  entry, closerName, canDelete, onDelete, isPending,
}: {
  entry:       FeedbackEntry
  closerName:  string
  canDelete:   boolean
  onDelete:    () => void
  isPending:   boolean
}) {
  const sc = entry.score !== null ? scoreStyle(entry.score) : null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">

      {/* En-tête : badge + supprimer */}
      <div className="flex items-start justify-between gap-2">
        <BadgeStatut statut={entry.statut} />
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={isPending}
            title="Supprimer"
            className="p-1 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40 shrink-0 -mt-0.5"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Closer + date + durée */}
      <div>
        <p className="text-sm font-semibold text-gray-900">{closerName}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDate(entry.call_date)}
          {entry.duration !== null && ` · ${entry.duration} min`}
        </p>
      </div>

      {/* Score */}
      {entry.score !== null && sc && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-400">Score</span>
            <span className={cn('text-sm font-bold tabular-nums', sc.text)}>
              {entry.score}
              <span className="text-xs font-normal text-gray-400">/100</span>
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={cn('h-full rounded-full', sc.bar)}
              style={{ width: `${entry.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Points forts */}
      {entry.forts && entry.forts.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-2">
            Points forts
          </p>
          <ul className="space-y-1.5">
            {entry.forts.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="text-green-500 mt-0.5 shrink-0 font-bold">•</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* À améliorer */}
      {entry.ameliorer && entry.ameliorer.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wide mb-2">
            À améliorer
          </p>
          <ul className="space-y-1.5">
            {entry.ameliorer.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="text-red-400 mt-0.5 shrink-0 font-bold">•</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Modal ajout ───────────────────────────────────────────────────

function ModalAjout({
  closers, userId, role, onClose,
}: {
  closers: Profil[]
  userId:  string
  role:    string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const isAdminOrCsm = role === 'admin' || role === 'csm'
  const today = new Date().toISOString().slice(0, 10)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await ajouterFeedback(fd)
      onClose()
    })
  }

  const ownName = closers.find(c => c.id === userId)?.full_name ?? 'Moi'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Nouveau feedback IA</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Closer */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Closer</label>
            {isAdminOrCsm ? (
              <select name="user_id" className={INPUT_CLS}>
                {closers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
                ))}
              </select>
            ) : (
              <>
                <input type="hidden" name="user_id" value={userId} />
                <p className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600">
                  {ownName}
                </p>
              </>
            )}
          </div>

          {/* Date + Durée */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Date de l'appel</label>
              <input
                name="call_date" type="date" required
                defaultValue={today}
                className={INPUT_CLS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Durée (min)</label>
              <input
                name="duration" type="number" min="0" placeholder="45"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Score + Statut */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Score /100</label>
              <input
                name="score" type="number" min="0" max="100" placeholder="85"
                className={INPUT_CLS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Statut</label>
              <select name="statut" className={INPUT_CLS}>
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Points forts */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Points forts
              <span className="text-xs font-normal text-gray-400 ml-1.5">un par ligne</span>
            </label>
            <textarea
              name="forts" rows={3}
              placeholder={"Excellente écoute\nBonne gestion des objections\nTon assuré"}
              className={`${INPUT_CLS} resize-none`}
            />
          </div>

          {/* À améliorer */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              À améliorer
              <span className="text-xs font-normal text-gray-400 ml-1.5">un par ligne</span>
            </label>
            <textarea
              name="ameliorer" rows={3}
              placeholder={"Trop long sur la présentation\nManque de closing direct"}
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

export default function FeedbackView({
  feedbacks, closers, userId, role,
}: Props) {
  const [moisSelect,   setMoisSelect]   = useState<string>('tout')
  const [modalOuverte, setModalOuverte] = useState(false)
  const [pending, startTransition]      = useTransition()

  const canAdd    = role === 'admin' || role === 'csm' || role === 'closer'
  const canDelete = role === 'admin' || role === 'csm'

  const profileMap = useMemo(
    () => new Map(closers.map(c => [c.id, c.full_name ?? 'Inconnu'])),
    [closers],
  )

  const moisOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const f of feedbacks) {
      const [y, m] = f.call_date.split('-').map(Number)
      const key = `${y}-${String(m).padStart(2, '0')}`
      if (!seen.has(key)) {
        seen.add(key)
        opts.push({ value: key, label: `${MOIS_COURT[m - 1]} ${y}` })
      }
    }
    return opts.sort((a, b) => b.value.localeCompare(a.value))
  }, [feedbacks])

  const filtrees = useMemo(() => {
    if (moisSelect === 'tout') return feedbacks
    const [y, m] = moisSelect.split('-').map(Number)
    return feedbacks.filter(f => {
      const [fy, fm] = f.call_date.split('-').map(Number)
      return fy === y && fm === m
    })
  }, [feedbacks, moisSelect])

  const stats = useMemo(() => {
    const avecScore  = filtrees.filter(f => f.score !== null)
    const scoreMoyen = avecScore.length > 0
      ? Math.round(avecScore.reduce((s, f) => s + (f.score ?? 0), 0) / avecScore.length)
      : null
    return {
      scoreMoyen,
      nbNotes:     avecScore.length,
      closed:      filtrees.filter(f => f.statut === 'Closed').length,
      noShow:      filtrees.filter(f => f.statut === 'No Show').length,
      suiviRequis: filtrees.filter(f => f.statut === 'Suivi requis').length,
    }
  }, [filtrees])

  function handleDelete(id: string) {
    if (!confirm('Supprimer ce feedback ?')) return
    startTransition(async () => { await supprimerFeedback(id) })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedbacks IA</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analyse des appels de closing</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setModalOuverte(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Ajouter
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Score moyen"
          value={stats.scoreMoyen !== null ? `${stats.scoreMoyen}/100` : '—'}
          sub={stats.nbNotes > 0 ? `${stats.nbNotes} appel${stats.nbNotes > 1 ? 's' : ''} noté${stats.nbNotes > 1 ? 's' : ''}` : 'Aucun appel noté'}
        />
        <StatCard
          label="Appels Closed"
          value={stats.closed}
          sub={stats.closed > 0 ? `sur ${filtrees.length} appels` : 'Ce mois'}
        />
        <StatCard
          label="No Show"
          value={stats.noShow}
          sub={stats.noShow > 0 ? `sur ${filtrees.length} appels` : 'Ce mois'}
        />
        <StatCard
          label="Suivi requis"
          value={stats.suiviRequis}
          sub={stats.suiviRequis > 0 ? `sur ${filtrees.length} appels` : 'Ce mois'}
        />
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
            Tout ({feedbacks.length})
          </button>
          {moisOptions.map(o => {
            const count = feedbacks.filter(f => {
              const [fy, fm] = f.call_date.split('-').map(Number)
              const [oy, om] = o.value.split('-').map(Number)
              return fy === oy && fm === om
            }).length
            return (
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
                {o.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Grille de cartes */}
      {filtrees.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-16 text-center">
          <p className="text-sm text-gray-400">Aucun feedback pour cette période</p>
          {canAdd && (
            <p className="text-xs text-gray-300 mt-1">
              Cliquez sur &ldquo;Ajouter&rdquo; pour créer le premier.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtrees.map(f => (
            <FeedbackCard
              key={f.id}
              entry={f}
              closerName={profileMap.get(f.user_id) ?? 'Inconnu'}
              canDelete={canDelete}
              onDelete={() => handleDelete(f.id)}
              isPending={pending}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOuverte && (
        <ModalAjout
          closers={closers}
          userId={userId}
          role={role}
          onClose={() => setModalOuverte(false)}
        />
      )}
    </div>
  )
}
