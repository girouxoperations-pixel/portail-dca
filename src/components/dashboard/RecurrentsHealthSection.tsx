'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, Calendar, Zap, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dollar } from '@/lib/constants'
import { marquerRecu } from '@/app/(portal)/recurrents/actions'

export interface RecurrentsOcc {
  id:             string
  date_attendue:  string
  montant_attendu: number
  mois:           number
  annee:          number
  clientName:     string
  closerName?:    string
}

interface Props {
  occsAujourdhui: RecurrentsOcc[]
  occsRetard:     RecurrentsOcc[]
  occsSemaine:    RecurrentsOcc[]
  occsMois:       RecurrentsOcc[]
}

type Filtre = 'aujourd_hui' | 'semaine' | 'mois' | 'retard'

function fmtDate(d: string) {
  return new Date(d + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function OccRow({ occ }: { occ: RecurrentsOcc }) {
  const [pending, start] = useTransition()
  const [done, setDone]  = useState(false)

  if (done) {
    return (
      <tr className="bg-green-50/60">
        <td colSpan={5} className="px-4 py-2.5 text-xs text-green-700 flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-green-500" /> {occ.clientName} — {dollar(occ.montant_attendu)} marqué reçu
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-2.5 font-medium text-gray-800">{occ.clientName}</td>
      <td className="px-4 py-2.5 text-gray-500">{occ.closerName ?? '—'}</td>
      <td className="px-4 py-2.5 text-gray-500">{fmtDate(occ.date_attendue)}</td>
      <td className="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{dollar(occ.montant_attendu)}</td>
      <td className="px-4 py-2.5 text-right">
        <button
          disabled={pending}
          onClick={() => start(async () => { await marquerRecu(occ.id, occ.montant_attendu); setDone(true) })}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors disabled:opacity-50"
        >
          {pending ? '…' : <><CheckCircle2 size={11} /> Reçu</>}
        </button>
      </td>
    </tr>
  )
}

function OccTable({ occs, accentCls }: { occs: RecurrentsOcc[]; accentCls: string }) {
  if (occs.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">Aucun versement</p>
  }
  const sorted = [...occs].sort((a, b) => a.date_attendue.localeCompare(b.date_attendue))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={cn('text-xs font-semibold uppercase tracking-wide', accentCls)}>
            <th className="px-4 py-2.5 text-left">Client</th>
            <th className="px-4 py-2.5 text-left">Closer</th>
            <th className="px-4 py-2.5 text-left">Date attendue</th>
            <th className="px-4 py-2.5 text-right">Montant</th>
            <th className="px-4 py-2.5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map(o => <OccRow key={o.id} occ={o} />)}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-100 bg-gray-50/60">
            <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</td>
            <td className="px-4 py-2.5 text-right font-bold text-gray-800 tabular-nums">
              {dollar(sorted.reduce((s, o) => s + o.montant_attendu, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function RecurrentsHealthSection({ occsAujourdhui, occsRetard, occsSemaine, occsMois }: Props) {
  const [open, setOpen] = useState<Filtre | null>(null)

  function toggle(f: Filtre) {
    setOpen(prev => prev === f ? null : f)
  }

  const hasData = occsAujourdhui.length + occsRetard.length + occsSemaine.length + occsMois.length > 0
  if (!hasData) return null

  const CARDS = [
    {
      key:     'aujourd_hui' as const,
      icon:    Zap,
      label:   "Aujourd'hui",
      amount:  occsAujourdhui.reduce((s, o) => s + o.montant_attendu, 0),
      count:   occsAujourdhui.length,
      sub:     (n: number) => `${n} versement${n !== 1 ? 's' : ''} dû${n !== 1 ? 's' : ''} aujourd'hui`,
      danger:  occsAujourdhui.length > 0,
      occs:    occsAujourdhui,
      openCls: 'border-orange-300 bg-orange-50',
      headCls: 'bg-orange-50 border-b border-orange-100',
      thCls:   'text-orange-400',
      filtre:  'aujourd_hui',
    },
    {
      key:     'semaine' as const,
      icon:    Clock,
      label:   'Cette semaine',
      amount:  occsSemaine.reduce((s, o) => s + o.montant_attendu, 0),
      count:   occsSemaine.length,
      sub:     (n: number) => `${n} versement${n !== 1 ? 's' : ''} attendu${n !== 1 ? 's' : ''}`,
      danger:  false,
      occs:    occsSemaine,
      openCls: 'border-amber-200 bg-amber-50/30',
      headCls: 'bg-amber-50 border-b border-amber-100',
      thCls:   'text-amber-400',
      filtre:  'semaine',
    },
    {
      key:     'mois' as const,
      icon:    Calendar,
      label:   'Ce mois-ci',
      amount:  occsMois.reduce((s, o) => s + o.montant_attendu, 0),
      count:   occsMois.length,
      sub:     (n: number) => `${n} versement${n !== 1 ? 's' : ''} à encaisser`,
      danger:  false,
      occs:    occsMois,
      openCls: 'border-violet-200 bg-violet-50/30',
      headCls: 'bg-violet-50 border-b border-violet-100',
      thCls:   'text-violet-400',
      filtre:  'mois',
    },
    {
      key:     'retard' as const,
      icon:    AlertTriangle,
      label:   'En retard',
      amount:  occsRetard.reduce((s, o) => s + o.montant_attendu, 0),
      count:   occsRetard.length,
      sub:     (n: number) => `${n} versement${n !== 1 ? 's' : ''} non reçu${n !== 1 ? 's' : ''}`,
      danger:  occsRetard.length > 0,
      occs:    occsRetard,
      openCls: 'border-red-300 bg-red-50',
      headCls: 'bg-red-50 border-b border-red-100',
      thCls:   'text-red-400',
      filtre:  'retard',
    },
  ]

  const activeCard = open ? CARDS.find(c => c.key === open) : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CARDS.map(card => {
          const Icon    = card.icon
          const isOpen  = open === card.key
          const isEmpty = card.count === 0
          return (
            <button
              key={card.key}
              onClick={() => toggle(card.key)}
              className={cn(
                'rounded-xl border shadow-sm p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
                isOpen
                  ? card.openCls + ' ring-2 ring-offset-1 ' + (card.danger ? 'ring-red-300' : 'ring-violet-200')
                  : card.danger && !isEmpty
                    ? card.key === 'aujourd_hui' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-100',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon
                    size={14}
                    className={
                      card.danger && !isEmpty
                        ? card.key === 'aujourd_hui' ? 'text-orange-500' : 'text-red-500'
                        : 'text-gray-300'
                    }
                  />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
                </div>
                <ChevronRight size={13} className={cn('text-gray-300 transition-transform', isOpen && 'rotate-90')} />
              </div>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                card.danger && !isEmpty
                  ? card.key === 'aujourd_hui' ? 'text-orange-600' : 'text-red-600'
                  : isEmpty ? 'text-gray-300' : 'text-gray-900',
              )}>
                {isEmpty ? '—' : dollar(card.amount)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub(card.count)}</p>
            </button>
          )
        })}
      </div>

      {/* Panneau inline déroulant */}
      {activeCard && (
        <div className={cn('rounded-xl border shadow-sm overflow-hidden', activeCard.openCls)}>
          <div className={cn('px-5 py-3 flex items-center justify-between', activeCard.headCls)}>
            <p className="text-sm font-semibold text-gray-700">
              {activeCard.label} — {activeCard.count} versement{activeCard.count !== 1 ? 's' : ''}
            </p>
            <Link
              href={`/recurrents?filtre=${activeCard.filtre}`}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1"
              onClick={e => e.stopPropagation()}
            >
              Gérer <ChevronRight size={12} />
            </Link>
          </div>
          <OccTable occs={activeCard.occs} accentCls={activeCard.thCls} />
        </div>
      )}
    </div>
  )
}
