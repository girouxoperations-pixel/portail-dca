'use server'

import { revalidatePath }    from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculerDuel, calculerCerf, classerJoueuses, cashEffectif, type PlayerScore } from '@/lib/chasse/engine'
import type { ChassConfig, Player, WeekConfig, Duel } from '@/lib/chasse/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: p } = await supabase.from('profiles').select('roles,role').eq('id', user.id).single()
  const roles = (p?.roles ?? [p?.role ?? '']) as string[]
  if (!roles.some(r => ['admin','csm','head_csm'].includes(r))) throw new Error('Non autorisé')
  return user.id
}

// ── Lecture config ────────────────────────────────────────────────────

export async function getChassData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profil } = await supabase.from('profiles').select('roles,role,full_name').eq('id', user.id).single()
  const roles = (profil?.roles ?? [profil?.role ?? '']) as string[]
  const isAdmin = roles.some(r => ['admin','csm','head_csm'].includes(r))

  const db = createAdminClient()

  const [
    { data: config },
    { data: players },
    { data: weeks },
    { data: duels },
    { data: monthlyResults },
  ] = await Promise.all([
    db.from('chasse_config').select('*').single(),
    db.from('chasse_players').select('*, profiles(full_name, role)').order('created_at'),
    db.from('chasse_weeks').select('*').order('week_number'),
    db.from('chasse_duels').select('*').order('created_at'),
    db.from('chasse_monthly_results').select('*').order('month').order('rank'),
  ])

  return { config, players, weeks, duels, monthlyResults, isAdmin, userId: user.id }
}

// ── Cash depuis cash_entries pour une semaine ─────────────────────────

export async function getCashJoueuses(weekStart: string, weekEnd: string): Promise<{
  closerCash: Record<string, number>
  setterCash: Record<string, number>
}> {
  const db = createAdminClient()

  const { data: entries } = await db
    .from('cash_entries')
    .select('closed_by, set_by, collected, close_type, notes, recurring_occurrences(recurring_deals(date_debut))')
    .gte('entry_date', weekStart)
    .lte('entry_date', weekEnd)
    .eq('is_refunded', false)

  const closerCash: Record<string, number> = {}
  const setterCash: Record<string, number> = {}

  for (const e of entries ?? []) {
    if (e.close_type === 'recurring') {
      // Include only if the deal started during this week (new sale installments)
      const occ = (e.recurring_occurrences as unknown as { recurring_deals: { date_debut: string }[] | null }[] | null)?.[0]
      const dealDateDebut = occ?.recurring_deals?.[0]?.date_debut
      if (!dealDateDebut || dealDateDebut < weekStart) continue
    } else {
      // Legacy note-based filter for non-recurring entries
      if (e.notes?.startsWith('Récurrent') || e.notes?.startsWith('Versement récurrent')) continue
    }

    if (e.closed_by) closerCash[e.closed_by] = (closerCash[e.closed_by] ?? 0) + (e.collected ?? 0)
    if (e.set_by)    setterCash[e.set_by]    = (setterCash[e.set_by]    ?? 0) + (e.collected ?? 0)
  }

  return { closerCash, setterCash }
}

// ── Breakdown détaillé du cash d'une joueuse pour une semaine ─────────

export interface CashBreakdownEntry {
  id:          string
  client_name: string | null
  entry_date:  string
  collected:   number
  close_type:  string | null
  notes:       string | null
}

