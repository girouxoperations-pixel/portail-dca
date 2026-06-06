/**
 * Logique de périodes bi-hebdomadaires glissantes.
 * Toutes les périodes sont calculées depuis l'ancre PAYROLL_ANCHOR.
 * Chaque période dure 14 jours.
 */

import { MOIS_FR } from '@/lib/constants'

// Date de départ du premier cycle de paie
export const PAYROLL_ANCHOR = '2026-06-06'

function anchorDate() {
  return new Date(PAYROLL_ANCHOR + 'T00:00:00')
}

function formatRange(start: Date, end: Date): string {
  const sd = start.getDate()
  const ed = end.getDate()
  const sm = MOIS_FR[start.getMonth()]
  const em = MOIS_FR[end.getMonth()]
  const sy = start.getFullYear()
  const ey = end.getFullYear()

  if (sy === ey && start.getMonth() === end.getMonth()) {
    return `${sd}-${ed} ${sm} ${sy}`
  }
  if (sy === ey) {
    return `${sd} ${sm} – ${ed} ${em} ${sy}`
  }
  return `${sd} ${sm} ${sy} – ${ed} ${em} ${ey}`
}

function periodFor(dateStr: string) {
  const anchor = anchorDate()
  const d      = new Date(dateStr + 'T00:00:00')
  const days   = Math.floor((d.getTime() - anchor.getTime()) / 86400000)
  const idx    = Math.floor(days / 14)

  const start = new Date(anchor)
  start.setDate(start.getDate() + idx * 14)
  const end = new Date(start)
  end.setDate(end.getDate() + 13)

  return { idx, start, end, label: formatRange(start, end) }
}

export function periodLabel(entryDateStr: string): string {
  return periodFor(entryDateStr).label
}

export interface PeriodeItem {
  label: string
  month: number
  year:  number
  start: string
  end:   string
}

export function currentPeriode(now = new Date()): PeriodeItem {
  const p = periodFor(now.toISOString().split('T')[0])
  return {
    label: p.label,
    month: p.start.getMonth() + 1,
    year:  p.start.getFullYear(),
    start: p.start.toISOString().split('T')[0],
    end:   p.end.toISOString().split('T')[0],
  }
}

export function genPeriodes(now = new Date(), count = 10): PeriodeItem[] {
  const anchor  = anchorDate()
  const current = periodFor(now.toISOString().split('T')[0])
  const list: PeriodeItem[] = []

  for (let i = current.idx + 1; i >= current.idx - (count - 2); i--) {
    const start = new Date(anchor)
    start.setDate(start.getDate() + i * 14)
    const end = new Date(start)
    end.setDate(end.getDate() + 13)
    list.push({
      label: formatRange(start, end),
      month: start.getMonth() + 1,
      year:  start.getFullYear(),
      start: start.toISOString().split('T')[0],
      end:   end.toISOString().split('T')[0],
    })
  }
  return list
}
