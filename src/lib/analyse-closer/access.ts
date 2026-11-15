/**
 * Accès à l'onglet Analyse-closer : réservé à Samuel.
 * Pour donner l'accès à quelqu'un d'autre, ajouter son courriel ici.
 */
export const ANALYSE_CLOSER_EMAILS = ['girouxoperations@gmail.com']

export function peutVoirAnalyseCloser(email: string | null | undefined): boolean {
  return !!email && ANALYSE_CLOSER_EMAILS.includes(email.toLowerCase())
}
