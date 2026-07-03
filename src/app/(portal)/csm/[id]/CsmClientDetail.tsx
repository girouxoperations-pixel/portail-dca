'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, Circle, Calendar,
  MessageSquare, Shield, Target, Phone, Edit2, Check, X,
  DollarSign, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CsmClient } from '../types'
import { computeDueDates, today, formatDate } from '../types'
import {
  updateMeeting, toggleText, toggleMilestone,
  updateCircleLogin, updateTheory, updateStatus, updateNotes, updateOnboardingNotes,
} from '../actions'

interface CashEntry { montant_courant: number; collected: number; entry_date: string; methode: string | null }
interface Followup {
  id: string; due_message1: string; due_message2: string; due_message3: string
  message1_done: boolean; message1_date: string | null
  message2_done: boolean; message2_date: string | null
  message3_done: boolean; message3_date: string | null
}

interface Props {
  client:      CsmClient
  cashEntry:   CashEntry | null
  followup:    Followup | null
  closerName:  string | null
}

// ── Inline editable date input ────────────────────────────────────────
function DateInput({
  label, value, onSave, color,
}: {
  label: string
  value: string | null
  onSave: (v: string | null) => Promise<void>
  color?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await onSave(val || null)
      setEditing(false)
    })
  }
  function cancel() { setVal(value ?? ''); setEditing(false) }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={val}
            onChange={e => setVal(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button onClick={save} disabled={pending} className="p-1 text-green-600 hover:bg-green-50 rounded">
            <Check size={12} />
          </button>
          <button onClick={cancel} className="p-1 text-gray-400 hover:bg-gray-50 rounded">
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={cn('text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 hover:opacity-80', color ?? 'bg-gray-100 text-gray-600')}
        >
          {value ? formatDate(value) : <span className="text-gray-300">— ajouter</span>}
          <Edit2 size={9} className="text-gray-400" />
        </button>
      )}
    </div>
  )
}

// ── Milestone checkbox ───────────────────────────────────────────────
function Milestone({
  label, done, onToggle, green,
}: {
  label: string; done: boolean; onToggle: () => void; green?: boolean
}) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      onClick={() => startTransition(onToggle)}
      disabled={pending}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
        done
          ? green
            ? 'bg-green-50 text-green-800 ring-1 ring-green-200'
            : 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
          : 'bg-gray-50 text-gray-500 ring-1 ring-gray-100 hover:ring-gray-200',
      )}
    >
      {done
        ? <CheckCircle2 size={16} className={green ? 'text-green-600' : 'text-blue-500'} />
        : <Circle size={16} className="text-gray-300" />
      }
      {label}
    </button>
  )
}

