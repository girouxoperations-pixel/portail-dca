'use server'

import { revalidatePath }    from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── helpers ──────────────────────────────────────────────────────────────

const FR_MONTHS: Record<string, string> = {
  janvier: '01', jan: '01', janv: '01',
  février: '02', fevrier: '02', fév: '02', fev: '02',
  mars: '03', mar: '03',
  avril: '04', avr: '04',
  mai: '05',
  juin: '06',
  juillet: '07', juil: '07',
  août: '08', aout: '08',
  septembre: '09', sep: '09', sept: '09',
  octobre: '10', oct: '10',
  novembre: '11', nov: '11',
  décembre: '12', decembre: '12', déc: '12', dec: '12',
}

function smartYear(month: string, day: string): string {
  const now = new Date()
  const currentYear = now.getFullYear()
  const candidate = new Date(`${currentYear}-${month}-${day}T00:00`)
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() + 2)
  // If more than 2 months in the future, assume last year
  return candidate > cutoff ? String(currentYear - 1) : String(currentYear)
}

function parseDate(raw: string | undefined | null): string | null {
  if (!raw || !raw.trim()) return null
  const s = raw.trim().replace(/\./g, '') // remove trailing dots (nov. → nov)

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`

  // French: "1 février" or "1 février 2026"
  const frFull = s.toLowerCase().match(/^(\d{1,2})\s+([a-zéûôàèùâêîœç]+)\s*(\d{4})?$/)
  if (frFull) {
    const [, d, mRaw, y] = frFull
    const m = FR_MONTHS[mRaw.replace(/[éè]/g, 'e').replace('û', 'u').replace('â', 'a')] ?? FR_MONTHS[mRaw]
    if (m) {
      const day = d.padStart(2, '0')
      const year = y ?? smartYear(m, day)
      return `${year}-${m}-${day}`
    }
  }

  // Try native Date parsing as last resort
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]

  return null
}

function normalizePaymentType(raw: string | undefined | null): string | null {
  if (!raw || !raw.trim()) return null
  const s = raw.trim().toLowerCase().replace(/\s+/g, '-')
  if (s === 'pif') return 'pif'
  if (s === '2-vers' || s === '2vers') return '2-vers'
  if (s === '3-vers' || s === '3vers') return '3-vers'
  if (s.startsWith('fin')) return 'financement'
  return s
}

function parseBool(raw: string | undefined | null): boolean {
  if (!raw) return false
  const s = raw.trim().toLowerCase()
  return ['oui', 'yes', '1', 'true', '✓', 'x', 'vrai'].includes(s)
}

function parseNum(raw: string | undefined | null): number {
  if (!raw) return 0
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
}

// Normalize column name: remove quotes, trim, normalize apostrophes
function normalizeKey(k: string): string {
  return k.trim().replace(/[‘’ʼ]/g, "'").replace(/^["']|["']$/g, '')
}

function get(row: Record<string, string>, ...keys: string[]): string | undefined {
  const normalized: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) normalized[normalizeKey(k)] = v
  for (const key of keys) {
    const nk = normalizeKey(key)
    if (normalized[nk] !== undefined) return normalized[nk]
  }
  return undefined
}

// ── main action ───────────────────────────────────────────────────────────

export async function importCsmClients(rows: Record<string, string>[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'csm'].includes(profile.role)) throw new Error('Forbidden')

  const db = createAdminClient()

  const records = rows
    .filter(r => (get(r, 'Noms', 'Nom', 'name') ?? '').trim().length > 0)
    .map(r => {
      const name = (get(r, 'Noms', 'Nom', 'name') ?? '').trim()

      const rawDate = get(r, "DATE D'INSCRIPTION", "DATE D’INSCRIPTION", 'Date inscription', 'enrollment_date', 'Date')
      const enrollment_date = parseDate(rawDate) ?? new Date().toISOString().split('T')[0]

      const pcts = [
        parseNum(get(r, '25% théorie', '25% Théorie')),
        parseNum(get(r, 'Théorie 55%', 'Théorie 55')),
        parseNum(get(r, 'theory_pct', 'Théorie', 'Theorie')),
      ]
      const theory_pct = Math.max(...pcts)

      return {
        name,
        enrollment_date,
        payment_type:     normalizePaymentType(get(r, 'Paiement', 'payment_type')),
        invoice_sent:     parseBool(get(r, 'Facture', 'invoice_sent')),
        onboarding_notes: get(r, 'Onboarding', 'onboarding_notes')?.trim() || null,

        m1_date:  parseDate(get(r, 'M1', 'm1_date')),
        m1_notes: get(r, 'Notes M1', 'm1_notes')?.trim() || null,
        m1_missed: false,

        m2_date:  parseDate(get(r, 'M2', 'm2_date')),
        m2_notes: get(r, 'Notes M2', 'm2_notes')?.trim() || null,
        m2_missed: false,

        m3_date:  parseDate(get(r, 'M3', 'm3_date')),
        m3_notes: get(r, 'Notes M3', 'm3_notes')?.trim() || null,
        m3_missed: false,

        m4_date:  parseDate(get(r, 'M4', 'm4_date')),
        m4_notes: get(r, 'Notes M4', 'm4_notes')?.trim() || null,
        m4_missed: false,

        text_j7_done:  parseBool(get(r, 'Jour 7', 'text_j7_done')),
        text_j7_date:  parseDate(get(r, 'Jour 7 date', 'text_j7_date')),
        text_j49_done: parseBool(get(r, 'J+49', 'text_j49_done')),
        text_j49_date: parseDate(get(r, 'J+49 date', 'text_j49_date')),
        text_j63_done: parseBool(get(r, 'J+63', 'text_j63_done')),
        text_j63_date: parseDate(get(r, 'J+63 date', 'text_j63_date')),
        text_j77_done: parseBool(get(r, 'J+77', 'text_j77_done')),
        text_j77_date: parseDate(get(r, 'J+77 date', 'text_j77_date')),
        text_j90_done: parseBool(get(r, 'J+90', '3 semaines', 'text_j90_done')),
        text_j90_date: parseDate(get(r, 'J+90 date', 'text_j90_date')),

        theory_pct,
        quiz_setter_done:   parseBool(get(r, 'Quiz', 'quiz_setter_done')),
        cert_setter_done:   parseBool(get(r, 'Cert.Setter', 'Cert. Setter', 'cert_setter_done')),
        opportunity_setter: parseBool(get(r, 'Opportunité', 'opportunity_setter')),
        theory_closer_done: parseBool(get(r, 'Théorie Closing', 'theory_closer_done')),
        quiz_closer_done:   parseBool(get(r, 'Quiz Closing', 'quiz_closer_done')),
        cert_closer_done:   parseBool(get(r, 'Cert. Closing', 'Cert.Closing', 'cert_closer_done')),
        opportunity_closer: parseBool(get(r, 'Opportunité Closing', 'opportunity_closer')),

        circle_last_login: parseDate(get(r, 'circle_last_login')),
        notes: get(r, 'Note', 'Notes', 'notes')?.trim() || null,
        status: 'active' as const,
      }
    })

  if (records.length === 0) throw new Error('Aucun enregistrement valide trouvé')

  const { error } = await db.from('csm_clients').insert(records)
  if (error) throw error

  revalidatePath('/csm')
  return { count: records.length }
}

export async function deleteAllCsmClients() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') throw new Error('Forbidden')

  const db = createAdminClient()
  const { error } = await db.from('csm_clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
  revalidatePath('/csm')
}
