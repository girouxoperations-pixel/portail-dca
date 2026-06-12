'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, Calendar, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dollar } from '@/lib/constants'

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
  occsRetard:  RecurrentsOcc[]
  occsSemaine: RecurrentsOcc[]
  occsMois:    RecurrentsOcc[]
}

type Filtre = 'retard' | 'semaine' | 'mois'

const MOIS_COURT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function fmtDate(d: string) {
  return new Date(d + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function OccTable({ occs, accentCls }: { occs: RecurrentsOcc[]; accentCls: string }) {
  if (occs.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">Aucun versement</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={cn('text-xs font-semibold uppercase tracking-wide', accentCls)}>
            <th className="px-4 py-2.5 text-left">Client</th>
            <th className="px-4 py-2.5 text-left">Closer</th>
            <th className="px-4 py-2.5 text-left">Date attendue</th>
            <th className="px-4 py-2.5 text-right">Montant</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {occs.map(o => (
            <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
              <td className="px-4 py-2.5 font-medium text-gray-800">{o.clientName}</td>
              <td className="px-4 py-2.5 text-gray-500">{o.closerName ?? '—'}</td>
              <td className="px-4 py-2.5 text-gray-500">{fmtDate(o.date_attendue)}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{dollar(o.montant_attendu)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-100 bg-gray-50/60">
            <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</td>
            <td className="px-4 py-2.5 text-right font-bold text-gray-800 tabular-nums">
              {dollar(occs.reduce((s, o) => s + o.montant_attendu, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function RecurrentsHealthSection({ occsRetard, occsSemaine, occsMois }: Props) {
  const [open, setOpen] = useState<Filtre | null>(null)

  function toggle(f: Filtre) {
    setOpen(prev => prev === f ? null : f)
  }

  const hasData = occsRetard.length + occsSemaine.length + occsMois.length > 0
  if (!hasData) return null

  const CARDS = [
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
    },
    {
      key:     'mois' as const,
      icon:    Calendar,
      label:   'Ce mois (à venir)',
      amount:  occsMois.reduce((s, o) => s + o.montant_attendu, 0),
      count:   occsMois.length,
      sub:     (n: number) => `${n} versement${n !== 1 ? 's' : ''} à encaisser`,
      danger:  false,
      occs:    occsMois,
      openCls: 'border-violet-200 bg-violet-50/30',
      headCls: 'bg-violet-50 border-b border-violet-100',
      thCls:   'text-violet-400',
    },
  ]

  const activeCard = open ? CARDS.find(c => c.key === open) : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-100',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={14} className={card.danger && !isEmpty ? 'text-red-500' : 'text-gray-300'} />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
                </div>
                <ChevronRight
                  size={13}
                  className={cn(
                    'text-gray-300 transition-transform',
                    isOpen && 'rotate-90',
                  )}
                />
              </div>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                card.danger && !isEmpty ? 'text-red-600' : isEmpty ? 'text-gray-300' : 'text-gray-900',
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
              href={`/recurrents?filtre=${activeCard.key}`}
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
