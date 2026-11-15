'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Brain, Loader2, Plus, FileText, ChevronDown, ChevronRight, Trash2, ExternalLink, RefreshCw,
  ThumbsUp, ThumbsDown, BarChart3, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { extraireFaits, analyserAppelCloser, genererRapportJour, supprimerAnalyse, donnerFeedback } from './actions'

export interface AnalyseRow {
  id: string
  call_date: string
  closer_name: string
  prospect_name: string | null
  fathom_url: string | null
  issue: string | null
  verdict: string | null
  avatar: string | null
  volonte: string | null
  capacite: string | null
  closable: string | null
  closable_pct: number | null
  info_manquante: boolean | null
  solution: string | null
  score: number | null
  analysis: Analyse
  samuel_accord: boolean | null
  samuel_verdict: string | null
  samuel_closable: string | null
  samuel_note: string | null
  created_at: string
}
export interface RapportRow { report_date: string; content: string; nb_appels: number; created_at: string }

interface Axe { niveau?: string; preuves?: string[]; explication?: string; besoin?: string; urgence?: string; laisse_le_controle?: string; solution_possible?: string }
interface Analyse {
  resume?: string
  verdict_explication?: string
  volonte?: Axe
  capacite?: Axe
  info_non_collectee?: { info: string; consequence?: string; question_a_poser?: string }[]
  closable?: { reponse?: string; probabilite?: number; moment_bascule?: string; ce_qui_aurait_close?: string }
  etapes?: { etape: string; note: number; commentaire: string }[]
  forces?: { point: string; citation?: string }[]
  correctifs?: { point: string; citation?: string; a_dire?: string }[]
  focus?: string
  signal_setter?: string
  cash?: { paiement_obtenu?: string; montant_aujourdhui?: string; paiement_complet_vise_en_premier?: string; argent_laisse_sur_la_table?: string }
  profil_lead?: { source_ou_webinaire?: string; profil?: string; motivation_principale?: string; objection_principale?: string; qualite_lead?: string; commentaire_ads?: string }
}

const VERDICT: Record<string, { label: string; cls: string }> = {
  closee:        { label: '✅ Closée',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  vente_manquee: { label: '🟢 Vente manquée', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  a_suivre:      { label: '🟡 À suivre',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pas_qualifiee: { label: '🔴 Pas qualifiée', cls: 'bg-red-50 text-red-700 border-red-200' },
}
const NIVEAU: Record<string, { label: string; cls: string }> = {
  oui:     { label: '✅ Oui',     cls: 'text-emerald-700' },
  partiel: { label: '⚠️ Partiel', cls: 'text-amber-700' },
  non:     { label: '❌ Non',     cls: 'text-red-700' },
  inconnu: { label: '❓ Info non collectée', cls: 'text-gray-500' },
}
const CLOSABLE: Record<string, string> = { oui: '🎯 Closable', non: '⛔ Pas closable', incertain: '❔ Incertain' }

/** Valeurs finales : la correction de Samuel l'emporte sur l'IA. */
const verdictFinal = (a: AnalyseRow) => (a.samuel_accord === false && a.samuel_verdict) || a.verdict
const closableFinal = (a: AnalyseRow) => (a.samuel_accord === false && a.samuel_closable) || a.closable

function aujourdhui() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date())
}
function dateIlYA(jours: number) {
  return new Date(Date.now() - jours * 86400000).toISOString().slice(0, 10)
}
function dateLongue(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm text-gray-800 leading-relaxed">
      {text.split('\n').map((line, i) => {
        const t = line.trim()
        if (!t) return <div key={i} className="h-2" />
        const parts = t.replace(/^[-•]\s*/, '').split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j} className="font-semibold text-gray-900">{p.slice(2, -2)}</strong>
            : <span key={j}>{p}</span>)
        if (/^\*\*.+\*\*$/.test(t)) return <h3 key={i} className="font-bold text-gray-900 mt-4">{t.slice(2, -2)}</h3>
        if (/^#+\s/.test(t)) return <h3 key={i} className="font-bold text-gray-900 mt-4">{t.replace(/^#+\s/, '')}</h3>
        if (/^[-•]\s/.test(t)) return (
          <div key={i} className="flex gap-2 ml-1"><ChevronRight size={12} className="text-violet-400 mt-1 shrink-0" /><p>{parts}</p></div>
        )
        return <p key={i}>{parts}</p>
      })}
    </div>
  )
}

