'use client'

import { useState, useMemo, useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import {
  AlertCircle, CheckCircle2, Circle, Clock,
  DollarSign, MessageSquare, ChevronDown, ChevronUp, Users, UserSearch, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuiviTask, VersementTask, ProspectTask } from './types'
import { todayStr, weekEnd, classifyTask, dollar, fmtDate } from './types'
import { toggleSuiviMessage, toggleProspectFollowup, deleteProspectFollowup } from './actions'

interface Props {
  suiviTasks:     SuiviTask[]
  versementTasks: VersementTask[]
  prospectTasks:  ProspectTask[]
  closers:        { id: string; full_name: string | null }[]
}

type Tab = 'today' | 'week' | 'overdue'

export default function AdminTodoView({ suiviTasks, versementTasks, prospectTasks, closers }: Props) {
  const [tab, setTab]       = useState<Tab>('overdue')
  const [closer, setCloser] = useState<string>('tous')

  const today = todayStr()
  const eow   = weekEnd()

  const allTasks = useMemo(() => {
    const s = suiviTasks.filter(t => closer === 'tous' || t.closerId === closer)
    const v = versementTasks.filter(t => closer === 'tous' || t.closerId === closer)
    const p = prospectTasks.filter(t => closer === 'tous' || t.closerId === closer)
    return { suivis: s, versements: v, prospects: p }
  }, [suiviTasks, versementTasks, prospectTasks, closer])

  function periodOf(dueDate: string, done: boolean) {
    return classifyTask(dueDate, done, today, eow)
  }

  const filtered = useMemo(() => {
    const suivis     = allTasks.suivis.filter(t => periodOf(t.dueDate, t.done) === tab)
    const versements = allTasks.versements.filter(t => {
      const p = periodOf(t.dueDate, false)
      return tab === 'today' ? (p === 'today' || p === 'overdue') : p === tab
    })
    const prospects  = allTasks.prospects.filter(t => {
      const p = periodOf(t.followupDate, t.done)
      return tab === 'today' ? (p === 'today' || p === 'overdue') : p === tab
    })
    return { suivis, versements, prospects }
  }, [allTasks, tab, today, eow])

  // KPI badges count only pending items
  const overdueS = suiviTasks.filter(t => periodOf(t.dueDate, t.done) === 'overdue').length
  const overdueV = versementTasks.filter(t => !t.done && periodOf(t.dueDate, false) === 'overdue').length
  const overdueP = prospectTasks.filter(t => periodOf(t.followupDate, t.done) === 'overdue').length
  const todayS   = suiviTasks.filter(t => periodOf(t.dueDate, t.done) === 'today').length
  const todayV   = versementTasks.filter(t => !t.done && (periodOf(t.dueDate, false) === 'today' || periodOf(t.dueDate, false) === 'overdue')).length
  const todayP   = prospectTasks.filter(t => { const p = periodOf(t.followupDate, t.done); return p === 'today' || p === 'overdue' }).length

  const TABS: { key: Tab; label: string; badgeCount: number }[] = [
    { key: 'today',   label: "Aujourd'hui",  badgeCount: todayS + todayV + todayP },
    { key: 'week',    label: 'Cette semaine', badgeCount: 0 },
    { key: 'overdue', label: 'En retard',    badgeCount: overdueS + overdueV + overdueP },
  ]

  // Group by closer
  const byCloser = useMemo(() => {
    const map = new Map<string, { name: string; suivis: SuiviTask[]; versements: VersementTask[]; prospects: ProspectTask[] }>()
    for (const t of filtered.suivis) {
      if (!map.has(t.closerId)) map.set(t.closerId, { name: t.closerName, suivis: [], versements: [], prospects: [] })
      map.get(t.closerId)!.suivis.push(t)
    }
    for (const t of filtered.versements) {
      const key = t.closerId ?? '__none__'
      if (!map.has(key)) map.set(key, { name: t.closerName ?? 'Non assigné', suivis: [], versements: [], prospects: [] })
      map.get(key)!.versements.push(t)
    }
    for (const t of filtered.prospects) {
      if (!map.has(t.closerId)) map.set(t.closerId, { name: t.closerName, suivis: [], versements: [], prospects: [] })
      map.get(t.closerId)!.prospects.push(t)
    }
    return [...map.entries()].sort((a, b) =>
      (b[1].suivis.length + b[1].versements.length + b[1].prospects.length) -
      (a[1].suivis.length + a[1].versements.length + a[1].prospects.length)
    )
  }, [filtered])

  const totalFiltered = filtered.suivis.length + filtered.versements.length + filtered.prospects.length

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Todo — Vue équipe</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={AlertCircle}   label="Suivis en retard"     value={overdueS} danger={overdueS > 0} />
        <KpiCard icon={DollarSign}    label="Récurrents en retard" value={overdueV} danger={overdueV > 0} />
        <KpiCard icon={UserSearch}    label="Prospects en retard"  value={overdueP} danger={overdueP > 0} />
        <KpiCard icon={MessageSquare} label="Tâches aujourd'hui"   value={todayS + todayV + todayP} />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-all',
                tab === t.key
                  ? t.key === 'overdue' ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {t.label}
              {t.badgeCount > 0 && (
                <span className={cn(
                  'text-[11px] font-bold px-1.5 py-0.5 rounded-full',
                  tab === t.key
                    ? t.key === 'overdue' ? 'bg-red-500 text-white' : 'bg-violet-100 text-violet-700'
                    : t.key === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600',
                )}>
                  {t.badgeCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <select
          value={closer}
          onChange={e => setCloser(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="tous">Tous les closers</option>
          {closers.map(c => <option key={c.id} value={c.id}>{c.full_name ?? 'Inconnu'}</option>)}
        </select>

        <span className="text-xs text-gray-400 ml-auto">{totalFiltered} tâche{totalFiltered !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      {totalFiltered === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-14 text-center">
          <CheckCircle2 size={32} className="mx-auto text-green-300 mb-3" />
          <p className="text-sm font-medium text-gray-400">Rien à signaler pour cette période</p>
        </div>
      ) : (
        <div className="space-y-3">
          {byCloser.map(([closerId, group]) => (
            <CloserGroup
              key={closerId}
              closerName={group.name}
              suivis={group.suivis}
              versements={group.versements}
              prospects={group.prospects}
              today={today}
              isOverdue={tab === 'overdue'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, danger }: {
  icon: React.ElementType; label: string; value: number; danger?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl border shadow-sm p-4',
      danger && value > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100',
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} className={danger && value > 0 ? 'text-red-500' : 'text-gray-300'} />
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className={cn('text-2xl font-bold tabular-nums', danger && value > 0 ? 'text-red-600' : 'text-gray-900')}>
        {value > 0 ? value : '—'}
      </p>
    </div>
  )
}

// ── Per-closer collapsible group ──────────────────────────────────────
function CloserGroup({ closerName, suivis, versements, prospects, today, isOverdue }: {
  closerName: string
  suivis:     SuiviTask[]
  versements: VersementTask[]
  prospects:  ProspectTask[]
  today:      string
  isOverdue:  boolean
}) {
  const [open, setOpen] = useState(true)
  const total = suivis.length + versements.length + prospects.length
  const pendingV = versements.filter(t => !t.done).length

  return (
    <div className={cn(
      'rounded-xl border shadow-sm overflow-hidden',
      isOverdue && total > 0 ? 'border-red-100' : 'border-gray-100',
    )}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          isOverdue && total > 0 ? 'bg-red-50' : 'bg-gray-50',
        )}
      >
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">{closerName}</span>
          <span className={cn(
            'text-[11px] font-bold px-2 py-0.5 rounded-full',
            isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600',
          )}>
            {suivis.length + pendingV + prospects.length} tâche{(suivis.length + pendingV + prospects.length) > 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {open && (
        <div className="divide-y divide-gray-50">
          {prospects.map(t => (
            <AdminProspectRow key={t.id} task={t} today={today} />
          ))}
          {suivis.map(t => (
            <AdminSuiviRow key={`${t.followupId}-${t.messageNum}`} task={t} today={today} />
          ))}
          {versements.map(t => (
            <AdminVersementRow key={t.occurrenceId} task={t} today={today} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Admin prospect row ────────────────────────────────────────────────
function AdminProspectRow({ task: t, today }: { task: ProspectTask; today: string }) {
  const [optimisticDone, setOptimistic] = useOptimistic(t.done)
  const [, startTransition] = useTransition()

  function toggle() {
    const next = !optimisticDone
    startTransition(async () => {
      setOptimistic(next)
      await toggleProspectFollowup(t.id, next)
    })
  }

  function del(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(async () => { await deleteProspectFollowup(t.id) })
  }

  const overdue = !optimisticDone && t.followupDate < today
  const isToday = !optimisticDone && t.followupDate === today

  return (
    <div
      onClick={toggle}
      role="button"
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors cursor-pointer"
    >
      {optimisticDone
        ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
        : overdue
          ? <AlertCircle size={16} className="text-red-400 shrink-0" />
          : isToday
            ? <Clock size={16} className="text-amber-400 shrink-0" />
            : <Circle size={16} className="text-gray-200 shrink-0" />
      }
      <UserSearch size={12} className="text-violet-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm', optimisticDone ? 'text-gray-300 line-through' : 'text-gray-700')}>
          {t.prospectName}
        </span>
        {t.notes && <span className="text-xs text-gray-400 ml-2">· {t.notes}</span>}
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{fmtDate(t.followupDate)}</span>
      {overdue && !optimisticDone && (
        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">En retard</span>
      )}
      <button onClick={del} className="p-1 text-gray-200 hover:text-red-400 transition-colors shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Admin suivi row ───────────────────────────────────────────────────
function AdminSuiviRow({ task: t, today }: { task: SuiviTask; today: string }) {
  const [optimisticDone, setOptimistic] = useOptimistic(t.done)
  const [, startTransition] = useTransition()

  function toggle() {
    const next = !optimisticDone
    startTransition(async () => {
      setOptimistic(next)
      await toggleSuiviMessage(t.followupId, t.messageNum, next)
    })
  }

  const overdue = !optimisticDone && t.dueDate < today
  const isToday = !optimisticDone && t.dueDate === today

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
      <MessageSquare size={12} className="text-gray-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm', optimisticDone ? 'text-gray-300 line-through' : 'text-gray-700')}>
          {t.clientName}
        </span>
        <span className="text-xs text-gray-400 ml-2">· Msg {t.messageNum}</span>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{fmtDate(t.dueDate)}</span>
      {overdue && !optimisticDone && (
        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">En retard</span>
      )}
    </button>
  )
}

// ── Admin versement row — shows done state when collected ─────────────
function AdminVersementRow({ task: t, today }: { task: VersementTask; today: string }) {
  const isOverdue = !t.done && t.dueDate < today
  return (
    <Link
      href="/recurrents"
      className={cn(
        'flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors',
        t.done && 'opacity-70',
      )}
    >
      {t.done
        ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
        : <DollarSign   size={16} className={isOverdue ? 'text-orange-400 shrink-0' : 'text-gray-200 shrink-0'} />
      }
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm', t.done ? 'text-gray-400 line-through' : 'text-gray-700')}>
          {t.clientName}
        </span>
      </div>
      <span className="text-sm font-semibold text-gray-600 shrink-0">{dollar(t.montant)}</span>
      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{fmtDate(t.dueDate)}</span>
      {t.done    && <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded shrink-0">Reçu ✓</span>}
      {isOverdue && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded shrink-0">En retard</span>}
    </Link>
  )
}
