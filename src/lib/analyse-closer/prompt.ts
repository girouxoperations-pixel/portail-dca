import { SCRIPT_SHE_CLOSES } from './script'

export const MODELE_ANALYSE = process.env.ANALYSE_CLOSER_MODEL || 'claude-sonnet-4-6'

/** Critères validés par Samuel (15 nov. 2026). */
export const CRITERES = `
## AVATAR TYPE SHE CLOSES
- Femme de 18 à 50 ans.
- Veut changer sa situation et a un besoin réel.
- Veut se faire guider ; influençable.
- Laisse la closer avoir le contrôle de l'appel.
Signal ❌ fort : la prospect veut garder le contrôle de l'appel (mène avec ses questions, magasine, doute de tout, ne se laisse pas guider). Ce n'est pas notre cliente type, même si elle coche le reste.
Être bilingue n'est PAS une raison de disqualifier ; rediriger vers les États-Unis n'est qu'une sortie polie quand ce n'est pas notre avatar.

## CAPACITÉ FINANCIÈRE (solution faisable)
Au moins une option :
- un plan de 4 versements minimum (4v), par carte de crédit ou par virement ;
- une solution de financement : Desjardins, ou Alveo (regarde le cash flow plutôt que le crédit ; produit 12 mois).
Prix actuel : 5 000 $ + taxes (certains appels de référence montrent l'ancien prix de 4 000 $).

## VERDICTS
- "closee" : la vente a été faite pendant l'appel (ou paiement/financement confirmé).
- "vente_manquee" : bon avatar + solution faisable, mais pas closée → dire à quel moment et pourquoi l'appel a été perdu.
- "a_suivre" : bon avatar, mais il manquait un élément réel (ex. financement Alveo/Desjardins en attente, rappel planifié).
- "pas_qualifiee" : pas notre avatar ou aucune solution financière possible → signal pour les setters.
`

/** Résumé des 11 appels de référence fournis par Samuel. */
export const APPELS_REFERENCE = `
Appels modèles (ce qui fonctionne chez nous) :
1. Samuel — Céleste Ouellet : close via Desjardins.
2. Samuel — Hanaé Poliquin : objection « pas d'un coup », plan financier, Desjardins.
3. Samuel — Ilona Lefebvre : frame du webinaire, Desjardins.
4. Samuel — Rosalie Parent : frame de sélection, preuve sociale ciblée (même métier), anticipation des objections (conjoint), questions après la présentation (« ressens-tu que c'est ça ? », « qu'est-ce qui ferait que ça ne marcherait pas ? », « tu commencerais quand ? »), prix → « c'est-tu envisageable ? » → choix carte/virement, vérification de la provenance des fonds, 2 challenges (engagement, résilience), close. Virement complet.
5. Samuel — professionnelle d'un ordre (pas de commission possible) : veut plus de liberté, virement Interac fait pendant l'appel.
6. Samuel — Lise : appel débuté en anglais ; versements autorisés au lieu de sortir tout d'un coup de la marge de crédit.
7. Audrey — Sarah Lemieux : peur pour sa carte ; exception 4 versements par carte (~1 250 $ + taxes/mois).
8. Emma Tardif — Laury Archambault : webinaire, budget serré (auto financée, carte 2 000 $), demande Alveo 12 mois lancée en direct, en attente de sélection → exemple « a_suivre ».
9. Audrey — Sophie Vaillancourt : méfiante (formation à 8 000 $ sans résultat), refuse les intérêts ; prix reformulé en micro-versements (~115 $/mois), demande Desjardins faite pendant l'appel, fonds déposés et virement avant la fin.
10. Samuel — Shana Chataigne : disqualification. Voulait garder le contrôle (mène avec ses questions, méfiante, veut garder sa job). Sortie polie vers les États-Unis, aucun pitch de prix → « pas_qualifiee » bien géré.
11. Samuel — Camelia Tchang-Poirier : disqualification financière. Motivée mais aucune réserve (« cracher 2 000 $ ? non »). Fourchette de prix donnée avant l'offre, refus de la mettre en stress financier, report → « pas_qualifiee ».
`

