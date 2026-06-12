'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { CheckCircle2, Clock, AlertCircle, Circle, Users, UserSearch } from 'lucide-react'
import { toggleMessage } from './actions'
import { toggleProspectFollowup } from '@/app/(portal)/todo/actions'
import { cn } from '@/lib/utils'

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

type Filter = 'tous' | 'a-faire' | 'en-retard' | 'completes'

function today() { return new Date().toISOString().split('T')[0] }

function getMsgStatus(done: boolean, due: string): 'done' | 'overdue' | 'soon' | 'pending' {
  if (done) return 'done'
  const todayStr = today()
  if (due < todayStr) return 'overdue'
  const daysLeft = Math.ceil((new Date(due).getTime() - new Date(todayStr).getTime()) / 86400000)
  if (daysLeft <= 3) return 'soon'
  return 'pending'
}

function getFollowupStatus(f: Followup): 'complete' | 'en-retard' | 'en-cours' {
  if (f.message1_done && f.message2_done && f.message3_done) return 'complete'
  const todayStr = today()
  const overdue = (!f.message1_done && f.due_message1 < todayStr)
    || (!f.message2_done && f.due_message2 < todayStr)
    || (!f.message3_done && f.due_message3 < todayStr)
  if (overdue) return 'en-retard'
  return 'en-cours'
}

function formatDate(d: string) {
  return new Date(d + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const MSG_STYLE = {
  done:    { ring: 'ring-green-200 bg-green-50',   icon: CheckCircle2, iconCls: 'text-green-500', label: 'bg-green-100 text-green-700' },
  overdue: { ring: 'ring-red-200 bg-red-50',       icon: AlertCircle,  iconCls: 'text-red-500',   label: 'bg-red-100 text-red-700'     },
  soon:    { ring: 'ring-amber-200 bg-amber-50',   icon: Clock,        iconCls: 'text-amber-500', label: 'bg-amber-100 text-amber-700' },
  pending: { ring: 'ring-gray-200 bg-gray-50',     icon: Circle,       iconCls: 'text-gray-300',  label: 'bg-gray-100 text-gray-500'   },
} as const

interface MsgCheckboxProps {
  followupId: string
  num:        1 | 2 | 3
  done:       boolean
  dueDate:    string
  doneDate:   string | null
}

function MsgCheckbox({ followupId, num, done, dueDate, doneDate }: MsgCheckboxProps) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done)
  const [, startTransition] = useTransition()
  const status = getMsgStatus(optimisticDone, dueDate)
  const style  = MSG_STYLE[status]
  const Icon   = style.icon

  function handle() {
    const next = !optimisticDone
    startTransition(async () => {
      setOptimisticDone(next)
      await toggleMessage(followupId, num, next)
    })
  }

  return (
    <button
      onClick={handle}
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-xl ring-1 transition-all w-28 shrink-0',
        style.ring,
        'hover:shadow-sm',
      )}
    >
      <Icon size={20} className={style.iconCls} />
      <span className="text-[11px] font-semibold text-gray-600">Msg {num}</span>
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', style.label)}>
        {optimisticDone && doneDate ? `Fait le ${formatDate(doneDate)}` : formatDate(dueDate)}
      </span>
    </button>
  )
}

interface ProspectItem {
  id:           string
  prospectName: string
  followupDate: string
  notes:        string | null
  done:         boolean
  doneDate:     string | null
}

function ProspectRow({ p }: { p: ProspectItem }) {
  const td = today()
  const [optimisticDone, setOptimistic] = useOptimistic(p.done)
  const [, startTransition] = useTransition()

  function toggle() {
    const next = !optimisticDone
    startTransition(async () => {
      setOptimistic(next)
      await toggleProspectFollowup(p.id, next)
    })
  }

  const overdue = !optimisticDone && p.followupDate < td
  const isToday = !optimisticDone && p.followupDate === td

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
    >
      {optimisticDone
        ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
        : overdue
          ? <AlertCircle size={16} className="text-red-400 shrink-0" />
          : isToday
            ? <Clock size={16} className="text-amber-400 shrink-0" />
            : <Circle size={16} className="text-gray-200 shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm font-medium', optimisticDone ? 'text-gray-300 line-through' : 'text-gray-700')}>
          {p.prospectName}
        </span>
        {p.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.notes}</p>}
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatDate(p.followupDate)}</span>
      {overdue && !optimisticDone && (
        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">En retard</span>
      )}
    </button>
  )
}

export default function CloserFollowupView({ followups, prospects = [] }: { followups: Followup[]; prospects?: ProspectItem[] }) {
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
    { key: 'tous',      label: 'Tous'       },
    { key: 'a-faire',   label: 'À faire'    },
    { key: 'en-retard', label: 'En retard'  },
    { key: 'completes', label: 'Complétés'  },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suivi client</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {followups.length} client{followups.length !== 1 ? 's' : ''} · {nComplete} complété{nComplete !== 1 ? 's' : ''} · {nRetard} en retard
        </p>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f.key
                ? 'bg-violet-600 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Relances prospects */}
      {prospects.length > 0 && (
        <div className="bg-white rounded-xl border border-violet-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 border-b border-violet-100">
            <UserSearch size={14} className="text-violet-500" />
            <span className="text-sm font-semibold text-violet-800">Relances prospects</span>
            <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              {prospects.filter(p => !p.done).length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {prospects.map(p => <ProspectRow key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {/* Liste */}
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
              <div
                key={f.id}
                className={cn(
                  'bg-white rounded-xl border shadow-sm p-4',
                  status === 'en-retard' ? 'border-red-100' : 'border-gray-100',
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{f.client_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Closé le {formatDate(f.close_date)}
                    </p>
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

                {f.notes && (
                  <p className="mt-3 text-xs text-gray-400 border-t border-gray-50 pt-3">{f.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