export async function getCashBreakdown(
  profileId: string,
  groupe:    'closer' | 'setter',
  weekStart: string,
  weekEnd:   string,
): Promise<CashBreakdownEntry[]> {
  const db = createAdminClient()

  const col = groupe === 'closer' ? 'closed_by' : 'set_by'

  const { data: entries } = await db
    .from('cash_entries')
    .select('id, client_name, entry_date, collected, close_type, notes, recurring_occurrences(recurring_deals(date_debut))')
    .eq(col, profileId)
    .gte('entry_date', weekStart)
    .lte('entry_date', weekEnd)
    .eq('is_refunded', false)
    .order('entry_date', { ascending: true })

  return (entries ?? []).filter(e => {
    if (e.close_type === 'recurring') {
      const occ = (e.recurring_occurrences as unknown as { recurring_deals: { date_debut: string }[] | null }[] | null)?.[0]
      const dealDateDebut = occ?.recurring_deals?.[0]?.date_debut
      return !!dealDateDebut && dealDateDebut >= weekStart
    }
    if (e.notes?.startsWith('Récurrent') || e.notes?.startsWith('Versement récurrent')) return false
    return true
  }).map(e => ({
    id:          e.id,
    client_name: e.client_name,
    entry_date:  e.entry_date,
    collected:   e.collected ?? 0,
    close_type:  e.close_type,
    notes:       e.notes,
  }))
}

// ── Sauvegarder override de cash ──────────────────────────────────────

export async function sauvegarderOverride(
  duelId:       string,
  player:       '1' | '2',
  cash:         number,
  reason:       string,
) {
  const adminId = await requireAdmin()
  const db = createAdminClient()

  const { data: duel } = await db.from('chasse_duels').select('player1_cash_override,player2_cash_override,player1_id,player2_id').eq('id', duelId).single()
  if (!duel) throw new Error('Duel introuvable')

  const field = player === '1' ? 'player1_cash_override' : 'player2_cash_override'
  const playerId = player === '1' ? duel.player1_id : duel.player2_id

  await db.from('chasse_overrides_log').insert({
    duel_id:       duelId,
    player_id:     playerId,
    original_cash: player === '1' ? duel.player1_cash_override : duel.player2_cash_override,
    new_cash:      cash,
    reason:        reason.trim() || null,
    changed_by:    adminId,
  })

  await db.from('chasse_duels').update({ [field]: cash, override_note: reason.trim() || null }).eq('id', duelId)
  revalidatePath('/chasse')
}

// ── Confirmer la semaine ──────────────────────────────────────────────

export async function confirmerSemaine(weekId: string, weekStart: string, weekEnd: string) {
  const adminId = await requireAdmin()
  const db = createAdminClient()

  const { data: duelsRow } = await db.from('chasse_duels').select('*').eq('week_id', weekId)
  if (!duelsRow || duelsRow.length === 0) throw new Error('Aucun duel pour cette semaine')

  const { closerCash, setterCash } = await getCashJoueuses(weekStart, weekEnd)
  const { data: players } = await db.from('chasse_players').select('id, profile_id, groupe')

  for (const duel of duelsRow) {
    const groupe = duel.groupe as 'closer' | 'setter'
    const cashMap = groupe === 'closer' ? closerCash : setterCash

    const p1Profile = players?.find(p => p.id === duel.player1_id)?.profile_id
    const p2Profile = players?.find(p => p.id === duel.player2_id)?.profile_id

    const cash1 = cashEffectif(p1Profile ? (cashMap[p1Profile] ?? 0) : 0, duel.player1_cash_override)
    const cash2 = duel.is_cerf
      ? 0
      : cashEffectif(p2Profile ? (cashMap[p2Profile] ?? 0) : 0, duel.player2_cash_override)

    let result
    if (duel.is_cerf) {
      result = calculerCerf(cash1, duel.cerf_target ?? 0)
    } else {
      result = calculerDuel(cash1, cash2)
    }

    const winnerId = result.winnerId === 'p1' ? duel.player1_id
                   : result.winnerId === 'p2' ? duel.player2_id
                   : null

    await db.from('chasse_duels').update({
      player1_cash_override: duel.player1_cash_override ?? cash1,
      player2_cash_override: duel.is_cerf ? null : (duel.player2_cash_override ?? cash2),
      winner_id:   winnerId,
      points_p1:   result.pointsP1,
      points_p2:   result.pointsP2,
      is_confirmed: true,
    }).eq('id', duel.id)
  }

  await db.from('chasse_weeks').update({
    status: 'confirmed',
    confirmed_by: adminId,
    confirmed_at: new Date().toISOString(),
  }).eq('id', weekId)

  revalidatePath('/chasse')
}

