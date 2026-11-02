import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://regpcbvbptmynandccnj.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function main() {
  // 1. État des semaines
  const { data: weeks } = await db.from('chasse_weeks').select('*').order('week_number')
  console.log('\n── Semaines ──')
  for (const w of weeks ?? []) console.log(`  S${w.week_number} (${w.week_start}→${w.week_end}): ${w.status}`)

  // 2. Semaine 3 active
  const week3 = (weeks ?? []).find(w => w.week_number === 3 && w.month === 10)
  if (!week3) throw new Error('Semaine 3 introuvable')
  console.log(`\nSemaine 3: ${week3.id} (${week3.status})`)

  // 3. Joueurs
  const { data: players } = await db.from('chasse_players').select('id, position, groupe, status, profile_id, profiles(full_name)')
  const playerMap = new Map((players ?? []).map(p => [p.id, p]))
  const activeClosers = (players ?? []).filter(p => p.groupe === 'closer' && p.status === 'active')
  const activeSetters = (players ?? []).filter(p => p.groupe === 'setter' && p.status === 'active')

  console.log('\n── Closers actifs ──')
  for (const p of activeClosers) console.log(`  ${p.position}: ${(p.profiles as any)?.full_name} (${p.profile_id})`)

  // 4. Cash semaine 3
  const WEEK_START = week3.week_start
  const WEEK_END   = week3.week_end
  console.log(`\nCash: ${WEEK_START} → ${WEEK_END}`)

  const { data: entries } = await db
    .from('cash_entries')
    .select('closed_by, set_by, collected, close_type, notes, recurring_occurrences(recurring_deals(date_debut))')
    .gte('entry_date', WEEK_START)
    .lte('entry_date', WEEK_END)
    .eq('is_refunded', false)

  const closerCash: Record<string, number> = {}
  const setterCash: Record<string, number> = {}
  for (const e of entries ?? []) {
    if (e.close_type === 'recurring') {
      const occ = (e.recurring_occurrences as any)?.[0]
      const dateDebut = occ?.recurring_deals?.[0]?.date_debut
      if (!dateDebut || dateDebut < WEEK_START) continue
    } else {
      if (e.notes?.startsWith('Récurrent') || e.notes?.startsWith('Versement récurrent')) continue
    }
    if (e.closed_by) closerCash[e.closed_by] = (closerCash[e.closed_by] ?? 0) + (e.collected ?? 0)
    if (e.set_by)    setterCash[e.set_by]    = (setterCash[e.set_by]    ?? 0) + (e.collected ?? 0)
  }

  console.log('\n── Cash closers ──')
  for (const [pid, cash] of Object.entries(closerCash)) {
    const name = activeClosers.find(p => p.profile_id === pid)
    console.log(`  ${(name?.profiles as any)?.full_name ?? pid}: ${cash.toFixed(0)}$`)
  }
  console.log('\n── Cash setters ──')
  for (const p of activeSetters) {
    const cash = setterCash[p.profile_id] ?? 0
    console.log(`  ${(p.profiles as any)?.full_name}: ${cash.toFixed(0)}$`)
  }

  // 5. Duels semaine 3
  const { data: duels3 } = await db.from('chasse_duels').select('*').eq('week_id', week3.id)
  console.log('\n── Duels S3 ──')
  for (const d of duels3 ?? []) {
    const p1 = playerMap.get(d.player1_id)
    const p2 = d.player2_id ? playerMap.get(d.player2_id) : null
    console.log(`  ${(p1?.profiles as any)?.full_name} vs ${d.is_cerf ? 'Cerf' : ((p2?.profiles as any)?.full_name ?? 'null')} — confirmed: ${d.is_confirmed}`)
  }

  // 6. Duels S1/S2 pour voir le pattern
  const week1 = (weeks ?? []).find(w => w.week_number === 1 && w.month === 10)
  const week2 = (weeks ?? []).find(w => w.week_number === 2 && w.month === 10)
  for (const [label, wk] of [['S1', week1], ['S2', week2]] as [string, typeof week1][]) {
    if (!wk) continue
    const { data: dd } = await db.from('chasse_duels').select('*').eq('week_id', wk.id).eq('groupe', 'closer')
    console.log(`\n── Duels ${label} (closers) ──`)
    for (const d of dd ?? []) {
      const p1 = playerMap.get(d.player1_id)
      const p2 = d.player2_id ? playerMap.get(d.player2_id) : null
      console.log(`  ${(p1?.profiles as any)?.full_name} (${p1?.position}) vs ${d.is_cerf ? 'Cerf' : ((p2?.profiles as any)?.full_name ?? 'null')} (${p2?.position ?? '—'})`)
    }
  }
}
main().catch(console.error)