function BlocAxe({ titre, axe }: { titre: string; axe?: Axe }) {
  const n = axe?.niveau ? NIVEAU[axe.niveau] : null
  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase text-gray-400">{titre}</p>
        {n && <span className={cn('text-xs font-semibold', n.cls)}>{n.label}</span>}
      </div>
      {axe?.besoin && <p className="text-xs text-gray-700"><strong>Besoin : </strong>{axe.besoin}</p>}
      {axe?.urgence && <p className="text-xs text-gray-700"><strong>Urgence : </strong>{axe.urgence}</p>}
      {axe?.laisse_le_controle && <p className="text-xs text-gray-700"><strong>Laisse le contrôle : </strong>{axe.laisse_le_controle}</p>}
      {axe?.solution_possible && <p className="text-xs text-gray-700"><strong>Solution : </strong>{axe.solution_possible}</p>}
      {axe?.explication && <p className="text-xs text-gray-700">{axe.explication}</p>}
      {axe?.preuves?.map((c, i) => <p key={i} className="text-xs italic text-gray-500">« {c} »</p>)}
    </div>
  )
}

function Feedback({ a }: { a: AnalyseRow }) {
  const [mode, setMode] = useState<'ferme' | 'desaccord'>('ferme')
  const [verdict, setVerdict] = useState(a.verdict ?? '')
  const [closable, setClosable] = useState(a.closable ?? '')
  const [note, setNote] = useState(a.samuel_note ?? '')
  const [pending, start] = useTransition()
  const router = useRouter()

  const envoyer = (accord: boolean) => start(async () => {
    const r = await donnerFeedback({ id: a.id, accord, verdict: accord ? null : verdict, closable: accord ? null : closable, note })
    if (!r.ok) { alert(r.erreur); return }
    setMode('ferme')
    router.refresh()
  })

  if (a.samuel_accord !== null && mode === 'ferme') {
    return (
      <div className="bg-violet-50 rounded-xl p-3 text-xs text-violet-900 flex items-start justify-between gap-3">
        <p>
          {a.samuel_accord ? '👍 Tu es d’accord avec l’analyse.' : `👎 Corrigé : ${VERDICT[a.samuel_verdict ?? '']?.label ?? '—'} · ${CLOSABLE[a.samuel_closable ?? ''] ?? '—'}`}
          {a.samuel_note && <span className="block mt-1 italic">« {a.samuel_note} »</span>}
        </p>
        <button onClick={() => setMode('desaccord')} className="underline shrink-0">Modifier</button>
      </div>
    )
  }

  return (
    <div className="border border-violet-100 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-violet-900">Ton jugement (l’IA apprend de tes corrections)</p>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Pourquoi ? (optionnel, mais c’est ce qui l’entraîne le mieux)"
        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg resize-none" />
      {mode === 'desaccord' && (
        <div className="grid grid-cols-2 gap-2">
          <select value={verdict} onChange={e => setVerdict(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg">
            {Object.entries(VERDICT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={closable} onChange={e => setClosable(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg">
            {Object.entries(CLOSABLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        {mode === 'ferme' ? (
          <>
            <button disabled={pending} onClick={() => envoyer(true)} className="flex-1 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 inline-flex items-center justify-center gap-1"><ThumbsUp size={12} /> D’accord</button>
            <button disabled={pending} onClick={() => setMode('desaccord')} className="flex-1 py-1.5 text-xs rounded-lg bg-red-50 text-red-700 inline-flex items-center justify-center gap-1"><ThumbsDown size={12} /> Pas d’accord</button>
          </>
        ) : (
          <button disabled={pending} onClick={() => envoyer(false)} className="flex-1 py-1.5 text-xs rounded-lg bg-violet-600 text-white inline-flex items-center justify-center gap-1">
            {pending && <Loader2 size={12} className="animate-spin" />} Enregistrer ma correction
          </button>
        )}
      </div>
    </div>
  )
}

function CarteAppel({ a }: { a: AnalyseRow }) {
  const [ouvert, setOuvert] = useState(false)
  const [pending, start] = useTransition()
  const vf = verdictFinal(a)
  const v = vf ? VERDICT[vf] : null
  const an = a.analysis ?? {}
  const cl = an.closable

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOuvert(o => !o)} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50">
        {ouvert ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {a.closer_name}{a.prospect_name && <span className="font-normal text-gray-500"> → {a.prospect_name}</span>}
          </p>
          <p className="text-xs text-gray-500 truncate">{an.resume}</p>
        </div>
        {closableFinal(a) && (
          <span className="hidden sm:inline text-[11px] text-gray-600 whitespace-nowrap">
            {CLOSABLE[closableFinal(a)!]}{a.closable_pct != null && ` ${a.closable_pct}%`}
          </span>
        )}
        {v && <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap', v.cls)}>{v.label}</span>}
        {a.samuel_accord !== null && <span className="text-xs">{a.samuel_accord ? '👍' : '✏️'}</span>}
        {a.score != null && <span className="text-sm font-bold text-violet-700 tabular-nums w-8 text-right">{a.score}</span>}
      </button>

      {ouvert && (
        <div className="px-5 pb-5 pt-3 space-y-4 text-sm border-t border-gray-50">
          {a.fathom_url && (
            <a href={a.fathom_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700 inline-flex items-center gap-1">
              Fathom <ExternalLink size={11} />
            </a>
          )}

          {/* Question 2 : avatar = volonté + capacité */}
          <div>
            <p className="text-[11px] font-semibold uppercase text-gray-400 mb-1.5">Est-ce notre avatar ?</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <BlocAxe titre="Volonté (veut le faire)" axe={an.volonte} />
              <BlocAxe titre="Capacité financière (peut le faire)" axe={an.capacite} />
            </div>
          </div>

          {an.info_non_collectee?.length ? (
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-[11px] font-semibold uppercase text-red-600 mb-1">Info non collectée → faute de la closer</p>
              {an.info_non_collectee.map((x, i) => (
                <div key={i} className="mb-1.5 text-xs text-red-900">
                  <p>• <strong>{x.info}</strong>{x.consequence && ` — ${x.consequence}`}</p>
                  {x.question_a_poser && <p className="ml-3 text-emerald-700">À demander : « {x.question_a_poser} »</p>}
                </div>
              ))}
            </div>
          ) : null}

          {/* Question 1 : closable ? */}
          {cl && (
            <div className="bg-violet-50 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase text-violet-500">La vente était-elle closable ?</p>
                <span className="text-sm font-bold text-violet-900">{CLOSABLE[cl.reponse ?? ''] ?? '—'}{cl.probabilite != null && ` · ${cl.probabilite}%`}</span>
              </div>
              {cl.moment_bascule && <p className="text-xs text-violet-900"><strong>Moment de bascule : </strong>{cl.moment_bascule}</p>}
              {cl.ce_qui_aurait_close && <p className="text-xs text-violet-900"><strong>Ce qui aurait closé : </strong>{cl.ce_qui_aurait_close}</p>}
            </div>
          )}

          {(an.cash || an.profil_lead) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {an.cash && (
                <div className="bg-emerald-50 rounded-xl p-3 space-y-1 text-xs text-emerald-950">
                  <p className="text-[11px] font-semibold uppercase text-emerald-600">Cash</p>
                  {an.cash.paiement_obtenu && <p><strong>Obtenu : </strong>{an.cash.paiement_obtenu}{an.cash.montant_aujourdhui && an.cash.montant_aujourdhui !== 'inconnu' && ` (${an.cash.montant_aujourdhui})`}</p>}
                  {an.cash.paiement_complet_vise_en_premier && <p><strong>Paiement complet visé en premier : </strong>{an.cash.paiement_complet_vise_en_premier}</p>}
                  {an.cash.argent_laisse_sur_la_table && <p className="text-orange-700"><strong>Laissé sur la table : </strong>{an.cash.argent_laisse_sur_la_table}</p>}
                </div>
              )}
              {an.profil_lead && (
                <div className="bg-sky-50 rounded-xl p-3 space-y-1 text-xs text-sky-950">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase text-sky-600">Ce que les ads attirent</p>
                    {an.profil_lead.qualite_lead && <span className="font-semibold">Lead {an.profil_lead.qualite_lead}</span>}
                  </div>
                  {an.profil_lead.source_ou_webinaire && <p><strong>Source : </strong>{an.profil_lead.source_ou_webinaire}</p>}
                  {an.profil_lead.profil && <p><strong>Profil : </strong>{an.profil_lead.profil}</p>}
                  {an.profil_lead.motivation_principale && <p><strong>Motivation : </strong>{an.profil_lead.motivation_principale}</p>}
                  {an.profil_lead.objection_principale && <p><strong>Objection : </strong>{an.profil_lead.objection_principale}</p>}
                  {an.profil_lead.commentaire_ads && <p className="italic">{an.profil_lead.commentaire_ads}</p>}
                </div>
              )}
            </div>
          )}

          {an.verdict_explication && <p className="text-gray-700"><strong>Verdict : </strong>{an.verdict_explication}</p>}

          {an.etapes?.length ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase text-gray-400">Étapes du script</p>
              {an.etapes.map((e, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-12 shrink-0 text-xs font-bold tabular-nums text-violet-700">{e.note}/10</span>
                  <p className="text-xs text-gray-700"><strong>{e.etape}</strong> — {e.commentaire}</p>
                </div>
              ))}
            </div>
          ) : null}

          {an.forces?.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase text-emerald-600 mb-1">Ce qui va bien (à garder)</p>
              {an.forces.map((f, i) => (
                <div key={i} className="mb-2">
                  <p className="text-gray-800">• {f.point}</p>
                  {f.citation && <p className="text-xs italic text-gray-500 ml-3">« {f.citation} »</p>}
                </div>
              ))}
            </div>
          ) : null}

          {an.correctifs?.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase text-orange-600 mb-1">Correctifs</p>
              {an.correctifs.map((c, i) => (
                <div key={i} className="mb-2">
                  <p className="text-gray-800">• {c.point}</p>
                  {c.citation && <p className="text-xs italic text-gray-500 ml-3">Dit : « {c.citation} »</p>}
                  {c.a_dire && <p className="text-xs text-emerald-700 ml-3">À dire : « {c.a_dire} »</p>}
                </div>
              ))}
            </div>
          ) : null}

          {an.focus && <p className="bg-gray-50 rounded-xl p-3 text-gray-900"><strong>🎯 Focus : </strong>{an.focus}</p>}
          {an.signal_setter && <p className="bg-red-50 rounded-xl p-3 text-red-800"><strong>Signal setter : </strong>{an.signal_setter}</p>}

          <Feedback a={a} />

          <button
            onClick={() => { if (confirm('Supprimer cette analyse ?')) start(async () => { const r = await supprimerAnalyse(a.id); if (!r.ok) alert(r.erreur) }) }}
            disabled={pending}
            className="text-xs text-gray-400 hover:text-red-600 inline-flex items-center gap-1"
          >
            <Trash2 size={12} /> Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

function TableauClosers({ analyses }: { analyses: AnalyseRow[] }) {
  const [jours, setJours] = useState(30)
  const lignes = useMemo(() => {
    const limite = dateIlYA(jours)
    const parCloser = new Map<string, AnalyseRow[]>()
    for (const a of analyses) {
      if (a.call_date < limite) continue
      parCloser.set(a.closer_name, [...(parCloser.get(a.closer_name) ?? []), a])
    }
    return [...parCloser.entries()].map(([closer, rows]) => {
      const closees = rows.filter(r => verdictFinal(r) === 'closee').length
      const closables = rows.filter(r => closableFinal(r) === 'oui' || verdictFinal(r) === 'closee').length
      const perdues = rows.filter(r => closableFinal(r) === 'oui' && verdictFinal(r) !== 'closee').length
      const avatars = rows.filter(r => r.volonte === 'oui' && r.capacite === 'oui').length
      const infos = rows.filter(r => r.info_manquante).length
      const scores = rows.map(r => r.score).filter((s): s is number => s != null)
      return {
        closer, appels: rows.length, closees, closables, perdues, avatars, infos,
        tauxClosables: closables ? Math.round((closees / closables) * 100) : null,
        score: scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : null,
      }
    }).sort((a, b) => b.perdues - a.perdues)
  }, [analyses, jours])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Performance par closer</p>
        <select value={jours} onChange={e => setJours(Number(e.target.value))} className="px-2 py-1 text-xs border border-gray-200 rounded-lg">
          <option value={7}>7 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={45}>45 derniers jours</option>
        </select>
      </div>
      {lignes.length === 0 ? <p className="text-sm text-gray-400">Aucun appel analysé sur cette période.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">Closer</th>
                <th className="py-2 px-2 font-medium text-right">Appels</th>
                <th className="py-2 px-2 font-medium text-right">Closées</th>
                <th className="py-2 px-2 font-medium text-right" title="Ventes closables qui n'ont pas été closées">Closables perdues</th>
                <th className="py-2 px-2 font-medium text-right" title="Closées ÷ appels closables">Taux sur closables</th>
                <th className="py-2 px-2 font-medium text-right" title="Volonté ET capacité = oui">Vrais avatars</th>
                <th className="py-2 px-2 font-medium text-right" title="Appels où une info clé n'a pas été collectée">Infos non collectées</th>
                <th className="py-2 pl-2 font-medium text-right">Score moy.</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(l => (
                <tr key={l.closer} className="border-b border-gray-50">
                  <td className="py-2 pr-3 font-semibold text-gray-900">{l.closer}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{l.appels}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{l.closees}</td>
                  <td className={cn('py-2 px-2 text-right tabular-nums font-semibold', l.perdues ? 'text-orange-600' : 'text-gray-400')}>{l.perdues}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{l.tauxClosables != null ? `${l.tauxClosables}%` : '—'}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{l.avatars}/{l.appels}</td>
                  <td className={cn('py-2 px-2 text-right tabular-nums', l.infos ? 'text-red-600' : 'text-gray-400')}>{l.infos}</td>
                  <td className="py-2 pl-2 text-right tabular-nums font-bold text-violet-700">{l.score ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-gray-400">Tes corrections remplacent le jugement de l’IA dans ce tableau.</p>
    </div>
  )
}

export default function AnalyseCloserView({ analyses, rapports, closers }: {
  analyses: AnalyseRow[]; rapports: RapportRow[]; closers: string[]
}) {
  const router = useRouter()
  const [onglet, setOnglet] = useState<'jour' | 'closers'>('jour')
  const [closer, setCloser] = useState('')
  const [prospect, setProspect] = useState('')
  const [callDate, setCallDate] = useState(aujourdhui())
  const [fathomUrl, setFathomUrl] = useState('')
  const [issue, setIssue] = useState<'' | 'close' | 'pas_close' | 'a_suivre'>('')
  const [transcript, setTranscript] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [etape, setEtape] = useState<0 | 1 | 2>(0)
  const [analysing, startAnalyse] = useTransition()
  const [reporting, startRapport] = useTransition()

  const jours = useMemo(() => {
    const s = new Set([...analyses.map(a => a.call_date), ...rapports.map(r => r.report_date)])
    return [...s].sort().reverse()
  }, [analyses, rapports])
  const [jour, setJour] = useState<string>(jours[0] ?? aujourdhui())

  const duJour = analyses.filter(a => a.call_date === jour)
  const rapport = rapports.find(r => r.report_date === jour)
  const compte = (v: string) => duJour.filter(a => verdictFinal(a) === v).length

  function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    startAnalyse(async () => {
      try {
        setEtape(1)
        const f = await extraireFaits({ closer, prospect, transcript })
        if (!f.ok) throw new Error(`Étape 1 (extraction) : ${f.erreur}`)
        setEtape(2)
        const r = await analyserAppelCloser({ closer, prospect, callDate, fathomUrl, issue, transcript, faits: f.data })
        if (!r.ok) throw new Error(`Étape 2 (jugement) : ${r.erreur}`)
        setTranscript(''); setProspect(''); setFathomUrl(''); setIssue('')
        setJour(callDate)
        setOnglet('jour')
        router.refresh()
      } catch (err) {
        setErreur(err instanceof Error ? err.message : 'Erreur inattendue')
      } finally {
        setEtape(0)
      }
    })
  }

  function rapportJour() {
    setErreur(null)
    startRapport(async () => {
      try {
        const r = await genererRapportJour(jour)
        if (!r.ok) throw new Error(r.erreur)
        router.refresh()
      }
      catch (err) { setErreur(err instanceof Error ? err.message : 'Erreur inattendue') }
    })
  }

  const champ = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500'

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-200">
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyse-closer</h1>
          <p className="text-sm text-gray-500">Était-ce notre avatar ? La vente était-elle closable ? Visible seulement par toi.</p>
        </div>
      </div>

      {erreur && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">{erreur}</div>}

      <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* Formulaire */}
        <form onSubmit={soumettre} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 lg:sticky lg:top-20">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Plus size={13} /> Ajouter un appel</p>
          <div className="grid grid-cols-2 gap-2">
            <input list="closers-liste" value={closer} onChange={e => setCloser(e.target.value)} placeholder="Closer" className={champ} required />
            <datalist id="closers-liste">{closers.map(c => <option key={c} value={c} />)}</datalist>
            <input value={prospect} onChange={e => setProspect(e.target.value)} placeholder="Prospect" className={champ} />
            <input type="date" value={callDate} onChange={e => setCallDate(e.target.value)} className={champ} />
            <select value={issue} onChange={e => setIssue(e.target.value as typeof issue)} className={champ}>
              <option value="">Issue : à déduire</option>
              <option value="close">Closée</option>
              <option value="pas_close">Pas closée</option>
              <option value="a_suivre">À suivre</option>
            </select>
          </div>
          <input value={fathomUrl} onChange={e => setFathomUrl(e.target.value)} placeholder="Lien Fathom (optionnel)" className={champ} />
          <textarea
            value={transcript} onChange={e => setTranscript(e.target.value)} rows={10}
            placeholder="Colle ici la transcription Fathom complète…"
            className={cn(champ, 'resize-none font-mono text-xs leading-relaxed')}
          />
          <button
            type="submit" disabled={analysing || transcript.trim().length < 500 || !closer.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white disabled:bg-gray-100 disabled:text-gray-300"
          >
            {analysing
              ? <><Loader2 size={15} className="animate-spin" /> {etape === 1 ? 'Étape 1/2 : extraction des faits…' : 'Étape 2/2 : jugement…'}</>
              : <><Brain size={15} /> Analyser l&apos;appel</>}
          </button>
          {analysing && <p className="text-[11px] text-gray-400 text-center">Analyse approfondie : 2 à 4 minutes. Garde la page ouverte.</p>}
        </form>

        <div className="space-y-4">
          <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit">
            {([['jour', 'Rapport du jour', CalendarDays], ['closers', 'Par closer', BarChart3]] as const).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setOnglet(k)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1.5', onglet === k ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {onglet === 'closers' ? <TableauClosers analyses={analyses} /> : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={jour} onChange={e => setJour(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white capitalize">
                  {(jours.length ? jours : [jour]).map(j => <option key={j} value={j}>{dateLongue(j)}</option>)}
                </select>
                <div className="flex gap-1.5 text-xs flex-wrap">
                  {Object.entries(VERDICT).map(([k, v]) => (
                    <span key={k} className={cn('px-2 py-1 rounded-full border', v.cls)}>{v.label} · {compte(k)}</span>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2"><FileText size={15} className="text-violet-600" /> Rapport du jour</p>
                  <button
                    onClick={rapportJour} disabled={reporting || !duJour.length}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {reporting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    {rapport ? 'Regénérer' : 'Générer le rapport'}
                  </button>
                </div>
                {rapport
                  ? <Markdown text={rapport.content} />
                  : <p className="text-sm text-gray-400">{duJour.length ? 'Aucun rapport encore pour cette journée.' : 'Aucun appel analysé pour cette journée.'}</p>}
              </div>

              <div className="space-y-2">
                {duJour.map(a => <CarteAppel key={a.id} a={a} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
