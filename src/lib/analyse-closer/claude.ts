import { MODELE_ANALYSE, MODELE_REPLI, SYSTEME } from './prompt'

export type MessageClaude = { role: 'user' | 'assistant'; content: string }

/**
 * Appel à l'API Anthropic avec le bloc système She Closes (mis en cache),
 * réessais sur surcharge et repli automatique sur le modèle standard.
 */
export async function appelerClaudeMessages(
  messages: MessageClaude[],
  maxTokens: number,
  systemeEnPlus = '',
  modele = MODELE_ANALYSE,
  essai = 1,
): Promise<{ texte: string; modele: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Clé API Anthropic manquante (ANTHROPIC_API_KEY).')

  const system: Array<Record<string, unknown>> = [
    { type: 'text', text: SYSTEME, cache_control: { type: 'ephemeral' } },
  ]
  if (systemeEnPlus) system.push({ type: 'text', text: systemeEnPlus })

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: modele, max_tokens: maxTokens, system, messages }),
    })
  } catch (e) {
    if (essai < 3) return appelerClaudeMessages(messages, maxTokens, systemeEnPlus, modele, essai + 1)
    throw new Error(`Connexion à Anthropic impossible : ${e instanceof Error ? e.message : e}`)
  }

  if (!res.ok) {
    const err = await res.text()
    console.error(`[coach] Anthropic ${res.status} (${modele}, essai ${essai}) : ${err.slice(0, 500)}`)
    if ([429, 500, 502, 503, 529].includes(res.status)) {
      if (essai < 2) { await new Promise(r => setTimeout(r, 4000)); return appelerClaudeMessages(messages, maxTokens, systemeEnPlus, modele, essai + 1) }
      if (modele !== MODELE_REPLI) return appelerClaudeMessages(messages, maxTokens, systemeEnPlus, MODELE_REPLI, 1)
    }
    if (modele !== MODELE_REPLI && (res.status === 404 || res.status === 400)) {
      return appelerClaudeMessages(messages, maxTokens, systemeEnPlus, MODELE_REPLI, 1)
    }
    if (res.status === 401) throw new Error('Clé Anthropic refusée : vérifie ANTHROPIC_API_KEY dans Vercel.')
    throw new Error(`Erreur Anthropic (${res.status}) : ${err.slice(0, 300)}`)
  }
  const json = await res.json() as { content: Array<{ type: string; text: string }> }
  return { texte: json.content.filter(b => b.type === 'text').map(b => b.text).join(''), modele }
}
