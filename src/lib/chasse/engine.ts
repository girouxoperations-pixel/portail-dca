// ── Moteur de calcul — Saison de la Chasse ───────────────────────────
// Module pur : aucun appel Supabase, aucun side-effect.

import type { DuelResult, MonthlyResult, Player } from './types'
export type { Standing } from './types'
import type { Standing } from './types'

// ── Résultat d'un duel simple ─────────────────────────────────────────

export function calculerDuel(
  cashP1: number,
  cashP2: number,
): DuelResult {
  if (cashP1 > cashP2) {
    return { winnerId: 'p1', pointsP1: 1, pointsP2: 0, cerfWon: null }
  }
  if (cashP2 > cashP1) {
    return { winnerId: 'p2', pointsP1: 0, pointsP2: 1, cerfWon: null }
  }
  return { winnerId: null, pointsP1: 0.5, pointsP2: 0.5, cerfWon: null }
}

// ── Résultat d'un Cerf ────────────────────────────────────────────────

export function calculerCerf(
  cashJoueuse: number,
  target: number,
): DuelResult {
  const won = cashJoueuse >= target
  return {
    winnerId:  won ? 'p1' : null,
    pointsP1:  won ? 1 : 0,
    pointsP2:  0,
    cerfWon:   won,
  }
}

// ── Classement d'un groupe pour une période ───────────────────────────

export interface PlayerScore {
  playerId:    string
  nom:         string
  totalPoints: number
  totalCash:   number
}

export function classerJoueuses(scores: PlayerScore[]): Standing[] {
  const sorted = [...scores].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    return b.totalCash - a.totalCash
  })

  const activePlayers = sorted.filter(s =>
    !sorted.find(x => x.playerId === s.playerId && x.totalPoints < 0) // toutes actives ici
  )

  return sorted.map((s, i) => ({
    playerId:     s.playerId,
    nom:          s.nom,
    groupe:       'closer', // remplacé à l'appel
    totalPoints:  s.totalPoints,
    totalCash:    s.totalCash,
    rank:         i + 1,
    isEliminated: false,
    isThreatened: i === sorted.length - 1 && sorted.length > 1,
  }))
}

// ── Résolution des égalités pour l'élimination ───────────────────────
// Retourne l'id de la joueuse à éliminer.
// Règle 1 : duel entre elles → gagnante survit
// Règle 2 : moins de cash total du mois → éliminée

export function resolveElimination(
  tiePlayers: PlayerScore[],
  // duels de la semaine où elles se sont affrontées (si existant)
  h2hResult: { winnerId: string | null; loserId: string | null } | null,
): string | null {
  if (tiePlayers.length === 0) return null
  if (tiePlayers.length === 1) return tiePlayers[0].playerId

  // Si duel direct existait et pas d'égalité parfaite
  if (h2hResult?.loserId) return h2hResult.loserId

  // Moins de cash total
  const sorted = [...tiePlayers].sort((a, b) => a.totalCash - b.totalCash)
  return sorted[0].playerId
}

// ── Génération des duels de fin de mois (1re vs 2e, 3e vs 4e) ────────

export function genererDuelsDynamiques(standings: Standing[]): Array<[string, string]> {
  const actifs = standings.filter(s => !s.isEliminated).sort((a, b) => a.rank - b.rank)
  const duels: Array<[string, string]> = []
  for (let i = 0; i + 1 < actifs.length; i += 2) {
    duels.push([actifs[i].playerId, actifs[i + 1].playerId])
  }
  return duels
}

// ── Positions pour le mois suivant ───────────────────────────────────
// Retourne les joueurs actifs triés par rang final du mois précédent.

export function genererPositionsMoisSuivant(
  results: MonthlyResult[],
  groupe: 'closer' | 'setter',
  month: number,
): string[] {
  return results
    .filter(r => r.groupe === groupe && r.month === month && !r.eliminated)
    .sort((a, b) => a.rank - b.rank)
    .map(r => r.playerId)
}

// ── Calcul du % finale ────────────────────────────────────────────────
// Cash semaine finale / moyenne hebdomadaire (oct5 → déc11)

export interface WeeklyCash {
  weekNumber: number
  cash:       number
}

export function calculerPourcentageFinale(
  finaleCash:   number,
  weeklyHistory: WeeklyCash[], // semaines 1–10 seulement (pas finale)
): number {
  const semaines = weeklyHistory.filter(w => w.weekNumber >= 1 && w.weekNumber <= 10)
  if (semaines.length === 0) return 0
  const moyenne = semaines.reduce((s, w) => s + w.cash, 0) / semaines.length
  if (moyenne === 0) return finaleCash > 0 ? Infinity : 0
  return Math.round((finaleCash / moyenne) * 10000) / 100 // 2 décimales
}

// ── Règle 1-1 setters décembre ────────────────────────────────────────
// Si après 2 semaines c'est 1-1 (ou ½-½), on regarde le cash total.

export function resolverFinaleSetters(
  cashTotalP1: number,
  cashTotalP2: number,
  pointsP1:   number,
  pointsP2:   number,
): 'p1' | 'p2' | null {
  if (pointsP1 !== pointsP2) {
    return pointsP1 > pointsP2 ? 'p1' : 'p2'
  }
  if (cashTotalP1 !== cashTotalP2) {
    return cashTotalP1 > cashTotalP2 ? 'p1' : 'p2'
  }
  return null // égalité parfaite
}

// ── Helper: cash actif d'une joueuse pour une semaine ─────────────────

export function cashEffectif(
  cashEntries: number,
  override:    number | null,
): number {
  return override !== null ? override : cashEntries
}
