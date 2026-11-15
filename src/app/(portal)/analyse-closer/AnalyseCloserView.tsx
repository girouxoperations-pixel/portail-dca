'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Loader2, Plus, FileText, ChevronDown, ChevronRight, Trash2, ExternalLink, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyserAppelCloser, genererRapportJour, supprimerAnalyse } from './actions'

export interface AnalyseRow {
  id: string
  call_date: string
  closer_name: string
  prospect_name: string | null
  fathom_url: string | null
  issue: string | null
  verdict: string | null
  avatar: string | null
  solution: string | null
  score: number | null
  analysis: Analyse
  created_at: string
}
export interface RapportRow { report_date: string; content: string; nb_appels: number; created_at: string }

interface Analyse {
  resume?: string
  verdict_explication?: string
  avatar_preuves?: string[]
  solution_preuves?: string[]
  etapes?: { etape: string; note: number; commentaire: string }[]
  forces?: { point: string; citation?: string }[]
  correctifs?: { point: string; citation?: string; a_dire?: string }[]
  focus?: string
  signal_setter?: string
}

const VERDICT: Record<string, { label: string; cls: string }> = {
  closee:        { label: '✅ Closée',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  vente_manquee: { label: '🟢 Vente manquée', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  a_suivre:      { label: '🟡 À suivre',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pas_qualifiee: { label: '🔴 Pas qualifiée', cls: 'bg-red-50 text-red-700 border-red-200' },
}
const AVATAR: Record<string, string> = { oui: '✅ Avatar', partiel: '⚠️ Avatar partiel', non: '❌ Pas l’avatar' }

function aujourdhui() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date())
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
        if (/^[-•]\s/.test(t)) return (
          <div key={i} className="flex gap-2 ml-1"><ChevronRight size={12} className="text-violet-400 mt-1 shrink-0" /><p>{parts}</p></div>
        )
        return <p key={i}>{parts}</p>
      })}
    </div>
  )
}

function CarteAppel({ a }: { a: AnalyseRow }) {
  const [ouvert, setOuvert] = useState(false)
  const [pending, start] = useTransition()
  const v = a.verdict ? VERDICT[a.verdict] : null
  const an = a.analysis ?? {}

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
        {v && <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap', v.cls)}>{v.label}</span>}
        {a.score != null && <span className="text-sm font-bold text-violet-700 tabular-nums w-10 text-right">{a.score}</span>}
      </button>

      {ouvert && (
        <div className="px-5 pb-5 pt-1 space-y-4 text-sm border-t border-gray-50">
          <div className="flex flex-wrap gap-2 text-xs pt-3">
            {a.avatar && <span className="px-2 py-0.5 rounded bg-gray-100">{AVATAR[a.avatar]}</span>}
            {a.solution && <span className="px-2 py-0.5 rounded bg-gray-100">💳 {a.solution}</span>}
            {a.fathom_url && (
              <a href={a.fathom_url} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 inline-flex items-center gap-1">
                Fathom <ExternalLink size={11} />
              </a>
            )}
          </div>

          {an.verdict_explication && <p className="text-gray-700"><strong>Verdict : </strong>{an.verdict_explication}</p>}

          {(an.avatar_preuves?.length || an.solution_preuves?.length) ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {[['Avatar', an.avatar_preuves], ['Capacité financière', an.solution_preuves]].map(([titre, liste]) => (
                <div key={titre as string} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[11px] font-semibold uppercase text-gray-400 mb-1">{titre as string}</p>
                  {(liste as string[] | undefined)?.map((c, i) => <p key={i} className="text-xs italic text-gray-600">« {c} »</p>)}
                </div>
              ))}
            </div>
          ) : null}

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
              <p className="text-[11px] font-semibold uppercase text-emerald-600 mb-1">Forces</p>
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

          {an.focus && <p className="bg-violet-50 rounded-xl p-3 text-violet-900"><strong>🎯 Focus : </strong>{an.focus}</p>}
          {an.signal_setter && <p className="bg-red-50 rounded-xl p-3 text-red-800"><strong>Signal setter : </strong>{an.signal_setter}</p>}

          <button
            onClick={() => { if (confirm('Supprimer cette analyse ?')) start(() => supprimerAnalyse(a.id)) }}
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

export default function AnalyseCloserView({ analyses, rapports, closers }: {
  analyses: AnalyseRow[]; rapports: RapportRow[]; closers: string[]
}) {
  const router = useRouter()
  const [closer, setCloser] = useState('')
  const [prospect, setProspect] = useState('')
  const [callDate, setCallDate] = useState(aujourdhui())
  const [fathomUrl, setFathomUrl] = useState('')
  const [issue, setIssue] = useState<'' | 'close' | 'pas_close' | 'a_suivre'>('')
  const [transcript, setTranscript] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [analysing, startAnalyse] = useTransition()
  const [reporting, startRapport] = useTransition()

  const jours = useMemo(() => {
    const s = new Set([...analyses.map(a => a.call_date), ...rapports.map(r => r.report_date)])
    return [...s].sort().reverse()
  }, [analyses, rapports])
  const [jour, setJour] = useState<string>(jours[0] ?? aujourdhui())

  const duJour = analyses.filter(a => a.call_date === jour)
  const rapport = rapports.find(r => r.report_date === jour)
  const compte = (v: string) => duJour.filter(a => a.verdict === v).length

  function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    startAnalyse(async () => {
      try {
        await analyserAppelCloser({ closer, prospect, callDate, fathomUrl, issue, transcript })
        setTranscript(''); setProspect(''); setFathomUrl(''); setIssue('')
        setJour(callDate)
        router.refresh()
      } catch (err) {
        setErreur(err instanceof Error ? err.message : 'Erreur inattendue')
      }
    })
  }

  function rapportJour() {
    setErreur(null)
    startRapport(async () => {
      try { await genererRapportJour(jour); router.refresh() }
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
          <p className="text-sm text-gray-500">Les appels des closers comparés à la méthode She Closes. Visible seulement par toi.</p>
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
            {analysing ? <><Loader2 size={15} className="animate-spin" /> Analyse en cours (1-2 min)…</> : <><Brain size={15} /> Analyser l&apos;appel</>}
          </button>
        </form>

        {/* Rapport du jour */}
        <div className="space-y-4">
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
        </div>
      </div>
    </div>
  )
}
