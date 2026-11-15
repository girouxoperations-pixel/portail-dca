'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { peutVoirAnalyseCloser } from '@/lib/analyse-closer/access'
import {
  MODELE_ANALYSE, MODELE_REPLI, SYSTEME,
  promptExtraction, promptJugement, promptRapportJour, type Correction,
} from '@/lib/analyse-closer/prompt'

async function verifierAcces() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !peutVoirAnalyseCloser(user.email)) throw new Error('Accès refusé')
  return user
}

async function appelerClaude(prompt: string, maxTokens: number, modele = MODELE_ANALYSE, essai = 1): Promise<{ texte: string; modele: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Clé API Anthropic manquante (ANTHROPIC_API_KEY).')

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: modele,
        max_tokens: maxTokens,
        // Le script + critères + références sont identiques à chaque appel : mis en cache.
        system: [{ type: 'text', text: SYSTEME, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch (e) {
    if (essai < 3) return appelerClaude(prompt, maxTokens, modele, essai + 1)
    throw new Error(`Connexion à Anthropic impossible : ${e instanceof Error ? e.message : e}`)
  }

  if (!res.ok) {
    const err = await res.text()
    console.error(`[analyse-closer] Anthropic ${res.status} (${modele}, essai ${essai}) : ${err.slice(0, 500)}`)
    // Surcharge / limite / erreur serveur : on réessaie, puis on bascule sur le modèle de repli.
    if ([429, 500, 502, 503, 529].includes(res.status)) {
      if (essai < 2) { await new Promise(r => setTimeout(r, 4000)); return appelerClaude(prompt, maxTokens, modele, essai + 1) }
      if (modele !== MODELE_REPLI) return appelerClaude(prompt, maxTokens, MODELE_REPLI, 1)
    }
    // Modèle indisponible sur cette clé → modèle de repli.
    if (modele !== MODELE_REPLI && (res.status === 404 || res.status === 400)) {
      return appelerClaude(prompt, maxTokens, MODELE_REPLI, 1)
    }
    if (res.status === 401) throw new Error('Clé Anthropic refusée : vérifie ANTHROPIC_API_KEY dans Vercel.')
    if (res.status === 400 && /credit|billing|balance/i.test(err)) throw new Error('Crédits Anthropic insuffisants : ajoute des crédits dans console.anthropic.com → Billing.')
    throw new Error(`Erreur Anthropic (${res.status}) : ${err.slice(0, 300)}`)
  }
  const json = await res.json() as { stop_reason?: string; content: Array<{ type: string; text: string }> }
  if (json.stop_reason === 'max_tokens') console.error(`[analyse-closer] réponse coupée (max_tokens) avec ${modele}`)
  return { texte: json.content.filter(b => b.type === 'text').map(b => b.text).join(''), modele }
}

function extraireJson(texte: string): Record<string, unknown> {
  const debut = texte.indexOf('{')
  const fin = texte.lastIndexOf('}')
  if (debut < 0 || fin < 0) throw new Error("L'analyse n'a pas renvoyé de résultat lisible. Réessaie.")
  try {
    return JSON.parse(texte.slice(debut, fin + 1))
  } catch {
    console.error('[analyse-closer] JSON invalide :', texte.slice(0, 300), '…', texte.slice(-300))
    throw new Error("L'analyse a renvoyé un résultat incomplet. Réessaie.")
  }
}

/** Les erreurs des Server Actions sont masquées en production : on renvoie le message au lieu de lancer. */
export type Resultat<T> = { ok: true; data: T } | { ok: false; erreur: string }
async function sur<T>(fn: () => Promise<T>): Promise<Resultat<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    const erreur = e instanceof Error ? e.message : String(e)
    console.error('[analyse-closer]', erreur)
    return { ok: false, erreur }
  }
}

const VERDICTS = ['closee', 'vente_manquee', 'a_suivre', 'pas_qualifiee']
const NIVEAUX = ['oui', 'partiel', 'non', 'inconnu']
const CLOSABLE = ['oui', 'non', 'incertain']
const ouNull = (v: unknown, liste: string[]) => (liste.includes(String(v)) ? String(v) : null)
const entier = (v: unknown, min: number, max: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : null
}

/** Passe 1 : extraction des faits (requête séparée pour rester sous la limite de temps). */
async function _extraireFaits(data: { closer: string; prospect: string; transcript: string }) {
  await verifierAcces()
  if (!data.closer.trim()) throw new Error('Indique le nom de la closer.')
  if (data.transcript.trim().length < 500) throw new Error('Transcription trop courte.')
  const { texte } = await appelerClaude(promptExtraction({
    closer: data.closer.trim(), prospect: data.prospect.trim(), transcript: data.transcript,
  }), 16000)
  return extraireJson(texte)
}

async function chargerCorrections(): Promise<Correction[]> {
  const db = createAdminClient()
  const { data } = await db
    .from('call_analyses')
    .select('closer_name, prospect_name, verdict, closable, samuel_accord, samuel_verdict, samuel_closable, samuel_note, feedback_at')
    .not('samuel_accord', 'is', null)
    .order('feedback_at', { ascending: false })
    .limit(60)
  const rows = data ?? []
  // Priorité aux désaccords et aux accords commentés : ce sont eux qui calibrent.
  const desaccords = rows.filter(r => r.samuel_accord === false)
  const commentes = rows.filter(r => r.samuel_accord === true && r.samuel_note)
  return [...desaccords, ...commentes].slice(0, 25).map(r => ({
    closer: r.closer_name, prospect: r.prospect_name,
    verdict_ia: r.verdict, closable_ia: r.closable,
    accord: !!r.samuel_accord, verdict_samuel: r.samuel_verdict,
    closable_samuel: r.samuel_closable, note: r.samuel_note,
  }))
}

