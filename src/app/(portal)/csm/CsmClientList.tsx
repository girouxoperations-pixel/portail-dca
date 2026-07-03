'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import {
  Search, Users, CheckCircle2, AlertCircle, Clock,
  Shield, X, AlertTriangle, ChevronDown, Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ExportCsvButton from '@/components/ui/ExportCsvButton'
import type { CsmClient } from './types'
import { computeDueDates, today, formatDate } from './types'
import {
  updateMeeting, updateMissed, toggleText, updateStatus, marquerRemboursement, updateOnboardingDate, updateEmailAvis,
} from './actions'

type StatusFilter = 'tous' | 'active' | 'paused' | 'cert_setter' | 'cert_closer' | 'dropped'

const STATUS_CONFIG: Record<CsmClient['status'], { label: string; cls: string }> = {
  active:    { label: 'Active',      cls: 'bg-green-100 text-green-700' },
  paused:    { label: 'En pause',    cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Complétée',  cls: 'bg-blue-100 text-blue-700'   },
  dropped:   { label: 'Abandon',    cls: 'bg-gray-100 text-gray-500'   },
  refund:    { label: 'Remboursée', cls: 'bg-red-100 text-red-600'     },
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
  const [open, setOpen]         = useState(false)
  const [val, setVal]           = useState(date ?? '')
  const [pendingM, startM]      = useTransition()
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
            <button
              onClick={handleMissed}
              disabled={pendingM}
              title={missed ? 'Enlever manqué' : 'Marquer comme manqué'}
              className={cn(
                'px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50',
                missed
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-50 text-red-600 hover:bg-red-100',
              )}
            >
              {missed ? '✓' : <AlertTriangle size={11} />}
            </button>
          </div>
          {missed && (
            <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1">
              <AlertTriangle size={9} /> RDV manqué — entrer nouvelle date ci-dessus
            </p>
          )}
        </div>
      )}
    </td>
  )
}

// ── Text touchpoint cell ──────────────────────────────────────────────

function TextCell({ clientId, field, done, dueDate, actualDate, today: todayStr, info }: {
  clientId:   string
  field:      'j7' | 'j49' | 'j63' | 'j77' | 'j90'
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
  const cfg = avis ? EMAIL_CONFIG[avis] : null

  function handleSelect(key: EmailAvis | null) {
    startT(async () => { await updateEmailAvis(clientId, key); setOpen(false) })
  }

  return (
    <td className="px-2 py-2 text-center relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5 mx-auto',
          cfg ? cfg.cls : 'bg-gray-100 text-gray-400',
        )}
      >
        {cfg ? cfg.label : '—'}
        <ChevronDown size={8} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-40">
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
      )}
    </td>
  )
}

// ── Inline status badge ───────────────────────────────────────────────

function StatusCell({ clientId, status }: { clientId: string; status: CsmClient['status'] }) {
  const [open, setOpen]    = useState(false)
  const [pending, startT]  = useTransition()
  const cfg = STATUS_CONFIG[status]

  function handleSelect(key: CsmClient['status']) {
    if (key === 'refund') {
      if (!confirm('Marquer comme remboursée ?\n\nCela va supprimer la deal de la cash collect et annuler la commission associée.')) return
      startT(async () => { await marquerRemboursement(clientId); setOpen(false) })
    } else {
      startT(async () => { await updateStatus(clientId, key); setOpen(false) })
    }
  }

  const nonRefund = (Object.entries(STATUS_CONFIG) as [CsmClient['status'], typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).filter(([k]) => k !== 'refund')
  const refundEntry = STATUS_CONFIG['refund']

  return (
    <td className="px-2 py-2 text-center relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5 mx-auto', cfg.cls)}
      >
        {cfg.label}
        <ChevronDown size={8} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-36">
          {nonRefund.map(([key, c]) => (
            <button
              key={key}
              disabled={pending}
              onClick={() => handleSelect(key)}
              className={cn(
                'w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50',
                status === key ? 'font-semibold' : '',
              )}
            >
              <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', c.cls)}>{c.label}</span>
            </button>
          ))}
          <div className="border-t border-red-100">
            <button
              disabled={pending}
              onClick={() => handleSelect('refund')}
              className="w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-red-50"
            >
              <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', refundEntry.cls)}>{refundEntry.label}</span>
            </button>
          </div>
        </div>
      )}
    </td>
  )
}

