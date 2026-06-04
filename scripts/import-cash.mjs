// scripts/import-cash.mjs
// One-time import of historical cash collect data from CSV files
// Run: node scripts/import-cash.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── Load .env.local ──────────────────────────────────────────────────
const envPath = join(process.cwd(), '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── Month name → number ──────────────────────────────────────────────
const MOIS = {
  janvier:1, février:2, fevrier:2, mars:3, avril:4, mai:5, juin:6,
  juillet:7, août:8, aout:8, septembre:9, octobre:10, novembre:11,
  décembre:12, decembre:12,
  // English abbreviations (sometimes used)
  jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
}

function norm(s) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function parseDate(str, defaultYear) {
  if (!str) return null
  const parts = str.trim().split(/\s+/)
  if (parts.length < 2) return null
  const day = parseInt(parts[0])
  const monthKey = norm(parts[1])
  const month = MOIS[monthKey]
  const year = parts.length >= 3 ? parseInt(parts[parts.length - 1]) : defaultYear
  if (!day || !month || !year || year < 2020 || year > 2030) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseAmount(str) {
  if (!str) return 0
  const n = parseFloat(str.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

function parseCSVLine(line) {
  const cols = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') inQ = !inQ
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
    else cur += ch
  }
  cols.push(cur.trim())
  return cols
}

// ── Summary keywords to skip ─────────────────────────────────────────
const SKIP_KEYWORDS = [
  'total', 'taxes', 'sales agency', 'closer + setter', 'rev share',
  'non payé', 'financement (', 'name:', 'bonus', 'closer', 'setter',
]
function isSkipRow(cols) {
  const first = norm(cols[0] ?? '')
  return SKIP_KEYWORDS.some(k => first.startsWith(k))
}

// ── CSV files to import ──────────────────────────────────────────────
const FILES = [
  { path: '/Users/sg/Desktop/DCA 2026 - Cash Collect - Janvier 2026.csv', month: 1, year: 2026 },
  { path: '/Users/sg/Desktop/DCA 2026 - Cash Collect - Avril 2026.csv',   month: 4, year: 2026 },
  { path: '/Users/sg/Desktop/DCA 2026 - Cash Collect - Mai 2026.csv',     month: 5, year: 2026 },
  { path: '/Users/sg/Desktop/DCA 2026 - Cash Collect - Juin 2026.csv',    month: 6, year: 2026 },
]

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  // 1. Fetch existing profiles to map first names → UUIDs
  const { data: profiles, error: pErr } = await supabase
    .from('profiles').select('id, full_name')
  if (pErr) throw pErr

  const nameMap = new Map()
  for (const p of profiles ?? []) {
    if (!p.full_name) continue
    const firstName = norm(p.full_name.split(/\s+/)[0])
    nameMap.set(firstName, p.id)
    nameMap.set(norm(p.full_name), p.id)
  }
  console.log(`\nProfiles found: ${profiles?.length ?? 0}`)
  if (nameMap.size) console.log('  Names:', [...nameMap.keys()].join(', '))

  const allEntries = []
  const unmatchedNames = new Set()

  function resolveId(name) {
    if (!name) return null
    const n = norm(name.split(/\s+/)[0]) // match by first name
    const id = nameMap.get(n) ?? nameMap.get(norm(name))
    if (!id && name.trim()) unmatchedNames.add(name.trim())
    return id ?? null
  }

  // 2. Parse each CSV file
  for (const { path, month: fileMonth, year: fileYear } of FILES) {
    const content = readFileSync(path, 'utf8')
    const lines = content.split('\n')

    let section = null
    let headerFound = false
    let count = 0

    for (const line of lines) {
      const cols = parseCSVLine(line)
      const c0 = norm(cols[0] ?? '')

      // Detect section headers
      if (c0.includes('new deals') || c0.includes('nouveau')) {
        section = 'nouveau'; headerFound = false; continue
      }
      if (c0 === 'récurrent' || c0 === 'recurrent' || c0.startsWith('récurrent :') || c0.startsWith('recurrent :')) {
        section = 'récurrent'; headerFound = false; continue
      }

      // Detect column header row — also auto-start 'nouveau' if no section header found
      if (!headerFound && c0 === 'date' && norm(cols[2] ?? '').includes('montant')) {
        if (!section) section = 'nouveau'
        headerFound = true; continue
      }

      if (!section || !headerFound) continue

      const dateStr   = cols[0]?.trim()
      const clientName = cols[1]?.trim()
      const montantStr = cols[2]?.trim()
      const collectedStr = cols[3]?.trim()
      const methode   = cols[4]?.trim() || null
      const setByName = cols[5]?.trim() || null
      const closedByName = cols[6]?.trim() || null

      // Skip empty or summary rows
      if (!dateStr || !clientName || !montantStr) continue
      if (isSkipRow(cols)) continue
      if (clientName.toLowerCase().startsWith('total') || clientName.toLowerCase().startsWith('financement')) continue

      const date = parseDate(dateStr, fileYear)
      if (!date) continue

      const montantCourant = parseAmount(montantStr)
      if (montantCourant === 0 && !clientName) continue

      let collected
      if (section === 'récurrent') {
        const up = collectedStr?.toUpperCase()
        if (up === 'TRUE')  collected = montantCourant
        else if (up === 'FALSE') collected = 0
        else collected = parseFloat(collectedStr) || 0
      } else {
        collected = parseFloat(collectedStr) || 0
      }

      // Derive month/year from parsed date
      const [ey, em] = date.split('-').map(Number)

      // Build notes: preserve unmatched names + any context in col 7
      const extras = [
        section === 'récurrent' ? 'Récurrent' : null,
        setByName  && !nameMap.get(norm(setByName.split(/\s+/)[0]))  ? `Setter: ${setByName}`   : null,
        closedByName && !nameMap.get(norm(closedByName.split(/\s+/)[0])) ? `Closer: ${closedByName}` : null,
        cols[7]?.trim() && cols[7].trim() !== 'CA$0.00' && cols[7].trim() !== '' ? cols[7].trim() : null,
      ].filter(Boolean)

      allEntries.push({
        entry_date:      date,
        client_name:     clientName,
        montant_courant: montantCourant,
        collected,
        methode,
        set_by:    resolveId(setByName),
        closed_by: resolveId(closedByName),
        month: em,
        year:  ey,
        notes: extras.length ? extras.join(' | ') : null,
      })
      count++
    }

    console.log(`\n${path.split('/').pop()}: ${count} entrées parsées`)
  }

  console.log(`\n── Total à importer : ${allEntries.length} entrées ──`)
  if (unmatchedNames.size) {
    console.log(`\nNoms sans profil (stored in notes) :`)
    for (const n of [...unmatchedNames].sort()) console.log(`  - ${n}`)
    console.log('\n  → Invite ces membres via /admin pour lier les données à leurs comptes.')
  }

  // 3. Insert in batches of 100
  let inserted = 0
  let errCount = 0

  for (let i = 0; i < allEntries.length; i += 100) {
    const batch = allEntries.slice(i, i + 100)
    const { error } = await supabase.from('cash_entries').insert(batch)
    if (error) {
      console.error(`Erreur batch ${Math.floor(i/100)+1}:`, error.message)
      errCount += batch.length
    } else {
      inserted += batch.length
      process.stdout.write(`\r  Inséré : ${inserted}/${allEntries.length}`)
    }
  }

  console.log(`\n\n✓ Import terminé — ${inserted} entrées insérées, ${errCount} erreurs.`)
}

main().catch(err => { console.error('\n✗', err.message); process.exit(1) })
