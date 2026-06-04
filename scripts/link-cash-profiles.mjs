// scripts/link-cash-profiles.mjs
// Run AFTER the team members have accepted their invitations.
// Links historical cash_entries (set_by / closed_by = NULL) to real profile UUIDs
// by matching first names stored in the notes field.
//
// Run: node scripts/link-cash-profiles.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync }  from 'fs'
import { join }          from 'path'

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

function norm(s) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

async function main() {
  // 1. Fetch all profiles
  const { data: profiles, error: pErr } = await db.from('profiles').select('id, full_name, role')
  if (pErr) throw pErr

  // Build first-name → id map
  const nameMap = new Map()
  for (const p of profiles ?? []) {
    if (!p.full_name) continue
    const first = norm(p.full_name.split(/\s+/)[0])
    nameMap.set(first, { id: p.id, role: p.role })
    nameMap.set(norm(p.full_name), { id: p.id, role: p.role })
  }

  console.log(`\nProfiles disponibles (${profiles?.length ?? 0}) :`)
  for (const p of profiles ?? []) {
    console.log(`  ${p.full_name} (${p.role})`)
  }

  // 2. Fetch all cash_entries where set_by or closed_by is NULL
  const { data: entries, error: eErr } = await db
    .from('cash_entries')
    .select('id, notes, set_by, closed_by')
    .or('set_by.is.null,closed_by.is.null')

  if (eErr) throw eErr
  console.log(`\nEntrées à lier : ${entries?.length ?? 0}`)

  let updated = 0
  let skipped = 0

  for (const entry of entries ?? []) {
    const notes = entry.notes ?? ''
    const updates: Record<string, string> = {}

    // Extract "Setter: Name" from notes
    const setterMatch = notes.match(/Setter:\s*([^|]+)/)
    if (setterMatch && !entry.set_by) {
      const name = setterMatch[1].trim()
      const found = nameMap.get(norm(name.split(/\s+/)[0])) ?? nameMap.get(norm(name))
      if (found) updates.set_by = found.id
    }

    // Extract "Closer: Name" from notes
    const closerMatch = notes.match(/Closer:\s*([^|]+)/)
    if (closerMatch && !entry.closed_by) {
      const name = closerMatch[1].trim()
      const found = nameMap.get(norm(name.split(/\s+/)[0])) ?? nameMap.get(norm(name))
      if (found) updates.closed_by = found.id
    }

    if (Object.keys(updates).length === 0) { skipped++; continue }

    const { error } = await db
      .from('cash_entries')
      .update(updates)
      .eq('id', entry.id)

    if (error) { console.error(`  Erreur sur ${entry.id}:`, error.message) }
    else updated++
  }

  console.log(`\n✓ ${updated} entrées liées aux profils`)
  console.log(`  ${skipped} entrées sans correspondance (membres pas encore invités)`)
}

main().catch(err => { console.error('\n✗', err.message); process.exit(1) })