// ── Confirmer l'élimination mensuelle ────────────────────────────────

export async function confirmerElimination(month: number) {
  const adminId = await requireAdmin()
  const db = createAdminClient()

  const { data: players } = await db.from('chasse_players').select('*, profiles(full_name)').eq('status', 'active')
  if (!players) throw new Error('Aucune joueuse active')

  const { data: duels } = await db
    .from('chasse_duels')
    .select('*, chasse_weeks!inner(month)')
    .eq('chasse_weeks.month', month)
    .eq('is_confirmed', true)

  for (const groupe of ['closer', 'setter'] as const) {
    const groupePlayers = players.filter(p => p.groupe === groupe)
    const groupeDuels = (duels ?? []).filter(d => d.groupe === groupe)

    const scores: PlayerScore[] = groupePlayers.map(p => {
      const myDuels = groupeDuels.filter(d => d.player1_id === p.id || d.player2_id === p.id)
      const totalPoints = myDuels.reduce((s, d) => {
        if (d.player1_id === p.id) return s + (d.points_p1 ?? 0)
        return s + (d.points_p2 ?? 0)
      }, 0)

      const { data: cashEntries } = { data: [] as { closed_by: string | null; set_by: string | null; collected: number }[] }
      return {
        playerId:    p.id,
        nom:         (p.profiles as { full_name: string | null } | null)?.full_name ?? '?',
        totalPoints,
        totalCash:   0, // sera recalculé ci-dessous
      }
    })

    // Trier et sauvegarder les résultats mensuels
    const sorted = [...scores].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
      return b.totalCash - a.totalCash
    })

    for (let i = 0; i < sorted.length; i++) {
      await db.from('chasse_monthly_results').upsert({
        month, groupe,
        player_id:    sorted[i].playerId,
        total_points: sorted[i].totalPoints,
        total_cash:   sorted[i].totalCash,
        rank:         i + 1,
        eliminated:   i === sorted.length - 1,
      }, { onConflict: 'month,groupe,player_id' })
    }

    // Marquer la dernière comme éliminée
    if (sorted.length > 0) {
      const elimineeId = sorted[sorted.length - 1].playerId
      await db.from('chasse_players').update({ status: 'eliminated', eliminated_month: month }).eq('id', elimineeId)
    }
  }

  revalidatePath('/chasse')
}

// ── Mettre à jour la configuration ───────────────────────────────────

export async function mettreAJourConfig(data: Partial<ChassConfig>) {
  await requireAdmin()
  const db = createAdminClient()

  const { data: existing } = await db.from('chasse_config').select('id').single()
  if (existing) {
    await db.from('chasse_config').update(data).eq('id', existing.id)
  } else {
    await db.from('chasse_config').insert(data)
  }
  revalidatePath('/chasse')
}

// ── Réassigner les positions ──────────────────────────────────────────

export async function reassignerPosition(playerId: string, position: string) {
  await requireAdmin()
  const db = createAdminClient()
  await db.from('chasse_players').update({ position }).eq('id', playerId)
  revalidatePath('/chasse')
}

// ── Créer les duels d'une semaine ────────────────────────────────────

export async function creerDuelsSemaine(
  weekId:  string,
  duels:   Array<{
    groupe:    'closer' | 'setter'
    player1Id: string
    player2Id: string | null
    isCerf:    boolean
    cerfTarget?: number
  }>
) {
  await requireAdmin()
  const db = createAdminClient()

  await db.from('chasse_duels').delete().eq('week_id', weekId)

  if (duels.length > 0) {
    await db.from('chasse_duels').insert(duels.map(d => ({
      week_id:    weekId,
      groupe:     d.groupe,
      player1_id: d.player1Id,
      player2_id: d.player2Id,
      is_cerf:    d.isCerf,
      cerf_target: d.cerfTarget ?? null,
    })))
  }

  revalidatePath('/chasse')
}
