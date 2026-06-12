export interface SuiviTask {
  type:       'suivi'
  followupId: string
  clientName: string
  messageNum: 1 | 2 | 3
  dueDate:    string
  done:       boolean
  doneDate:   string | null
  closerId:   string
  closerName: string
}

export interface VersementTask {
  type:         'versement'
  occurrenceId: string
  clientName:   string
  montant:      number
  dueDate:      string
  done:         boolean
  closerId:     string | null
  closerName?:  string
}

export type Task = SuiviTask | VersementTask

export type Period = 'today' | 'week' | 'overdue'

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function weekEnd(): string {
  const d = new Date()
  const dow = d.getDay()
  const sun = new Date(d)
  sun.setDate(d.getDate() + (dow === 0 ? 0 : 7 - dow))
  return sun.toISOString().split('T')[0]
}

export function classifyTask(dueDate: string, done: boolean, today: string, endOfWeek: string): Period | 'done' {
  if (done) return 'done'
  if (dueDate < today)   return 'overdue'
  if (dueDate === today) return 'today'
  if (dueDate <= endOfWeek) return 'week'
  return 'done' // future — not shown in todo
}

export function dollar(n: number): string {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

export function fmtDate(d: string): string {
  return new Date(d + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export interface ProspectTask {
  type:         'prospect'
  id:           string
  prospectName: string
  followupDate: string
  notes:        string | null
  done:         boolean
  doneDate:     string | null
  closerId:     string
  closerName:   string
}
