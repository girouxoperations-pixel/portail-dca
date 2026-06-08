'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Periode = 'semaine' | 'mois' | 'trimestre' | 'annee' | 'personnalise'

export interface DateRange {
  start: string
  end:   string
  label: string
}

const MOIS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
const MOIS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setHours(0, 0, 0, 0)
  m.setDate(d.getDate() + diff)
  return m
}

function formatCustomLabel(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const sameYear = s.getFullYear() === e.getFullYear()
  return sameYear
    ? `${s.getDate()} ${MOIS[s.getMonth()]} – ${e.getDate()} ${MOIS[e.getMonth()]} ${e.getFullYear()}`
    : `${s.getDate()} ${MOIS[s.getMonth()]} ${s.getFullYear()} – ${e.getDate()} ${MOIS[e.getMonth()]} ${e.getFullYear()}`
}

export function computeRange(periode: Periode, offset: number): DateRange {
  const now = new Date()

  if (periode === 'semaine') {
    const monday = getMonday(now)
    monday.setDate(monday.getDate() + offset * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const sameYear = monday.getFullYear() === sunday.getFullYear()
    const label = sameYear
      ? `${monday.getDate()} ${MOIS[monday.getMonth()]} – ${sunday.getDate()} ${MOIS[sunday.getMonth()]} ${sunday.getFullYear()}`
      : `${monday.getDate()} ${MOIS[monday.getMonth()]} ${monday.getFullYear()} – ${sunday.getDate()} ${MOIS[sunday.getMonth()]} ${sunday.getFullYear()}`
    return { start: toISO(monday), end: toISO(sunday), label }
  }

  if (periode === 'mois') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return {
      start: toISO(d),
      end:   toISO(end),
      label: `${MOIS_LONG[d.getMonth()]} ${d.getFullYear()}`,
    }
  }

  if (periode === 'trimestre') {
    const currentQ = Math.floor(now.getMonth() / 3) + offset
    const year = now.getFullYear() + Math.floor(currentQ / 4)
    const q = ((currentQ % 4) + 4) % 4
    const startMonth = q * 3
    const start = new Date(year, startMonth, 1)
    const end   = new Date(year, startMonth + 3, 0)
    return {
      start: toISO(start),
      end:   toISO(end),
      label: `T${q + 1} ${year}`,
    }
  }

  if (periode === 'annee') {
    const year = now.getFullYear() + offset
    return { start: `${year}-01-01`, end: `${year}-12-31`, label: `${year}` }
  }

  // personnalise — placeholder, overridden by hook
  const today = toISO(now)
  return { start: today, end: today, label: 'Personnalisé' }
}

export function computePrevRange(periode: Periode, offset: number, currentRange: DateRange): DateRange {
  if (periode === 'personnalise' && currentRange.start && currentRange.end) {
    const startMs = new Date(currentRange.start + 'T00:00:00').getTime()
    const endMs   = new Date(currentRange.end   + 'T00:00:00').getTime()
    const duration = endMs - startMs
    const prevEnd   = new Date(startMs - 86400000)
    const prevStart = new Date(prevEnd.getTime() - duration)
    return {
      start: toISO(prevStart),
      end:   toISO(prevEnd),
      label: formatCustomLabel(toISO(prevStart), toISO(prevEnd)),
    }
  }
  return computeRange(periode, offset - 1)
}

// ── Hook ──────────────────────────────────────────────────────────────

export function usePeriodFilter(initialPeriode: Periode = 'mois') {
  const [periode,     setPeriode]     = useState<Periode>(initialPeriode)
  const [offset,      setOffset]      = useState(0)
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')

  const range = useMemo((): DateRange => {
    if (periode === 'personnalise') {
      if (customStart && customEnd && customStart <= customEnd) {
        return { start: customStart, end: customEnd, label: formatCustomLabel(customStart, customEnd) }
      }
      return { start: '', end: '', label: 'Choisir les dates' }
    }
    return computeRange(periode, offset)
  }, [periode, offset, customStart, customEnd])

  function onChange(p: Periode, o: number) {
    setPeriode(p)
    setOffset(o)
  }

  function onCustomRange(start: string, end: string) {
    setCustomStart(start)
    setCustomEnd(end)
    setPeriode('personnalise')
  }

  return { periode, offset, range, onChange, onCustomRange, customStart, customEnd }
}

// ── Helpers ────────────────────────────────────────────────────────────

function weekOffsetFromDate(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const nowMonday = getMonday(new Date())
  const targetMonday = getMonday(target)
  const diff = targetMonday.getTime() - nowMonday.getTime()
  return Math.round(diff / (7 * 24 * 60 * 60 * 1000))
}

function mondayOfRange(periode: Periode, offset: number): string {
  if (periode !== 'semaine') return ''
  const monday = getMonday(new Date())
  monday.setDate(monday.getDate() + offset * 7)
  return toISO(monday)
}

// ── Component ─────────────────────────────────────────────────────────

const PERIODES: { value: Periode; label: string }[] = [
  { value: 'semaine',      label: 'Semaine'  },
  { value: 'mois',         label: 'Mois'     },
  { value: 'trimestre',    label: 'Trimestre'},
  { value: 'annee',        label: 'Année'    },
  { value: 'personnalise', label: 'Perso.'   },
]

interface Props {
  periode:       Periode
  offset:        number
  onChange:      (periode: Periode, offset: number) => void
  customStart?:  string
  customEnd?:    string
  onCustomRange?: (start: string, end: string) => void
}

export default function PeriodFilter({
  periode, offset, onChange, customStart = '', customEnd = '', onCustomRange,
}: Props) {
  const isCustom = periode === 'personnalise'

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Segmented control */}
      <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
        {PERIODES.map(p => (
          <button
            key={p.value}
            onClick={() => onChange(p.value, 0)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              periode === p.value
                ? 'bg-white text-violet-700 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range inputs */}
      {isCustom && (
        <div className="flex items-center gap-2 bg-white border border-violet-200 rounded-lg px-3 py-1.5">
          <Calendar size={13} className="text-violet-500 shrink-0" />
          <input
            type="date"
            value={customStart}
            onChange={e => onCustomRange?.(e.target.value, customEnd)}
            className="text-xs text-gray-700 border-0 bg-transparent focus:outline-none w-[118px]"
          />
          <span className="text-gray-300 text-xs">→</span>
          <input
            type="date"
            value={customEnd}
            min={customStart || undefined}
            onChange={e => onCustomRange?.(customStart, e.target.value)}
            className="text-xs text-gray-700 border-0 bg-transparent focus:outline-none w-[118px]"
          />
        </div>
      )}

      {/* Navigation (hidden for custom) */}
      {!isCustom && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(periode, offset - 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Période précédente"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center select-none">
            {computeRange(periode, offset).label}
          </span>
          <button
            onClick={() => onChange(periode, offset + 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Période suivante"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Jump-to-date for semaine mode */}
      {periode === 'semaine' && (
        <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors" title="Aller à une semaine spécifique">
          <Calendar size={14} />
          <input
            type="date"
            value={mondayOfRange(periode, offset)}
            onChange={e => {
              if (!e.target.value) return
              onChange('semaine', weekOffsetFromDate(e.target.value))
            }}
            className="text-xs text-gray-600 border-0 bg-transparent focus:outline-none cursor-pointer w-[120px]"
          />
        </label>
      )}
    </div>
  )
}
