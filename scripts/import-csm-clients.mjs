// scripts/import-csm-clients.mjs
// Imports CSM clients from CSM.xlsx "Evolution Cliente" sheet into csm_clients table.
// Run: node scripts/import-csm-clients.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

// ── Load .env.local ─────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Excel serial → ISO date string ─────────────────────────────────
function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null
  // Excel epoch: Dec 30, 1899
  const ms = (serial - 25569) * 86400 * 1000
  return new Date(ms).toISOString().split('T')[0]
}

// ── Parse theory percentage ─────────────────────────────────────────
function parsePct(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Math.round(v * 100)
  if (typeof v === 'string') {
    const m = v.match(/(\d+)/)
    return m ? parseInt(m[1]) : null
  }
  return null
}

// ── Normalize payment type ──────────────────────────────────────────
function parsePayment(v) {
  if (!v) return null
  const s = v.toString().toLowerCase().trim()
  if (s.includes('pif')) return 'pif'
  if (s.includes('financement') || s.includes('finan')) return 'financement'
  if (s.includes('3')) return '3-vers'
  if (s.includes('2')) return '2-vers'
  if (s.includes('vers') || s.includes('1')) return '1-vers'
  return v.toString().trim()
}

// ── Parse boolean ───────────────────────────────────────────────────
function parseBool(v) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  return false
}

// ── Main ────────────────────────────────────────────────────────────
const wb = XLSX.readFile('/Users/sg/Downloads/CSM.xlsx')
const ws = wb.Sheets['Evolution Cliente']
const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
const rows = allRows.slice(1).filter(r => r && r[0]) // skip header, skip empty

console.log(`Importing ${rows.length} clients…`)

// Column mapping (from Evolution Cliente header):
// [0]  Noms
// [1]  Onboarding (notes text)
// [2]  DATE D'INSCRIPTION (serial → enrollment_date)
// [3]  M1 (serial → m1_date)
// [4]  Paiement
// [5]  Facture (bool → invoice_sent)
// [6]  Jour 7 (serial → text_j7_date; if present → text_j7_done=true)
// [7]  25% théorie (pct)
// [8]  M2 (serial → m2_date)
// [9]  Notes M2
// [10] Jour 21 (serial → text_j21_date)
// [11] Théorie 55% (pct — take max with [7])
// [12] Quiz (bool → quiz_setter_done)
// [13] M3 (serial → m3_date)
// [14] Notes M3
// [15] 3 semaines post-M3 (serial → text_j49_date)
// [16] Note (follow-up note — included in m3_notes)
// [17] M4 (serial → m4_date)
// [18] Notes M4
// [19] Cert.Setter (bool → cert_setter_done)
// [20] Opportunité (bool → opportunity_setter)
// [21] M5 (serial → m5_date)
// [22] Notes M5
// [23] Quiz Closing (bool → quiz_closer_done)
// [24] Cert. Closing (bool → cert_closer_done)
// [25] Opportunité (bool → opportunity_closer)

const records = rows.map(r => {
  const theoryA = parsePct(r[7])
  const theoryB = parsePct(r[11])
  const theoryPct = Math.max(theoryA ?? 0, theoryB ?? 0)

  const j7Date = excelDate(r[6])
  const j21Date = excelDate(r[10])
  const j49Date = excelDate(r[15])

  // m3 notes: combine cols 14 + 16 (3-week follow-up note)
  const m3Notes = [r[14], r[16]].filter(Boolean).join('\n\n---\n\n') || null

  const enrollmentDate = excelDate(r[2])
  if (!enrollmentDate) return null

  return {
    name:               r[0]?.toString().trim(),
    enrollment_date:    enrollmentDate,
    payment_type:       parsePayment(r[4]),
    invoice_sent:       parseBool(r[5]),
    onboarding_notes:   r[1]?.toString().trim() || null,
    m1_date:            excelDate(r[3]),
    m2_date:            excelDate(r[8]),
    m2_notes:           r[9]?.toString().trim() || null,
    m3_date:            excelDate(r[13]),
    m3_notes:           m3Notes,
    m4_date:            excelDate(r[17]),
    m4_notes:           r[18]?.toString().trim() || null,
    m5_date:            excelDate(r[21]),
    m5_notes:           r[22]?.toString().trim() || null,
    text_j7_done:       j7Date != null,
    text_j7_date:       j7Date,
    text_j21_done:      j21Date != null,
    text_j21_date:      j21Date,
    text_j49_done:      j49Date != null,
    text_j49_date:      j49Date,
    theory_pct:         theoryPct,
    quiz_setter_done:   parseBool(r[12]),
    cert_setter_done:   parseBool(r[19]),
    opportunity_setter: parseBool(r[20]),
    quiz_closer_done:   parseBool(r[23]),
    cert_closer_done:   parseBool(r[24]),
    opportunity_closer: parseBool(r[25]),
    status:             'active',
  }
}).filter(Boolean)

console.log(`Parsed ${records.length} valid records`)

// Insert in batches of 50
const BATCH = 50
let inserted = 0
for (let i = 0; i < records.length; i += BATCH) {
  const batch = records.slice(i, i + BATCH)
  const { error } = await supabase.from('csm_clients').insert(batch)
  if (error) {
    console.error(`Error at batch ${i}:`, error.message)
    process.exit(1)
  }
  inserted += batch.length
  console.log(`  ${inserted}/${records.length} inserted`)
}

console.log('Done!')
