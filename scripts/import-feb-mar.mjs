// One-time import — Cash Collect Février et Mars 2026
// Run: node scripts/import-feb-mar.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const envPath = join(process.cwd(), '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const MOIS = {
  janvier:1, février:2, fevrier:2, mars:3, avril:4, mai:5, juin:6,
  juillet:7, août:8, aout:8, septembre:9, octobre:10, novembre:11,
  décembre:12, decembre:12,
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
  const month = MOIS[norm(parts[1])]
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
  let cur = '', inQ = false
  for (const ch of line) {
    if (ch === '"') inQ = !inQ
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
    else cur += ch
  }
  cols.push(cur.trim())
  return cols
}

const SKIP_KEYWORDS = [
  'total', 'taxes', 'workshop', 'sales agency', 'closer + setter', 'rev share',
  'non payé', 'name:', 'bonus', 'closer', 'setter',
]
function isSkipRow(cols) {
  const first = norm(cols[0] ?? '')
  return SKIP_KEYWORDS.some(k => first.startsWith(k))
}

const FILES = [
  { path: '/Users/sg/Desktop/DCA 2026 - Cash Collect - Février 2026.csv', year: 2026 },
  { path: '/Users/sg/Desktop/DCA 2026 - Cash Collect - Mars 2026.csv',    year: 2026 },
]

async function main() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name')
  if (pErr) throw pErr

  const nameMap = new Map()
  for (const p of profiles ?? []) {
    if (!p.full_name) continue
    const first = norm(p.full_name.split(/\s+/)[0])
    nameMap.set(first, p.id)
    nameMap.set(norm(p.full_name), p.id)
  }
  console.log(`Profils trouvés : ${profiles?.length ?? 0}`)

  const allEntries = []
  const unmatchedNames = new Set()

  function resolveId(name) {
    if (!name) return null
    const id = nameMap.get(norm(name.split(/\s+/)[0])) ?? nameMap.get(norm(name))
    if (!id && name.trim()) unmatchedNames.add(name.trim())
    return id ?? null
  }

  for (const { path, year: fileYear } of FILES) {
    const lines = readFileSync(path, 'utf8').split('\n')
    let section = null, headerFound = false, count = 0

    for (const line of lines) {
      const cols = parseCSVLine(line)
      const c0 = norm(cols[0] ?? '')

      if (c0.includes('new deals') || c0.includes('nouveau')) {
        section = 'nouveau'; headerFound = false; continue
      }
      if (c0 === 'récurrent' || c0 === 'recurrent' || c0.startsWith('récurrent :')) {
        section = 'récurrent'; headerFound = false; continue
      }
      if (!headerFound && c0 === 'date' && norm(cols[2] ?? '').includes('montant')) {
        if (!section) section = 'nouveau'
        headerFound = true; continue
      }
      if (!section || !headerFound) continue

      const dateStr      = cols[0]?.trim()
      const clientName   = cols[1]?.trim()
      const montantStr   = cols[2]?.trim()
      const collectedStr = cols[3]?.trim()
      const methode      = cols[4]?.trim() || null
      const setByName    = cols[5]?.trim() || null
      const closedByName = cols[6]?.trim() || null

      if (!dateStr || !clientName || !montantStr) continue
      if (isSkipRow(cols)) continue
      if (norm(clientName).startsWith('total') || norm(clientName).startsWith('financement')) continue

      const date = parseDate(dateStr, fileYear)
      if (!date) continue

      const montantCourant = parseAmount(montantStr)

      let collected
      if (section === 'récurrent') {
        const up = collectedStr?.toUpperCase()
        collected = up === 'TRUE' ? montantCourant : up === 'FALSE' ? 0 : parseFloat(collectedStr) || 0
      } else {
        collected = parseFloat(collectedStr) || 0
      }

      const [ey, em] = date.split('-').map(Number)

      const extras = [
        section === 'récurrent' ? 'Récurrent' : null,
        setByName    && !nameMap.get(norm(setByName.split(/\s+/)[0]))    ? `Setter: ${setByName}`    : null,
        closedByName && !nameMap.get(norm(closedByName.split(/\s+/)[0])) ? `Closer: ${closedByName}` : null,
        cols[7]?.trim() && !['CA$0.00', ''].includes(cols[7].trim()) ? cols[7].trim() : null,
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
    console.log(`${path.split('/').pop()}: ${count} entrées`)
  }

  console.log(`\nTotal à importer : ${allEntries.length} entrées`)
  if (unmatchedNames.size) {
    console.log('\nNoms sans profil (stockés dans notes) :')
    for (const n of [...unmatchedNames].sort()) console.log(`  - ${n}`)
  }

  let inserted = 0, errCount = 0
  for (let i = 0; i < allEntries.length; i += 100) {
    const batch = allEntries.slice(i, i + 100)
    const { error } = await supabase.from('cash_entries').insert(batch)
    if (error) { console.error(`Erreur batch:`, error.message); errCount += batch.length }
    else { inserted += batch.length; process.stdout.write(`\rInséré : ${inserted}/${allEntries.length}`) }
  }
  console.log(`\n\n✓ ${inserted} entrées insérées, ${errCount} erreurs.`)
}

main().catch(err => { console.error('✗', err.message); process.exit(1) })
