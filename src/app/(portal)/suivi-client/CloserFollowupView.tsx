'use client'

import { useState, useOptimistic, useTransition } from 'react'
import {
  CheckCircle2, Clock, AlertCircle, Circle,
  Users, UserSearch, Plus, Trash2,
} from 'lucide-react'
import { toggleMessage } from './actions'
import { toggleProspectFollowup, deleteProspectFollowup, addProspectFollowup } from '@/app/(portal)/todo/actions'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────

export interface Followup {
  id:            string
  client_name:   string
  close_date:    string
  due_message1:  string
  due_message2:  string
  due_message3:  string
  message1_done: boolean
  message1_date: string | null
  message2_done: boolean
  message2_date: string | null
  message3_done: boolean
  message3_date: string | null
  notes:         string | null
}

export interface ProspectItem {
  id:           string
  prospectName: string
  followupDate: string
  notes:        string | null
  done:         boolean
  doneDate:     string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

type Filter = 'tous' | 'a-faire' | 'en-retard' | 'completes'

function today() { return new Date().toISOString().split('T')[0] }

function getMsgStatus(done: boolean, due: string): 'done' | 'overdue' | 'soon' | 'pending' {
  if (done) return 'done'
  const t = today()
  if (due < t) return 'overdue'
  return Math.ceil((new Date(due).getTime() - new Date(t).getTime()) / 86400000) <= 3 ? 'soon' : 'pending'
}

function getFollowupStatus(f: Followup): 'complete' | 'en-retard' | 'en-cours' {
  if (f.message1_done && f.message2_done && f.message3_done) return 'complete'
  const t = today()
  const overdue = (!f.message1_done && f.due_message1 < t)
    || (!f.message2_done && f.due_message2 < t)
    || (!f.message3_done && f.due_message3 < t)
  return overdue ? 'en-retard' : 'en-cours'
}

function formatDate(d: string) {
  return new Date(d + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const MSG_STYLE = {
  done:    { ring: 'ring-green-200 bg-green-50',  icon: CheckCircle2, iconCls: 'text-green-500',  label: 'bg-green-100 text-green-700'  },
  overdue: { ring: 'ring-red-200 bg-red-50',      icon: AlertCircle,  iconCls: 'text-red-500',    label: 'bg-red-100 text-red-700'      },
  soon:    { ring: 'ring-amber-200 bg-amber-50',  icon: Clock,        iconCls: 'text-amber-500',  label: 'bg-amber-100 text-amber-700'  },
  pending: { ring: 'ring-gray-200 bg-gray-50',    icon: Circle,       iconCls: 'text-gray-300',   label: 'bg-gray-100 text-gray-500'    },
} as const

// ── MsgCheckbox ────────────────────────────────────────────────────────

function MsgCheckbox({ followupId, num, done, dueDate, doneDate }: {
  followupId: string; num: 1 | 2 | 3; done: boolean; dueDate: string; doneDate: string | null
}) {
  const [optimisticDone, setOptimistic] = useOptimistic(done)
  const [, startTransition] = useTransition()
  const status = getMsgStatus(optimisticDone, dueDate)
  const style  = MSG_STYLE[status]
  const Icon   = style.icon

  function handle() {
    const next = !optimisticDone
    startTransition(async () => {
      setOptimistic(next)
      await toggleMessage(followupId, num, next)
    })
  }

  return (
    <button onClick={handle} className={cn(
      'flex flex-col items-center gap-1.5 p-3 rounded-xl ring-1 transition-all w-28 shrink-0 hover:shadow-sm',
      style.ring,
    )}>
      <Icon size={20} className={style.iconCls} />
      <span className="text-[11px] font-semibold text-gray-600">Msg {num}</span>
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', style.label)}>
        {optimisticDone && doneDate ? `Fait le ${formatDate(doneDate)}` : formatDate(dueDate)}
      </span>
    </button>
  )
}

// ── ProspectRow ────────────────────────────────────────────────────────

function ProspectRow({ p }: { p: ProspectItem }) {
  const t = today()
  const [optimisticDone, setOptimistic] = useOptimistic(p.done)
  const [, startTransition] = useTransition()

  function toggle() {
    const next = !optimisticDone
    startTransition(async () => {
      setOptimistic(next)
      await toggleProspectFollowup(p.id, next)
    })
  }

  function del() {
    startTransition(async () => {
      await deleteProspectFollowup(p.id)
    })
  }

  const overdue = !optimisticDone && p.followupDate < t
  const isToday = !optimisticDone && p.followupDate === t

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0',
      optimisticDone && 'opacity-50',
    )}>
      <button onClick={toggle} className="shrink-0">
        {optimisticDone
          ? <CheckCircle2 size={18} className="text-green-500" />
          : overdue
            ? <AlertCircle  size={18} className="text-red-400"   />
            : isToday
              ? <Clock        size={18} className="text-amber-400" />
              : <Circle       size={18} className="text-gray-200"  />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', optimisticDone ? 'line-through text-gray-400' : 'text-gray-800')}>
          {p.prospectName}
        </p>
        {p.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.notes}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium',
          overdue        ? 'bg-red-50 text-red-600'     :
          isToday        ? 'bg-amber-50 text-amber-600' :
          optimisticDone ? 'bg-green-50 text-green-600' :
          'bg-gray-100 text-gray-500',
        )}>
          {formatDate(p.followupDate)}
        </span>
        <button onClick={del} className="p-1 text-gray-200 hover:text-red-400 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── AddProspectForm ────────────────────────────────────────────────────

function AddProspectForm({ onDone }: { onDone: () => void }) {
  const [, startTransition] = useTransition()
  const t = today()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await addProspectFollowup(fd)
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 bg-violet-50 border-b border-violet-100 space-y-2">
      <div className="flex gap-2">
        <input
          name="prospect_name" required
          placeholder="Nom du prospect"
          className="flex-1 px-3 py-1.5 rounded-lg border border-violet-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <input
          name="followup_date" type="date" required defaultValue={t}
          className="px-3 py-1.5 rounded-lg border border-violet-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>
      <input
        name="notes"
        placeholder="Notes (optionnel)"
        className="w-full px-3 py-1.5 rounded-lg border border-violet-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
      />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700">Annuler</button>
        <button type="submit" className="px-3 py-1 bg-violet-600 text-white text-xs font-medium rounded-lg">Ajouter</button>
      </div>
    </form>
  )
}

