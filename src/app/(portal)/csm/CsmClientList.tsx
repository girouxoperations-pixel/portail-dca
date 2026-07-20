'use client'

import { useState, useMemo, useTransition, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Search, Users, CheckCircle2, AlertCircle, Clock,
  Shield, X, AlertTriangle, ChevronDown, Upload, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ExportCsvButton from '@/components/ui/ExportCsvButton'
import type { CsmClient } from './types'
import { computeDueDates, today, formatDate } from './types'
import {
  updateMeeting, updateMissed, toggleText, toggleMilestone, updateStatus,
  marquerRemboursement, updateOnboardingDate, updateEmailAvis, creerCsmClientManuel,
} from './actions'

type StatusFilter =
  | 'tous' | 'active' | 'm2_missed' | 'm3_missed'
  | 'cert_setter' | 'cert_closer' | 'paused' | 'dropped' | 'refund'
  | 'j90_auto' | 'overdue_texts'

const STATUS_CONFIG: Record<CsmClient['status'], { label: string; cls: string }> = {
  active:    { label: 'Active',      cls: 'bg-green-100 text-green-700'  },
  paused:    { label: 'En pause',    cls: 'bg-amber-100 text-amber-700'  },
  completed: { label: 'Complétée',  cls: 'bg-blue-100 text-blue-700'    },
  dropped:   { label: 'Abandon',    cls: 'bg-gray-100 text-gray-500'    },
  refund:    { label: 'Remboursée', cls: 'bg-red-100 text-red-600'      },
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

function EditableMCell({ clientId, num, date, missed }: {
  clientId: string
  num:      1 | 2 | 3 | 4
  date:     string | null
  missed:   boolean
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

  const cellCls = missed
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
        onClick={() => setOpen(v => !v)}
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

function TextCell({ clientId, field, done, dueDate, actualDate, today: todayStr, info }: {
  clientId:   string
  field:      'j7' | 'j24' | 'j49' | 'j63' | 'j77' | 'j90'
  done:       boolean
  dueDate:    string
  actualDate: string | null
  today:      string
  info?:      string
}) {
  const [pending, start] = useTransition()
  const displayDate = done && actualDate ? actualDate : dueDate
  const cls = done
    ? 'bg-green-100 text-green-800 border border-green-200'
    : dueDate <= todayStr
      ? 'bg-red-100 text-red-700 border border-red-200'
      : 'bg-yellow-50 text-yellow-800 border border-yellow-200'

  return (
    <td className="px-2 py-2 text-center">
      <button
        onClick={() => start(async () => toggleText(clientId, field, !done))}
        disabled={pending}
        className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center justify-center gap-0.5 w-full transition-all', cls)}
      >
        {done && <CheckCircle2 size={8} />}
        {!done && dueDate <= todayStr && <Clock size={8} />}
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
  clientId, status, certSetterDone, certCloserDone, dayN,
}: {
  clientId:       string
  status:         CsmClient['status']
  certSetterDone: boolean
  certCloserDone: boolean
  dayN:           number
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
      if (!confirm('Marquer comme remboursée ?\n\nCela va supprimer la deal de la cash collect et annuler la commission associée.')) return
      startT(async () => { await marquerRemboursement(clientId); setOpen(false) })
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
            {(['active', 'paused', 'dropped'] as const).map(key => (
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

// ── Main component ────────────────────────────────────────────────────

interface Props { clients: CsmClient[]; fullyPaidNames: string[] }

function paymentBadgeCls(payment: string | null, fullyPaid: boolean): string {
  if (!payment) return 'text-gray-400'
  const p = payment.toLowerCase().trim().replace(/\s+/g, '-')
  if (p === 'pif' || fullyPaid) return 'font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded'
  if (p.startsWith('fin'))      return 'font-semibold text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded'
  return 'font-semibold text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded'
}

export default function CsmClientList({ clients, fullyPaidNames }: Props) {
  const fullyPaidSet = useMemo(() => new Set(fullyPaidNames), [fullyPaidNames])
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [ajoutOpen, setAjoutOpen]       = useState(false)
  const [ajoutPending, startAjoutTrans] = useTransition()
  const todayStr = today()

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
      })
      setAjoutOpen(false)
    })
  }

  // Overdue text check (reused for filter and KPI)
  function hasOverdueText(c: CsmClient): boolean {
    const due = computeDueDates(c.enrollment_date, c.onboarding_date)
    const dayN = daysBetween(c.enrollment_date, todayStr)
    return [
      { done: c.text_j7_done,  due: due.j7  },
      { done: c.text_j24_done, due: due.j24 },
      { done: c.text_j49_done, due: due.j49 },
      { done: c.text_j63_done, due: due.j63 },
      { done: c.text_j77_done, due: due.j77 },
      { done: c.text_j90_done, due: due.j90 },
    ].some(ch => !ch.done && ch.due < todayStr && dayN >= 7)
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
      if (statusFilter === 'overdue_texts'  && !hasOverdueText(c))         return false
      // Refund clients only show in the dedicated 'refund' tab — hide from 'tous'
      if (statusFilter === 'tous' && c.status === 'refund') return false
      const simpleStatusFilters = ['active', 'paused', 'dropped', 'refund']
      if (simpleStatusFilters.includes(statusFilter) && c.status !== statusFilter) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, search, statusFilter, todayStr])

  // KPIs
  const active      = clients.filter(c => c.status === 'active').length
  const certCloser  = clients.filter(c => c.cert_closer_done).length
  const overdue     = clients.filter(hasOverdueText).length
  const refundCount = clients.filter(c => c.status === 'refund').length

  const m2NoShowCount = clients.filter(c => c.m2_missed).length
  const m3NoShowCount = clients.filter(c => c.m3_missed).length
  const j90Count      = clients.filter(c => daysBetween(c.enrollment_date, todayStr) >= 90).length

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'tous',         label: 'Toutes'                                                                              },
    { key: 'active',       label: 'Actives'                                                                             },
    { key: 'm2_missed',    label: `M2 manqué${m2NoShowCount > 0 ? ` (${m2NoShowCount})` : ''}`                         },
    { key: 'm3_missed',    label: `M3 manqué${m3NoShowCount > 0 ? ` (${m3NoShowCount})` : ''}`                         },
    { key: 'cert_setter',  label: 'Cert. Setter'                                                                        },
    { key: 'cert_closer',  label: 'Cert. Closer'                                                                        },
    { key: 'paused',       label: 'En pause'                                                                            },
    { key: 'dropped',      label: 'Abandons'                                                                            },
    { key: 'j90_auto',     label: `+90 jours${j90Count > 0 ? ` (${j90Count})` : ''}`                                  },
    { key: 'refund',       label: `Remboursé${refundCount > 0 ? ` (${refundCount})` : ''}`                             },
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

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Textes en retard</p>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums', overdue > 0 ? 'text-amber-600' : 'text-gray-300')}>
            {overdue > 0 ? overdue : '—'}
          </p>
        </div>
        <div className={cn(
          'rounded-xl border shadow-sm p-4 cursor-pointer transition-all',
          j90Count > 0 ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : 'bg-white border-gray-100',
          statusFilter === 'j90_auto' && 'ring-2 ring-orange-400',
        )}
          onClick={() => setStatusFilter(sf => sf === 'j90_auto' ? 'tous' : 'j90_auto')}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className={j90Count > 0 ? 'text-orange-500' : 'text-gray-300'} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">+90 jours</p>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums', j90Count > 0 ? 'text-orange-600' : 'text-gray-300')}>
            {j90Count > 0 ? j90Count : '—'}
          </p>
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
            onClick={() => setAjoutOpen(true)}
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

        {/* Modal ajout client manuel */}
        {ajoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Ajouter un client manuellement</h2>
                <button onClick={() => setAjoutOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={16} /></button>
              </div>
              <form onSubmit={handleAjoutManuel} className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Nom de la cliente *</label>
                  <input name="name" required placeholder="Fiesta Neila Kamugisha"
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
                    <select name="payment_type"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
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
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setAjoutOpen(false)}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
                  <button type="submit" disabled={ajoutPending}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                    {ajoutPending ? 'Ajout…' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

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
        ) : statusFilter === 'overdue_texts' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-40">Cliente</th>
                  <th className="px-2 py-2.5 text-center text-gray-300">J.</th>
                  <th className="px-2 py-2.5 text-center">J+7</th>
                  <th className="px-2 py-2.5 text-center">J+24</th>
                  <th className="px-2 py-2.5 text-center">J+49</th>
                  <th className="px-2 py-2.5 text-center">J+63</th>
                  <th className="px-2 py-2.5 text-center">J+77</th>
                  <th className="px-2 py-2.5 text-center">J+90</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => {
                  const due  = computeDueDates(c.enrollment_date, c.onboarding_date)
                  const dayN = daysBetween(c.enrollment_date, todayStr)
                  return (
                    <tr key={c.id} className="hover:bg-violet-50/20 transition-colors">
                      <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-gray-50">
                        <Link href={`/csm/${c.id}`} className="hover:underline">
                          <span className="font-semibold text-sm text-gray-900">{c.name}</span>
                        </Link>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(c.enrollment_date)}</p>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[10px] font-bold text-gray-400">J+{dayN}</span>
                      </td>
                      <TextCell clientId={c.id} field="j7"  done={c.text_j7_done}  dueDate={due.j7}  actualDate={c.text_j7_date}  today={todayStr} />
                      <TextCell clientId={c.id} field="j24" done={c.text_j24_done} dueDate={due.j24} actualDate={c.text_j24_date} today={todayStr} />
                      <TextCell clientId={c.id} field="j49" done={c.text_j49_done} dueDate={due.j49} actualDate={c.text_j49_date} today={todayStr} />
                      <TextCell clientId={c.id} field="j63" done={c.text_j63_done} dueDate={due.j63} actualDate={c.text_j63_date} today={todayStr} />
                      <TextCell clientId={c.id} field="j77" done={c.text_j77_done} dueDate={due.j77} actualDate={c.text_j77_date} today={todayStr} />
                      <TextCell clientId={c.id} field="j90" done={c.text_j90_done} dueDate={due.j90} actualDate={c.text_j90_date} today={todayStr} />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
                        <Link href={`/csm/${c.id}`} className="hover:underline">
                          <span className={cn('font-semibold text-sm', nameCls)}>{c.name}</span>
                        </Link>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(c.enrollment_date)}</p>
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
                      />

                      {/* M2 */}
                      <EditableMCell clientId={c.id} num={2} date={c.m2_date} missed={c.m2_missed} />

                      {/* J+24 */}
                      <TextCell clientId={c.id} field="j24" done={c.text_j24_done} dueDate={due.j24} actualDate={c.text_j24_date} today={todayStr} />

                      {/* M3 */}
                      <EditableMCell clientId={c.id} num={3} date={c.m3_date} missed={c.m3_missed} />

                      {/* Post-M3 touchpoints */}
                      <TextCell clientId={c.id} field="j49" done={c.text_j49_done} dueDate={due.j49} actualDate={c.text_j49_date} today={todayStr} />
                      <TextCell clientId={c.id} field="j63" done={c.text_j63_done} dueDate={due.j63} actualDate={c.text_j63_date} today={todayStr} />
                      <TextCell clientId={c.id} field="j77" done={c.text_j77_done} dueDate={due.j77} actualDate={c.text_j77_date} today={todayStr} />
                      <TextCell clientId={c.id} field="j90" done={c.text_j90_done} dueDate={due.j90} actualDate={c.text_j90_date} today={todayStr} />

                      {/* M4 */}
                      <EditableMCell clientId={c.id} num={4} date={c.m4_date} missed={c.m4_missed} />

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
                        status={c.status}
                        certSetterDone={c.cert_setter_done}
                        certCloserDone={c.cert_closer_done}
                        dayN={dayN}
                      />

                      {/* Payment */}
                      <td className="px-2 py-2 text-center">
                        <span className={cn(
                          'text-[10px] uppercase',
                          paymentBadgeCls(c.payment_type, fullyPaidSet.has(c.name.toLowerCase().trim())),
                        )}>
                          {c.payment_type ?? '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
