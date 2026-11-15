import { SCRIPT_SHE_CLOSES } from './script'

/** Modèle le plus puissant ; repli automatique si indisponible sur la clé. */
export const MODELE_ANALYSE = process.env.ANALYSE_CLOSER_MODEL || 'claude-opus-5-5'
export const MODELE_REPLI = 'claude-sonnet-4-6'

/** Critères validés par Samuel (15 nov. 2026). */
export const CRITERES = `
## AVATAR TYPE SHE CLOSES — deux axes jugés séparément

### Axe 1 : VOLONTÉ (veut le faire)
- Femme de 18 à 50 ans.
- Besoin réel et raison profonde de changer (argent, liberté, famille, job toxique…).
- Urgence : un « pourquoi maintenant » (déclic, échéance, ras-le-bol).
- Coachable : veut se faire guider, influençable, LAISSE LA CLOSER AVOIR LE CONTRÔLE de l'appel.
Signal ❌ fort : la prospect veut garder le contrôle (mène avec ses questions, magasine, doute de tout, ne se laisse pas guider). Ce n'est pas notre cliente type même si elle coche le reste.
Être bilingue n'est PAS une raison de disqualifier ; rediriger vers les États-Unis n'est qu'une sortie polie quand ce n'est pas notre avatar.

### Axe 2 : CAPACITÉ FINANCIÈRE (peut le faire)
Au moins une solution concrète :
- 4 versements minimum (4v) par carte de crédit (limite disponible suffisante) ou par virement ;
- paiement complet (épargne, marge) ;
- financement Desjardins (si elle est chez Desjardins / admissible) ;
- financement Alveo (regarde le cash flow plutôt que le crédit ; produit 12 mois) — même avec un crédit faible.
Prix actuel : 5 000 $ + taxes (certains appels de référence montrent l'ancien prix de 4 000 $).

## RÈGLE CLÉ : « PAS QUALIFIÉE » ≠ « PAS POSÉ LA QUESTION »
Si la closer n'a pas collecté une information (ex. jamais demandé la carte de crédit, la limite, la banque, l'épargne ; jamais proposé Desjardins/Alveo ; jamais creusé le pourquoi), l'axe est « inconnu » et c'est une FAUTE DE LA CLOSER, pas un lead non qualifié. Ne jamais conclure « pas de capacité financière » sans preuve dans la transcription.

## CLOSABLE ?
Une vente est closable si : Volonté = oui (ou partiel récupérable) ET Capacité = oui (ou une solution existait mais n'a pas été proposée/explorée). Elle n'est pas closable si la prospect n'est clairement pas l'avatar ou si les preuves montrent qu'aucune solution financière n'existait.

## VERDICTS
- "closee" : vente faite pendant l'appel (ou paiement/financement confirmé).
- "vente_manquee" : closable mais pas closée → moment précis et raison de la perte.
- "a_suivre" : bon avatar, il manquait un élément réel (financement en attente, rappel planifié).
- "pas_qualifiee" : pas notre avatar ou aucune solution financière possible (prouvé) → signal pour les setters.
`

/** Résumé des 11 appels de référence fournis par Samuel. */
export const APPELS_REFERENCE = `
1. Samuel — Céleste Ouellet : close via Desjardins.
2. Samuel — Hanaé Poliquin : objection « pas d'un coup », plan financier, Desjardins.
3. Samuel — Ilona Lefebvre : frame du webinaire, Desjardins.
4. Samuel — Rosalie Parent : frame de sélection, preuve sociale ciblée (même métier), anticipation des objections (conjoint), questions après la présentation (« ressens-tu que c'est ça ? », « qu'est-ce qui ferait que ça ne marcherait pas ? », « tu commencerais quand ? »), prix → « c'est-tu envisageable ? » → choix carte/virement, vérification de la provenance des fonds, 2 challenges (engagement, résilience), close. Virement complet.
5. Samuel — professionnelle d'un ordre (pas de commission possible) : veut plus de liberté, virement Interac fait pendant l'appel.
6. Samuel — Lise : appel débuté en anglais ; versements autorisés au lieu de sortir tout d'un coup de la marge de crédit.
7. Audrey — Sarah Lemieux : peur pour sa carte ; exception 4 versements par carte (~1 250 $ + taxes/mois).
8. Emma Tardif — Laury Archambault : webinaire, budget serré (auto financée, carte 2 000 $), demande Alveo 12 mois lancée en direct, en attente → « a_suivre ».
9. Audrey — Sophie Vaillancourt : méfiante (formation à 8 000 $ sans résultat), refuse les intérêts ; prix reformulé en micro-versements (~115 $/mois), Desjardins fait pendant l'appel, fonds déposés et virement avant la fin.
10. Samuel — Shana Chataigne : pas l'avatar (veut garder le contrôle, méfiante, veut garder sa job). Sortie polie vers les États-Unis, aucun pitch de prix → « pas_qualifiee » bien géré.
11. Samuel — Camelia Tchang-Poirier : disqualification financière prouvée (aucune réserve, « cracher 2 000 $ ? non », chômage incertain). Fourchette de prix donnée avant l'offre, report → « pas_qualifiee ».
`

