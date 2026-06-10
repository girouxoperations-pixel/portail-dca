'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Users, CheckCircle2, AlertCircle, Clock, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import ExportCsvButton from '@/components/ui/ExportCsvButton'
import type { CsmClient } from './types'
import { computeDueDates, today, formatDate } from './types'

type StatusFilter = 'tous' | 'active' | 'paused' | 'completed' | 'dropped'

// ── Date cell color ──────────────────────────────────────────────────
// J = today: red, past: green, future: yellow, empty: gray
function cellCls(date: string | null, todayStr: string, done?: boolean): string {
  if (!date) return 'bg-gray-50 text-gray-300'
  // For text follow-ups, if done override the date coloring
  if (done === true) return 'bg-green-100 text-green-700 font-semibold'
  if (done === false && date < todayStr) return 'bg-red-100 text-red-700'  // overdue
  if (date === todayStr) return 'bg-red-500 text-white font-bold'           // today = red
  if (date < todayStr)   return 'bg-green-100 text-green-700'              // past = green
  return 'bg-yellow-50 text-yellow-700'                                     // future = yellow
}

// ── Name color rules ─────────────────────────────────────────────────
// red = not logged in Circle for 7+ days; green = cert setter done; default = gray
function nameColor(c: CsmClient, todayStr: string): string {
  const notConnected = !c.circle_last_login
    ? (new Date(todayStr).getTime() - new Date(c.enrollment_date).getTime()) > 7 * 86400000
    : (new Date(todayStr).getTime() - new Date(c.circle_last_login).getTime()) > 7 * 86400000
  if (notConnected && !c.cert_setter_done) return 'text-red-600'
  if (c.cert_setter_done) return 'text-green-700 font-semibold'
  return 'text-gray-900'
}

// ── Day # since enrollment ────────────────────────────────────────────
function dayNumber(enrollmentDate: string, todayStr: string): number {
  return Math.floor((new Date(todayStr).getTime() - new Date(enrollmentDate + 'T00:00').getTime()) / 86400000)
}

interface Props { clients: CsmClient[] }