// ── Timeline milestone item ───────────────────────────────────────────
function TimelineItem({
  label, date, dueDate, done, today: todayStr, children,
}: {
  label: string
  date: string | null
  dueDate?: string
  done?: boolean
  today: string
  children?: React.ReactNode
}) {
  const effective = date ?? dueDate ?? null
  const cls = !effective ? 'border-gray-100 bg-white'
    : done === true ? 'border-green-200 bg-green-50'
    : effective === todayStr ? 'border-red-400 bg-red-50'
    : effective < todayStr ? (done === false ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50')
    : 'border-yellow-200 bg-yellow-50'

  const dotCls = !effective ? 'bg-gray-200'
    : done === true ? 'bg-green-500'
    : effective <= todayStr ? (done === false ? 'bg-red-500' : 'bg-green-500')
    : 'bg-yellow-400'

  return (
    <div className={cn('flex gap-3 rounded-xl border p-4', cls)}>
      <div className="mt-0.5">
        <div className={cn('w-3 h-3 rounded-full shrink-0', dotCls)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          {effective && (
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {done === true && date ? `Fait le ${formatDate(date)}` : formatDate(effective)}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Notes textarea ────────────────────────────────────────────────────
function NotesEditor({ value, onSave }: { value: string | null; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => { await onSave(val); setEditing(false) })
  }

  return editing ? (
    <div className="space-y-2">
      <textarea
        value={val}
        onChange={e => setVal(e.target.value)}
        rows={4}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={pending} className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700">
          Enregistrer
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100">
          Annuler
        </button>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left text-sm text-gray-500 hover:text-gray-700 min-h-8"
    >
      {val || <span className="text-gray-300 italic">Ajouter des notes…</span>}
    </button>
  )
}

function dollar(n: number) {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

export default function CsmClientDetail({ client: c, cashEntry, followup, closerName }: Props) {
  const todayStr = today()
  const due = computeDueDates(c.enrollment_date)
  const dayN = Math.floor((new Date(todayStr).getTime() - new Date(c.enrollment_date + 'T00:00').getTime()) / 86400000)

  // Date color for cell display
  function mDateColor(date: string | null): string {
    if (!date) return 'bg-gray-100 text-gray-500'
    if (date === todayStr) return 'bg-red-500 text-white'
    if (date < todayStr)   return 'bg-green-100 text-green-800'
    return 'bg-yellow-50 text-yellow-800'
  }

  const STATUS_OPTIONS = [
    { value: 'active',  label: 'Active'   },
    { value: 'paused',  label: 'En pause' },
    { value: 'dropped', label: 'Abandon'  },
  ]

  const [, startTransition] = useTransition()

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

      {/* Back */}
      <Link href="/csm" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
        <ArrowLeft size={14} />
        Retour
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Inscrite le {formatDate(c.enrollment_date)} · <strong>J+{dayN}</strong>
              {c.payment_type && <span className="ml-2 text-xs uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c.payment_type}</span>}
            </p>
          </div>

          <select
            defaultValue={c.status}
            onChange={e => startTransition(() => { updateStatus(c.id, e.target.value) })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Deal info from cash entry */}
        {(cashEntry || closerName) && (
          <div className="mt-3 flex flex-wrap gap-3">
            {closerName && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full">
                <User size={11} />
                Closer : {closerName}
              </span>
            )}
            {cashEntry && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                <DollarSign size={11} />
                {dollar(cashEntry.montant_courant)}
                {cashEntry.methode && <span className="opacity-70">· {cashEntry.methode}</span>}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Notes d'onboarding</p>
          <NotesEditor value={c.onboarding_notes} onSave={v => updateOnboardingNotes(c.id, v)} />
        </div>

        {/* Circle tracker */}
        <div className="mt-4 flex items-center gap-3">
          <Phone size={14} className="text-violet-400" />
          <span className="text-xs text-gray-500">Dernière connexion Circle :</span>
          <DateInput
            label=""
            value={c.circle_last_login}
            onSave={d => updateCircleLogin(c.id, d)}
            color={
              !c.circle_last_login ? 'bg-red-50 text-red-600'
              : (new Date(todayStr).getTime() - new Date(c.circle_last_login).getTime()) > 7 * 86400000
                ? 'bg-red-50 text-red-600'
                : 'bg-green-50 text-green-700'
            }
          />
        </div>

        {/* Theory progress */}
        <div className="mt-3 flex items-center gap-3">
          <Target size={14} className="text-violet-400" />
          <span className="text-xs text-gray-500">Théorie :</span>
          <TheoryInput value={c.theory_pct} onSave={v => updateTheory(c.id, v)} />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <Calendar size={14} />
          Progression — 3 mois
        </h2>

        <div className="space-y-2.5">
          {/* M1 */}
          <TimelineItem label="M1 — Onboarding" date={c.m1_date} today={todayStr}>
            <DateInput label="Date" value={c.m1_date} onSave={d => updateMeeting(c.id, 1, { date: d })} color={mDateColor(c.m1_date)} />
          </TimelineItem>

          {/* J+7 text */}
          <TimelineItem label="Texto J+7" date={c.text_j7_date} dueDate={due.j7} done={c.text_j7_done} today={todayStr}>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-xs text-gray-400">Progression Circle · uniquement jours de semaine</p>
              <TextToggle clientId={c.id} field="j7" done={c.text_j7_done} />
            </div>
          </TimelineItem>

          {/* M2 */}
          <TimelineItem label="M2 — Réunion groupe" date={c.m2_date} today={todayStr}>
            <DateInput label="Date" value={c.m2_date} onSave={d => updateMeeting(c.id, 2, { date: d })} color={mDateColor(c.m2_date)} />
            <MeetingNotes clientId={c.id} num={2} notes={c.m2_notes} />
          </TimelineItem>

          {/* Quiz setter */}
          <TimelineItem label="Examen théorique Setting" date={null} today={todayStr}>
            <Milestone
              label="Quiz setting fait"
              done={c.quiz_setter_done}
              onToggle={() => toggleMilestone(c.id, 'quiz_setter_done', !c.quiz_setter_done)}
            />
          </TimelineItem>

          {/* M3 */}
          <TimelineItem label="M3 — 1:1 Upsell" date={c.m3_date} today={todayStr}>
            <DateInput label="Date" value={c.m3_date} onSave={d => updateMeeting(c.id, 3, { date: d })} color={mDateColor(c.m3_date)} />
            <MeetingNotes clientId={c.id} num={3} notes={c.m3_notes} />
          </TimelineItem>

          {/* Post-M3 texts */}
          {([
            { field: 'j49' as const, label: 'Texto J+49', done: c.text_j49_done, date: c.text_j49_date, dueDate: due.j49 },
            { field: 'j63' as const, label: 'Texto J+63', done: c.text_j63_done, date: c.text_j63_date, dueDate: due.j63 },
            { field: 'j77' as const, label: 'Texto J+77', done: c.text_j77_done, date: c.text_j77_date, dueDate: due.j77 },
            { field: 'j90' as const, label: 'Texto J+90', done: c.text_j90_done, date: c.text_j90_date, dueDate: due.j90 },
          ]).map(({ field, label, done, date, dueDate }) => (
            <TimelineItem key={field} label={label} date={date} dueDate={dueDate} done={done} today={todayStr}>
              <TextToggle clientId={c.id} field={field} done={done} />
            </TimelineItem>
          ))}

          {/* M4 */}
          <TimelineItem label="M4 — 1:1 Upsell Closer" date={c.m4_date} today={todayStr}>
            <DateInput label="Date" value={c.m4_date} onSave={d => updateMeeting(c.id, 4, { date: d })} color={mDateColor(c.m4_date)} />
            <p className="text-[10px] text-gray-400 mt-1">⚡ Définir M4 active automatiquement la certification Setter</p>
            <MeetingNotes clientId={c.id} num={4} notes={c.m4_notes} />
          </TimelineItem>

        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <Shield size={14} />
          Certifications &amp; Jalons
        </h2>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Setting</p>
          <div className="flex flex-wrap gap-2">
            <Milestone
              label="Quiz Setter"
              done={c.quiz_setter_done}
              onToggle={() => toggleMilestone(c.id, 'quiz_setter_done', !c.quiz_setter_done)}
            />
            <Milestone
              label="Certification Setter"
              done={c.cert_setter_done}
              onToggle={() => toggleMilestone(c.id, 'cert_setter_done', !c.cert_setter_done)}
              green
            />
            <Milestone
              label="Opportunité Setter"
              done={c.opportunity_setter}
              onToggle={() => toggleMilestone(c.id, 'opportunity_setter', !c.opportunity_setter)}
            />
          </div>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Closing</p>
          <div className="flex flex-wrap gap-2">
            <Milestone
              label="Théorie Closing"
              done={c.theory_closer_done}
              onToggle={() => toggleMilestone(c.id, 'theory_closer_done', !c.theory_closer_done)}
            />
            <Milestone
              label="Quiz Closer"
              done={c.quiz_closer_done}
              onToggle={() => toggleMilestone(c.id, 'quiz_closer_done', !c.quiz_closer_done)}
            />
            <Milestone
              label="Certification Closer"
              done={c.cert_closer_done}
              onToggle={() => toggleMilestone(c.id, 'cert_closer_done', !c.cert_closer_done)}
              green
            />
            <Milestone
              label="Opportunité Closer"
              done={c.opportunity_closer}
              onToggle={() => toggleMilestone(c.id, 'opportunity_closer', !c.opportunity_closer)}
            />
          </div>
        </div>
      </div>

      {/* Suivi client (client_followups) */}
      {followup && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3">
            <Phone size={14} />
            Suivi closer — 3 textos
          </h2>
          <div className="flex flex-wrap gap-3">
            {([1, 2, 3] as const).map(n => {
              const done = followup[`message${n}_done` as 'message1_done']
              const due  = followup[`due_message${n}` as 'due_message1']
              const date = followup[`message${n}_date` as 'message1_date']
              return (
                <div
                  key={n}
                  className={cn(
                    'flex flex-col items-center gap-1 px-4 py-3 rounded-xl ring-1',
                    done ? 'bg-green-50 ring-green-200'
                    : due < todayStr ? 'bg-red-50 ring-red-200'
                    : 'bg-yellow-50 ring-yellow-200',
                  )}
                >
                  {done
                    ? <CheckCircle2 size={16} className="text-green-500" />
                    : due < todayStr
                      ? <Circle size={16} className="text-red-400" />
                      : <Circle size={16} className="text-yellow-400" />
                  }
                  <span className="text-[11px] font-semibold text-gray-600">Msg {n}</span>
                  <span className="text-[10px] text-gray-400">
                    {done && date ? `Fait le ${formatDate(date)}` : formatDate(due)}
                  </span>
                </div>
              )
            })}
          </div>
          <Link href="/suivi-client" className="inline-block mt-3 text-xs text-violet-500 hover:underline">
            Voir dans Suivi client →
          </Link>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3">
          <MessageSquare size={14} />
          Notes générales
        </h2>
        <NotesEditor value={c.notes} onSave={v => updateNotes(c.id, v)} />
      </div>
    </div>
  )
}

// ── Text toggle button ────────────────────────────────────────────────
function TextToggle({ clientId, field, done }: {
  clientId: string
  field: 'j7' | 'j21' | 'j49' | 'j63' | 'j77' | 'j90'
  done: boolean
}) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => { toggleText(clientId, field, !done) })}
      className={cn(
        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-medium',
        done
          ? 'bg-green-100 text-green-700 ring-1 ring-green-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
      )}
    >
      {done ? <CheckCircle2 size={12} /> : <Circle size={12} />}
      {done ? 'Envoyé' : 'Marquer envoyé'}
    </button>
  )
}

// ── Meeting notes inline editor ────────────────────────────────────────
function MeetingNotes({ clientId, num, notes }: { clientId: string; num: 1|2|3|4|5; notes: string | null }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(notes ?? '')
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await updateMeeting(clientId, num, { notes: val || null })
      setEditing(false)
    })
  }

  if (!editing) return (
    <div className="mt-2">
      {val
        ? <p className="text-xs text-gray-500 whitespace-pre-line">{val}</p>
        : null}
      <button onClick={() => setEditing(true)} className="text-[10px] text-violet-500 hover:underline mt-1">
        {val ? 'Modifier les notes' : '+ Ajouter des notes'}
      </button>
    </div>
  )

  return (
    <div className="mt-2 space-y-1.5">
      <textarea
        value={val}
        onChange={e => setVal(e.target.value)}
        rows={3}
        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={pending} className="text-xs bg-violet-600 text-white px-2.5 py-1 rounded hover:bg-violet-700">Enregistrer</button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-400 px-2 py-1 hover:bg-gray-50 rounded">Annuler</button>
      </div>
    </div>
  )
}

// ── Theory % input ────────────────────────────────────────────────────
function TheoryInput({ value, onSave }: { value: number; onSave: (v: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value))
  const [pending, startTransition] = useTransition()

  function save() {
    const n = Math.max(0, Math.min(100, parseInt(val) || 0))
    startTransition(async () => { await onSave(n); setEditing(false) })
  }

  if (editing) return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0} max={100}
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-16 text-xs border border-gray-300 rounded px-2 py-0.5"
      />
      <span className="text-xs text-gray-400">%</span>
      <button onClick={save} disabled={pending} className="p-1 text-green-600"><Check size={12} /></button>
      <button onClick={() => setEditing(false)} className="p-1 text-gray-400"><X size={12} /></button>
    </div>
  )

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-xs bg-violet-50 text-violet-700 px-2.5 py-0.5 rounded-full font-medium hover:bg-violet-100"
    >
      {value}%
    </button>
  )
}