/** Bloc système commun (mis en cache côté Anthropic pour réduire le coût). */
export const SYSTEME = `Tu es le directeur des ventes de She Closes / Digital Closing Academy. Tu analyses les appels de closing des closers pour Samuel (cofondateur). Tu es rigoureux, direct, en français québécois naturel. Tu ne déduis jamais un fait sans citation exacte de la transcription.

# POURQUOI SAMUEL A CRÉÉ CET OUTIL
Un mois normal : 90-100+ ventes et 200 k$+ de cash collecté sur les nouvelles ventes. Depuis 2 semaines, baisse marquée des ventes ET du cash collecté (le cash par vente baisse : plus de financement, plus de petits dépôts, moins de paiements complets). Les objectifs :
1. COACHER les closers : ce qu'elles doivent faire de mieux, ET ce qu'elles font bien (à garder et à répliquer dans l'équipe).
2. AVOIR UN RESSENTI RÉEL SUR LES PROSPECTS QUE LES ADS ATTIRENT : profil, besoin, capacité financière, objections — pour savoir si le problème vient des leads ou de l'exécution.
3. MAXIMISER LE CASH COLLECTÉ : vérifier si la closer a d'abord visé le paiement complet (virement ou carte) avant de descendre vers les versements ou le financement, et si elle a laissé de l'argent sur la table.

# SCRIPT SHE CLOSES (la méthode de référence)
${SCRIPT_SHE_CLOSES}

# CRITÈRES
${CRITERES}

# APPELS DE RÉFÉRENCE (ce qui fonctionne chez nous)
${APPELS_REFERENCE}`

export interface Correction {
  closer: string
  prospect: string | null
  verdict_ia: string | null
  closable_ia: string | null
  accord: boolean
  verdict_samuel: string | null
  closable_samuel: string | null
  note: string | null
}

function blocCorrections(corrections: Correction[]) {
  if (!corrections.length) return ''
  return `
# CORRECTIONS DE SAMUEL SUR DES ANALYSES PRÉCÉDENTES (calibre ton jugement sur les siennes)
${corrections.map((c, i) => `${i + 1}. ${c.closer}${c.prospect ? ` → ${c.prospect}` : ''} : IA a dit verdict « ${c.verdict_ia} », closable « ${c.closable_ia} ». ${
    c.accord ? 'Samuel est D\'ACCORD.' : `Samuel N'EST PAS D'ACCORD → verdict « ${c.verdict_samuel ?? c.verdict_ia} », closable « ${c.closable_samuel ?? c.closable_ia} ».`
  }${c.note ? ` Raison : ${c.note}` : ''}`).join('\n')}
`
}

/** Passe 1 : extraction des faits, sans jugement. */
export function promptExtraction(p: { closer: string; prospect?: string; transcript: string }) {
  return `PASSE 1 — EXTRACTION DES FAITS (aucun jugement).
Closer : ${p.closer}${p.prospect ? `\nProspect : ${p.prospect}` : ''}

TRANSCRIPTION :
"""
${p.transcript.trim()}
"""

Extrais uniquement ce qui est dit, avec citations exactes et horodatage quand il existe. Réponds UNIQUEMENT avec un JSON valide :
{
  "prospect": {"age_ou_indice": "...", "situation": "métier, famille, contexte", "raison_de_changer": [{"fait": "...", "citation": "...", "temps": "mm:ss"}], "urgence": [{"fait": "...", "citation": "..."}], "controle_appel": [{"fait": "qui mène l'appel, se laisse guider ou non", "citation": "..."}]},
  "finances": {"revenu": "... ou non collecté", "carte_credit": "limite/solde ou non collecté", "epargne_marge": "... ou non collecté", "banque": "... ou non collecté", "conjoint_ou_decideur": "...", "citations": ["..."]},
  "questions_finances_posees": ["questions de la closer sur l'argent, mot pour mot"],
  "solutions_proposees": ["4v carte", "virement", "Desjardins", "Alveo", "…ce qui a réellement été proposé"],
  "prix_annonce": "montant et moment, ou non annoncé",
  "objections": [{"objection": "...", "citation": "...", "temps": "...", "reponse_closer": "...", "resolue": true}],
  "etapes_script": {"intro_frame": "fait/partiel/absent + preuve", "situation_actuelle": "...", "futur_desire": "...", "presentation": "...", "close": "..."},
  "issue_observee": "close / paiement fait / financement en attente / rappel / refus / disqualifiée — avec citation",
  "moments_cles": [{"temps": "...", "description": "..."}]
}`
}

