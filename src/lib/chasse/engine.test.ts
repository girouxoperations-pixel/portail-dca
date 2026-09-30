import { describe, it, expect } from 'vitest'
import {
  calculerDuel,
  calculerCerf,
  classerJoueuses,
  resolveElimination,
  genererDuelsDynamiques,
  calculerPourcentageFinale,
  resolverFinaleSetters,
  cashEffectif,
  type PlayerScore,
} from './engine'
import type { Standing } from './engine'

// ── Duel simple ───────────────────────────────────────────────────────

describe('calculerDuel', () => {
  it('p1 gagne si cash supérieur', () => {
    const r = calculerDuel(1000, 800)
    expect(r.winnerId).toBe('p1')
    expect(r.pointsP1).toBe(1)
    expect(r.pointsP2).toBe(0)
  })

  it('p2 gagne si cash supérieur', () => {
    const r = calculerDuel(500, 1200)
    expect(r.winnerId).toBe('p2')
    expect(r.pointsP1).toBe(0)
    expect(r.pointsP2).toBe(1)
  })

  it('égalité parfaite → ½ point chacune', () => {
    const r = calculerDuel(750, 750)
    expect(r.winnerId).toBeNull()
    expect(r.pointsP1).toBe(0.5)
    expect(r.pointsP2).toBe(0.5)
  })
})

// ── Cerf ──────────────────────────────────────────────────────────────

describe('calculerCerf', () => {
  it('Cerf atteint → 1 point', () => {
    const r = calculerCerf(50000, 45000)
    expect(r.cerfWon).toBe(true)
    expect(r.pointsP1).toBe(1)
  })

  it('Cerf exact → 1 point', () => {
    const r = calculerCerf(45000, 45000)
    expect(r.cerfWon).toBe(true)
    expect(r.pointsP1).toBe(1)
  })

  it('Cerf raté → 0 point', () => {
    const r = calculerCerf(30000, 45000)
    expect(r.cerfWon).toBe(false)
    expect(r.pointsP1).toBe(0)
  })
})

// ── Classement ────────────────────────────────────────────────────────

describe('classerJoueuses', () => {
  const scores: PlayerScore[] = [
    { playerId: 'c', nom: 'C', totalPoints: 1, totalCash: 5000 },
    { playerId: 'a', nom: 'A', totalPoints: 3, totalCash: 8000 },
    { playerId: 'b', nom: 'B', totalPoints: 3, totalCash: 9000 },
    { playerId: 'd', nom: 'D', totalPoints: 0, totalCash: 2000 },
  ]

  it('trie par points puis par cash', () => {
    const standings = classerJoueuses(scores)
    expect(standings[0].playerId).toBe('b') // 3pts, 9k cash
    expect(standings[1].playerId).toBe('a') // 3pts, 8k cash
    expect(standings[2].playerId).toBe('c') // 1pt
    expect(standings[3].playerId).toBe('d') // 0pt
  })

  it('marque la dernière comme menacée', () => {
    const standings = classerJoueuses(scores)
    expect(standings[3].isThreatened).toBe(true)
    expect(standings[0].isThreatened).toBe(false)
  })
})

// ── Résolution d'égalité en bas du classement ─────────────────────────

describe('resolveElimination', () => {
  const p1: PlayerScore = { playerId: 'p1', nom: 'P1', totalPoints: 1, totalCash: 5000 }
  const p2: PlayerScore = { playerId: 'p2', nom: 'P2', totalPoints: 1, totalCash: 7000 }

  it('duel direct existait → on élimine la perdante', () => {
    const result = resolveElimination([p1, p2], { winnerId: 'p2', loserId: 'p1' })
    expect(result).toBe('p1')
  })

  it('pas de duel direct → moins de cash total éliminée', () => {
    const result = resolveElimination([p1, p2], null)
    expect(result).toBe('p1') // p1 a moins de cash
  })

  it('duel direct égalité → moins de cash éliminée', () => {
    const result = resolveElimination([p1, p2], { winnerId: null, loserId: null })
    expect(result).toBe('p1')
  })
})

// ── Duels dynamiques fin de mois ──────────────────────────────────────

