export interface CsmClient {
  id:                  string
  name:                string
  enrollment_date:     string
  payment_type:        string | null
  invoice_sent:        boolean
  onboarding_notes:    string | null
  onboarding_date:     string | null
  m1_date:             string | null
  m1_notes:            string | null
  m1_missed:           boolean
  m2_date:             string | null
  m2_notes:            string | null
  m2_missed:           boolean
  m3_date:             string | null
  m3_notes:            string | null
  m3_missed:           boolean
  m4_date:             string | null
  m4_notes:            string | null
  m4_missed:           boolean
  text_j7_done:        boolean
  text_j7_date:        string | null
  text_j24_done:       boolean
  text_j24_date:       string | null
  text_j49_done:       boolean
  text_j49_date:       string | null
  text_j63_done:       boolean
  text_j63_date:       string | null
  text_j77_done:       boolean
  text_j77_date:       string | null
  text_j90_done:       boolean
  text_j90_date:       string | null
  theory_pct:          number
  quiz_setter_done:    boolean
  cert_setter_done:    boolean
  opportunity_setter:  boolean
  theory_closer_done:  boolean
  quiz_closer_done:    boolean
  cert_closer_done:    boolean
  opportunity_closer:  boolean
  circle_last_login:   string | null
  email_avis:          '1er_avis' | '2e_avis' | '3e_avis' | 'mise_en_demeure' | 'out' | null
  status:              'active' | 'paused' | 'eval_failed' | 'completed' | 'dropped' | 'refund'
  notes:               string | null
  created_at:          string
}

export interface CsmDueDates {
  j7:  string
  j24: string
  j49: string
  j63: string
  j77: string
  j90: string
}

// J+7 uses onboardingDate if provided, all others use enrollmentDate
export function computeDueDates(enrollmentDate: string, onboardingDate?: string | null): CsmDueDates {
  function wd(days: number, base: string): string {
    const d = new Date(base + 'T00:00')
    d.setDate(d.getDate() + days)
    const dow = d.getDay()
    if (dow === 0) d.setDate(d.getDate() + 1) // Sun -> Mon
    if (dow === 6) d.setDate(d.getDate() + 2) // Sat -> Mon
    return d.toISOString().split('T')[0]
  }
  const j7Base = onboardingDate || enrollmentDate
  return {
    j7:  wd(7,  j7Base),
    j24: wd(24, enrollmentDate),
    j49: wd(49, enrollmentDate),
    j63: wd(63, enrollmentDate),
    j77: wd(77, enrollmentDate),
    j90: wd(90, enrollmentDate),
  }
}

// Color for a date cell: red = today, green = past, yellow = future, null = no date
export function dateColor(dateStr: string | null, todayStr: string): 'red' | 'green' | 'yellow' | 'none' {
  if (!dateStr) return 'none'
  if (dateStr === todayStr) return 'red'
  if (dateStr < todayStr)  return 'green'
  return 'yellow'
}

// Color for a text/check-in milestone
export function textMilestoneColor(
  done: boolean,
  dueDate: string,
  todayStr: string,
): 'green' | 'red' | 'yellow' | 'gray' {
  if (done) return 'green'
  if (dueDate < todayStr) return 'red'   // overdue
  if (dueDate === todayStr) return 'red' // today
  return 'yellow'                         // future
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