/** Passe 2 : jugement + enregistrement. */
async function _analyserAppelCloser(data: {
  closer: string
  prospect: string
  callDate: string
  fathomUrl: string
  issue: '' | 'close' | 'pas_close' | 'a_suivre'
  transcript: string
  faits: Record<string, unknown>
}) {
  const user = await verifierAcces()
  const corrections = await chargerCorrections()

  const { texte, modele } = await appelerClaude(promptJugement({
    closer: data.closer.trim(),
    prospect: data.prospect.trim(),
    issue: data.issue,
    faits: data.faits,
    transcript: data.transcript,
    corrections,
  }), 16000)
  const a = extraireJson(texte)

  const volonte = (a.volonte ?? {}) as Record<string, unknown>
  const capacite = (a.capacite ?? {}) as Record<string, unknown>
  const closable = (a.closable ?? {}) as Record<string, unknown>
  const infoManquante = Array.isArray(a.info_non_collectee) && a.info_non_collectee.length > 0
  const avatar = volonte.niveau === 'oui' && capacite.niveau === 'oui' ? 'oui'
    : volonte.niveau === 'non' || capacite.niveau === 'non' ? 'non' : 'partiel'

  const db = createAdminClient()
  const { data: row, error } = await db.from('call_analyses').insert({
    call_date: data.callDate || undefined,
    closer_name: data.closer.trim(),
    prospect_name: data.prospect.trim() || null,
    fathom_url: data.fathomUrl.trim() || null,
    issue: data.issue || null,
    transcript: data.transcript.trim(),
    faits: data.faits,
    verdict: ouNull(a.verdict, VERDICTS),
    avatar,
    volonte: ouNull(volonte.niveau, NIVEAUX),
    capacite: ouNull(capacite.niveau, NIVEAUX),
    solution: typeof capacite.solution_possible === 'string' ? capacite.solution_possible : null,
    closable: ouNull(closable.reponse, CLOSABLE),
    closable_pct: entier(closable.probabilite, 0, 100),
    info_manquante: infoManquante,
    score: entier(a.score, 0, 100),
    analysis: a,
    model: modele,
    created_by: user.id,
  }).select('id').single()
  if (error) throw new Error(error.message)

  revalidatePath('/analyse-closer')
  return { id: row.id as string }
}

/** Boucle d'apprentissage : Samuel valide ou corrige l'analyse. */
async function _donnerFeedback(data: {
  id: string
  accord: boolean
  verdict: string | null
  closable: string | null
  note: string
}) {
  await verifierAcces()
  const db = createAdminClient()
  const { error } = await db.from('call_analyses').update({
    samuel_accord: data.accord,
    samuel_verdict: data.accord ? null : ouNull(data.verdict, VERDICTS),
    samuel_closable: data.accord ? null : ouNull(data.closable, CLOSABLE),
    samuel_note: data.note.trim() || null,
    feedback_at: new Date().toISOString(),
  }).eq('id', data.id)
  if (error) throw new Error(error.message)
  revalidatePath('/analyse-closer')
}

async function _genererRapportJour(date: string) {
  await verifierAcces()
  const db = createAdminClient()
  const { data: rows, error } = await db
    .from('call_analyses')
    .select('closer_name, prospect_name, verdict, volonte, capacite, closable, closable_pct, solution, score, analysis, samuel_accord, samuel_verdict, samuel_closable, samuel_note')
    .eq('call_date', date)
  if (error) throw new Error(error.message)
  if (!rows?.length) throw new Error('Aucun appel analysé pour cette journée.')

  const compact = rows.map(r => {
    const a = r.analysis as Record<string, unknown>
    return {
      closer: r.closer_name, prospect: r.prospect_name,
      verdict: r.samuel_accord === false && r.samuel_verdict ? r.samuel_verdict : r.verdict,
      closable: r.samuel_accord === false && r.samuel_closable ? r.samuel_closable : r.closable,
      probabilite: r.closable_pct, volonte: r.volonte, capacite: r.capacite,
      solution: r.solution, score: r.score, note_samuel: r.samuel_note,
      resume: a.resume, explication: a.verdict_explication, bascule: a.closable,
      info_non_collectee: a.info_non_collectee, correctifs: a.correctifs, focus: a.focus,
      signal_setter: a.signal_setter, cash: a.cash, profil_lead: a.profil_lead, forces: a.forces,
    }
  })
  const { texte } = await appelerClaude(promptRapportJour(date, compact), 4000)

  const { error: e2 } = await db.from('call_daily_reports').upsert({
    report_date: date, content: texte, nb_appels: rows.length, created_at: new Date().toISOString(),
  })
  if (e2) throw new Error(e2.message)
  revalidatePath('/analyse-closer')
}

async function _supprimerAnalyse(id: string) {
  await verifierAcces()
  const db = createAdminClient()
  const { error } = await db.from('call_analyses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/analyse-closer')
}

export async function extraireFaits(data: Parameters<typeof _extraireFaits>[0]) { return sur(() => _extraireFaits(data)) }
export async function analyserAppelCloser(data: Parameters<typeof _analyserAppelCloser>[0]) { return sur(() => _analyserAppelCloser(data)) }
export async function donnerFeedback(data: Parameters<typeof _donnerFeedback>[0]) { return sur(() => _donnerFeedback(data)) }
export async function genererRapportJour(date: string) { return sur(() => _genererRapportJour(date)) }
export async function supprimerAnalyse(id: string) { return sur(() => _supprimerAnalyse(id)) }
