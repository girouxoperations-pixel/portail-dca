'use client'

import { useState } from 'react'
import { Users, CheckCircle2, AlertCircle, Clock, Circle, TrendingUp } from 'lucide-react'
import ExportCsvButton from '@/components/ui/ExportCsvButton'
import { cn } from '@/lib/utils'
import type { Followup } from './CloserFollowupView'

interface Profile { id: string; full_name: string | null }

interface Props {
  followups: (Followup & { closer_id: string })[]
  profiles:  Profile[]
}

type StatusFilter = 'tous' | 'en-cours' | 'completes' | 'en-retard'

function today() { return new Date().toISOString().split('T')[0] }

function getMsgStatus(done: boolean, due: string): 'done' | 'overdue' | 'soon' | 'pending' {
  if (done) return 'done'
  const todayStr = today()
  if (due < todayStr) return 'overdue'
  const daysLeft = Math.ceil((new Date(due).getTime() - new Date(todayStr).getTime()) / 86400000)
  return daysLeft <= 3 ? 'soon' : 'pending'
}

function getGlobalStatus(f: Followup): 'complete' | 'en-retard' | 'en-cours' {
  if (f.message1_done && f.message2_done && f.message3_done) return 'complete'
  const todayStr = today()
  const overdue = (!f.message1_done && f.due_message1 < todayStr)
    || (!f.message2_done && f.due_message2 < todayStr)
    || (!f.message3_done && f.due_message3 < todayStr)
  return overdue ? 'en-retard' : 'en-cours'
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function MsgCell({ done, due }: { done: boolean; due: string }) {
  const status = getMsgStatus(done, due)
  if (status === 'done')    return <CheckCircle2 size={16} className="text-green-500 mx-auto" />
  if (status === 'overdue') return <AlertCircle  size={16} className="text-red-500 mx-auto"   />
  if (status === 'soon')    return <Clock        size={16} className="text-amber-500 mx-auto"  />
  return <Circle size={16} className="text-gray-300 mx-auto" />
}

export default function AdminFollowupView({ followups, profiles }: Props) {
  const [closerFilter, setCloserFilter] = useState<string>('tous')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous')

  const profileMap = new Map(profiles.map(p => [p.id, p.full_name ?? 'Inconnu']))

  const todayStr = today()
  const curMonth = todayStr.slice(0, 7)

  // KPIs
  const thisMon  = followups.filter(f => f.close_date.startsWith(curMonth))
  const totalMsg = followups.length * 3
  const doneMsg  = followups.reduce((s, f) =>
    s + (f.message1_done ? 1 : 0) + (f.message2_done ? 1 : 0) + (f.message3_done ? 1 : 0), 0)
  const nRetard  = followups.filter(f => getGlobalStatus(f) === 'en-retard').length
  const pctDone  = totalMsg > 0 ? Math.round((doneMsg / totalMsg) * 100) : 0

  // Filtered rows
  const filtered = followups.filter(f => {
    if (closerFilter !== 'tous' && f.closer_id !== closerFilter) return false
    const gs = getGlobalStatus(f)
    if (statusFilter === 'en-cours')   return gs === 'en-cours'
    if (statusFilter === 'completes')  return gs === 'complete'
    if (statusFilter === 'en-retard')  return gs === 'en-retard'
    return true
  })

  const csvData = filtered.map(f => ({
    Client:         f.client_name,
    Closer:         profileMap.get(f.closer_id) ?? '—',
    'Date close':   formatDate(f.close_date),
    'Msg 1 dû':     formatDate(f.due_message1),
    'Msg 1 fait':   f.message1_done ? 'Oui' : 'Non',
    'Msg 2 dû':     formatDate(f.due_message2),
    'Msg 2 fait':   f.message2_done ? 'Oui' : 'Non',
    'Msg 3 dû':     formatDate(f.due_message3),
    'Msg 3 fait':   f.message3_done ? 'Oui' : 'Non',
    Statut:         getGlobalStatus(f) === 'complete' ? 'Complété' : getGlobalStatus(f) === 'en-retard' ? 'En retard' : 'En cours',
  }))

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'tous',       label: 'Tous'      },
    { key: 'en-cours',   label: 'En cours'  },
    { key: 'completes',  label: 'Complétés' },
    { key: 'en-retard',  label: 'En retard' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suivi client</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vue équipe — tous les closers</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={15} className="text-violet-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Clients ce mois</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">{thisMon.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-green-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Messages complétés</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">{pctDone} %</p>
          <p className="text-xs text-gray-400 mt-0.5">{doneMsg} / {totalMsg} messages</p>
        </div>
        <div className={cn(
          'rounded-xl border shadow-sm p-5',
          nRetard > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100',
        )}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={15} className={nRetard > 0 ? 'text-red-500' : 'text-gray-300'} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Suivis en retard</p>
          </div>
          <p className={cn('text-3xl font-bold tabular-nums', nRetard > 0 ? 'text-red-600' : 'text-gray-300')}>
            {nRetard > 0 ? nRetard : '—'}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Filtre closer */}
        <select
          value={closerFilter}
          onChange={e => setCloserFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="tous">Tous les closers</option>
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.full_name ?? 'Inconnu'}</option>
          ))}
        </select>

        {/* Filtre statut */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                statusFilter === f.key
                  ? 'bg-white text-violet-700 shadow-sm font-semibold'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <ExportCsvButton filename="suivi-clients" data={csvData} />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Aucun suivi dans cette catégorie</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Closer</th>
                  <th className="px-4 py-3 text-left">Date close</th>
                  <th className="px-4 py-3 text-center">Msg 1</th>
                  <th className="px-4 py-3 text-center">Msg 2</th>
                  <th className="px-4 py-3 text-center">Msg 3</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(f => {
                  const gs = getGlobalStatus(f)
                  return (
                    <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{f.client_name}</td>
                      <td className="px-4 py-3 text-gray-500">{profileMap.get(f.closer_id) ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(f.close_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <MsgCell done={f.message1_done} due={f.due_message1} />
                          <span className="text-[10px] text-gray-400">{formatDate(f.due_message1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <MsgCell done={f.message2_done} due={f.due_message2} />
                          <span className="text-[10px] text-gray-400">{formatDate(f.due_message2)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <MsgCell done={f.message3_done} due={f.due_message3} />
                          <span className="text-[10px] text-gray-400">{formatDate(f.due_message3)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          gs === 'complete'  ? 'bg-green-50 text-green-700'  :
                          gs === 'en-retard' ? 'bg-red-50 text-red-700'      :
                          'bg-blue-50 text-blue-700',
                        )}>
                          {gs === 'complete' ? 'Complété' : gs === 'en-retard' ? 'En retard' : 'En cours'}
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
