'use client'

import { useState, useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, AlertCircle, DollarSign, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuiviTask, VersementTask, Period } from './types'
import { todayStr, weekEnd, classifyTask, dollar, fmtDate } from './types'
import { toggleSuiviMessage } from './actions'

interface Props {
  suiviTasks:    SuiviTask[]
  versementTasks: VersementTask[]
  closerName:    string
}

type Tab = 'today' | 'week' | 'overdue'

export default function CloserTodoView({ suiviTasks, versementTasks, closerName }: Props) {
  const [tab, setTab] = useState<Tab>('today')
  const today = todayStr()
  const eow   = weekEnd()

  function filterPeriod(dueDate: string, done: boolean): Period | 'done' {
    return classifyTask(dueDate, done, today, eow)
  }

  const todayFollowups  = suiviTasks.filter(t => filterPeriod(t.dueDate, t.done) === 'today')
  const weekFollowups   = suiviTasks.filter(t => filterPeriod(t.dueDate, t.done) === 'week')
  const overdueFollowups = suiviTasks.filter(t => filterPeriod(t.dueDate, t.done) === 'overdue')

  const todayVers   = versementTasks.filter(t => filterPeriod(t.dueDate, false) === 'today' || filterPeriod(t.dueDate, false) === 'overdue')
  const weekVers    = versementTasks.filter(t => filterPeriod(t.dueDate, false) === 'week')
  const overdueVers = versementTasks.filter(t => filterPeriod(t.dueDate, false) === 'overdue')

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'today',   label: "Aujourd'hui", count: todayFollowups.length + todayVers.length },
    { key: 'week',    label: 'Cette semaine', count: weekFollowups.length + weekVers.length },
    { key: 'overdue', label: 'En retard',   count: overdueFollowups.length + overdueVers.length },
  ]

  const currentSuivis   = tab === 'today' ? todayFollowups : tab === 'week' ? weekFollowups : overdueFollowups
  const currentVers     = tab === 'today' ? todayVers      : tab === 'week' ? weekVers      : overdueVers
  const empty           = currentSuivis.length === 0 && currentVers.length === 0

  const now = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 capitalize">{now}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Bonjour {closerName} — voici tes tâches</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? t.key === 'overdue'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-violet-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                'text-[11px] font-bold px-1.5 py-0.5 rounded-full',
                tab === t.key
                  ? t.key === 'overdue' ? 'bg-red-500 text-white' : 'bg-violet-100 text-violet-700'
                  : t.key === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600',
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {empty ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-14 text-center">
          <CheckCircle2 size={32} className="mx-auto text-green-300 mb-3" />
          <p className="text-sm font-medium text-gray-400">Rien à faire ici</p>
          <p className="text-xs text-gray-300 mt-1">Tu es à jour pour cette période.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Suivis clients */}
          {currentSuivis.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <MessageSquare size={14} className="text-violet-500" />
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Suivis clients — {currentSuivis.length} message{currentSuivis.length > 1 ? 's' : ''}
                </h2>
              </div>
              <div className="space-y-2">
                {currentSuivis.map(t => (
                  <SuiviRow key={`${t.followupId}-${t.messageNum}`} task={t} today={today} />
                ))}
              </div>
            </section>
          )}

          {/* Versements à collecter */}
          {currentVers.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <DollarSign size={14} className="text-green-500" />
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Versements à collecter — {currentVers.length}
                </h2>
              </div>
              <div className="space-y-2">
                {currentVers.map(t => (
                  <VersementRow key={t.occurrenceId} task={t} today={today} />
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 ml-1">
                Marquer reçu depuis <Link href="/recurrents" className="text-violet-500 hover:underline">Récurrents →</Link>
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// ── Suivi row with optimistic checkbox ────────────────────────────────
function SuiviRow({ task: t, today }: { task: SuiviTask; today: string }) {
  const [optimisticDone, setOptimistic] = useOptimistic(t.done)
  const [, startTransition] = useTransition()

  const isOverdue = !optimisticDone && t.dueDate < today
  const isToday   = !optimisticDone && t.dueDate === today

  function toggle() {
    const next = !optimisticDone
    startTransition(async () => {
      setOptimistic(next)
      await toggleSuiviMessage(t.followupId, t.messageNum, next)
    })
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
        optimisticDone
          ? 'bg-green-50 border-green-100'
          : isOverdue ? 'bg-red-50 border-red-200 hover:bg-red-100'
          : isToday   ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
          : 'bg-white border-gray-100 hover:border-gray-200',
      )}
    >
      {optimisticDone
        ? <CheckCircle2 size={20} className="text-green-500 shrink-0" />
        : isOverdue
          ? <AlertCircle size={20} className="text-red-400 shrink-0" />
          : isToday
            ? <Clock size={20} className="text-amber-500 shrink-0" />
            : <Circle size={20} className="text-gray-300 shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', optimisticDone ? 'text-gray-400 line-through' : 'text-gray-800')}>
          {t.clientName}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Message {t.messageNum} · {optimisticDone && t.doneDate ? `Fait le ${fmtDate(t.doneDate)}` : fmtDate(t.dueDate)}
        </p>
      </div>
      {isOverdue && !optimisticDone && (
        <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
          En retard
        </span>
      )}
    </button>
  )
}

// ── Versement row (read-only, link to recurrents) ────────────────────
function VersementRow({ task: t, today }: { task: VersementTask; today: string }) {
  const isOverdue = t.dueDate < today

  return (
    <Link
      href="/recurrents"
      className={cn(
        'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
        isOverdue ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : 'bg-white border-gray-100 hover:border-gray-200',
      )}
    >
      <DollarSign size={20} className={isOverdue ? 'text-orange-500 shrink-0' : 'text-gray-300 shrink-0'} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{t.clientName}</p>
        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(t.dueDate)}</p>
      </div>
      <span className="text-sm font-semibold text-gray-700 shrink-0">{dollar(t.montant)}</span>
      {isOverdue && (
        <span className="text-[10px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">
          En retard
        </span>
      )}
    </Link>
  )
}
