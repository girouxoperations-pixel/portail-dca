const QC_TZ = 'America/Toronto'

/** Returns { year, month, day } for the current moment in Québec time. */
export function nowQC(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: QC_TZ,
    year:  'numeric',
    month: '2-digit',
    day:   '2-digit',
  }).formatToParts(new Date())
  return {
    year:  Number(parts.find(p => p.type === 'year') ?.value ?? 0),
    month: Number(parts.find(p => p.type === 'month')?.value ?? 0),
    day:   Number(parts.find(p => p.type === 'day')  ?.value ?? 0),
  }
}

/** Current date in Québec timezone as YYYY-MM-DD string. */
export function todayQC(): string {
  const { year, month, day } = nowQC()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * A Date object whose calendar fields (getFullYear / getMonth / getDate / getDay)
 * reflect the current Québec date — safe for date arithmetic on the server.
 */
export function dateQC(): Date {
  const { year, month, day } = nowQC()
  return new Date(year, month - 1, day)
}