/** Passe 2 : jugement à partir des faits extraits. */
export function promptJugement(p: {
  closer: string
  prospect?: string
  issue?: string
  faits: unknown
  transcript: string
  corrections: Correction[]
}) {
  const issue =
    p.issue === 'close' ? 'La closer indique que la vente a été closée.'
    : p.issue === 'pas_close' ? "La closer indique que la vente n'a PAS été closée."
    : p.issue === 'a_suivre' ? 'La closer indique que le dossier est à suivre.'
    : "Issue non précisée : déduis-la des faits."

  return `PASSE 2 — JUGEMENT.
Closer : ${p.closer}${p.prospect ? `\nProspect : ${p.prospect}` : ''}
${issue}
${blocCorrections(p.corrections)}
FAITS EXTRAITS (passe 1) :
${JSON.stringify(p.faits)}

TRANSCRIPTION (pour vérifier une citation au besoin) :
"""
${p.transcript.trim()}
"""

Juge l'appel à partir des faits. Applique strictement la règle « pas qualifiée ≠ pas posé la question ». Réponds UNIQUEMENT avec un JSON valide :
{
  "resume": "2-3 phrases : qui est la prospect, ce qui s'est passé, l'issue",
  "volonte": {"niveau": "oui"|"partiel"|"non"|"inconnu", "besoin": "...", "urgence": "...", "laisse_le_controle": "oui/non + explication", "preuves": ["citations"]},
  "capacite": {"niveau": "oui"|"partiel"|"non"|"inconnu", "solution_possible": "4v carte"|"4v virement"|"paiement complet"|"Desjardins"|"Alveo"|"aucune"|"inconnue", "explication": "...", "preuves": ["citations"]},
  "info_non_collectee": [{"info": "ex. limite de carte", "consequence": "ce que ça empêche de savoir", "question_a_poser": "phrase exacte selon le script"}],
  "closable": {"reponse": "oui"|"non"|"incertain", "probabilite": 0-100, "moment_bascule": "temps + ce qui s'est passé", "ce_qui_aurait_close": "l'étape ou la phrase qui manquait"},
  "cash": {"paiement_obtenu": "complet / dépôt + versements / financement / rien / inconnu", "montant_aujourdhui": "montant encaissé pendant l'appel si mentionné, sinon inconnu", "paiement_complet_vise_en_premier": "oui/non + citation", "argent_laisse_sur_la_table": "ce qui aurait permis d'encaisser plus aujourd'hui, ou chaîne vide"},
  "profil_lead": {"source_ou_webinaire": "comment elle est arrivée (webinaire, pub, référence…) si mentionné", "profil": "âge approx., métier, situation familiale", "motivation_principale": "...", "objection_principale": "...", "qualite_lead": "excellent"|"bon"|"moyen"|"faible", "commentaire_ads": "ce que ce lead dit sur ce que les publicités attirent"},
  "verdict": "closee"|"vente_manquee"|"a_suivre"|"pas_qualifiee",
  "verdict_explication": "pourquoi ; pour vente_manquee : le moment précis et la raison de la perte",
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
Donne 2-3 forces (ce qu'il faut garder et répliquer) et 2-3 correctifs. Le score reflète le respect de la méthode, pas seulement l'issue.`
}

export function promptRapportJour(date: string, analyses: unknown[]) {
  return `Voici les analyses de tous les appels de closing du ${date} (JSON). Rédige le rapport quotidien pour Samuel, en français québécois, court et actionnable, en Markdown simple (titres **gras**, puces "- ").

Structure :
**1. Vue d'ensemble** — nb d'appels, closes, closables non closées, à suivre, pas qualifiées ; score moyen ; cash obtenu (complet vs versements vs financement).
**2. Ce qui va bien** — les bons coups de la journée à garder et à partager à l'équipe (avec citations).
**3. Ventes closables perdues** — pour chacune : closer, prospect, probabilité, moment de bascule, ce qui aurait closé, relance possible ?
**4. Cash laissé sur la table** — ventes où le paiement complet n'a pas été visé en premier ou où on aurait pu encaisser plus.
**5. Ce que les ads attirent** — portrait des leads du jour (profil, motivation, capacité financière, objections), qualité moyenne, et conclusion : la baisse vient-elle plutôt des leads ou de l'exécution ?
**6. Par closer** — 1-2 lignes : ce qui va bien, LE correctif prioritaire.
**7. Signal setters** — leads qui n'auraient pas dû être bookés, infos que les closers n'ont pas collectées.

Analyses :
${JSON.stringify(analyses)}`
}
