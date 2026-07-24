'use server'

import { createClient } from '@/lib/supabase/server'

export async function analyserAppel(data: {
  callType:   'closer' | 'setter'
  personName: string
  transcript: string
}): Promise<{ feedback: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Clé API Anthropic manquante — contacte un admin.')

  const typeLabel  = data.callType === 'closer' ? 'CLOSING' : 'SETTING'
  const nameIntro  = data.personName.trim()
    ? `Le/La ${data.callType === 'closer' ? 'closer' : 'setter'} qui fait l'appel s'appelle **${data.personName.trim()}**.`
    : ''

  const closerGuide = `
Pour un appel de **closing**, évalue :
- **Rapport** : connexion établie, aisance de la prospect
- **Transition** : passage naturel vers le sujet business
- **Discovery** : profondeur des questions, douleur identifiée, budget abordé, urgence créée
- **Pitch** : clarté, pertinence par rapport à la discovery, enthousiasme
- **Objections** : écoute active, techniques utilisées, résolution
- **Close** : demande directe faite, persistance, résultat`

  const setterGuide = `
Pour un appel de **setting**, évalue :
- **Ouverture** : accroche, ton, création d'attention
- **Qualification** : critères vérifiés, fit évalué
- **Curiosité & désir** : intérêt créé pour le programme, urgence
- **Booking** : clarté du rendez-vous proposé, conviction
- **Confirmation & anti no-show** : confirmation solide, instructions données`

  const prompt = `Tu es un coach de vente senior chez She Closes / Digital Closing Academy. Tu analyses des transcriptions d'appels de vente high-ticket et tu donnes du feedback personnalisé, comme un manager bienveillant mais direct qui a entendu des milliers d'appels.

Il s'agit d'un appel de **${typeLabel}**.
${nameIntro}

${data.callType === 'closer' ? closerGuide : setterGuide}

**Ton style de feedback :**
- Chaleureux mais direct — tu tiens vraiment à la progression de la personne
- Tu cites des phrases exactes du transcript pour appuyer chaque point
- Tu donnes des scripts alternatifs concrets ("Au lieu de X, essaie Y")
- Tu es spécifique, pas générique
- Tu écris en français, de façon naturelle et conversationnelle

**Structure du feedback (rédige de façon fluide, pas comme un formulaire sec) :**

1. **Vue d'ensemble** — Ton impression générale (2-3 phrases directes)
2. **Ce qui a bien fonctionné** — 2-3 forces concrètes avec citations du transcript
3. **Points à améliorer** — 2-3 domaines prioritaires avec exemples précis et scripts alternatifs
4. **Moment(s) clé(s) à réécouter** — Si des timestamps ou moments précis sont identifiables dans le transcript
5. **Focus pour le prochain appel** — Une seule chose principale à pratiquer jusqu'au prochain coaching

---
**TRANSCRIPTION :**

${data.transcript.trim()}
---

Commence directement par le feedback. Pas d'introduction générique du style "Bien sûr, voici mon analyse...".`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Erreur Anthropic (${response.status}): ${err}`)
  }

  const json = await response.json() as {
    content: Array<{ type: string; text: string }>
  }

  const feedback = json.content.find(b => b.type === 'text')?.text ?? ''
  return { feedback }
}
