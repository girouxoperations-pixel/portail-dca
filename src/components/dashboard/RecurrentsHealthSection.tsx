'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, Calendar, Zap, ChevronRight, CheckCircle2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dollar } from '@/lib/constants'
import { marquerRecu, marquerRecuAvecSoldes, modifierDateOccurrence } from '@/app/(portal)/recurrents/actions'

export interface RecurrentsOcc {
  id:               string
  date_attendue:    string
  montant_attendu:  number
  mois:             number
  annee:            number
  clientName:       string
  closerName?:      string
  methodePaiement?: string | null
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
  type SoldeLine = { montant: string; date: string }

  const [pending, start]              = useTransition()
  const [done, setDone]               = useState(false)
  const [showDiff, setShowDiff]       = useState(false)
  const [amount, setAmount]           = useState(String(occ.montant_attendu))
  const [soldeLines, setSoldeLines]   = useState<SoldeLine[]>([{ montant: '', date: '' }])
  const [editDate, setEditDate]       = useState(false)
  const [newDate, setNewDate]         = useState(occ.date_attendue)
  const [datePending, startDateTrans] = useTransition()

  const isPartial  = showDiff && Number(amount) > 0 && Number(amount) < occ.montant_attendu
  const soldeTotal = soldeLines.reduce((s, l) => s + (Number(l.montant) || 0), 0)
  const soldeReste = isPartial ? Math.round((occ.montant_attendu - Number(amount) - soldeTotal) * 100) / 100 : 0
  const soldeValid = !isPartial || soldeLines.every(l => l.date && Number(l.montant) > 0)

  function handleSaveDate() {
    if (!newDate || newDate === occ.date_attendue) { setEditDate(false); return }
    startDateTrans(async () => {
      await modifierDateOccurrence(occ.id, newDate)
      setEditDate(false)
    })
  }

  function handleMarquerExact() {
    start(async () => { await marquerRecu(occ.id, occ.montant_attendu); setDone(true) })
  }

  function handleMarquerDiff() {
    const val = Number(amount)
    if (isNaN(val) || val <= 0) return
    start(async () => {
      if (isPartial && soldeValid && soldeLines.some(l => l.date && Number(l.montant) > 0)) {
        const lignes = soldeLines.filter(l => l.date && Number(l.montant) > 0)
        await marquerRecuAvecSoldes(occ.id, val, lignes.map(l => ({ montant: Number(l.montant), date: l.date })))
      } else {
        await marquerRecu(occ.id, val)
      }
      setDone(true)
    })
  }

  if (done) {
    return (
      <tr className="bg-emerald-500/10">
        <td colSpan={6} className="px-4 py-2.5 text-xs text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 size={13} /> {occ.clientName} — {dollar(occ.montant_attendu)} marqué reçu
        </td>
      </tr>
    )
  }

  const methodeLabel = occ.methodePaiement === 'carte'
    ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">💳 Carte</span>
    : occ.methodePaiement === 'virement'
    ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🏦 Virement</span>
    : <span className="text-[10px] text-gray-600">—</span>