describe('genererDuelsDynamiques', () => {
  const makeStanding = (id: string, rank: number): Standing => ({
    playerId: id, nom: id, groupe: 'closer',
    totalPoints: 0, totalCash: 0, rank,
    isEliminated: false, isThreatened: false,
  })

  it('génère 1re vs 2e, 3e vs 4e pour 4 joueuses', () => {
    const standings = [
      makeStanding('p1', 1), makeStanding('p2', 2),
      makeStanding('p3', 3), makeStanding('p4', 4),
    ]
    const duels = genererDuelsDynamiques(standings)
    expect(duels).toHaveLength(2)
    expect(duels[0]).toEqual(['p1', 'p2'])
    expect(duels[1]).toEqual(['p3', 'p4'])
  })

  it('ignore les éliminées', () => {
    const standings = [
      makeStanding('p1', 1), makeStanding('p2', 2),
      makeStanding('p3', 3), { ...makeStanding('p4', 4), isEliminated: true },
    ]
    const duels = genererDuelsDynamiques(standings)
    expect(duels).toHaveLength(1)
    expect(duels[0]).toEqual(['p1', 'p2'])
  })
})

// ── Positions novembre ────────────────────────────────────────────────

import { genererPositionsMoisSuivant } from './engine'
import type { MonthlyResult } from './types'

describe('genererPositionsMoisSuivant', () => {
  const results: MonthlyResult[] = [
    { month: 10, groupe: 'closer', playerId: 'c', totalPoints: 3, totalCash: 9000, rank: 1, eliminated: false },
    { month: 10, groupe: 'closer', playerId: 'a', totalPoints: 2, totalCash: 7000, rank: 2, eliminated: false },
    { month: 10, groupe: 'closer', playerId: 'b', totalPoints: 1, totalCash: 5000, rank: 3, eliminated: false },
    { month: 10, groupe: 'closer', playerId: 'e', totalPoints: 0, totalCash: 2000, rank: 4, eliminated: true },
  ]

  it('retourne les IDs triés par rang, sans éliminées', () => {
    const positions = genererPositionsMoisSuivant(results, 'closer', 10)
    expect(positions).toEqual(['c', 'a', 'b'])
    expect(positions).not.toContain('e')
  })
})

// ── Calcul % finale ───────────────────────────────────────────────────

describe('calculerPourcentageFinale', () => {
  const history = [
    { weekNumber: 1, cash: 10000 },
    { weekNumber: 2, cash: 20000 },
    { weekNumber: 3, cash: 15000 },
    // moyenne = 15000
  ]

  it('calcule le pourcentage correctement', () => {
    const pct = calculerPourcentageFinale(18000, history)
    expect(pct).toBe(120) // 18000/15000 = 120%
  })

  it('retourne 0 si pas d\'historique', () => {
    expect(calculerPourcentageFinale(5000, [])).toBe(0)
  })

  it('exclut les semaines > 10 de la moyenne', () => {
    const histWithFinal = [...history, { weekNumber: 11, cash: 99999 }]
    const pct = calculerPourcentageFinale(18000, histWithFinal)
    expect(pct).toBe(120) // même résultat, sem 11 ignorée
  })
})

// ── 1-1 setters décembre ──────────────────────────────────────────────

describe('resolverFinaleSetters', () => {
  it('plus de points → gagnante', () => {
    expect(resolverFinaleSetters(5000, 8000, 2, 0)).toBe('p1')
  })

  it('égalité points → plus de cash', () => {
    expect(resolverFinaleSetters(9000, 7000, 1, 1)).toBe('p1')
  })

  it('égalité parfaite → null', () => {
    expect(resolverFinaleSetters(5000, 5000, 1, 1)).toBeNull()
  })
})

// ── Cash effectif ────────────────────────────────────────────────────

describe('cashEffectif', () => {
  it('utilise override si présent', () => {
    expect(cashEffectif(8000, 5000)).toBe(5000)
  })

  it('utilise cash_entries si pas override', () => {
    expect(cashEffectif(8000, null)).toBe(8000)
  })

  it('override 0 est valide', () => {
    expect(cashEffectif(8000, 0)).toBe(0)
  })
})
