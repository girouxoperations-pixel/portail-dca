'use client'

import { useState, useOptimistic, useTransition } from 'react'
import {
  CheckCircle2, Circle, Clock, AlertCircle,
  DollarSign, MessageSquare, UserSearch, Plus, Trash2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuiviTask, VersementTask, ProspectTask } from './types'
import { todayStr, weekEnd, classifyTask, dollar, fmtDate } from './types'
import { toggleSuiviMessage, addProspectFollowup, toggleProspectFollowup, deleteProspectFollowup, noterRecuCloser } from './actions'

interface Props {
  suiviTasks:     SuiviTask[]
  versementTasks: VersementTask[]
  prospectTasks:  ProspectTask[]
  closerName:     string
  closerId:       string
}

type Tab = 'today' | 'week' | 'overdue'

export default function CloserTodoView({ suiviTasks, versementTasks, prospectTasks, closerName }: Props) {
  const [tab, setTab] = useState<Tab>('today')
  const today = todayStr()
  const eow   = weekEnd()

  function periodOf(dueDate: string, done: boolean) {
    return classifyTask(dueDate, done, today, eow)
  }

  const suivis     = suiviTasks.filter(t => periodOf(t.dueDate, t.done) === tab)
  const versements = versementTasks.filter(t => {
    const p = periodOf(t.dueDate, false)
    return tab === 'today' ? (p === 'today' || p === 'overdue') : p === tab
  })
  const prospects  = prospectTasks.filter(t => {
    const p = periodOf(t.followupDate, t.done)
    return tab === 'today' ? (p === 'today' || p === 'overdue') : p === tab
  })

  // Badge counts: only pending (not done, not noted by closer)
  const vPending = (t: VersementTask) => !t.done && !t.closerNoted
  const counts = {
    today:
      suiviTasks.filter(t => periodOf(t.dueDate, t.done) === 'today').length +
      versementTasks.filter(t => vPending(t) && (periodOf(t.dueDate, false) === 'today' || periodOf(t.dueDate, false) === 'overdue')).length +
      prospectTasks.filter(t => { const p = periodOf(t.followupDate, t.done); return p === 'today' || p === 'overdue' }).length,
    week:
      suiviTasks.filter(t => periodOf(t.dueDate, t.done) === 'week').length +
      versementTasks.filter(t => vPending(t) && periodOf(t.dueDate, false) === 'week').length +
      prospectTasks.filter(t => periodOf(t.followupDate, t.done) === 'week').length,
    overdue:
      suiviTasks.filter(t => periodOf(t.dueDate, t.done) === 'overdue').length +
      versementTasks.filter(t => vPending(t) && periodOf(t.dueDate, false) === 'overdue').length +
      prospectTasks.filter(t => periodOf(t.followupDate, t.done) === 'overdue').length,
  }

  const overdueS = suiviTasks.filter(t => periodOf(t.dueDate, t.done) === 'overdue').length
  const overdueV = versementTasks.filter(t => vPending(t) && periodOf(t.dueDate, false) === 'overdue').length
  const overdueP = prospectTasks.filter(t => periodOf(t.followupDate, t.done) === 'overdue').length
  const todayAll = counts.today

  const [expandedCard, setExpandedCard] = useState<'suivis' | 'versements' | 'prospects' | 'today' | null>(null)
  function toggleCard(card: typeof expandedCard) {
    setExpandedCard(v => v === card ? null : card)
  }

  const overdueSuivis     = suiviTasks.filter(t => periodOf(t.dueDate, t.done) === 'overdue')
  const overdueVersements = versementTasks.filter(t => vPending(t) && periodOf(t.dueDate, false) === 'overdue')
  const overdueProspects  = prospectTasks.filter(t => periodOf(t.followupDate, t.done) === 'overdue')
  const todayItems = {
    suivis:     suiviTasks.filter(t => { const p = periodOf(t.dueDate, t.done); return p === 'today' }),
    versements: versementTasks.filter(t => { const p = periodOf(t.dueDate, false); return vPending(t) && (p === 'today' || p === 'overdue') }),
    prospects:  prospectTasks.filter(t => { const p = periodOf(t.followupDate, t.done); return p === 'today' || p === 'overdue' }),
  }

  const empty = suivis.length === 0 && prospects.length === 0 && versements.length === 0

  const TABS: { key: Tab; label: string }[] = [
    { key: 'today',   label: "Aujourd'hui"  },
    { key: 'week',    label: 'Cette semaine' },
    { key: 'overdue', label: 'En retard'    },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 capitalize">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Bonjour {closerName} — voici tes tâches</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={AlertCircle}   label="Suivis en retard"     value={overdueS} danger={overdueS > 0} active={expandedCard === 'suivis'}     onClick={() => toggleCard('suivis')} />
        <KpiCard icon={DollarSign}    label="Récurrents en retard" value={overdueV} danger={overdueV > 0} active={expandedCard === 'versements'} onClick={() => toggleCard('versements')} />
        <KpiCard icon={UserSearch}    label="Prospects en retard"  value={overdueP} danger={overdueP > 0} active={expandedCard === 'prospects'}  onClick={() => toggleCard('prospects')} />
        <KpiCard icon={MessageSquare} label="Tâches aujourd'hui"   value={todayAll}                       active={expandedCard === 'today'}      onClick={() => toggleCard('today')} />
      </div>

      {/* Inline expand panel */}
      {expandedCard && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {expandedCard === 'suivis' && (
            overdueSuivis.length === 0
              ? <p className="text-sm text-gray-400 text-center py-5">Aucun suivi en retard</p>
              : <div className="divide-y divide-gray-50">
                  {overdueSuivis.map(t => (
                    <div key={`${t.followupId}-${t.messageNum}`} className="flex items-center gap-3 px-4 py-2.5">
                      <AlertCircle size={13} className="text-red-400 shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{t.clientName}</span>
                      <span className="text-xs text-gray-400">Msg {t.messageNum}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.dueDate)}</span>
                    </div>
                  ))}
                </div>
          )}
          {expandedCard === 'versements' && (
            overdueVersements.length === 0
              ? <p className="text-sm text-gray-400 text-center py-5">Aucun récurrent en retard</p>
              : <div className="divide-y divide-gray-50">
                  {overdueVersements.map(t => (
                    <div key={t.occurrenceId} className="flex items-center gap-3 px-4 py-2.5">
                      <DollarSign size={13} className="text-orange-400 shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{t.clientName}</span>
                      <span className="text-xs font-semibold text-gray-600">{dollar(t.montant)}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.dueDate)}</span>
                    </div>
                  ))}
                </div>
          )}
          {expandedCard === 'prospects' && (
            overdueProspects.length === 0
              ? <p className="text-sm text-gray-400 text-center py-5">Aucun prospect en retard</p>
              : <div className="divide-y divide-gray-50">
                  {overdueProspects.map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      <UserSearch size={13} className="text-violet-400 shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{t.prospectName}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.followupDate)}</span>
                    </div>
                  ))}
                </div>
          )}
          {expandedCard === 'today' && (
            (todayItems.suivis.length + todayItems.versements.length + todayItems.prospects.length) === 0
              ? <p className="text-sm text-gray-400 text-center py-5">Rien pour aujourd'hui</p>
              : <div className="divide-y divide-gray-50">
                  {todayItems.prospects.map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      <UserSearch size={13} className="text-violet-400 shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{t.prospectName}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.followupDate)}</span>
                    </div>
                  ))}
                  {todayItems.suivis.map(t => (
                    <div key={`${t.followupId}-${t.messageNum}`} className="flex items-center gap-3 px-4 py-2.5">
                      <MessageSquare size={13} className="text-blue-400 shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{t.clientName}</span>
                      <span className="text-xs text-gray-400">Msg {t.messageNum}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.dueDate)}</span>
                    </div>
                  ))}
                  {todayItems.versements.map(t => (
                    <div key={t.occurrenceId} className="flex items-center gap-3 px-4 py-2.5">
                      <DollarSign size={13} className="text-green-400 shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{t.clientName}</span>
                      <span className="text-xs font-semibold text-gray-600">{dollar(t.montant)}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.dueDate)}</span>
                    </div>
                  ))}
                </div>
          )}
        </div>
      )}

      {/* Period tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? t.key === 'overdue' ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-violet-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={cn(
                'text-[11px] font-bold px-1.5 py-0.5 rounded-full',
                tab === t.key
                  ? t.key === 'overdue' ? 'bg-red-500 text-white' : 'bg-violet-100 text-violet-700'
                  : t.key === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600',
              )}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {empty ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
          <CheckCircle2 size={32} className="mx-auto text-green-300 mb-3" />
          <p className="text-sm font-medium text-gray-400">Rien à faire ici</p>
          <p className="text-xs text-gray-300 mt-1">Tu es à jour pour cette période.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Follow up prospects */}
          {prospects.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <UserSearch size={14} className="text-violet-500" />
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Follow up — {prospects.length} prospect{prospects.length > 1 ? 's' : ''}
                </h2>
              </div>
              <div className="space-y-2">
                {prospects.map(t => <ProspectRow key={t.id} task={t} today={today} />)}
              </div>
            </section>
          )}

          {/* Suivi client */}
          {suivis.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <MessageSquare size={14} className="text-blue-500" />
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Suivi client — {suivis.length} message{suivis.length > 1 ? 's' : ''}
                </h2>
              </div>
              <div className="space-y-2">
                {suivis.map(t => <SuiviRow key={`${t.followupId}-${t.messageNum}`} task={t} today={today} />)}
              </div>
            </section>
          )}

          {/* Récurrents */}
          {versements.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <DollarSign size={14} className="text-green-500" />
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Récurrents — {versements.length}
                </h2>
              </div>
              <div className="space-y-2">
                {versements.map(t => <VersementRow key={t.occurrenceId} task={t} today={today} />)}
              </div>
              {versements.some(t => !t.done && !t.closerNoted) && (
                <p className="text-[11px] text-gray-400 mt-2 ml-1">
                  Coche un versement pour le noter personnellement. La validation officielle est faite par l'admin.
                </p>
              )}
            </section>
          )}
        </div>
      )}

      {/* Add prospect follow-up */}
      <AddProspectForm />
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, danger, active, onClick }: {
  icon: React.ElementType; label: string; value: number
  danger?: boolean; active?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border shadow-sm p-4 text-left w-full transition-all',
        active        ? 'ring-2 ring-violet-400 bg-white border-violet-200'
        : danger && value > 0 ? 'bg-red-50 border-red-200 hover:bg-red-100'
        : 'bg-white border-gray-100 hover:bg-gray-50',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} className={danger && value > 0 ? 'text-red-500' : 'text-gray-300'} />
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className={cn('text-2xl font-bold tabular-nums', danger && value > 0 ? 'text-red-600' : 'text-gray-900')}>
        {value > 0 ? value : '—'}
      </p>
    </button>
  )
}

