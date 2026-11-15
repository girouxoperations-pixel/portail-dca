'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { peutVoirAnalyseCloser } from '@/lib/analyse-closer/access'
import { MODELE_ANALYSE, promptAnalyse, promptRapportJour } from '@/lib/analyse-closer/prompt'

async function verifierAcces() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !peutVoirAnalyseCloser(user.email)) throw new Error('Accès refusé')
  return user
}

async function appelerClaude(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Clé API Anthropic manquante (ANTHROPIC_API_KEY).')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELE_ANALYSE,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Erreur Anthropic (${res.status}) : ${await res.text()}`)
  const json = await res.json() as { content: Array<{ type: string; text: string }> }
  return json.content.find(b => b.type === 'text')?.text ?? ''
}

function extraireJson(texte: string): Record<string, unknown> {
  const debut = texte.indexOf('{')
  const fin = texte.lastIndexOf('}')
  if (debut < 0 || fin < 0) throw new Error("L'analyse n'a pas renvoyé de JSON.")
  return JSON.parse(texte.slice(debut, fin + 1))
}

const VERDICTS = ['closee', 'vente_manquee', 'a_suivre', 'pas_qualifiee']
const AVATARS = ['oui', 'partiel', 'non']

export async function analyserAppelCloser(data: {
  closer: string
  prospect: string
  callDate: string
  fathomUrl: string
  issue: '' | 'close' | 'pas_close' | 'a_suivre'
  transcript: string
}) {
  const user = await verifierAcces()
  if (!data.closer.trim()) throw new Error('Indique le nom de la closer.')
  if (data.transcript.trim().length < 500) throw new Error('Transcription trop courte.')

  const texte = await appelerClaude(promptAnalyse({
    closer: data.closer.trim(),
    prospect: data.prospect.trim(),
    issue: data.issue,
    transcript: data.transcript,
  }), 6000)
  const a = extraireJson(texte)

  const score = Number(a.score)
  const db = createAdminClient()
  const { data: row, error } = await db.from('call_analyses').insert({
    call_date: data.callDate || undefined,
    closer_name: data.closer.trim(),
    prospect_name: data.prospect.trim() || null,
    fathom_url: data.fathomUrl.trim() || null,
    issue: data.issue || null,
    transcript: data.transcript.trim(),
    verdict: VERDICTS.includes(String(a.verdict)) ? a.verdict : null,
    avatar: AVATARS.includes(String(a.avatar)) ? a.avatar : null,
    solution: typeof a.solution_financiere === 'string' ? a.solution_financiere : null,
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
    analysis: a,
    model: MODELE_ANALYSE,
    created_by: user.id,
  }).select('id').single()
  if (error) throw new Error(error.message)

  revalidatePath('/analyse-closer')
  return { id: row.id as string }
}

export async function genererRapportJour(date: string) {
  await verifierAcces()
  const db = createAdminClient()
  const { data: rows, error } = await db
    .from('call_analyses')
    .select('closer_name, prospect_name, verdict, avatar, solution, score, analysis')
    .eq('call_date', date)
  if (error) throw new Error(error.message)
  if (!rows?.length) throw new Error('Aucun appel analysé pour cette journée.')

  const compact = rows.map(r => {
    const a = r.analysis as Record<string, unknown>
    return {
      closer: r.closer_name, prospect: r.prospect_name, verdict: r.verdict,
      avatar: r.avatar, solution: r.solution, score: r.score,
      resume: a.resume, explication: a.verdict_explication,
      correctifs: a.correctifs, forces: a.forces, focus: a.focus, signal_setter: a.signal_setter,
    }
  })
  const contenu = await appelerClaude(promptRapportJour(date, compact), 3000)

  const { error: e2 } = await db.from('call_daily_reports').upsert({
    report_date: date, content: contenu, nb_appels: rows.length, created_at: new Date().toISOString(),
  })
  if (e2) throw new Error(e2.message)
  revalidatePath('/analyse-closer')
}

export async function supprimerAnalyse(id: string) {
  await verifierAcces()
  const db = createAdminClient()
  const { error } = await db.from('call_analyses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/analyse-closer')
}