export default function CsmClientList({ clients }: Props) {
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous')
  const todayStr = today()

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return clients.filter(c => {
      if (statusFilter !== 'tous' && c.status !== statusFilter) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [clients, search, statusFilter])

  // KPIs
  const active     = clients.filter(c => c.status === 'active').length
  const certSetter = clients.filter(c => c.cert_setter_done).length
  const overdue    = clients.filter(c => {
    const due = computeDueDates(c.enrollment_date)
    const checks = [
      { done: c.text_j7_done,  due: due.j7  },
      { done: c.text_j21_done, due: due.j21 },
      { done: c.text_j49_done, due: due.j49 },
      { done: c.text_j63_done, due: due.j63 },
      { done: c.text_j77_done, due: due.j77 },
      { done: c.text_j90_done, due: due.j90 },
    ]
    return checks.some(ch => !ch.done && ch.due < todayStr && dayNumber(c.enrollment_date, todayStr) >= 7)
  }).length

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'tous',      label: 'Toutes'     },
    { key: 'active',    label: 'Actives'    },
    { key: 'paused',    label: 'En pause'   },
    { key: 'completed', label: 'Complétées' },
    { key: 'dropped',   label: 'Abandons'   },
  ]

  const csvData = filtered.map(c => {
    const due = computeDueDates(c.enrollment_date)
    return {
      Nom:             c.name,
      Inscription:     formatDate(c.enrollment_date),
      Paiement:        c.payment_type ?? '—',
      M1:              formatDate(c.m1_date),
      J7:              formatDate(c.text_j7_date ?? due.j7),
      M2:              formatDate(c.m2_date),
      M3:              formatDate(c.m3_date),
      M4:              formatDate(c.m4_date),
      'Cert.Setter':   c.cert_setter_done ? 'Oui' : 'Non',
      'Cert.Closer':   c.cert_closer_done ? 'Oui' : 'Non',
      Statut:          c.status,
    }
  })

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suivi CSM</h1>
        <p className="text-sm text-gray-500 mt-0.5">Progression cliente — 3 mois de formation</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
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
          overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100',
        )}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className={overdue > 0 ? 'text-red-500' : 'text-gray-300'} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Suivis en retard</p>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums', overdue > 0 ? 'text-red-600' : 'text-gray-300')}>
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
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                statusFilter === f.key ? 'bg-white text-violet-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>
          <ExportCsvButton filename="csm-clients" data={csvData} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Aujourd&apos;hui
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-100 inline-block" /> Passé / fait
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-100 inline-block" /> À venir
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-100 inline-block" /> En retard
        </span>
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
                  <th className="px-3 py-2.5 text-center">J.</th>
                  <th className="px-3 py-2.5 text-center">M1</th>
                  <th className="px-3 py-2.5 text-center">J+7</th>
                  <th className="px-3 py-2.5 text-center">J+21</th>
                  <th className="px-3 py-2.5 text-center">M2</th>
                  <th className="px-3 py-2.5 text-center">M3</th>
                  <th className="px-3 py-2.5 text-center">J+49</th>
                  <th className="px-3 py-2.5 text-center">J+63</th>
                  <th className="px-3 py-2.5 text-center">J+77</th>
                  <th className="px-3 py-2.5 text-center">J+90</th>
                  <th className="px-3 py-2.5 text-center">M4</th>
                  <th className="px-3 py-2.5 text-center">M5</th>
                  <th className="px-3 py-2.5 text-center">Quiz S</th>
                  <th className="px-3 py-2.5 text-center">Cert S</th>
                  <th className="px-3 py-2.5 text-center">Opp S</th>
                  <th className="px-3 py-2.5 text-center">Quiz C</th>
                  <th className="px-3 py-2.5 text-center">Cert C</th>
                  <th className="px-3 py-2.5 text-center">Opp C</th>
                  <th className="px-3 py-2.5 text-center">Paiement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => {
                  const due = computeDueDates(c.enrollment_date)
                  const dayN = dayNumber(c.enrollment_date, todayStr)

                  return (
                    <tr key={c.id} className="hover:bg-violet-50/30 transition-colors">
                      {/* Name */}
                      <td className="px-3 py-2 sticky left-0 bg-white z-10">
                        <Link href={`/csm/${c.id}`} className="hover:underline">
                          <span className={cn('font-medium', nameColor(c, todayStr))}>
                            {c.name}
                          </span>
                        </Link>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(c.enrollment_date)}</p>
                      </td>

                      {/* Day # */}
                      <td className="px-3 py-2 text-center">
                        <span className="text-[11px] font-bold text-gray-500">J+{dayN}</span>
                      </td>

                      {/* M1 */}
                      <DateCell date={c.m1_date} today={todayStr} />

                      {/* J+7 text */}
                      <TextCell done={c.text_j7_done} dueDate={due.j7} actualDate={c.text_j7_date} today={todayStr} />

                      {/* J+21 text */}
                      <TextCell done={c.text_j21_done} dueDate={due.j21} actualDate={c.text_j21_date} today={todayStr} />

                      {/* M2 */}
                      <DateCell date={c.m2_date} today={todayStr} />

                      {/* M3 */}
                      <DateCell date={c.m3_date} today={todayStr} />

                      {/* J+49 text */}
                      <TextCell done={c.text_j49_done} dueDate={due.j49} actualDate={c.text_j49_date} today={todayStr} />

                      {/* J+63 text */}
                      <TextCell done={c.text_j63_done} dueDate={due.j63} actualDate={c.text_j63_date} today={todayStr} />

                      {/* J+77 text */}
                      <TextCell done={c.text_j77_done} dueDate={due.j77} actualDate={c.text_j77_date} today={todayStr} />

                      {/* J+90 text */}
                      <TextCell done={c.text_j90_done} dueDate={due.j90} actualDate={c.text_j90_date} today={todayStr} />

                      {/* M4 */}
                      <DateCell date={c.m4_date} today={todayStr} />

                      {/* M5 */}
                      <DateCell date={c.m5_date} today={todayStr} />

                      {/* Milestones */}
                      <CheckCell done={c.quiz_setter_done} />
                      <CheckCell done={c.cert_setter_done} green />
                      <CheckCell done={c.opportunity_setter} />
                      <CheckCell done={c.quiz_closer_done} />
                      <CheckCell done={c.cert_closer_done} green />
                      <CheckCell done={c.opportunity_closer} />

                      {/* Payment */}
                      <td className="px-3 py-2 text-center">
                        <span className="text-[10px] text-gray-500 uppercase">{c.payment_type ?? '—'}</span>
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

// ── Sub-components ────────────────────────────────────────────────────

function DateCell({ date, today: todayStr }: { date: string | null; today: string }) {
  if (!date) return <td className="px-2 py-2 text-center"><span className="text-gray-200">—</span></td>
  const cls = date === todayStr
    ? 'bg-red-500 text-white'
    : date < todayStr
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-50 text-yellow-800'
  return (
    <td className="px-2 py-2 text-center">
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', cls)}>
        {formatDate(date)}
      </span>
    </td>
  )
}

function TextCell({
  done, dueDate, actualDate, today: todayStr,
}: {
  done: boolean; dueDate: string; actualDate: string | null; today: string
}) {
  const displayDate = done && actualDate ? actualDate : dueDate
  const cls = done
    ? 'bg-green-100 text-green-800'
    : dueDate <= todayStr
      ? 'bg-red-100 text-red-700'
      : 'bg-yellow-50 text-yellow-800'

  return (
    <td className="px-2 py-2 text-center">
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center justify-center gap-0.5', cls)}>
        {done && <CheckCircle2 size={9} />}
        {!done && dueDate <= todayStr && <Clock size={9} />}
        {formatDate(displayDate)}
      </span>
    </td>
  )
}

function CheckCell({ done, green }: { done: boolean; green?: boolean }) {
  return (
    <td className="px-2 py-2 text-center">
      {done
        ? <CheckCircle2 size={14} className={cn('mx-auto', green ? 'text-green-600' : 'text-blue-500')} />
        : <span className="text-gray-200 text-xs">—</span>
      }
    </td>
  )
}
