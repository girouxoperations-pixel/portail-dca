export const PALIERS = [
  { seuil: 130_000, closer: 1_800, setter:   900 },
  { seuil: 100_000, closer: 1_500, setter:   750 },
  { seuil:  85_000, closer: 1_200, setter:   600 },
  { seuil:  70_000, closer: 1_000, setter:   500 },
  { seuil:  50_000, closer:   700, setter:   350 },
] as const

export type Palier = typeof PALIERS[number]

export const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
] as const

export const MOIS_COURT = [
  'Jan.','Fév.','Mar.','Avr.','Mai','Juin',
  'Juil.','Août','Sep.','Oct.','Nov.','Déc.',
] as const

export function dollar(n: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} $`
}

export function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getPalier(collected: number): Palier | null {
  return PALIERS.find(p => collected >= p.seuil) ?? null
}

export function formatDate(dateStr: string, moisCourt = MOIS_COURT) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${moisCourt[m - 1]} ${y}`
}
