'use client'

import { useState, useMemo, useTransition, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Search, Users, CheckCircle2, AlertCircle, Clock,
  Shield, X, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Upload, Plus, Pencil,
  ListTodo, Circle, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ExportCsvButton from '@/components/ui/ExportCsvButton'
import type { CsmClient, CsmTask } from './types'
import { computeDueDates, today, formatDate } from './types'
import {
  updateMeeting, updateMissed, toggleText, toggleMilestone, updateStatus,
  marquerRemboursementAvecMontant, updateOnboardingDate, updateEmailAvis, creerCsmClientManuel,
  updateCsmId, updatePaymentType, supprimerCsmClient,
  creerTache, toggleTache, supprimerTache,
} from './actions'
import { definirObjectifCsm } from '@/app/(portal)/payes/actions'

type StatusFilter =
  | 'tous' | 'active' | 'm2_missed' | 'm3_missed'
  | 'cert_setter' | 'cert_closer' | 'eval_failed' | 'paused' | 'dropped' | 'refund'
  | 'j90_auto' | 'overdue_texts' | 'meetings_today' | 'tasks'

const STATUS_CONFIG: Record<CsmClient['status'], { label: string; cls: string }> = {
  active:      { label: 'Active',       cls: 'bg-green-100 text-green-700'  },
  paused:      { label: 'En pause',     cls: 'bg-amber-100 text-amber-700'  },
  eval_failed: { label: 'Eval échoué',  cls: 'bg-orange-100 text-orange-700' },
  completed:   { label: 'Complétée',   cls: 'bg-blue-100 text-blue-700'    },
  dropped:     { label: 'Abandon',     cls: 'bg-gray-100 text-gray-500'    },
  refund:      { label: 'Remboursée',  cls: 'bg-red-100 text-red-600'      },
}

function daysBetween(a: string, b: string) {
  return Math.floor((new Date(b).getTime() - new Date(a + 'T00:00').getTime()) / 86400000)
}

// ── Editable onboarding date cell ─────────────────────────────────────

function EditableOnboardingCell({ clientId, date }: {
  clientId: string
  date:     string | null
}) {
  const [open, setOpen]    = useState(false)
  const [val, setVal]      = useState(date ?? '')
  const [pending, startT]  = useTransition()
  const todayStr = today()

  function handleSave() {
    startT(async () => {
      await updateOnboardingDate(clientId, val || null)
      setOpen(false)
    })
  }

  const cellCls = !date
    ? 'bg-gray-50 text-gray-300 border border-dashed border-gray-200'
    : date < todayStr
      ? 'bg-green-100 text-green-800 border border-green-200'
      : date === todayStr
        ? 'bg-red-500 text-white border border-red-600'
        : 'bg-yellow-50 text-yellow-800 border border-yellow-200'

  return (
    <td className="px-2 py-2 text-center relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium w-full min-w-[52px] transition-all', cellCls)}
      >
        {date ? formatDate(date) : <span className="opacity-50">+ date</span>}
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-48 text-left">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Onboarding</p>
            <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={12} /></button>
          </div>
          <input
            type="date"
            value={val}
            onChange={e => setVal(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 mb-2"
          />
          <button
            onClick={handleSave}
            disabled={pending}
            className="w-full py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {pending ? '…' : 'Sauvegarder'}
          </button>
        </div>
      )}
    </td>
  )
}

// ── Editable meeting date cell ────────────────────────────────────────

function EditableMCell({ clientId, num, date, missed, cancelled }: {
  clientId:  string
  num:       1 | 2 | 3 | 4
  date:      string | null
  missed:    boolean
  cancelled?: boolean
}) {
  const [open, setOpen]    = useState(false)
  const [val, setVal]      = useState(date ?? '')
  const [pendingM, startM] = useTransition()
  const todayStr = today()

  function handleSave() {
    startM(async () => {
      await updateMeeting(clientId, num, { date: val || null })
      if (missed) await updateMissed(clientId, num, false)
      setOpen(false)
    })
  }

  function handleMissed() {
    startM(async () => {
      await updateMissed(clientId, num, !missed)
      setOpen(false)
    })
  }

  const effectiveCancelled = cancelled && !date && !missed
  const cellCls = effectiveCancelled
    ? 'bg-gray-100 text-gray-400 border border-gray-200 line-through'
    : missed
      ? 'bg-red-100 text-red-700 border border-red-300'
      : !date
        ? 'bg-gray-50 text-gray-300 border border-dashed border-gray-200'
        : date < todayStr
          ? 'bg-green-100 text-green-800 border border-green-200'
          : date === todayStr
            ? 'bg-red-500 text-white border border-red-600'
            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'

  return (
    <td className="px-2 py-2 text-center relative">
      <button
        onClick={() => { if (!effectiveCancelled) setOpen(v => !v) }}
        className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium w-full min-w-[52px] transition-all', cellCls)}
      >
        {missed
          ? <span className="flex items-center gap-0.5 justify-center"><AlertTriangle size={8} />Manqué</span>
          : date ? formatDate(date) : <span className="opacity-50">+ date</span>
        }
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52 text-left">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">M{num} — Date</p>
            <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={12} /></button>
          </div>
          <input
            type="date"
            value={val}
            onChange={e => setVal(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 mb-2"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleSave}
              disabled={pendingM}
              className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {pendingM ? '…' : 'Sauvegarder'}
            </button>
          </div>
          <button
            onClick={handleMissed}
            disabled={pendingM}
            className={cn(
              'mt-1.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border',
              missed
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
            )}
          >
            <AlertTriangle size={11} />
            {missed ? 'Annuler no show' : 'No show'}
          </button>
        </div>
      )}
    </td>
  )
}

// ── Text touchpoint cell ──────────────────────────────────────────────

function TextDoneButton({ clientId, field }: { clientId: string; field: 'j7'|'j24'|'j49'|'j63'|'j77'|'j90' }) {
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() => start(async () => toggleText(clientId, field, true))}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
    >
      <CheckCircle2 size={12} />
      Fait
    </button>
  )
}

function TextCell({ clientId, field, done, dueDate, actualDate, today: todayStr, info, cancelled }: {
  clientId:   string
  field:      'j7' | 'j24' | 'j49' | 'j63' | 'j77' | 'j90'
  done:       boolean
  dueDate:    string
  actualDate: string | null
  today:      string
  info?:      string
  cancelled?: boolean
}) {
  const [pending, start] = useTransition()
  const effectiveCancelled = cancelled && !done
  const displayDate = done && actualDate ? actualDate : dueDate
  const cls = effectiveCancelled
    ? 'bg-gray-100 text-gray-400 border border-gray-200 line-through'
    : done
      ? 'bg-green-100 text-green-800 border border-green-200'
      : dueDate <= todayStr
        ? 'bg-red-100 text-red-700 border border-red-200'
        : 'bg-yellow-50 text-yellow-800 border border-yellow-200'

  return (
    <td className="px-2 py-2 text-center">
      <button
        onClick={() => { if (!effectiveCancelled) start(async () => toggleText(clientId, field, !done)) }}
        disabled={pending || effectiveCancelled}
        className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center justify-center gap-0.5 w-full transition-all', cls)}
      >
        {done && <CheckCircle2 size={8} />}
        {!done && !effectiveCancelled && dueDate <= todayStr && <Clock size={8} />}
        {formatDate(displayDate)}
      </button>
      {info && <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{info}</p>}
    </td>
  )
}

// ── Email avis badge ─────────────────────────────────────────────────