// ── Add prospect form ─────────────────────────────────────────────────
function AddProspectForm() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    startTransition(async () => {
      await addProspectFollowup(formData)
      setOpen(false)
    })
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-violet-300 hover:text-violet-500 transition-colors"
    >
      <Plus size={16} />
      Ajouter un follow-up prospect
    </button>
  )

  return (
    <form action={submit} className="bg-white rounded-xl border border-violet-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <UserSearch size={14} className="text-violet-500" />
          Nouveau follow-up prospect
        </p>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500">
          <X size={16} />
        </button>
      </div>
      <input name="prospect_name" required placeholder="Nom du prospect"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      <input name="followup_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      <input name="notes" placeholder="Notes (optionnel)"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="flex-1 bg-violet-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50">
          {pending ? 'Ajout…' : 'Ajouter'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">
          Annuler
        </button>
      </div>
    </form>
  )
}

// ── Prospect row ──────────────────────────────────────────────────────
function ProspectRow({ task: t, today }: { task: ProspectTask; today: string }) {
  const [optimisticDone, setOptimistic] = useOptimistic(t.done)
  const [, startTransition] = useTransition()

  const isOverdue = !optimisticDone && t.followupDate < today
  const isToday   = !optimisticDone && t.followupDate === today

  function toggle() {
    const next = !optimisticDone
    startTransition(async () => {
      setOptimistic(next)
      await toggleProspectFollowup(t.id, next)
    })
  }

  function remove(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(() => { deleteProspectFollowup(t.id) })
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
      optimisticDone ? 'bg-green-50 border-green-100'
      : isOverdue    ? 'bg-red-50 border-red-200'
      : isToday      ? 'bg-amber-50 border-amber-200'
      : 'bg-white border-gray-100',
    )}>
      <button onClick={toggle} className="shrink-0">
        {optimisticDone
          ? <CheckCircle2 size={20} className="text-green-500" />
          : isOverdue
            ? <AlertCircle size={20} className="text-red-400" />
            : isToday
              ? <Clock size={20} className="text-amber-500" />
              : <Circle size={20} className="text-gray-300" />
        }
      </button>
      <div className="flex-1 min-w-0" onClick={toggle} role="button">
        <p className={cn('text-sm font-medium', optimisticDone ? 'text-gray-400 line-through' : 'text-gray-800')}>
          {t.prospectName}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {optimisticDone && t.doneDate ? `Fait le ${fmtDate(t.doneDate)}` : fmtDate(t.followupDate)}
          {t.notes && <span className="ml-2 text-gray-300">· {t.notes}</span>}
        </p>
      </div>
      {isOverdue && !optimisticDone && (
        <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
          En retard
        </span>
      )}
      <button onClick={remove} className="p-1 text-gray-200 hover:text-red-400 shrink-0 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ── Suivi row ─────────────────────────────────────────────────────────
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
        optimisticDone ? 'bg-green-50 border-green-100'
        : isOverdue    ? 'bg-red-50 border-red-200 hover:bg-red-100'
        : isToday      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
        : 'bg-white border-gray-100 hover:border-gray-200',
      )}
    >
      {optimisticDone ? <CheckCircle2 size={20} className="text-green-500 shrink-0" />
       : isOverdue    ? <AlertCircle  size={20} className="text-red-400 shrink-0"   />
       : isToday      ? <Clock        size={20} className="text-amber-500 shrink-0" />
       :                <Circle       size={20} className="text-gray-300 shrink-0"  />}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', optimisticDone ? 'text-gray-400 line-through' : 'text-gray-800')}>
          {t.clientName}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Message {t.messageNum} · {optimisticDone && t.doneDate ? `Fait le ${fmtDate(t.doneDate)}` : fmtDate(t.dueDate)}
        </p>
      </div>
      {isOverdue && !optimisticDone && (
        <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">En retard</span>
      )}
    </button>
  )
}