export function promptAnalyse(params: {
  closer: string
  prospect?: string
  issue?: string
  transcript: string
}) {
  const issue =
    params.issue === 'close' ? 'La closer indique que la vente a été closée.'
    : params.issue === 'pas_close' ? "La closer indique que la vente n'a PAS été closée."
    : params.issue === 'a_suivre' ? 'La closer indique que le dossier est à suivre.'
    : "Issue de l'appel non précisée : déduis-la de la transcription."

  return `Tu es le directeur des ventes de She Closes / Digital Closing Academy. Tu analyses un appel de closing pour Samuel (cofondateur), qui veut savoir exactement ce que fait chaque closer comparé à la méthode She Closes qui fonctionne. Tu es direct, précis, en français québécois naturel, et tu cites toujours les phrases exactes de la transcription.

# SCRIPT SHE CLOSES (la méthode de référence)
${SCRIPT_SHE_CLOSES}

# CRITÈRES
${CRITERES}

# APPELS DE RÉFÉRENCE
${APPELS_REFERENCE}

# APPEL À ANALYSER
Closer : ${params.closer}
${params.prospect ? `Prospect : ${params.prospect}` : ''}
${issue}

TRANSCRIPTION :
"""
${params.transcript.trim()}
"""

# CE QUE TU DOIS RENDRE
Réponds UNIQUEMENT avec un objet JSON valide (sans texte autour, sans bloc de code), de cette forme :
{
  "resume": "2-3 phrases : qui est la prospect, ce qui s'est passé, l'issue",
  "verdict": "closee" | "vente_manquee" | "a_suivre" | "pas_qualifiee",
  "verdict_explication": "pourquoi ce verdict ; pour vente_manquee : le moment précis et la raison de la perte",
  "avatar": "oui" | "partiel" | "non",
  "avatar_preuves": ["citations exactes de la prospect qui justifient (âge, besoin, se laisse guider ou non)"],
  "solution_financiere": "4v carte" | "4v virement" | "paiement complet" | "Desjardins" | "Alveo" | "aucune" | "inconnue",
  "solution_preuves": ["citations sur sa capacité financière"],
  "score": 0-100,
  "etapes": [
    {"etape": "1. Intro / frame", "note": 0-10, "commentaire": "..."},
    {"etape": "2. Situation actuelle", "note": 0-10, "commentaire": "..."},
    {"etape": "3. Futur désiré", "note": 0-10, "commentaire": "..."},
    {"etape": "4. Présentation", "note": 0-10, "commentaire": "..."},
    {"etape": "5. Close / objections", "note": 0-10, "commentaire": "..."}
  ],
  "forces": [{"point": "...", "citation": "phrase exacte de la closer"}],
  "correctifs": [{"point": "...", "citation": "phrase exacte de la closer", "a_dire": "ce qu'il aurait fallu dire selon le script"}],
  "focus": "LA chose à travailler avant le prochain appel",
  "signal_setter": "si pas_qualifiee : ce que la setter aurait dû voir ; sinon chaîne vide"
}
Donne 2-3 forces et 2-3 correctifs. Le score reflète le respect de la méthode, pas seulement l'issue.`
}

export function promptRapportJour(date: string, analyses: unknown[]) {
  return `Tu es le directeur des ventes de She Closes. Voici les analyses IA de tous les appels de closing du ${date} (JSON). Rédige le rapport quotidien pour Samuel, en français québécois, court et actionnable, en Markdown simple (titres **gras**, puces "- ").

Structure :
**1. Vue d'ensemble** — nombre d'appels, closes, ventes manquées, à suivre, pas qualifiées ; score moyen.
**2. Ventes manquées** — pour chacune : closer, prospect, moment où ça a été perdu, quoi faire (relance possible ?).
**3. Par closer** — 1-2 lignes chacune : ce qui va bien, LE correctif prioritaire.
**4. Tendances** — erreurs qui reviennent dans l'équipe, à travailler en coaching.
**5. Signal setters** — prospects pas qualifiées qui n'auraient pas dû être bookées.

Analyses :
${JSON.stringify(analyses)}`
}
