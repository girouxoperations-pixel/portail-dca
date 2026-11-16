'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { peutVoirAnalyseCloser } from '@/lib/analyse-closer/access'
import { CONSIGNES_COACH } from '@/lib/analyse-closer/prompt'
import { appelerClaudeMessages, type MessageClaude } from '@/lib/analyse-closer/claude'

export type Resultat<T> = { ok: true; data: T } | { ok: false; erreur: string }

/** Accès : les closers et Samuel. */
export async function utilisateurCoach() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data: p } = await db.from('profiles').select('full_name, role, roles').eq('id', user.id).maybeSingle()
  const roles: string[] = (p?.roles?.length ? p.roles : [p?.role]).filter(Boolean)
  const estSamuel = peutVoirAnalyseCloser(user.email)
  if (!estSamuel && !roles.includes('closer')) return null
  return { id: user.id, nom: (p?.full_name as string | null) ?? user.email ?? 'Closer', estSamuel }
}

async function precisionsDeSamuel(): Promise<string> {
  const db = createAdminClient()
  const { data } = await db.from('call_analyses')
    .select('samuel_note').not('samuel_note', 'is', null)
    .order('feedback_at', { ascending: false }).limit(20)
  const notes = (data ?? []).map(r => r.samuel_note as string).filter(Boolean)
  return notes.length
    ? `\n\nPRÉCISIONS DONNÉES PAR SAMUEL EN CORRIGEANT DES ANALYSES (à respecter) :\n${notes.map(n => `- ${n}`).join('\n')}`
    : ''
}

export async function poserQuestion(data: { conversationId: string | null; question: string; extrait: string }): Promise<Resultat<{ conversationId: string }>> {
  try {
    const u = await utilisateurCoach()
    if (!u) throw new Error('Accès refusé')
    const question = data.question.trim()
    if (question.length < 5) throw new Error('Écris ta question.')
    const db = createAdminClient()

    let convId = data.conversationId
    let historique: MessageClaude[] = []
    if (convId) {
      const { data: conv } = await db.from('coach_conversations').select('user_id').eq('id', convId).maybeSingle()
      if (!conv || conv.user_id !== u.id) throw new Error('Conversation introuvable.')
      const { data: msgs } = await db.from('coach_messages').select('role, content')
        .eq('conversation_id', convId).order('created_at').limit(40)
      historique = (msgs ?? []) as MessageClaude[]
    } else {
      const { data: c, error } = await db.from('coach_conversations')
        .insert({ user_id: u.id, user_name: u.nom, titre: question.slice(0, 90) }).select('id').single()
      if (error) throw new Error(error.message)
      convId = c.id as string
    }

    const contenu = data.extrait.trim()
      ? `${question}\n\nExtrait de mon appel :\n"""\n${data.extrait.trim().slice(0, 20000)}\n"""`
      : question

    const { texte, modele } = await appelerClaudeMessages(
      [...historique, { role: 'user', content: contenu }],
      3000,
      CONSIGNES_COACH + await precisionsDeSamuel(),
    )

    const { error: e2 } = await db.from('coach_messages').insert([
      { conversation_id: convId, role: 'user', content: contenu },
      { conversation_id: convId, role: 'assistant', content: texte, model: modele },
    ])
    if (e2) throw new Error(e2.message)
    await db.from('coach_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)

    revalidatePath('/coach')
    return { ok: true, data: { conversationId: convId! } }
  } catch (e) {
    const erreur = e instanceof Error ? e.message : String(e)
    console.error('[coach]', erreur)
    return { ok: false, erreur }
  }
}

export async function supprimerConversation(id: string): Promise<Resultat<null>> {
  try {
    const u = await utilisateurCoach()
    if (!u) throw new Error('Accès refusé')
    const db = createAdminClient()
    const { data: conv } = await db.from('coach_conversations').select('user_id').eq('id', id).maybeSingle()
    if (!conv || (conv.user_id !== u.id && !u.estSamuel)) throw new Error('Conversation introuvable.')
    await db.from('coach_conversations').delete().eq('id', id)
    revalidatePath('/coach')
    return { ok: true, data: null }
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : String(e) }
  }
}