type EmailAvis = '1er_avis' | '2e_avis' | '3e_avis' | 'mise_en_demeure' | 'out'

const EMAIL_CONFIG: Record<EmailAvis, { label: string; cls: string }> = {
  '1er_avis':        { label: '1er avis',        cls: 'bg-yellow-100 text-yellow-700' },
  '2e_avis':         { label: '2e avis',          cls: 'bg-orange-100 text-orange-700' },
  '3e_avis':         { label: '3e avis',          cls: 'bg-red-100 text-red-600'      },
  'mise_en_demeure': { label: 'Mise en demeure',  cls: 'bg-red-700 text-white'         },
  'out':             { label: 'Out',               cls: 'bg-gray-800 text-white'        },
}

function EmailCell({ clientId, avis }: { clientId: string; avis: EmailAvis | null }) {
  const [open, setOpen]   = useState(false)
  const [pending, startT] = useTransition()
  const [pos, setPos]     = useState({ top: 0, left: 0 })
  const btnRef            = useRef<HTMLButtonElement>(null)
  const cfg = avis ? EMAIL_CONFIG[avis] : null

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left + r.width / 2 })
    }
    setOpen(v => !v)
  }

  function handleSelect(key: EmailAvis | null) {
    startT(async () => { await updateEmailAvis(clientId, key); setOpen(false) })
  }

  return (
    <td className="px-2 py-2 text-center">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={cn(
          'text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5 mx-auto',
          cfg ? cfg.cls : 'bg-gray-100 text-gray-400',
        )}
      >
        {cfg ? cfg.label : '—'}
        <ChevronDown size={8} />
      </button>
      {open && typeof window !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-40"
            style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
          >
            <button
              disabled={pending}
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
            >
              — Aucun
            </button>
            {(Object.entries(EMAIL_CONFIG) as [EmailAvis, typeof EMAIL_CONFIG[EmailAvis]][]).map(([key, c]) => (
              <button
                key={key}
                disabled={pending}
                onClick={() => handleSelect(key)}
                className={cn('w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50', avis === key && 'font-semibold')}
              >
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', c.cls)}>{c.label}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </td>
  )
}

// ── Inline status + cert badge ────────────────────────────────────────

function StatusCell({
  clientId, clientName, status, certSetterDone, certCloserDone, dayN, isAdmin, onRefundClick,
}: {
  clientId:       string
  clientName:     string
  status:         CsmClient['status']
  certSetterDone: boolean
  certCloserDone: boolean
  dayN:           number
  isAdmin:        boolean
  onRefundClick:  (clientId: string, clientName: string) => void
}) {
  const [open, setOpen]   = useState(false)
  const [pending, startT] = useTransition()
  const [pos, setPos]     = useState({ top: 0, left: 0 })
  const btnRef            = useRef<HTMLButtonElement>(null)

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left + r.width / 2 })
    }
    setOpen(v => !v)
  }

  // Effective badge reflects the most specific state
  let badgeLabel: string
  let badgeCls: string
  if (certCloserDone) {
    badgeLabel = 'Cert. Closer'
    badgeCls   = 'bg-purple-100 text-purple-700'
  } else if (certSetterDone) {
    badgeLabel = 'Cert. Setter'
    badgeCls   = 'bg-blue-100 text-blue-700'
  } else if (dayN >= 90 && status === 'active') {
    badgeLabel = '+90 jours'
    badgeCls   = 'bg-orange-100 text-orange-700'
  } else {
    badgeLabel = STATUS_CONFIG[status].label
    badgeCls   = STATUS_CONFIG[status].cls
  }

  function handleStatus(key: CsmClient['status']) {
    if (key === 'refund') {
      setOpen(false)
      onRefundClick(clientId, clientName)
    } else {
      startT(async () => { await updateStatus(clientId, key); setOpen(false) })
    }
  }

  function handleCert(field: 'cert_setter_done' | 'cert_closer_done', value: boolean) {
    startT(async () => { await toggleMilestone(clientId, field, value); setOpen(false) })
  }

  return (
    <td className="px-2 py-2 text-center">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5 mx-auto', badgeCls)}
      >
        {badgeLabel}
        <ChevronDown size={8} />
      </button>
      {open && typeof window !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-40 text-left"
            style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
          >
            {(['active', 'paused', 'eval_failed', 'dropped'] as const).map(key => (
              <button
                key={key}
                disabled={pending}
                onClick={() => handleStatus(key)}
                className={cn('w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50', status === key && !certSetterDone && !certCloserDone && 'font-semibold')}
              >
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', STATUS_CONFIG[key].cls)}>{STATUS_CONFIG[key].label}</span>
              </button>
            ))}
            <div className="border-t border-gray-100">
              <button
                disabled={pending}
                onClick={() => handleCert('cert_setter_done', !certSetterDone)}
                className={cn('w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-blue-50', certSetterDone && 'font-semibold')}
              >
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', certSetterDone ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>
                  {certSetterDone ? '✓ Cert. Setter' : 'Cert. Setter'}
                </span>
              </button>
              <button
                disabled={pending}
                onClick={() => handleCert('cert_closer_done', !certCloserDone)}
                className={cn('w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-purple-50', certCloserDone && 'font-semibold')}
              >
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', certCloserDone ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500')}>
                  {certCloserDone ? '✓ Cert. Closer' : 'Cert. Closer'}
                </span>
              </button>
            </div>
            <div className="border-t border-red-100">
              <button
                disabled={pending}
                onClick={() => handleStatus('refund')}
                className="w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-red-50"
              >
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', STATUS_CONFIG['refund'].cls)}>{STATUS_CONFIG['refund'].label}</span>
              </button>
            </div>
            {isAdmin && (
              <div className="border-t border-red-200">
                <button
                  disabled={pending}
                  onClick={() => {
                    if (!confirm('Supprimer définitivement cette cliente ?\n\nCette action est irréversible.')) return
                    startT(async () => { await supprimerCsmClient(clientId); setOpen(false) })
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  🗑 Supprimer
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </td>
  )
}

// ── Toggleable milestone cell ─────────────────────────────────────────

function ToggleCell({ clientId, field, done, green }: {
  clientId: string
  field:    'cert_setter_done' | 'opportunity_setter' | 'cert_closer_done' | 'opportunity_closer'
  done:     boolean
  green?:   boolean
}) {
  const [pending, startT] = useTransition()
  return (
    <td
      className="px-2 py-2 text-center cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => startT(() => { toggleMilestone(clientId, field, !done) })}
    >
      {pending
        ? <span className="text-gray-300 text-xs">…</span>
        : done
          ? <CheckCircle2 size={13} className={cn('mx-auto', green ? 'text-green-600' : 'text-blue-500')} />
          : <span className="text-gray-200 text-xs">—</span>
      }
    </td>
  )
}

// ── CSM assignation cell ──────────────────────────────────────────────

function CsmCell({ clientId, csmId, csmMembers }: {
  clientId:   string
  csmId:      string | null
  csmMembers: { id: string; full_name: string | null }[]
}) {
  const [pending, startT] = useTransition()
  function handleChange(newId: string) {
    startT(async () => { await updateCsmId(clientId, newId || null) })
  }
  if (csmMembers.length === 0) return null
  const name = csmId ? (csmMembers.find(m => m.id === csmId)?.full_name ?? '?') : null
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : null
  return (
    <td className="px-2 py-2 text-center relative">
      <select
        value={csmId ?? ''}
        onChange={e => handleChange(e.target.value)}
        disabled={pending}
        title={name ?? 'Assigner une CSM'}
        className="text-[10px] font-semibold rounded px-1 py-0.5 border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-400 text-center"
        style={{ maxWidth: 56 }}
      >
        <option value="">—</option>
        {csmMembers.map(m => (
          <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>
        ))}
      </select>
      {initials && (
        <span className="block text-[9px] text-violet-500 font-bold mt-0.5 truncate">{initials}</span>
      )}
    </td>
  )
}

// ── Payment type cell ─────────────────────────────────────────────────

const PAYMENT_OPTIONS = [
  { value: 'pif',        label: 'PIF'          },
  { value: 'financement', label: 'Financement' },
  { value: '2-vers',     label: '2 versements' },
  { value: '3-vers',     label: '3 versements' },
  { value: '4-vers',     label: '4 versements' },
]

function PaymentTypeCell({ clientId, paymentType, fullyPaid }: {
  clientId:    string
  paymentType: string | null
  fullyPaid:   boolean
}) {
  const [pending, startT] = useTransition()
  const pLow = paymentType?.toLowerCase().trim() ?? ''
  const isPif = pLow === 'pif' || fullyPaid

  return (
    <td className="px-2 py-2 text-center">
      <select
        value={paymentType ?? ''}
        onChange={e => startT(async () => { await updatePaymentType(clientId, e.target.value) })}
        disabled={pending}
        className={cn(
          'text-[10px] font-semibold rounded px-1.5 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-400',
          isPif
            ? 'bg-green-50 text-green-700 focus:ring-green-400'
            : 'bg-yellow-50 text-yellow-700 focus:ring-amber-400',
        )}
      >
        <option value="">—</option>
        {PAYMENT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </td>
  )
}

// ── Main component ────────────────────────────────────────────────────

interface Profil { id: string; full_name: string | null }
interface DashCommission { csm_id: string; type: string; amount: number; created_at: string; month: number | null; year: number | null; client_name: string | null }
interface CsmGoal { user_id: string; year: number; month: number; target_cert_setter: number; target_placement: number; target_cert_closer: number; target_upsell: number }
interface VirementStatEntry { csm_id: string; month: number; year: number; attendu: number; recu_montant: number }

interface Props {
  clients:          CsmClient[]
  fullyPaidNames:   string[]
  csmMembers:       Profil[]
  dashCommissions:  DashCommission[]
  csmGoals:         CsmGoal[]
  virementStats:    VirementStatEntry[]
  availableClients: { name: string; entryDate: string }[]
  tasks:            CsmTask[]
  currentYear:      number
  currentMonth:     number
  currentUserId:    string
  isAdmin:          boolean
  canSeeAll:        boolean
}

// ── Tasks panel ────────────────────────────────────────────────────────

function TasksPanel({
  tasks, clientMap, csmFilter, clientCsmMap, todayStr,
  onToggle, onDelete, onAdd,
}: {
  tasks:         CsmTask[]
  clientMap:     Map<string, string>
  csmFilter:     string
  clientCsmMap:  Map<string, string>
  todayStr:      string
  onToggle:      (id: string, done: boolean) => void
  onDelete:      (id: string) => void
  onAdd:         (clientId?: string, clientName?: string) => void
}) {
  const [showDone, setShowDone] = useState(false)

  const visible = tasks.filter(t =>
    csmFilter === 'tous' || clientCsmMap.get(t.csm_client_id) === csmFilter
  )

  function virementDate(t: CsmTask): string {
    const ro = t.recurring_occurrences
    if (!ro) return t.due_date
    return Array.isArray(ro) ? (ro[0]?.date_attendue ?? t.due_date) : ro.date_attendue
  }
  function byVirement(a: CsmTask, b: CsmTask) { return virementDate(a).localeCompare(virementDate(b)) }
  const overdue  = visible.filter(t => !t.done && t.due_date <  todayStr).sort(byVirement)
  const dueToday = visible.filter(t => !t.done && t.due_date === todayStr).sort(byVirement)
  const upcoming = visible.filter(t => !t.done && t.due_date >  todayStr).sort(byVirement)
  const done     = visible.filter(t => t.done)

  function TaskRow({ task }: { task: CsmTask }) {
    const clientName = clientMap.get(task.csm_client_id) ?? '?'
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 transition-colors group">
        <button
          onClick={() => onToggle(task.id, !task.done)}
          className={cn('shrink-0 transition-colors', task.done ? 'text-green-500' : 'text-gray-300 hover:text-violet-500')}
        >
          {task.done
            ? <CheckCircle2 size={16} />
            : <Circle size={16} />
          }
        </button>
        <div className="flex-1 min-w-0">
          <span className={cn('text-sm font-medium text-gray-800', task.done && 'line-through text-gray-400')}>{task.title}</span>
          <button
            onClick={() => onAdd(task.csm_client_id, clientName)}
            className="ml-2 text-[11px] text-violet-500 hover:text-violet-700 font-medium"
          >
            {clientName}
          </button>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatDate(task.due_date)}</span>
        <button
          onClick={() => onDelete(task.id)}
          className="shrink-0 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    )
  }

  function Section({ label, items, cls }: { label: string; items: CsmTask[]; cls: string }) {
    if (items.length === 0) return null
    return (
      <div className={cn('bg-white rounded-xl border shadow-sm overflow-hidden', cls)}>
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{label}</span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{items.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {items.map(t => <TaskRow key={t.id} task={t} />)}
        </div>
      </div>
    )
  }

  const isEmpty = overdue.length + dueToday.length + upcoming.length + done.length === 0

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => onAdd()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
        >
          <Plus size={12} /> Nouvelle tâche
        </button>
      </div>

      {isEmpty && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-sm text-gray-400">
          Aucune tâche pour le moment
        </div>
      )}

      <Section
        label="⚠ En retard"
        items={overdue}
        cls="border-red-100"
      />
      <Section
        label="📅 Aujourd'hui"
        items={dueToday}
        cls="border-orange-100"
      />
      <Section
        label="🔜 À venir"
        items={upcoming}
        cls="border-gray-100"
      />

      {done.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            <ChevronDown size={12} className={cn('transition-transform', showDone && 'rotate-180')} />
            {showDone ? 'Masquer' : 'Voir'} les tâches complétées ({done.length})
          </button>
          {showDone && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {done.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const MOIS_FR_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const MOIS_FR_LONG  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// ── Dashboard CSM ─────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return n.toLocaleString('fr-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function CsmDashboard({
  commissions, csmMembers, goals, virementStats, currentYear, currentMonth, isAdmin,
}: {
  commissions:   DashCommission[]
  csmMembers:    Profil[]
  goals:         CsmGoal[]
  virementStats: VirementStatEntry[]
  currentYear:   number
  currentMonth:  number
  isAdmin:       boolean
}) {
  const [selYear, setSelYear]         = useState(currentYear)
  const [selMonth, setSelMonth]       = useState(currentMonth)
  const [editGoalFor, setEditGoalFor] = useState<string | null>(null)
  const [expanded, setExpanded]       = useState<{ csmId: string; type: string } | null>(null)
  const [gSetter, setGSetter]         = useState(0)
  const [gPlacement, setGPlacement]   = useState(0)
  const [gCloser, setGCloser]         = useState(0)
  const [gUpsell, setGUpsell]         = useState(0)
  const [saving, startSave]           = useTransition()

  function prevMonth() {
    if (selMonth === 1) { setSelMonth(12); setSelYear(y => y - 1) }
    else setSelMonth(m => m - 1)
    setEditGoalFor(null)
  }
  function nextMonth() {
    const isCurrentOrFuture = selYear > currentYear || (selYear === currentYear && selMonth >= currentMonth)
    if (isCurrentOrFuture) return
    if (selMonth === 12) { setSelMonth(1); setSelYear(y => y + 1) }
    else setSelMonth(m => m + 1)
    setEditGoalFor(null)
  }

  const goalMap = useMemo(() => {
    const map = new Map<string, CsmGoal>()
    goals.forEach(g => { if (g.year === selYear && g.month === selMonth) map.set(g.user_id, g) })
    return map
  }, [goals, selYear, selMonth])

  function openEdit(csmId: string) {
    const g = goalMap.get(csmId)
    setGSetter(g?.target_cert_setter ?? 0)
    setGPlacement(g?.target_placement ?? 0)
    setGCloser(g?.target_cert_closer ?? 0)
    setGUpsell(g?.target_upsell ?? 0)
    setEditGoalFor(csmId)
  }

  function saveGoal(csmId: string) {
    startSave(async () => {
      await definirObjectifCsm(csmId, selYear, selMonth, gSetter, gPlacement, gCloser, gUpsell)
      setEditGoalFor(null)
    })
  }

  function countFor(csmId: string, type: string) {
    return commissions.filter(c =>
      c.csm_id === csmId && c.type === type && c.month === selMonth && c.year === selYear
    ).length
  }

  function clientNamesFor(csmId: string, type: string): string[] {
    return commissions
      .filter(c => c.csm_id === csmId && c.type === type && c.month === selMonth && c.year === selYear)
      .map(c => c.client_name ?? '?')
  }

  function toggleExpanded(csmId: string, type: string) {
    setExpanded(e => e?.csmId === csmId && e.type === type ? null : { csmId, type })
  }

  function virementFor(csmId: string) {
    const stat = virementStats.find(s => s.csm_id === csmId && s.month === selMonth && s.year === selYear)
    return { attendu: stat?.attendu ?? 0, recu: stat?.recu_montant ?? 0 }
  }

  const isCurrentMonth = selYear === currentYear && selMonth === currentMonth

  if (csmMembers.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Performance CSM</p>
          <p className="text-xs text-gray-400 mt-0.5">Certifications · Placements · Upsells — par mois</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-700 w-32 text-center">
            {MOIS_FR_LONG[selMonth - 1]} {selYear}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {csmMembers.map(csm => {
          const g       = goalMap.get(csm.id)
          const editing = editGoalFor === csm.id

          const rows: { label: string; type: string; color: string; bg: string; goal: number }[] = [
            { label: 'Cert. setter', type: 'cert_setter', color: 'text-violet-600', bg: 'bg-violet-50', goal: g?.target_cert_setter ?? 0 },
            { label: 'Placement',    type: 'placement',   color: 'text-amber-600',  bg: 'bg-amber-50',  goal: g?.target_placement   ?? 0 },
            { label: 'Cert. closer', type: 'cert_closer', color: 'text-green-600',  bg: 'bg-green-50',  goal: g?.target_cert_closer ?? 0 },
            { label: 'Upsell',       type: 'upsell',      color: 'text-pink-600',   bg: 'bg-pink-50',   goal: g?.target_upsell      ?? 0 },
          ]

          const virement = virementFor(csm.id)
          const vPct     = virement.attendu > 0 ? Math.min(100, Math.round((virement.recu / virement.attendu) * 100)) : 0
          const vBarCl   = vPct >= 100 ? 'bg-green-500' : vPct >= 60 ? 'bg-sky-500' : vPct >= 30 ? 'bg-amber-400' : 'bg-red-400'

          return (
            <div key={csm.id} className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-800">{csm.full_name ?? '—'}</span>
                {isAdmin && !editing && (
                  <button onClick={() => openEdit(csm.id)}
                    className="text-xs text-gray-400 hover:text-violet-600 transition-colors flex items-center gap-1">
                    <Pencil size={11} />Objectifs
                  </button>
                )}
                {editing && (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <input type="number" min="0" value={gSetter} onChange={e => setGSetter(+e.target.value)}
                      title="Objectif cert. setter" placeholder="Setter"
                      className="w-14 text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 tabular-nums" />
                    <input type="number" min="0" value={gPlacement} onChange={e => setGPlacement(+e.target.value)}
                      title="Objectif placement" placeholder="Placement"
                      className="w-14 text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 tabular-nums" />
                    <input type="number" min="0" value={gCloser} onChange={e => setGCloser(+e.target.value)}
                      title="Objectif cert. closer" placeholder="Closer"
                      className="w-14 text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 tabular-nums" />
                    <input type="number" min="0" value={gUpsell} onChange={e => setGUpsell(+e.target.value)}
                      title="Objectif upsell" placeholder="Upsell"
                      className="w-14 text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500 tabular-nums" />
                    <button onClick={() => saveGoal(csm.id)} disabled={saving}
                      className="text-xs px-2 py-1 bg-violet-600 text-white rounded disabled:opacity-50">✓</button>
                    <button onClick={() => setEditGoalFor(null)}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">✕</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {rows.map(row => {
                  const count   = countFor(csm.id, row.type)
                  const pct     = row.goal > 0 ? Math.min(100, Math.round((count / row.goal) * 100)) : 0
                  const barCl   = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-violet-500' : pct >= 30 ? 'bg-amber-400' : 'bg-red-400'
                  const isOpen  = expanded?.csmId === csm.id && expanded.type === row.type
                  const names   = isOpen ? clientNamesFor(csm.id, row.type) : []
                  return (
                    <div
                      key={row.type}
                      className={cn('rounded-xl p-3 transition-all', row.bg, count > 0 && 'cursor-pointer hover:brightness-95')}
                      onClick={() => count > 0 && toggleExpanded(csm.id, row.type)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{row.label}</p>
                        {count > 0 && (
                          <ChevronDown size={11} className={cn('text-gray-400 transition-transform', isOpen && 'rotate-180')} />
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className={cn('text-2xl font-bold tabular-nums', row.color)}>{count}</span>
                        {row.goal > 0 && <span className="text-xs text-gray-400">/ {row.goal}</span>}
                      </div>
                      {row.goal > 0 && (
                        <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', barCl)} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                      {isOpen && names.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/40 space-y-0.5">
                          {names.map((name, i) => (
                            <p key={i} className="text-[11px] text-gray-700 font-medium leading-tight">• {name}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Virement recurring section */}
              <div className="mt-2 rounded-xl bg-sky-50 p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Virements récurrents</p>
                {virement.attendu === 0 ? (
                  <p className="text-xs text-gray-400">Aucun virement planifié ce mois</p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-3 mb-1.5">
                      <span className="text-sm font-bold tabular-nums text-sky-700">
                        {fmtMoney(virement.recu)} $
                      </span>
                      <span className="text-xs text-gray-400">
                        / {fmtMoney(virement.attendu)} $ attendu
                      </span>
                      <span className="text-xs text-sky-500 ml-auto tabular-nums">
                        Comm. 2 % : {fmtMoney(Math.round(virement.recu * 0.02))} $
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', vBarCl)} style={{ width: `${vPct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{vPct} % collecté</p>
                  </>
                )}
              </div>

              {/* Carte suivi section */}
              {(() => {
                const carteComms = commissions.filter(c =>
                  c.csm_id === csm.id && c.type === 'carte_2pct' && c.month === selMonth && c.year === selYear
                )
                if (carteComms.length === 0) return null
                const carteTotal = carteComms.reduce((sum, c) => sum + c.amount, 0)
                return (
                  <div className="mt-2 rounded-xl bg-orange-50 p-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Carte — suivis email (2%)</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-sm font-bold tabular-nums text-orange-700">{carteComms.length}</span>
                      <span className="text-xs text-gray-400">suivi{carteComms.length > 1 ? 's' : ''}</span>
                      <span className="text-xs text-orange-500 ml-auto tabular-nums">
                        Comm. : {fmtMoney(Math.round(carteTotal * 100) / 100)} $
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CsmClientList({
  clients, fullyPaidNames, csmMembers,
  dashCommissions, csmGoals, virementStats, availableClients, tasks,
  currentYear, currentMonth, currentUserId, isAdmin, canSeeAll,
}: Props) {
  const fullyPaidSet = useMemo(() => new Set(fullyPaidNames), [fullyPaidNames])
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [csmFilter, setCsmFilter]       = useState<string>('tous')
  const [ajoutMode, setAjoutMode]       = useState<'choice' | 'existing' | 'fresh' | null>(null)
  const [existingSearch, setExistingSearch] = useState('')
  const [selectedExisting, setSelectedExisting] = useState<{ name: string; entryDate: string } | null>(null)
  const [ajoutPending, startAjoutTrans] = useTransition()

  const [refundTarget, setRefundTarget] = useState<{ clientId: string; clientName: string } | null>(null)
  const [refundMontant, setRefundMontant] = useState('')
  const [refundPending, startRefundTrans] = useTransition()

  const [taskAddModal, setTaskAddModal] = useState<{ clientId?: string; clientName?: string } | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskClientId, setTaskClientId] = useState('')
  const [taskPending, startTaskTrans] = useTransition()

  function openAjout() { setAjoutMode('choice'); setExistingSearch(''); setSelectedExisting(null) }
  function closeAjout() { setAjoutMode(null); setExistingSearch(''); setSelectedExisting(null) }

  function openRefundModal(clientId: string, clientName: string) {
    setRefundTarget({ clientId, clientName })
    setRefundMontant('')
  }
  function closeRefundModal() { setRefundTarget(null); setRefundMontant('') }

  function handleRefundConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!refundTarget) return
    const montant = parseFloat(refundMontant.replace(',', '.'))
    if (!montant || montant <= 0) return
    startRefundTrans(async () => {
      await marquerRemboursementAvecMontant(refundTarget.clientId, montant)
      closeRefundModal()
    })
  }
  const todayStr = today()

  const csmMap = useMemo(() => new Map(csmMembers.map(m => [m.id, m.full_name ?? 'CSM'])), [csmMembers])

  function handleAjoutManuel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startAjoutTrans(async () => {
      await creerCsmClientManuel({
        name:            fd.get('name') as string,
        enrollment_date: fd.get('enrollment_date') as string,
        payment_type:    (fd.get('payment_type') as string) || 'pif',
        phone:           (fd.get('phone') as string) || null,
        email:           (fd.get('email') as string) || null,
        csm_id:          (fd.get('csm_id') as string) || null,
      })
      closeAjout()
    })
  }

  function openTaskModal(clientId?: string, clientName?: string) {
    setTaskAddModal({ clientId, clientName })
    setTaskTitle('')
    setTaskDate(todayStr)
    setTaskClientId(clientId ?? '')
  }

  function handleTaskSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cid = taskAddModal?.clientId ?? taskClientId
    if (!cid || !taskTitle.trim() || !taskDate) return
    startTaskTrans(async () => {
      await creerTache(cid, taskTitle, taskDate)
      setTaskAddModal(null)
    })
  }

  const tasksByClient = useMemo(() => {
    const map = new Map<string, CsmTask[]>()
    for (const t of tasks) {
      if (!map.has(t.csm_client_id)) map.set(t.csm_client_id, [])
      map.get(t.csm_client_id)!.push(t)
    }
    return map
  }, [tasks])

  const clientCsmMap = useMemo(
    () => new Map(clients.map(c => [c.id, c.csm_id ?? ''])),
    [clients],
  )

  const clientNameMap = useMemo(
    () => new Map(clients.map(c => [c.id, c.name])),
    [clients],
  )

  const tasksDueCount = useMemo(
    () => tasks.filter(t => !t.done && t.due_date <= todayStr).length,
    [tasks, todayStr],
  )

  // Texts due today or overdue (for filter and KPI)
  function hasTextDue(c: CsmClient): boolean {
    if (c.status === 'refund' || c.status === 'dropped') return false
    const due = computeDueDates(c.enrollment_date, c.onboarding_date)
    return [
      { done: c.text_j7_done,  due: due.j7  },
      { done: c.text_j24_done, due: due.j24 },
      { done: c.text_j49_done, due: due.j49 },
      { done: c.text_j63_done, due: due.j63 },
      { done: c.text_j77_done, due: due.j77 },
      { done: c.text_j90_done, due: due.j90 },
    ].some(ch => !ch.done && ch.due <= todayStr)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return clients.filter(c => {
      const dayN = daysBetween(c.enrollment_date, todayStr)
      if (statusFilter === 'm2_missed'      && !c.m2_missed)               return false
      if (statusFilter === 'm3_missed'      && !c.m3_missed)               return false
      if (statusFilter === 'cert_setter'    && !c.cert_setter_done)        return false
      if (statusFilter === 'cert_closer'    && !c.cert_closer_done)        return false
      if (statusFilter === 'j90_auto'       && dayN < 90)                  return false
      if (statusFilter === 'overdue_texts'  && !hasTextDue(c))             return false
      if (statusFilter === 'meetings_today' &&
          c.onboarding_date !== todayStr &&
          c.m2_date !== todayStr &&
          c.m3_date !== todayStr &&
          c.m4_date !== todayStr)                                           return false
      // Tasks panel has its own view — show nothing in the table
      if (statusFilter === 'tasks') return false
      // Refund + eval_failed only show in their dedicated tab — hide from 'tous'
      if (statusFilter === 'tous' && (c.status === 'refund' || c.status === 'eval_failed')) return false
      const simpleStatusFilters = ['active', 'paused', 'eval_failed', 'dropped', 'refund']
      if (simpleStatusFilters.includes(statusFilter) && c.status !== statusFilter) return false
      if (csmFilter !== 'tous' && c.csm_id !== csmFilter) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, search, statusFilter, csmFilter, todayStr])

  // Flat list of texts due today or overdue (for the "Textes à faire" view)
  const textsDueList = useMemo(() => {
    const LABELS: Record<string, string> = { j7: 'J+7', j24: 'J+24', j49: 'J+49', j63: 'J+63', j77: 'J+77', j90: 'J+90' }
    const rows: { client: CsmClient; field: 'j7'|'j24'|'j49'|'j63'|'j77'|'j90'; label: string; dueDate: string }[] = []
    for (const c of clients) {
      if (c.status === 'refund' || c.status === 'dropped') continue
      if (csmFilter !== 'tous' && c.csm_id !== csmFilter) continue
      const due = computeDueDates(c.enrollment_date, c.onboarding_date)
      const checks = [
        { field: 'j7'  as const, done: c.text_j7_done,  dueDate: due.j7  },
        { field: 'j24' as const, done: c.text_j24_done, dueDate: due.j24 },
        { field: 'j49' as const, done: c.text_j49_done, dueDate: due.j49 },
        { field: 'j63' as const, done: c.text_j63_done, dueDate: due.j63 },
        { field: 'j77' as const, done: c.text_j77_done, dueDate: due.j77 },
        { field: 'j90' as const, done: c.text_j90_done, dueDate: due.j90 },
      ]
      for (const ch of checks) {
        if (!ch.done && ch.dueDate <= todayStr)
          rows.push({ client: c, field: ch.field, label: LABELS[ch.field], dueDate: ch.dueDate })
      }
    }
    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.client.name.localeCompare(b.client.name))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, csmFilter, todayStr])

  // KPIs
  const active      = clients.filter(c => c.status === 'active').length
  const certCloser  = clients.filter(c => c.cert_closer_done).length
  const overdue     = textsDueList.length
  const refundCount = clients.filter(c => c.status === 'refund').length

  const m2NoShowCount   = clients.filter(c => c.m2_missed).length
  const m3NoShowCount   = clients.filter(c => c.m3_missed).length
  const j90Count        = clients.filter(c => daysBetween(c.enrollment_date, todayStr) >= 90).length
  const meetingsToday   = clients.filter(c =>
    c.onboarding_date === todayStr ||
    c.m2_date === todayStr ||
    c.m3_date === todayStr ||
    c.m4_date === todayStr
  ).length

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'tous',         label: 'Toutes'                                                                              },
    { key: 'active',       label: 'Actives'                                                                             },
    { key: 'm2_missed',    label: `M2 manqué${m2NoShowCount > 0 ? ` (${m2NoShowCount})` : ''}`                         },
    { key: 'm3_missed',    label: `M3 manqué${m3NoShowCount > 0 ? ` (${m3NoShowCount})` : ''}`                         },
    { key: 'cert_setter',  label: 'Cert. Setter'                                                                        },
    { key: 'cert_closer',  label: 'Cert. Closer'                                                                        },
    { key: 'eval_failed',  label: 'Eval échoué'                                                                         },
    { key: 'paused',       label: 'En pause'                                                                            },
    { key: 'dropped',      label: 'Abandons'                                                                            },
    { key: 'j90_auto',       label: `+90 jours${j90Count > 0 ? ` (${j90Count})` : ''}`                                  },
    { key: 'meetings_today', label: `Meeting du jour${meetingsToday > 0 ? ` (${meetingsToday})` : ''}`                  },
    { key: 'refund',         label: `Remboursé${refundCount > 0 ? ` (${refundCount})` : ''}`                             },
    { key: 'tasks',          label: `Tâches${tasksDueCount > 0 ? ` (${tasksDueCount})` : ''}`                            },
  ]

  const csvData = filtered.map(c => ({
    Nom:         c.name,
    Inscription: formatDate(c.enrollment_date),
    Paiement:    c.payment_type ?? '—',
    M2:          formatDate(c.m2_date),
    M3:          formatDate(c.m3_date),
    M4:          formatDate(c.m4_date),
    CertSetter:  c.cert_setter_done ? 'Oui' : 'Non',
    CertCloser:  c.cert_closer_done ? 'Oui' : 'Non',
    Statut:      c.status,
  }))

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-5 min-h-screen bg-gray-50">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suivi CSM</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Progression cliente — 8 touchpoints · 4 post-M3
        </p>
      </div>

      {/* Dashboard certifications */}
      <CsmDashboard
        commissions={dashCommissions}
        csmMembers={csmMembers}
        goals={csmGoals}
        virementStats={virementStats}
        currentYear={currentYear}
        currentMonth={currentMonth}
        isAdmin={isAdmin}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-violet-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Actives</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-purple-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cert. Closer</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{certCloser}</p>
        </div>
        <div
          className={cn(
            'rounded-xl border shadow-sm p-4 cursor-pointer transition-all',
            overdue > 0 ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-white border-gray-100',
            statusFilter === 'overdue_texts' && 'ring-2 ring-amber-400',
          )}
          onClick={() => setStatusFilter(sf => sf === 'overdue_texts' ? 'tous' : 'overdue_texts')}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className={overdue > 0 ? 'text-amber-500' : 'text-gray-300'} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Textes à faire</p>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums', overdue > 0 ? 'text-amber-600' : 'text-gray-300')}>
            {overdue > 0 ? overdue : '—'}
          </p>
          {overdue > 0 && <p className="text-[10px] text-amber-400 mt-0.5">textos à envoyer</p>}
        </div>
        <div className={cn(
          'rounded-xl border shadow-sm p-4 cursor-pointer transition-all',
          meetingsToday > 0 ? 'bg-violet-50 border-violet-200 hover:bg-violet-100' : 'bg-white border-gray-100',
          statusFilter === 'meetings_today' && 'ring-2 ring-violet-400',
        )}
          onClick={() => setStatusFilter(sf => sf === 'meetings_today' ? 'tous' : 'meetings_today')}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className={meetingsToday > 0 ? 'text-violet-500' : 'text-gray-300'} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Meeting du jour</p>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums', meetingsToday > 0 ? 'text-violet-600' : 'text-gray-300')}>
            {meetingsToday > 0 ? meetingsToday : '—'}
          </p>
          {meetingsToday > 0 && (
            <p className="text-[10px] text-violet-400 mt-0.5">ONB · M2 · M3 · M4</p>
          )}
        </div>
        <div
          className={cn(
            'rounded-xl border shadow-sm p-4 cursor-pointer transition-all',
            tasksDueCount > 0 ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 'bg-white border-gray-100',
            statusFilter === 'tasks' && 'ring-2 ring-blue-400',
          )}
          onClick={() => setStatusFilter(sf => sf === 'tasks' ? 'tous' : 'tasks')}
        >
          <div className="flex items-center gap-2 mb-1">
            <ListTodo size={14} className={tasksDueCount > 0 ? 'text-blue-500' : 'text-gray-300'} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tâches</p>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums', tasksDueCount > 0 ? 'text-blue-600' : 'text-gray-300')}>
            {tasksDueCount > 0 ? tasksDueCount : '—'}
          </p>
          {tasksDueCount > 0 && <p className="text-[10px] text-blue-400 mt-0.5">à faire aujourd&apos;hui ou en retard</p>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une cliente…"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        {canSeeAll && csmMembers.length > 0 && (
          <select
            value={csmFilter}
            onChange={e => setCsmFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-600"
          >
            <option value="tous">Toutes les CSM</option>
            {csmMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                statusFilter === f.key && f.key === 'refund'
                  ? 'bg-red-600 text-white shadow-sm'
                  : statusFilter === f.key
                  ? 'bg-violet-600 text-white shadow-sm'
                  : f.key === 'refund' && refundCount > 0
                  ? 'text-red-500 hover:text-red-700'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => openTaskModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <ListTodo size={12} /> Tâche
          </button>
          <button
            onClick={openAjout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
          >
            <Plus size={12} /> Ajouter
          </button>
          <Link
            href="/csm/import"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
          >
            <Upload size={12} /> Import CSV
          </Link>
          <ExportCsvButton filename="csm-clients" data={csvData} />
        </div>

        {/* Modal ajout cliente */}
        {ajoutMode !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  {ajoutMode === 'choice'   ? 'Ajouter une cliente' :
                   ajoutMode === 'existing' ? 'Cliente existante' :
                                             'Nouveau dossier'}
                </h2>
                <button onClick={closeAjout} className="text-gray-300 hover:text-gray-500"><X size={16} /></button>
              </div>

              {/* Étape 1 : choix du mode */}
              {ajoutMode === 'choice' && (
                <div className="p-6 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAjoutMode('existing')}
                    className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all"
                  >
                    <Users size={24} className="text-violet-500" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">Cliente existante</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Déjà dans la base de données</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setAjoutMode('fresh')}
                    className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all"
                  >
                    <Plus size={24} className="text-violet-500" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">Nouveau dossier</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Saisie manuelle complète</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Étape 2a : cliente existante */}
              {ajoutMode === 'existing' && (
                <div className="p-6 space-y-4">
                  {!selectedExisting ? (
                    <>
                      <input
                        autoFocus
                        value={existingSearch}
                        onChange={e => setExistingSearch(e.target.value)}
                        placeholder="Rechercher une cliente…"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
                        {availableClients
                          .filter(c => !existingSearch || c.name.toLowerCase().includes(existingSearch.toLowerCase()))
                          .slice(0, 50)
                          .map(c => (
                            <button
                              key={c.name}
                              onClick={() => setSelectedExisting(c)}
                              className="w-full text-left px-3 py-2.5 hover:bg-violet-50 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-900">{c.name}</span>
                              <span className="ml-2 text-[11px] text-gray-400">{formatDate(c.entryDate)}</span>
                            </button>
                          ))}
                        {availableClients.filter(c => !existingSearch || c.name.toLowerCase().includes(existingSearch.toLowerCase())).length === 0 && (
                          <p className="px-3 py-6 text-sm text-gray-400 text-center">Aucune cliente trouvée</p>
                        )}
                      </div>
                      <button onClick={() => setAjoutMode('choice')} className="text-xs text-gray-400 hover:text-gray-600">← Retour</button>
                    </>
                  ) : (
                    <form onSubmit={handleAjoutManuel} className="space-y-4">
                      <div className="px-3 py-2.5 bg-violet-50 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-semibold text-violet-800">{selectedExisting.name}</span>
                        <button type="button" onClick={() => setSelectedExisting(null)} className="text-violet-400 hover:text-violet-600"><X size={14} /></button>
                      </div>
                      <input type="hidden" name="name" value={selectedExisting.name} />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-gray-600">Date d&apos;inscription *</label>
                          <input name="enrollment_date" type="date" required defaultValue={selectedExisting.entryDate}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-gray-600">Type de paiement</label>
                          <select name="payment_type" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                            <option value="pif">PIF</option>
                            <option value="financement">Financement</option>
                            <option value="2-vers">2 versements</option>
                            <option value="3-vers">3 versements</option>
                          </select>
                        </div>
                      </div>
                      {canSeeAll && csmMembers.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-gray-600">CSM responsable</label>
                          <select name="csm_id" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                            <option value="">— Non assignée —</option>
                            {csmMembers.map(m => <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>)}
                          </select>
                        </div>
                      ) : (
                        <input type="hidden" name="csm_id" value={currentUserId} />
                      )}
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={closeAjout} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
                        <button type="submit" disabled={ajoutPending} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                          {ajoutPending ? 'Ajout…' : 'Ajouter'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Étape 2b : nouveau dossier */}
              {ajoutMode === 'fresh' && (
                <form onSubmit={handleAjoutManuel} className="p-6 space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Nom de la cliente *</label>
                    <input name="name" required placeholder="Prénom Nom"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">Date d&apos;inscription *</label>
                      <input name="enrollment_date" type="date" required defaultValue={todayStr}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">Type de paiement</label>
                      <select name="payment_type" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="pif">PIF</option>
                        <option value="financement">Financement</option>
                        <option value="2-vers">2 versements</option>
                        <option value="3-vers">3 versements</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">Téléphone</label>
                      <input name="phone" type="tel" placeholder="+1 (514) 000-0000"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">Email</label>
                      <input name="email" type="email" placeholder="cliente@exemple.com"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                  {canSeeAll && csmMembers.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">CSM responsable</label>
                      <select name="csm_id" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="">— Non assignée —</option>
                        {csmMembers.map(m => <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>)}
                      </select>
                    </div>
                  ) : (
                    <input type="hidden" name="csm_id" value={currentUserId} />
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <button type="button" onClick={() => setAjoutMode('choice')} className="text-xs text-gray-400 hover:text-gray-600">← Retour</button>
                    <div className="flex gap-2">
                      <button type="button" onClick={closeAjout} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
                      <button type="submit" disabled={ajoutPending} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                        {ajoutPending ? 'Ajout…' : 'Ajouter'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal remboursement */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Confirmer le remboursement</h2>
              <button onClick={closeRefundModal} className="text-gray-300 hover:text-gray-500"><X size={16} /></button>
            </div>
            <form onSubmit={handleRefundConfirm} className="p-6 space-y-4">
              <p className="text-sm text-gray-700">
                Cliente : <span className="font-semibold">{refundTarget.clientName}</span>
              </p>
              <p className="text-xs text-gray-500">
                La commission du closer (10 %) et de la setter (5 %) seront déduites automatiquement de leur paye.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600">Montant remboursé avant taxe ($)</label>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundMontant}
                  onChange={e => setRefundMontant(e.target.value)}
                  placeholder="ex. 3000"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              {refundMontant && parseFloat(refundMontant) > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700 space-y-1">
                  <p>Déduction closer : <span className="font-semibold">−{(parseFloat(refundMontant) * 0.10).toFixed(2)} $</span></p>
                  <p>Déduction setter : <span className="font-semibold">−{(parseFloat(refundMontant) * 0.05).toFixed(2)} $</span></p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeRefundModal} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
                <button
                  type="submit"
                  disabled={refundPending || !refundMontant || parseFloat(refundMontant) <= 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {refundPending ? 'En cours…' : 'Confirmer le remboursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tasks panel or table */}
      {statusFilter === 'tasks' ? (
        <TasksPanel
          tasks={tasks}
          clientMap={clientNameMap}
          csmFilter={csmFilter}
          clientCsmMap={clientCsmMap}
          todayStr={todayStr}
          onToggle={(id, done) => startTaskTrans(async () => { await toggleTache(id, done) })}
          onDelete={(id) => { if (confirm('Supprimer cette tâche ?')) startTaskTrans(async () => { await supprimerTache(id) }) }}
          onAdd={openTaskModal}
        />
      ) : (<>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Aujourd&apos;hui</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" /> Passé / fait</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-50 border border-yellow-200 inline-block" /> À venir</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" /> Manqué / retard</span>
        <span className="flex items-center gap-1.5 text-gray-400">Cliquer sur M ou J pour modifier · Cliquer sur C.S/C.C/Opp pour cocher</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Aucune cliente trouvée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-40">Cliente</th>
                  <th className="px-2 py-2.5 text-center text-gray-300">J.</th>
                  <th className="px-2 py-2.5 text-center text-emerald-500">Onb.</th>
                  {/* Touchpoints */}
                  <th className="px-2 py-2.5 text-center">J+7</th>
                  <th className="px-2 py-2.5 text-center text-violet-500">M2</th>
                  <th className="px-2 py-2.5 text-center">J+24</th>
                  <th className="px-2 py-2.5 text-center text-violet-500">M3</th>
                  {/* Post-M3 */}
                  <th className="px-2 py-2.5 text-center border-l border-violet-100">J+49</th>
                  <th className="px-2 py-2.5 text-center">J+63</th>
                  <th className="px-2 py-2.5 text-center">J+77</th>
                  <th className="px-2 py-2.5 text-center">J+90</th>
                  <th className="px-2 py-2.5 text-center text-violet-500 border-l border-violet-100">M4</th>
                  {/* Milestones — toggleable */}
                  <th className="px-2 py-2.5 text-center border-l border-gray-100">C.S</th>
                  <th className="px-2 py-2.5 text-center">Opp S</th>
                  <th className="px-2 py-2.5 text-center border-l border-gray-100">C.C</th>
                  <th className="px-2 py-2.5 text-center">Opp C</th>
                  {/* Meta */}
                  <th className="px-2 py-2.5 text-center border-l border-gray-100">Email</th>
                  <th className="px-2 py-2.5 text-center">Statut</th>
                  <th className="px-2 py-2.5 text-center">Paie</th>
                  {canSeeAll && csmMembers.length > 0 && <th className="px-2 py-2.5 text-center text-violet-400">CSM</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => {
                  const due  = computeDueDates(c.enrollment_date, c.onboarding_date)
                  const dayN = daysBetween(c.enrollment_date, todayStr)

                  // Last login info for J+7 cell
                  const lastLoginDaysAgo = c.circle_last_login
                    ? daysBetween(c.circle_last_login, todayStr)
                    : null
                  const j7Info = dayN >= 5
                    ? [
                        c.theory_pct > 0 ? `${c.theory_pct}% théorie` : null,
                        lastLoginDaysAgo !== null ? `connectée J-${lastLoginDaysAgo}` : 'jamais connectée',
                      ].filter(Boolean).join(' · ')
                    : undefined

                  const nameCls = 'text-gray-900'

                  return (
                    <tr
                      key={c.id}
                      className={cn(
                        'hover:bg-violet-50/20 transition-colors',
                        (c.m1_missed || c.m2_missed || c.m3_missed || c.m4_missed) && 'bg-red-50/30',
                      )}
                    >
                      {/* Name */}
                      <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-gray-50">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/csm/${c.id}`} className="hover:underline min-w-0">
                            <span className={cn('font-semibold text-sm', nameCls)}>{c.name}</span>
                          </Link>
                          {(() => {
                            const clientTasks = tasksByClient.get(c.id) ?? []
                            const pending = clientTasks.filter(t => !t.done)
                            if (pending.length === 0) return null
                            const urgent = pending.filter(t => t.due_date <= todayStr)
                            return (
                              <button
                                onClick={() => openTaskModal(c.id, c.name)}
                                className={cn(
                                  'shrink-0 flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold transition-colors',
                                  urgent.length > 0
                                    ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                    : 'bg-blue-50 text-blue-500 hover:bg-blue-100',
                                )}
                                title={`${pending.length} tâche${pending.length > 1 ? 's' : ''} en attente`}
                              >
                                <ListTodo size={9} />
                                {pending.length}
                              </button>
                            )
                          })()}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-gray-400">{formatDate(c.enrollment_date)}</p>
                          <button
                            onClick={() => openTaskModal(c.id, c.name)}
                            title="Ajouter une tâche"
                            className="p-0.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          >
                            <ListTodo size={11} />
                          </button>
                        </div>
                      </td>

                      {/* Day */}
                      <td className="px-2 py-2 text-center">
                        <span className="text-[10px] font-bold text-gray-400">J+{dayN}</span>
                      </td>

                      {/* Onboarding date */}
                      <EditableOnboardingCell clientId={c.id} date={c.onboarding_date} />

                      {/* J+7 — based on onboarding_date if available */}
                      <TextCell
                        clientId={c.id} field="j7"
                        done={c.text_j7_done} dueDate={due.j7} actualDate={c.text_j7_date}
                        today={todayStr}
                        info={j7Info}
                        cancelled={c.status === 'refund'}
                      />

                      {/* M2 */}
                      <EditableMCell clientId={c.id} num={2} date={c.m2_date} missed={c.m2_missed} cancelled={c.status === 'refund'} />

                      {/* J+24 */}
                      <TextCell clientId={c.id} field="j24" done={c.text_j24_done} dueDate={due.j24} actualDate={c.text_j24_date} today={todayStr} cancelled={c.status === 'refund'} />

                      {/* M3 */}
                      <EditableMCell clientId={c.id} num={3} date={c.m3_date} missed={c.m3_missed} cancelled={c.status === 'refund'} />

                      {/* Post-M3 touchpoints */}
                      <TextCell clientId={c.id} field="j49" done={c.text_j49_done} dueDate={due.j49} actualDate={c.text_j49_date} today={todayStr} cancelled={c.status === 'refund'} />
                      <TextCell clientId={c.id} field="j63" done={c.text_j63_done} dueDate={due.j63} actualDate={c.text_j63_date} today={todayStr} cancelled={c.status === 'refund'} />
                      <TextCell clientId={c.id} field="j77" done={c.text_j77_done} dueDate={due.j77} actualDate={c.text_j77_date} today={todayStr} cancelled={c.status === 'refund'} />
                      <TextCell clientId={c.id} field="j90" done={c.text_j90_done} dueDate={due.j90} actualDate={c.text_j90_date} today={todayStr} cancelled={c.status === 'refund'} />

                      {/* M4 */}
                      <EditableMCell clientId={c.id} num={4} date={c.m4_date} missed={c.m4_missed} cancelled={c.status === 'refund'} />

                      {/* Toggleable milestone cells */}
                      <ToggleCell clientId={c.id} field="cert_setter_done"  done={c.cert_setter_done}  green />
                      <ToggleCell clientId={c.id} field="opportunity_setter" done={c.opportunity_setter} />
                      <ToggleCell clientId={c.id} field="cert_closer_done"   done={c.cert_closer_done}  green />
                      <ToggleCell clientId={c.id} field="opportunity_closer" done={c.opportunity_closer} />

                      {/* Email avis */}
                      <EmailCell clientId={c.id} avis={c.email_avis ?? null} />

                      {/* Status + cert inline */}
                      <StatusCell
                        clientId={c.id}
                        clientName={c.name}
                        status={c.status}
                        certSetterDone={c.cert_setter_done}
                        certCloserDone={c.cert_closer_done}
                        dayN={dayN}
                        isAdmin={isAdmin}
                        onRefundClick={openRefundModal}
                      />

                      {/* Payment */}
                      <PaymentTypeCell
                        clientId={c.id}
                        paymentType={c.payment_type}
                        fullyPaid={fullyPaidSet.has(c.name.toLowerCase().trim())}
                      />

                      {/* CSM assignée */}
                      {canSeeAll && csmMembers.length > 0 && (
                        <CsmCell clientId={c.id} csmId={c.csm_id} csmMembers={csmMembers} />
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </>)}

      {/* Modal ajout tâche */}
      {taskAddModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <ListTodo size={15} className="text-blue-500" /> Nouvelle tâche
              </h2>
              <button onClick={() => setTaskAddModal(null)} className="text-gray-300 hover:text-gray-500"><X size={16} /></button>
            </div>
            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
              {taskAddModal.clientId ? (
                <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm font-semibold text-blue-800">
                  {taskAddModal.clientName}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Cliente *</label>
                  <select
                    required
                    value={taskClientId}
                    onChange={e => setTaskClientId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">— Choisir une cliente —</option>
                    {clients.filter(c => c.status === 'active').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600">Tâche *</label>
                <input
                  autoFocus
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Ex. Envoyer le contrat, Appel de suivi…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600">Date *</label>
                <input
                  type="date"
                  required
                  value={taskDate}
                  onChange={e => setTaskDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setTaskAddModal(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
                <button
                  type="submit"
                  disabled={taskPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {taskPending ? 'Ajout…' : 'Ajouter la tâche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
