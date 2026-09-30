// ── Génération du calendrier — Saison de la Chasse ───────────────────

import type { Player, DuelSpec } from './types'
import { OCT_SCHEDULE, NOV_SCHEDULE } from './types'
import type { Standing } from './engine'

export interface DuelDef {
  groupe:    'closer' | 'setter'
  player1Id: string
  player2Id: string | null
  isCerf:    boolean
}

// ── Semaines 1–3 octobre (statiques) ─────────────────────────────────

export function getDuelsStatiques(
  weekNumber: number,
  players:    Player[],
): DuelDef[] {
  const month = weekNumber <= 4 ? 'oct' : 'nov'
  const schedule = month === 'oct' ? OCT_SCHEDULE : NOV_SCHEDULE

  if (!(weekNumber in schedule)) return []

  const { closer: closerSpecs, setter: setterSpecs } =
    schedule[weekNumber as keyof typeof schedule]

  const byPos = (groupe: 'closer' | 'setter', pos: string): string | null =>
    players.find(p => p.groupe === groupe && p.position === pos)?.id ?? null

  const buildDuels = (specs: DuelSpec[], groupe: 'closer' | 'setter'): DuelDef[] =>
    specs.map(([p1, p2, isCerf]) => ({
      groupe,
      player1Id: byPos(groupe, p1) ?? '',
      player2Id: p2 ? byPos(groupe, p2) : null,
      isCerf,
    }))

  return [
    ...buildDuels(closerSpecs, 'closer'),
    ...buildDuels(setterSpecs, 'setter'),
  ]
}

// ── Semaine 4 octobre — setters dynamiques (classement 3 sem.) ────────
// Closers statiques, setters basés sur classement

export function getDuelsOctobreS4(
  players:       Player[],
  setterStandings: Standing[], // classement après 3 semaines
): DuelDef[] {
  // Closers semaine 4 : statique
  const closerSpecs: DuelSpec[] = [['A','E',false], ['B','D',false], ['C',null,true]]
  const byPos = (groupe: 'closer' | 'setter', pos: string): string | null =>
    players.find(p => p.groupe === groupe && p.position === pos)?.id ?? null

  const closerDuels: DuelDef[] = closerSpecs.map(([p1, p2, isCerf]) => ({
    groupe:    'closer' as const,
    player1Id: byPos('closer', p1) ?? '',
    player2Id: p2 ? byPos('closer', p2) : null,
    isCerf,
  }))

  // Setters : 1re vs 2e, 3e vs 4e (basé sur classement)
  const actifs = setterStandings.filter(s => !s.isEliminated).sort((a, b) => a.rank - b.rank)
  const setterDuels: DuelDef[] = []
  for (let i = 0; i + 1 < actifs.length; i += 2) {
    setterDuels.push({
      groupe:    'setter',
      player1Id: actifs[i].playerId,
      player2Id: actifs[i + 1].playerId,
      isCerf:    false,
    })
  }
  if (actifs.length % 2 !== 0) {
    setterDuels.push({
      groupe:    'setter',
      player1Id: actifs[actifs.length - 1].playerId,
      player2Id: null,
      isCerf:    true,
    })
  }

  return [...closerDuels, ...setterDuels]
}

// ── Semaines novembre dynamiques ─────────────────────────────────────
// weekNumber = 5-8, positions '#1'…'#N' résolues via classement novembre

export function getDuelsNovembre(
  weekNumber: number,
  players:    Player[],
  novStandings: { closer: Standing[]; setter: Standing[] },
): DuelDef[] {
  const resolve = (groupe: 'closer' | 'setter', rank: string): string => {
    const r = parseInt(rank.replace('#', '')) - 1
    const s = novStandings[groupe].filter(x => !x.isEliminated).sort((a, b) => a.rank - b.rank)
    return s[r]?.playerId ?? ''
  }

  if (weekNumber === 8) {
    // Dynamique : classement intermédiaire de novembre
    const closerActifs = novStandings.closer.filter(s => !s.isEliminated).sort((a, b) => a.rank - b.rank)
    const setterActifs = novStandings.setter.filter(s => !s.isEliminated).sort((a, b) => a.rank - b.rank)
    const duels: DuelDef[] = []
    for (let i = 0; i + 1 < closerActifs.length; i += 2) {
      duels.push({ groupe: 'closer', player1Id: closerActifs[i].playerId, player2Id: closerActifs[i+1].playerId, isCerf: false })
    }
    if (setterActifs.length >= 2) {
      duels.push({ groupe: 'setter', player1Id: setterActifs[0].playerId, player2Id: setterActifs[1].playerId, isCerf: false })
    }
    if (setterActifs.length >= 3) {
      duels.push({ groupe: 'setter', player1Id: setterActifs[2].playerId, player2Id: null, isCerf: true })
    }
    return duels
  }

  const specs = NOV_SCHEDULE[weekNumber as keyof typeof NOV_SCHEDULE]
  if (!specs) return []

  const build = (duelSpecs: DuelSpec[], groupe: 'closer' | 'setter'): DuelDef[] =>
    duelSpecs.map(([p1, p2, isCerf]) => ({
      groupe,
      player1Id: p1.startsWith('#') ? resolve(groupe, p1) : players.find(p => p.groupe === groupe && p.position === p1)?.id ?? '',
      player2Id: p2 ? (p2.startsWith('#') ? resolve(groupe, p2) : players.find(p => p.groupe === groupe && p.position === p2)?.id ?? '') : null,
      isCerf,
    }))

  return [
    ...build(specs.closer, 'closer'),
    ...build(specs.setter, 'setter'),
  ]
}

// ── Décembre ──────────────────────────────────────────────────────────

export function getDuelsDecembre(
  weekNumber: number,
  players:    Player[],
  decPositions: { closer: string[]; setter: string[] }, // IDs triés #1, #2, #3
): DuelDef[] {
  const duels: DuelDef[] = []

  if (weekNumber === 9) {
    // #2 vs #3 closers, #1 bye (cerf pour fierté)
    if (decPositions.closer[1] && decPositions.closer[2]) {
      duels.push({ groupe: 'closer', player1Id: decPositions.closer[1], player2Id: decPositions.closer[2], isCerf: false })
    }
    if (decPositions.closer[0]) {
      duels.push({ groupe: 'closer', player1Id: decPositions.closer[0], player2Id: null, isCerf: true })
    }
    if (decPositions.setter[0] && decPositions.setter[1]) {
      duels.push({ groupe: 'setter', player1Id: decPositions.setter[0], player2Id: decPositions.setter[1], isCerf: false })
    }
  }

  if (weekNumber === 10) {
    // #1 vs gagnante de sem 9 (passé en winnerId externe)
    if (decPositions.setter[0] && decPositions.setter[1]) {
      duels.push({ groupe: 'setter', player1Id: decPositions.setter[0], player2Id: decPositions.setter[1], isCerf: false })
    }
    // closer : géré dynamiquement (winnerId sem9 vs #1) — positions passées
    if (decPositions.closer[0] && decPositions.closer[1]) {
      duels.push({ groupe: 'closer', player1Id: decPositions.closer[0], player2Id: decPositions.closer[1], isCerf: false })
    }
  }

  return duels
}
