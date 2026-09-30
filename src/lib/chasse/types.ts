// ── Types centraux — Saison de la Chasse ─────────────────────────────

export type Groupe = 'closer' | 'setter'

export type PlayerStatus = 'active' | 'eliminated' | 'champion'

export interface Player {
  id:               string   // chasse_players.id
  profileId:        string   // profiles.id
  nom:              string
  groupe:           Groupe
  position:         string   // 'A'–'E' closers, 'W'–'Z' setters
  status:           PlayerStatus
  eliminatedMonth?: number   // 10 | 11 | 12
}

export interface WeekConfig {
  id:          string
  weekNumber:  number  // 1–11
  weekStart:   string  // YYYY-MM-DD (lundi)
  weekEnd:     string  // YYYY-MM-DD (vendredi)
  month:       number  // 10 | 11 | 12
  status:      'pending' | 'active' | 'confirmed'
}

export interface Duel {
  id:              string
  weekId:          string
  groupe:          Groupe
  player1Id:       string
  player2Id:       string | null  // null = Cerf
  isCerf:          boolean
  cerfTarget:      number | null
  // Cash (calculé auto depuis cash_entries, overridable)
  player1CashOverride: number | null
  player2CashOverride: number | null
  // Résultats (après confirmation)
  winnerId:        string | null   // null = égalité ou pas confirmé
  pointsP1:        number
  pointsP2:        number
  isConfirmed:     boolean
  overrideNote:    string | null
}

export interface PlayerWeekCash {
  playerId: string
  cash:     number   // depuis cash_entries ou override
}

export interface DuelResult {
  winnerId:  string | null  // null = égalité
  pointsP1:  number         // 0, 0.5 ou 1
  pointsP2:  number
  cerfWon:   boolean | null // null si pas cerf
}

export interface Standing {
  playerId:     string
  nom:          string
  groupe:       Groupe
  totalPoints:  number
  totalCash:    number
  rank:         number
  isEliminated: boolean
  isThreatened: boolean  // dernière au classement actif
}

export interface MonthlyResult {
  month:        number
  groupe:       Groupe
  playerId:     string
  totalPoints:  number
  totalCash:    number
  rank:         number
  eliminated:   boolean
}

export interface ChassConfig {
  showCash:          boolean
  cerfOctCloser:     number
  cerfOctSetter:     number
  cerfNovCloser:     number
  cerfNovSetter:     number
  cerfDecCloser:     number
  cerfDecSetter:     number
  weekStartWeekday:  number  // 1=lundi
  weekEndWeekday:    number  // 5=vendredi
}

// ── Semaines pré-définies du tournoi ──────────────────────────────────

export const WEEKS: Omit<WeekConfig, 'id' | 'status'>[] = [
  { weekNumber: 1,  weekStart: '2026-10-05', weekEnd: '2026-10-09', month: 10 },
  { weekNumber: 2,  weekStart: '2026-10-12', weekEnd: '2026-10-16', month: 10 },
  { weekNumber: 3,  weekStart: '2026-10-19', weekEnd: '2026-10-23', month: 10 },
  { weekNumber: 4,  weekStart: '2026-10-26', weekEnd: '2026-10-30', month: 10 },
  { weekNumber: 5,  weekStart: '2026-11-02', weekEnd: '2026-11-06', month: 11 },
  { weekNumber: 6,  weekStart: '2026-11-09', weekEnd: '2026-11-13', month: 11 },
  { weekNumber: 7,  weekStart: '2026-11-16', weekEnd: '2026-11-20', month: 11 },
  { weekNumber: 8,  weekStart: '2026-11-23', weekEnd: '2026-11-27', month: 11 },
  { weekNumber: 9,  weekStart: '2026-11-30', weekEnd: '2026-12-04', month: 12 },
  { weekNumber: 10, weekStart: '2026-12-07', weekEnd: '2026-12-11', month: 12 },
  { weekNumber: 11, weekStart: '2026-12-14', weekEnd: '2026-12-18', month: 12 },
]

// Positions par défaut
export const DEFAULT_POSITIONS_CLOSER: Record<string, string> = {
  Audrey:   'A',
  Emie:     'B',
  Mathilde: 'C',
  Emma:     'D',
  Shanny:   'E',
}

export const DEFAULT_POSITIONS_SETTER: Record<string, string> = {
  Kalianna: 'W',
  Alexandra:'X',
  Kim:      'Y',
  Mélika:   'Z',
}

// Schedule statique octobre (semaines 1-3)
// Format: [pos1, pos2] pour duel, ou [pos, null] pour cerf
export type DuelSpec = [string, string | null, boolean] // [p1, p2|null, isCerf]

export const OCT_SCHEDULE: Record<number, { closer: DuelSpec[]; setter: DuelSpec[] }> = {
  1: {
    closer: [['A','B',false], ['C','E',false], ['D',null,true]],
    setter: [['W','X',false], ['Y','Z',false]],
  },
  2: {
    closer: [['A','C',false], ['D','E',false], ['B',null,true]],
    setter: [['W','Y',false], ['X','Z',false]],
  },
  3: {
    closer: [['A','D',false], ['B','C',false], ['E',null,true]],
    setter: [['W','Z',false], ['X','Y',false]],
  },
  // Semaine 4 : dynamique (générée depuis classement)
}

export const NOV_SCHEDULE: Record<number, { closer: DuelSpec[]; setter: DuelSpec[] }> = {
  5: {
    closer: [['#1','#4',false], ['#2','#3',false]],
    setter: [['#2','#3',false], ['#1',null,true]],
  },
  6: {
    closer: [['#1','#3',false], ['#2','#4',false]],
    setter: [['#1','#3',false], ['#2',null,true]],
  },
  7: {
    closer: [['#1','#2',false], ['#3','#4',false]],
    setter: [['#1','#2',false], ['#3',null,true]],
  },
  // Semaine 8 : dynamique
}