  return (
    <tr className="hover:bg-white/[0.03] transition-colors">
      <td className="px-4 py-2.5 font-medium text-gray-200">{occ.clientName}</td>
      <td className="px-4 py-2.5 text-gray-500">{occ.closerName ?? '—'}</td>
      <td className="px-4 py-2.5">{methodeLabel}</td>

      <td className="px-4 py-2.5 text-gray-500">
        {editDate ? (
          <div className="flex items-center gap-1">
            <input
              type="date" value={newDate} onChange={e => setNewDate(e.target.value)} autoFocus
              className="px-1.5 py-0.5 rounded border border-violet-500/40 bg-white/[0.05] text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button onClick={handleSaveDate} disabled={datePending}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >OK</button>
            <button onClick={() => { setEditDate(false); setNewDate(occ.date_attendue) }}
              className="text-[10px] text-gray-500 hover:text-gray-300"
            >✕</button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span>{fmtDate(occ.date_attendue)}</span>
            <button onClick={() => setEditDate(true)} className="text-gray-600 hover:text-violet-400 transition-colors">
              <Pencil size={10} />
            </button>
          </div>
        )}
      </td>

      <td className="px-4 py-2.5 text-right">
        {showDiff ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                min="0" step="0.01" autoFocus
                className="w-24 px-2 py-0.5 rounded border border-violet-500/40 bg-white/[0.05] text-sm text-white text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <span className="text-[10px] text-gray-500 whitespace-nowrap">/ {dollar(occ.montant_attendu)}</span>
            </div>
            {isPartial && (
              <div className="mt-1 space-y-1 text-right">
                <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">Soldes à venir</p>
                {soldeLines.map((line, i) => (
                  <div key={i} className="flex items-center justify-end gap-1">
                    <input
                      type="number" value={line.montant} placeholder="Montant"
                      min="0" step="0.01"
                      onChange={e => { const nl = [...soldeLines]; nl[i] = { ...nl[i], montant: e.target.value }; setSoldeLines(nl) }}
                      className="w-20 px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 text-right tabular-nums focus:outline-none"
                    />
                    <input
                      type="date" value={line.date}
                      onChange={e => { const nl = [...soldeLines]; nl[i] = { ...nl[i], date: e.target.value }; setSoldeLines(nl) }}
                      className="px-1 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-300 focus:outline-none"
                    />
                    {soldeLines.length > 1 && (
                      <button onClick={() => setSoldeLines(soldeLines.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 text-xs leading-none">×</button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setSoldeLines([...soldeLines, { montant: soldeReste > 0 ? String(Math.round(soldeReste * 100) / 100) : '', date: '' }])}
                  className="text-[10px] text-violet-400 hover:text-violet-300 font-medium"
                >+ Versement</button>
                {soldeReste !== 0 && (
                  <p className={cn('text-[10px] font-medium', soldeReste > 0 ? 'text-amber-400' : 'text-red-400')}>
                    {soldeReste > 0 ? `Non alloué : ${dollar(soldeReste)}` : `Excès : ${dollar(-soldeReste)}`}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="font-semibold text-white tabular-nums">{dollar(occ.montant_attendu)}</span>
        )}
      </td>

      <td className="px-4 py-2.5 text-right">
        {!showDiff ? (
          <div className="flex flex-col items-end gap-1">
            <button
              disabled={pending} onClick={handleMarquerExact}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
            >
              {pending ? '…' : <><CheckCircle2 size={11} /> Reçu — {dollar(occ.montant_attendu)}</>}
            </button>
            <button onClick={() => setShowDiff(true)} className="text-[11px] text-gray-600 hover:text-violet-400 transition-colors">
              Montant différent ▾
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleMarquerDiff}
              disabled={pending || !soldeValid}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={11} />
              {pending ? '…' : isPartial ? `Partiel + ${soldeLines.filter(l => l.date && Number(l.montant) > 0).length} solde${soldeLines.filter(l => l.date && Number(l.montant) > 0).length > 1 ? 's' : ''}` : 'Confirmer'}
            </button>
            <button
              onClick={() => { setShowDiff(false); setAmount(String(occ.montant_attendu)); setSoldeLines([{ montant: '', date: '' }]) }}
              className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
            >Annuler ✕</button>
          </div>
        )}
      </td>
    </tr>
  )
}

function OccTable({ occs, headerCls }: { occs: RecurrentsOcc[]; headerCls: string }) {
  if (occs.length === 0) {
    return <p className="text-sm text-gray-600 text-center py-6">Aucun versement</p>
  }
  const sorted = [...occs].sort((a, b) => a.date_attendue.localeCompare(b.date_attendue))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={cn('text-xs font-semibold uppercase tracking-wider', headerCls)}>
            <th className="px-4 py-2.5 text-left">Client</th>
            <th className="px-4 py-2.5 text-left">Closer</th>
            <th className="px-4 py-2.5 text-left">Méthode</th>
            <th className="px-4 py-2.5 text-left">Date attendue</th>
            <th className="px-4 py-2.5 text-right">Montant</th>
            <th className="px-4 py-2.5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {sorted.map(o => <OccRow key={o.id} occ={o} />)}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/[0.06] bg-white/[0.02]">
            <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</td>
            <td className="px-4 py-2.5 text-right font-bold text-white tabular-nums">
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

  function toggle(f: Filtre) { setOpen(prev => prev === f ? null : f) }

  const hasData = occsAujourdhui.length + occsRetard.length + occsSemaine.length + occsMois.length > 0
  if (!hasData) return null

  const CARDS = [
    {
      key:       'aujourd_hui' as const,
      icon:      Zap,
      label:     "Aujourd'hui",
      amount:    occsAujourdhui.reduce((s, o) => s + o.montant_attendu, 0),
      count:     occsAujourdhui.length,
      sub:       (n: number) => `${n} versement${n !== 1 ? 's' : ''} dû${n !== 1 ? 's' : ''} aujourd'hui`,
      danger:    occsAujourdhui.length > 0,
      occs:      occsAujourdhui,
      cardCls:   occsAujourdhui.length > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[#1e1f2e] border-white/[0.07]',
      openCls:   'bg-[#26201a] border-orange-500/30',
      headCls:   'border-b border-orange-500/20 bg-orange-500/5',
      headerCls: 'text-orange-500/60',
      amtCls:    occsAujourdhui.length > 0 ? 'text-orange-400' : 'text-gray-600',
      iconCls:   occsAujourdhui.length > 0 ? 'text-orange-400' : 'text-gray-700',
    },
    {
      key:       'semaine' as const,
      icon:      Clock,
      label:     'Cette semaine',
      amount:    occsSemaine.reduce((s, o) => s + o.montant_attendu, 0),
      count:     occsSemaine.length,
      sub:       (n: number) => `${n} versement${n !== 1 ? 's' : ''} attendu${n !== 1 ? 's' : ''}`,
      danger:    false,
      occs:      occsSemaine,
      cardCls:   'bg-[#1e1f2e] border-white/[0.07]',
      openCls:   'bg-[#242214] border-amber-500/30',
      headCls:   'border-b border-amber-500/20 bg-amber-500/5',
      headerCls: 'text-amber-500/60',
      amtCls:    occsSemaine.length > 0 ? 'text-white' : 'text-gray-600',
      iconCls:   'text-amber-500',
    },
    {
      key:       'mois' as const,
      icon:      Calendar,
      label:     'Ce mois-ci',
      amount:    occsMois.reduce((s, o) => s + o.montant_attendu, 0),
      count:     occsMois.length,
      sub:       (n: number) => `${n} versement${n !== 1 ? 's' : ''} à encaisser`,
      danger:    false,
      occs:      occsMois,
      cardCls:   'bg-[#1e1f2e] border-white/[0.07]',
      openCls:   'bg-[#1e1e30] border-violet-500/30',
      headCls:   'border-b border-violet-500/20 bg-violet-500/5',
      headerCls: 'text-violet-400/60',
      amtCls:    occsMois.length > 0 ? 'text-white' : 'text-gray-600',
      iconCls:   'text-violet-400',
    },
    {
      key:       'retard' as const,
      icon:      AlertTriangle,
      label:     'En retard',
      amount:    occsRetard.reduce((s, o) => s + o.montant_attendu, 0),
      count:     occsRetard.length,
      sub:       (n: number) => `${n} versement${n !== 1 ? 's' : ''} non reçu${n !== 1 ? 's' : ''}`,
      danger:    occsRetard.length > 0,
      occs:      occsRetard,
      cardCls:   occsRetard.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-[#1e1f2e] border-white/[0.07]',
      openCls:   'bg-[#26181a] border-red-500/30',
      headCls:   'border-b border-red-500/20 bg-red-500/5',
      headerCls: 'text-red-500/60',
      amtCls:    occsRetard.length > 0 ? 'text-red-400' : 'text-gray-600',
      iconCls:   occsRetard.length > 0 ? 'text-red-400' : 'text-gray-700',
    },
  ]

  const activeCard = open ? CARDS.find(c => c.key === open) : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CARDS.map(card => {
          const Icon   = card.icon
          const isOpen = open === card.key
          return (
            <button
              key={card.key}
              onClick={() => toggle(card.key)}
              className={cn(
                'rounded-2xl border shadow-xl p-4 text-left transition-all hover:shadow-2xl hover:-translate-y-0.5 cursor-pointer',
                isOpen ? card.openCls + ' ring-1 ring-white/10' : card.cardCls,
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={13} className={card.iconCls} />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</p>
                </div>
                <ChevronRight size={12} className={cn('text-gray-700 transition-transform', isOpen && 'rotate-90')} />
              </div>
              <p className={cn('text-2xl font-bold tabular-nums tracking-tight', card.amtCls)}>
                {card.count === 0 ? '—' : dollar(card.amount)}
              </p>
              <p className="text-xs text-gray-600 mt-1">{card.sub(card.count)}</p>
            </button>
          )
        })}
      </div>

      {activeCard && (
        <div className={cn('rounded-2xl border shadow-xl overflow-hidden', activeCard.openCls)}>
          <div className={cn('px-5 py-3 flex items-center justify-between', activeCard.headCls)}>
            <p className="text-sm font-semibold text-gray-300">
              {activeCard.label} — {activeCard.count} versement{activeCard.count !== 1 ? 's' : ''}
            </p>
            <Link
              href={`/recurrents?filtre=${activeCard.key}`}
              className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1"
              onClick={e => e.stopPropagation()}
            >
              Gérer <ChevronRight size={12} />
            </Link>
          </div>
          <OccTable occs={activeCard.occs} headerCls={activeCard.headerCls} />
        </div>
      )}
    </div>
  )
}