function CheckCell({ done, green }: { done: boolean; green?: boolean }) {
  return (
    <td className="px-2 py-2 text-center">
      {done
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
  // 2-vers / 3-vers
  return 'font-semibold text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded'
}

export default function CsmClientList({ clients, fullyPaidNames }: Props) {
  const fullyPaidSet = useMemo(() => new Set(fullyPaidNames), [fullyPaidNames])
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous')
  const todayStr = today()

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return clients.filter(c => {
      if (statusFilter === 'cert_setter' && !c.cert_setter_done) return false
      if (statusFilter === 'cert_closer' && !c.cert_closer_done) return false
      if (statusFilter !== 'tous' && statusFilter !== 'cert_setter' && statusFilter !== 'cert_closer' && c.status !== statusFilter) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [clients, search, statusFilter])

  // KPIs
  const active     = clients.filter(c => c.status === 'active').length
  const certSetter = clients.filter(c => c.cert_setter_done).length
  const missedAny  = clients.filter(c => c.m1_missed || c.m2_missed || c.m3_missed || c.m4_missed).length
  const overdue    = clients.filter(c => {
    const due = computeDueDates(c.enrollment_date)
    return [
      { done: c.text_j7_done,  due: due.j7  },
      { done: c.text_j49_done, due: due.j49 },
      { done: c.text_j63_done, due: due.j63 },
      { done: c.text_j77_done, due: due.j77 },
      { done: c.text_j90_done, due: due.j90 },
    ].some(ch => !ch.done && ch.due < todayStr && daysBetween(c.enrollment_date, todayStr) >= 7)
  }).length

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'tous',        label: 'Toutes'         },
    { key: 'active',      label: 'Actives'        },
    { key: 'paused',      label: 'En pause'       },
    { key: 'cert_setter', label: 'Cert. setter'   },
    { key: 'cert_closer', label: 'Cert. closer'   },
    { key: 'dropped',     label: 'Abandons'       },
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
            <Shield size={14} className="text-green-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cert. Setter</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{certSetter}</p>
        </div>
        <div className={cn(
          'rounded-xl border shadow-sm p-4',
          missedAny > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100',
        )}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className={missedAny > 0 ? 'text-red-500' : 'text-gray-300'} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">RDV manqués</p>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums', missedAny > 0 ? 'text-red-600' : 'text-gray-300')}>
            {missedAny > 0 ? missedAny : '—'}
          </p>
        </div>
        <div className={cn(
          'rounded-xl border shadow-sm p-4',
          overdue > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100',
        )}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className={overdue > 0 ? 'text-amber-500' : 'text-gray-300'} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Textes en retard</p>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums', overdue > 0 ? 'text-amber-600' : 'text-gray-300')}>
            {overdue > 0 ? overdue : '—'}
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
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                statusFilter === f.key ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>
          <Link
            href="/csm/import"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
          >
            <Upload size={12} /> Import CSV
          </Link>
          <ExportCsvButton filename="csm-clients" data={csvData} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Aujourd&apos;hui</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" /> Passé / fait</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-50 border border-yellow-200 inline-block" /> À venir</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" /> Manqué / retard</span>
        <span className="flex items-center gap-1.5 text-gray-400">Cliquer sur M ou J pour modifier</span>
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
                  {/* Meetings */}
                  <th className="px-2 py-2.5 text-center">J+7</th>
                  <th className="px-2 py-2.5 text-center text-violet-500">M2</th>
                  <th className="px-2 py-2.5 text-center text-violet-500">M3</th>
                  {/* 4 post-M3 touchpoints */}
                  <th className="px-2 py-2.5 text-center border-l border-violet-100">J+49</th>
                  <th className="px-2 py-2.5 text-center">J+63</th>
                  <th className="px-2 py-2.5 text-center">J+77</th>
                  <th className="px-2 py-2.5 text-center">J+90</th>
                  <th className="px-2 py-2.5 text-center text-violet-500 border-l border-violet-100">M4</th>
                  {/* Milestones */}
                  <th className="px-2 py-2.5 text-center border-l border-gray-100">Q.S</th>
                  <th className="px-2 py-2.5 text-center">C.S</th>
                  <th className="px-2 py-2.5 text-center">Opp S</th>
                  <th className="px-2 py-2.5 text-center border-l border-gray-100">Q.C</th>
                  <th className="px-2 py-2.5 text-center">C.C</th>
                  <th className="px-2 py-2.5 text-center">Opp C</th>
                  {/* Meta */}
                  <th className="px-2 py-2.5 text-center border-l border-gray-100">Email</th>
                  <th className="px-2 py-2.5 text-center">Statut</th>
                  <th className="px-2 py-2.5 text-center">Paie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => {
                  const due  = computeDueDates(c.enrollment_date)
                  const dayN = daysBetween(c.enrollment_date, todayStr)

                  // Last login info for J7 cell
                  const lastLoginDaysAgo = c.circle_last_login
                    ? daysBetween(c.circle_last_login, todayStr)
                    : null
                  const j7Info = dayN >= 5
                    ? [
                        c.theory_pct > 0 ? `${c.theory_pct}% théorie` : null,
                        lastLoginDaysAgo !== null ? `connectée J-${lastLoginDaysAgo}` : 'jamais connectée',
                      ].filter(Boolean).join(' · ')
                    : undefined

                  // Name color: red if not connected 7+ days, black otherwise
                  const notConnected = lastLoginDaysAgo === null
                    ? dayN >= 7
                    : lastLoginDaysAgo >= 7
                  const nameCls = notConnected && !c.cert_setter_done ? 'text-red-600' : 'text-gray-900'

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

                      {/* J+7 with last login + progress info */}
                      <TextCell
                        clientId={c.id} field="j7"
                        done={c.text_j7_done} dueDate={due.j7} actualDate={c.text_j7_date}
                        today={todayStr}
                        info={j7Info}
                      />

                      {/* M2 */}
                      <EditableMCell clientId={c.id} num={2} date={c.m2_date} missed={c.m2_missed} />

                      {/* M3 */}
                      <EditableMCell clientId={c.id} num={3} date={c.m3_date} missed={c.m3_missed} />

                      {/* 4 post-M3 touchpoints */}
                      <TextCell clientId={c.id} field="j49" done={c.text_j49_done} dueDate={due.j49} actualDate={c.text_j49_date} today={todayStr} />
                      <TextCell clientId={c.id} field="j63" done={c.text_j63_done} dueDate={due.j63} actualDate={c.text_j63_date} today={todayStr} />
                      <TextCell clientId={c.id} field="j77" done={c.text_j77_done} dueDate={due.j77} actualDate={c.text_j77_date} today={todayStr} />
                      <TextCell clientId={c.id} field="j90" done={c.text_j90_done} dueDate={due.j90} actualDate={c.text_j90_date} today={todayStr} />

                      {/* M4 */}
                      <EditableMCell clientId={c.id} num={4} date={c.m4_date} missed={c.m4_missed} />

                      {/* Milestones */}
                      <CheckCell done={c.quiz_setter_done} />
                      <CheckCell done={c.cert_setter_done} green />
                      <CheckCell done={c.opportunity_setter} />
                      <CheckCell done={c.quiz_closer_done} />
                      <CheckCell done={c.cert_closer_done} green />
                      <CheckCell done={c.opportunity_closer} />

                      {/* Email avis */}
                      <EmailCell clientId={c.id} avis={c.email_avis ?? null} />

                      {/* Status inline */}
                      <StatusCell clientId={c.id} status={c.status} />

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