// ── Versement row — closer can personally note; admin/CSM confirms ────
function VersementRow({ task: t, today }: { task: VersementTask; today: string }) {
  const [optimisticNoted, setOptimistic] = useOptimistic(t.closerNoted)
  const [, startTransition] = useTransition()

  const effectiveDone = t.done || optimisticNoted
  const isOverdue = !effectiveDone && t.dueDate < today

  function toggle() {
    if (t.done) return
    const next = !optimisticNoted
    startTransition(async () => {
      setOptimistic(next)
      await noterRecuCloser(t.occurrenceId, next)
    })
  }

  return (
    <div
      onClick={toggle}
      role="button"
      className={cn(
        'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
        t.done            ? 'bg-green-50 border-green-100'
        : optimisticNoted ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        : isOverdue       ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
        : 'bg-white border-gray-100 hover:border-gray-200',
        !t.done && 'cursor-pointer',
      )}
    >
      {t.done
        ? <CheckCircle2 size={20} className="text-green-500 shrink-0" />
        : optimisticNoted
          ? <CheckCircle2 size={20} className="text-gray-400 shrink-0" />
          : <DollarSign   size={20} className={isOverdue ? 'text-orange-500 shrink-0' : 'text-gray-300 shrink-0'} />
      }
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', effectiveDone ? 'text-gray-400 line-through' : 'text-gray-800')}>
          {t.clientName}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(t.dueDate)}</p>
      </div>
      <span className={cn('text-sm font-semibold shrink-0', effectiveDone ? 'text-gray-400' : 'text-gray-700')}>
        {dollar(t.montant)}
      </span>
      {t.done              && <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">Reçu ✓</span>}
      {optimisticNoted && !t.done && <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">Noté ✓</span>}
      {isOverdue           && <span className="text-[10px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">En retard</span>}
    </div>
  )
}
