'use client'

import { useState, useTransition, useRef } from 'react'
import { Mic, Users, Loader2, Copy, Check, RotateCcw, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyserAppel } from './actions'

type CallType = 'closer' | 'setter'

function MarkdownFeedback({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1 text-sm text-gray-800 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />

        // H2 headers: **Title**
        if (/^\*\*(.+)\*\*$/.test(line.trim()) && line.trim().startsWith('**')) {
          const inner = line.trim().replace(/^\*\*|\*\*$/g, '')
          // Section headers (numbered)
          if (/^\d+\./.test(inner)) {
            return (
              <h3 key={i} className="text-sm font-bold text-gray-900 mt-5 mb-1.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {inner.match(/^\d+/)?.[0]}
                </span>
                <span>{inner.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '')}</span>
              </h3>
            )
          }
          return <p key={i} className="font-bold text-gray-900 mt-3">{inner}</p>
        }

        // Inline bold/italic processing
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
          if (part.startsWith('*') && part.endsWith('*'))
            return <em key={j} className="italic text-gray-700">{part.slice(1, -1)}</em>
          return <span key={j}>{part}</span>
        })

        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          return (
            <div key={i} className="flex items-start gap-2 ml-2">
              <ChevronRight size={12} className="text-violet-400 mt-1 shrink-0" />
              <p>{rendered.map((p, j) => {
                const txt = typeof (p as React.ReactElement).props?.children === 'string'
                  ? (p as React.ReactElement).props.children.replace(/^[-•]\s*/, '')
                  : null
                if (j === 0 && txt !== null) return <span key={j}>{txt}</span>
                return p
              })}</p>
            </div>
          )
        }

        // Quote blocks (lines starting with "> " or containing « »)
        if (line.trim().startsWith('> ') || line.trim().startsWith('"') || line.trim().startsWith('«')) {
          return (
            <blockquote key={i} className="border-l-2 border-violet-300 pl-3 my-1 text-gray-600 italic text-[13px]">
              {rendered}
            </blockquote>
          )
        }

        return <p key={i}>{rendered}</p>
      })}
    </div>
  )
}

export default function AnalyseurView() {
  const [callType,   setCallType]   = useState<CallType>('closer')
  const [personName, setPersonName] = useState('')
  const [transcript, setTranscript] = useState('')
  const [feedback,   setFeedback]   = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)
  const [pending,    startT]        = useTransition()
  const resultRef = useRef<HTMLDivElement>(null)

  const charCount = transcript.length
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0
  const canSubmit = transcript.trim().length > 200

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setFeedback(null)

    startT(async () => {
      try {
        const result = await analyserAppel({ callType, personName, transcript })
        setFeedback(result.feedback)
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inattendue')
      }
    })
  }

  function handleReset() {
    setFeedback(null)
    setError(null)
    setTranscript('')
    setPersonName('')
  }

  function handleCopy() {
    if (!feedback) return
    navigator.clipboard.writeText(feedback)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-200">
            <Mic size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Analyseur d&apos;appels</h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">
          Colle une transcription et obtiens du feedback coaching précis en quelques secondes.
        </p>
      </div>

      <div className={cn('grid gap-6', feedback ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2')}>
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Call type */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type d&apos;appel</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'closer', label: 'Closing', desc: 'Appel de vente high-ticket', icon: Mic },
                { key: 'setter', label: 'Setting', desc: 'Qualification & booking', icon: Users },
              ] as const).map(({ key, label, desc, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCallType(key)}
                  className={cn(
                    'flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all',
                    callType === key
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50',
                  )}
                >
                  <div className={cn('flex items-center gap-2', callType === key ? 'text-violet-700' : 'text-gray-500')}>
                    <Icon size={15} />
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                  <span className="text-[11px] text-gray-400">{desc}</span>
                </button>
              ))}
            </div>

            {/* Person name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Nom du/de la {callType === 'closer' ? 'closer' : 'setter'} <span className="text-gray-300">(optionnel)</span>
              </label>
              <input
                type="text"
                value={personName}
                onChange={e => setPersonName(e.target.value)}
                placeholder="Emma Tardif"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>
          </div>

          {/* Transcript */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Transcription</p>
              <span className="text-[10px] text-gray-300 tabular-nums">{wordCount} mots · {charCount} car.</span>
            </div>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder={`Colle ici la transcription de l'appel…\n\nEx:\nCloser: Bonjour Marie, comment tu vas aujourd'hui ?\nProspect: Très bien merci, et toi ?\n...`}
              rows={14}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none font-mono leading-relaxed"
            />
            {transcript.length > 0 && transcript.length < 200 && (
              <p className="text-[11px] text-amber-500">Transcription trop courte — minimum ~200 caractères pour une analyse utile.</p>
            )}
            <button
              type="submit"
              disabled={!canSubmit || pending}
              className={cn(
                'w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                canSubmit && !pending
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed',
              )}
            >
              {pending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <Mic size={16} />
                  Analyser l&apos;appel
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {(feedback || error || pending) && (
          <div ref={resultRef} className="lg:col-span-1">
            {pending && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center gap-4 min-h-64">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center">
                    <Mic size={22} className="text-violet-400" />
                  </div>
                  <Loader2 size={28} className="absolute -top-1 -right-1 text-violet-500 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Analyse en cours…</p>
                  <p className="text-xs text-gray-400 mt-1">Claude lit la transcription et prépare ton feedback</p>
                </div>
              </div>
            )}

            {error && !pending && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                <p className="text-sm font-semibold text-red-700 mb-1">Erreur</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {feedback && !pending && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Result header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Mic size={14} className="text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Feedback {callType === 'closer' ? 'closing' : 'setting'}
                        {personName && <span className="text-violet-600"> — {personName}</span>}
                      </p>
                      <p className="text-[10px] text-gray-400">Généré par Claude · She Closes Coach</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      {copied ? 'Copié !' : 'Copier'}
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <RotateCcw size={12} />
                      Nouvel appel
                    </button>
                  </div>
                </div>

                {/* Feedback content */}
                <div className="p-5">
                  <MarkdownFeedback text={feedback} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
