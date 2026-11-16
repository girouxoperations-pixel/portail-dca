'use client'

import { useMemo, useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Loader2, Plus, Send, Trash2, ChevronRight, Users, User, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { poserQuestion, supprimerConversation } from './actions'

export interface Conversation { id: string; user_id: string; user_name: string | null; titre: string | null; created_at: string; updated_at: string }
export interface Message { id: string; conversation_id: string; role: 'user' | 'assistant'; content: string; created_at: string }

const EXEMPLES = [
  'La prospect dit qu’elle doit en parler à sa mère avant de signer le prêt Desjardins. Qu’est-ce que je dis?',
  'Elle me dit « je dois y penser » juste après le prix. Comment je l’isole?',
  'Elle n’a pas de carte de crédit et n’est pas chez Desjardins. Quelles options je présente, et comment?',
  'Comment je reprends le contrôle quand la prospect pose toutes les questions?',
]

function dateCourte(d: string) {
  return new Date(d).toLocaleString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {text.split('\n').map((line, i) => {
        const t = line.trim()
        if (!t) return <div key={i} className="h-1.5" />
        const enGras = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') && p.endsWith('**') ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>)
        const num = t.match(/^(\d+)[.)]\s+(.*)$/)
        if (num) return <div key={i} className="flex gap-2"><span className="font-semibold text-violet-600 w-4 shrink-0">{num[1]}.</span><p>{enGras(num[2])}</p></div>
        if (/^[-•*]\s/.test(t)) return <div key={i} className="flex gap-2 ml-1"><ChevronRight size={12} className="text-violet-400 mt-1 shrink-0" /><p>{enGras(t.replace(/^[-•*]\s*/, ''))}</p></div>
        if (/^#+\s/.test(t)) return <p key={i} className="font-semibold mt-2">{enGras(t.replace(/^#+\s/, ''))}</p>
        return <p key={i}>{enGras(t)}</p>
      })}
    </div>
  )
}

