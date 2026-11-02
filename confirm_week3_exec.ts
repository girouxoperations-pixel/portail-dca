import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://regpcbvbptmynandccnj.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: week3 } = await db.from('chasse_weeks').select('*').eq('week_number', 3).eq('month', 10).single()
  if (!week3) throw new Error('S3 introuvable')

  const { data: players } = await db.from('chasse_players').select('id, position, groupe, status, profile_id, profiles(full_name)')
  const playerMap = new Map((players ?? []).map(p => [p.id, p]))
  const activeSetters = (players ?? []).filter(p => p.groupe === 'setter' && p.status === 'active')

  // Cash S3
  const { data: entries } = await db
    .from('cash_entries')
    .select('closed_by, set_by, collected, close_type, notes, recurring_occurrences(recurring_deals(date_debut))')
    .gte('entry_date', week3.week_start).lte('entry_date', week3.week_end).eq('is_refunded', false)

  const closerCash: Record<string, number> = {}
  const setterCash: Record<string, number> = {}
  for (const e of entries ?? []) {
    if (e.close_type === 'recurring') {
      const occ = (e.recurring_occurrences as any)?.[0]
      const dateDebut = occ?.recurring_deals?.[0]?.date_debut
      if (!dateDebut || dateDebut < week3.week_start) continue
    } else {
      if (e.notes?.startsWith('Récurrent') || e.notes?.startsWith('Versement récurrent')) continue
    }
    if (e.closed_by) closerCash[e.closed_by] = (closerCash[e.closed_by] ?? 0) + (e.collected ?? 0)
    if (e.set_by)    setterCash[e.set_by]    = (setterCash[e.set_by]    ?? 0) + (e.collected ?? 0)
  }

  // ── Confirmer duels closers S3 ──
  const { data: duels3 } = await db.from('chasse_duels').select('*').eq('week_id', week3.id)
  for (const duel of duels3 ?? []) {
    const p1 = playerMap.get(duel.player1_id)
    const p2 = duel.player2_id ? playerMap.get(duel.player2_id) : null
    const cash1 = duel.player1_cash_override ?? (p1 ? (closerCash[p1.profile_id] ?? 0) : 0)
    const cash2 = duel.player2_cash_override ?? (p2 ? (closerCash[p2.profile_id] ?? 0) : 0)
    const winnerId = cash1 > cash2 ? duel.player1_id : cash2 > cash1 ? duel.player2_id : null
    const pts1 = cash1 > cash2 ? 1 : cash1 === cash2 ? 0.5 : 0
    const pts2 = cash2 > cash1 ? 1 : cash1 === cash2 ? 0.5 : 0
    const n1 = (p1?.profiles as any)?.full_name
    const n2 = (p2?.profiles as any)?.full_name ?? '?'
    console.log(`Duel: ${n1} (${cash1}$) vs ${n2} (${cash2}$) → ${pts1}/${pts2}`)
    await db.from('chasse_duels').update({ player1_cash_override: cash1, player2_cash_override: cash2, winner_id: winnerId, points_p1: pts1, points_p2: pts2, is_confirmed: true }).eq('id', duel.id)
  }

  // ── Setters S3 (1pt / 0.5pt / 0pt) ──
  const ranked = activeSetters
    .map(p => ({ playerId: p.id, cash: setterCash[p.profile_id] ?? 0, name: (p.profiles as any)?.full_name }))
    .sort((a, b) => b.cash - a.cash)
  for (let i = 0; i < ranked.length; i++) {
    const pts = i === 0 ? 1 : i === 1 ? 0.5 : 0
    console.log(`Setter #${i+1}: ${ranked[i].name} ${ranked[i].cash}$ → ${pts}pt`)
    await db.from('chasse_setter_results').upsert({
      week_id: week3.id, player_id: ranked[i].playerId,
      cash: ranked[i].cash, points: pts, rank: i + 1, is_confirmed: true,
    }, { onConflict: 'week_id,player_id' })
  }

  // ── Confirmer S3 ──
  await db.from('chasse_weeks').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', week3.id)
  console.log('✓ Semaine 3 confirmée')

  // ── Activer S4 + créer duels (A vs E, B vs D) ──
  const { data: week4 } = await db.from('chasse_weeks').select('*').eq('week_number', 4).eq('month', 10).single()
  if (!week4) throw new Error('S4 introuvable')
  if (week4.status !== 'pending') { console.log(`S4 déjà: ${week4.status}`); return }

  await db.from('chasse_weeks').update({ status: 'active' }).eq('id', week4.id)

  const activeClosers = (players ?? []).filter(p => p.groupe === 'closer' && p.status === 'active')
  const byPos = new Map(activeClosers.map(p => [p.position, p.id]))

  await db.from('chasse_duels').delete().eq('week_id', week4.id)
  const inserts = [
    { week_id: week4.id, groupe: 'closer', player1_id: byPos.get('A')!, player2_id: byPos.get('E')!, is_cerf: false, cerf_target: null },
    { week_id: week4.id, groupe: 'closer', player1_id: byPos.get('B')!, player2_id: byPos.get('D')!, is_cerf: false, cerf_target: null },
  ].filter(d => d.player1_id && d.player2_id)

  for (const ins of inserts) {
    const p1 = activeClosers.find(p => p.id === ins.player1_id)
    const p2 = activeClosers.find(p => p.id === ins.player2_id)
    console.log(`Duel S4: ${(p1?.profiles as any)?.full_name} vs ${(p2?.profiles as any)?.full_name}`)
  }

  const { error } = await db.from('chasse_duels').insert(inserts)
  if (error) throw error
  console.log('✓ Semaine 4 activée')
}
main().catch(console.error)