// ── Onglet Suivi client ────────────────────────────────────────────────

function SuiviTab({ followups }: { followups: Followup[] }) {
  const [filter, setFilter] = useState<Filter>('tous')

  const filtered = followups.filter(f => {
    const status = getFollowupStatus(f)
    if (filter === 'a-faire')   return status === 'en-cours'
    if (filter === 'en-retard') return status === 'en-retard'
    if (filter === 'completes') return status === 'complete'
    return true
  })

  const nRetard   = followups.filter(f => getFollowupStatus(f) === 'en-retard').length
  const nComplete = followups.filter(f => getFollowupStatus(f) === 'complete').length

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'tous',      label: 'Tous'      },
    { key: 'a-faire',   label: 'À faire'   },
    { key: 'en-retard', label: 'En retard' },
    { key: 'completes', label: 'Complétés' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {followups.length} client{followups.length !== 1 ? 's' : ''} · {nComplete} complété{nComplete !== 1 ? 's' : ''} · {nRetard} en retard
      </p>

      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            filter === f.key ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300',
          )}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Users size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">Aucun suivi dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => {
            const status = getFollowupStatus(f)
            return (
              <div key={f.id} className={cn(
                'bg-white rounded-xl border shadow-sm p-4',
                status === 'en-retard' ? 'border-red-100' : 'border-gray-100',
              )}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{f.client_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Closé le {formatDate(f.close_date)}</p>
                  </div>
                  <span className={cn(
                    'text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                    status === 'complete'  ? 'bg-green-50 text-green-700'  :
                    status === 'en-retard' ? 'bg-red-50 text-red-700'      :
                    'bg-blue-50 text-blue-700',
                  )}>
                    {status === 'complete' ? 'Complété' : status === 'en-retard' ? 'En retard' : 'En cours'}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <MsgCheckbox followupId={f.id} num={1} done={f.message1_done} dueDate={f.due_message1} doneDate={f.message1_date} />
                  <MsgCheckbox followupId={f.id} num={2} done={f.message2_done} dueDate={f.due_message2} doneDate={f.message2_date} />
                  <MsgCheckbox followupId={f.id} num={3} done={f.message3_done} dueDate={f.due_message3} doneDate={f.message3_date} />
                </div>
                {f.notes && <p className="mt-3 text-xs text-gray-400 border-t border-gray-50 pt-3">{f.notes}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Onglet Follow up ───────────────────────────────────────────────────

function FollowUpTab({ prospects }: { prospects: ProspectItem[] }) {
  const [showForm, setShowForm] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const active = prospects.filter(p => !p.done)
  const done   = prospects.filter(p => p.done)

  const nOverdue = active.filter(p => p.followupDate < today()).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {active.length} actif{active.length !== 1 ? 's' : ''} · {nOverdue > 0 && <span className="text-red-500 font-medium">{nOverdue} en retard · </span>}{done.length} fait{done.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus size={13} />
          Ajouter
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {showForm && <AddProspectForm onDone={() => setShowForm(false)} />}

        {active.length === 0 && !showForm ? (
          <div className="py-10 text-center">
            <UserSearch size={28} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Aucun follow up actif</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-violet-600 hover:underline">
              + Ajouter un prospect
            </button>
          </div>
        ) : (
          active.map(p => <ProspectRow key={p.id} p={p} />)
        )}
      </div>

      {done.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            {showDone ? '▲' : '▼'} Complétés ({done.length})
          </button>
          {showDone && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {done.map(p => <ProspectRow key={p.id} p={p} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────

type Tab = 'suivi' | 'followup'

export default function CloserFollowupView({
  followups,
  prospects = [],
}: {
  followups:  Followup[]
  prospects?: ProspectItem[]
}) {
  const [tab, setTab] = useState<Tab>('suivi')

  const nSuiviRetard  = followups.filter(f => getFollowupStatus(f) === 'en-retard').length
  const nFuActif      = prospects.filter(p => !p.done).length
  const nFuOverdue    = prospects.filter(p => !p.done && p.followupDate < today()).length

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">

      <h1 className="text-2xl font-bold text-gray-900">Suivi client</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setTab('suivi')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all',
            tab === 'suivi' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Users size={14} />
          Suivi client
          {nSuiviRetard > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
              {nSuiviRetard}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('followup')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all',
            tab === 'followup' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <UserSearch size={14} />
          Follow up
          {nFuActif > 0 && (
            <span className={cn(
              'text-[11px] font-bold px-1.5 py-0.5 rounded-full',
              nFuOverdue > 0
                ? 'bg-red-100 text-red-600'
                : tab === 'followup' ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-600',
            )}>
              {nFuActif}
            </span>
          )}
        </button>
      </div>

      {tab === 'suivi'    && <SuiviTab   followups={followups} />}
      {tab === 'followup' && <FollowUpTab prospects={prospects} />}
    </div>
  )
}