export default function CoachView({ moi, conversations, messages }: {
  moi: { id: string; nom: string; estSamuel: boolean }
  conversations: Conversation[]
  messages: Message[]
}) {
  const router = useRouter()
  const [vue, setVue] = useState<'moi' | 'equipe'>('moi')
  const [actif, setActif] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [extrait, setExtrait] = useState('')
  const [montrerExtrait, setMontrerExtrait] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()
  const [enAttente, setEnAttente] = useState<string | null>(null)
  const finRef = useRef<HTMLDivElement>(null)

  const miennes = conversations.filter(c => c.user_id === moi.id)
  const equipe = conversations.filter(c => c.user_id !== moi.id)
  const liste = vue === 'moi' ? miennes : equipe
  const parCloser = useMemo(() => {
    const m = new Map<string, Conversation[]>()
    for (const c of equipe) m.set(c.user_name ?? '—', [...(m.get(c.user_name ?? '—') ?? []), c])
    return [...m.entries()]
  }, [equipe])

  const conv = conversations.find(c => c.id === actif) ?? null
  const fil = messages.filter(m => m.conversation_id === actif)
  const lectureSeule = !!conv && conv.user_id !== moi.id

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [fil.length, enAttente])

  function envoyer(e?: React.FormEvent) {
    e?.preventDefault()
    if (!question.trim() || enCours) return
    setErreur(null)
    const q = question
    setEnAttente(q)
    demarrer(async () => {
      const r = await poserQuestion({ conversationId: lectureSeule ? null : actif, question: q, extrait: montrerExtrait ? extrait : '' })
      setEnAttente(null)
      if (!r.ok) { setErreur(r.erreur); return }
      setQuestion(''); setExtrait(''); setMontrerExtrait(false)
      setVue('moi'); setActif(r.data.conversationId)
      router.refresh()
    })
  }

  function supprimer(id: string) {
    if (!confirm('Supprimer cette conversation ?')) return
    demarrer(async () => {
      const r = await supprimerConversation(id)
      if (!r.ok) { setErreur(r.erreur); return }
      if (actif === id) setActif(null)
      router.refresh()
    })
  }

  const Item = ({ c }: { c: Conversation }) => (
    <button onClick={() => setActif(c.id)}
      className={cn('w-full text-left px-3 py-2 rounded-lg text-xs group flex items-start gap-2', actif === c.id ? 'bg-violet-50 text-violet-900' : 'hover:bg-gray-50 text-gray-700')}>
      <span className="flex-1 min-w-0">
        <span className="block truncate font-medium">{c.titre ?? 'Question'}</span>
        <span className="block text-[10px] text-gray-400">{dateCourte(c.updated_at)}</span>
      </span>
      {(c.user_id === moi.id || moi.estSamuel) && (
        <Trash2 size={12} onClick={ev => { ev.stopPropagation(); supprimer(c.id) }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 mt-0.5 shrink-0" />
      )}
    </button>
  )

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-200">
          <GraduationCap size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coach</h1>
          <p className="text-sm text-gray-500">Pose ta question sur une situation d’appel : le Coach te donne quoi dire, selon la méthode She Closes.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-start">
        {/* Historique */}
        <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-2 lg:sticky lg:top-20">
          <button onClick={() => { setActif(null); setVue('moi') }}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-violet-600 text-white inline-flex items-center justify-center gap-1.5 hover:bg-violet-700">
            <Plus size={13} /> Nouvelle question
          </button>
          {moi.estSamuel && (
            <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
              {([['moi', 'Mes questions', User], ['equipe', `Équipe (${equipe.length})`, Users]] as const).map(([k, l, Icon]) => (
                <button key={k} onClick={() => setVue(k)}
                  className={cn('flex-1 py-1 text-[11px] rounded-md inline-flex items-center justify-center gap-1', vue === k ? 'bg-white shadow-sm text-violet-700 font-medium' : 'text-gray-500')}>
                  <Icon size={11} /> {l}
                </button>
              ))}
            </div>
          )}
          <div className="max-h-[60vh] overflow-y-auto space-y-0.5">
            {vue === 'equipe'
              ? parCloser.map(([nom, cs]) => (
                  <div key={nom} className="pt-1">
                    <p className="px-3 text-[10px] font-semibold uppercase text-gray-400">{nom} · {cs.length}</p>
                    {cs.map(c => <Item key={c.id} c={c} />)}
                  </div>
                ))
              : liste.map(c => <Item key={c.id} c={c} />)}
            {liste.length === 0 && <p className="text-xs text-gray-400 px-3 py-2">{vue === 'moi' ? 'Aucune question pour l’instant.' : 'Aucune question de l’équipe pour l’instant.'}</p>}
          </div>
        </aside>

        {/* Conversation */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[60vh]">
          {conv && lectureSeule && (
            <div className="px-5 py-2 border-b border-gray-50 text-xs text-gray-500">Question de <strong>{conv.user_name}</strong> · lecture seule</div>
          )}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            {!actif && !enAttente && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Exemples de questions :</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {EXEMPLES.map(ex => (
                    <button key={ex} onClick={() => setQuestion(ex)} className="text-left text-xs p-3 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50/40 text-gray-700">{ex}</button>
                  ))}
                </div>
              </div>
            )}
            {fil.map(m => (
              <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] rounded-2xl px-4 py-3', m.role === 'user' ? 'bg-violet-600 text-white whitespace-pre-wrap text-sm' : 'bg-gray-50 text-gray-800')}>
                  {m.role === 'user' ? m.content : <Markdown text={m.content} />}
                </div>
              </div>
            ))}
            {enAttente && (
              <>
                <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl px-4 py-3 bg-violet-600 text-white text-sm whitespace-pre-wrap">{enAttente}</div></div>
                <div className="flex justify-start"><div className="rounded-2xl px-4 py-3 bg-gray-50 text-gray-500 text-sm inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Le Coach réfléchit…</div></div>
              </>
            )}
            <div ref={finRef} />
          </div>

          {erreur && <div className="mx-5 mb-2 bg-red-50 border border-red-100 rounded-xl p-2.5 text-xs text-red-700">{erreur}</div>}

          {!lectureSeule && (
            <form onSubmit={envoyer} className="border-t border-gray-100 p-3 space-y-2">
              {montrerExtrait && (
                <textarea value={extrait} onChange={e => setExtrait(e.target.value)} rows={4}
                  placeholder="Colle ici le bout de transcription Fathom concerné (optionnel)…"
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
              )}
              <div className="flex gap-2 items-end">
                <button type="button" onClick={() => setMontrerExtrait(v => !v)} title="Ajouter un extrait d’appel"
                  className={cn('p-2 rounded-lg border text-xs', montrerExtrait ? 'border-violet-300 text-violet-700 bg-violet-50' : 'border-gray-200 text-gray-400 hover:text-gray-600')}>
                  <FileText size={16} />
                </button>
                <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
                  placeholder={actif ? 'Pose une question de suivi…' : 'Décris la situation : ce que la prospect a dit, à quelle étape de l’appel…'}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <button type="submit" disabled={enCours || !question.trim()}
                  className="p-2.5 rounded-lg bg-violet-600 text-white disabled:bg-gray-100 disabled:text-gray-300">
                  {enCours ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              {moi.estSamuel && <p className="text-[10px] text-gray-400">Les questions des closers sont visibles par toi dans « Équipe ». Elles ne voient que les leurs.</p>}
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
