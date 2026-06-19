'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Trash2, X, Search, MessageSquare, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import {
  ajouterCmFollowup, toggleCmMessage, setCmStatus, updateCmNotes, supprimerCmFollowup,
} from '@/app/(portal)/cm/actions'

// ── Types ─────────────────────────────────────────────────────────────

type CmStatus = 'en_cours' | 'pas_reponse_1' | 'pas_reponse_2'

type CmFollowup = {
  id:             string
  client_name:    string
  cm_id:          string | null
  profiles:       { full_name: string | null }[] | null
  status:         CmStatus
  message_1:      boolean; message_1_date: string | null
  message_2:      boolean; message_2_date: string | null
  message_3:      boolean; message_3_date: string | null
  message_4:      boolean; message_4_date: string | null
  message_5:      boolean; message_5_date: string | null
  notes:          string | null
  created_at:     string
  cash_entry_id:  string | null
  csm_client_id:  string | null
}

// ── Constantes ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CmStatus, { label: string; next: CmStatus; badge: string; icon: React.ElementType }> = {
  en_cours:      { label: 'En cours',         next: 'pas_reponse_1', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',    icon: Clock       },
  pas_reponse_1: { label: 'Pas de réponse 1', next: 'pas_reponse_2', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: AlertCircle },
  pas_reponse_2: { label: 'Pas de réponse 2', next: 'en_cours',      badge: 'bg-red-500/20 text-red-300 border-red-500/30',       icon: AlertCircle },
}

const FILTER_OPTS: { key: 'tous' | CmStatus; label: string }[] = [
  { key: 'tous',          label: 'Tous'     },
  { key: 'en_cours',      label: 'En cours' },
  { key: 'pas_reponse_1', label: 'PR 1'     },
  { key: 'pas_reponse_2', label: 'PR 2'     },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtShort(d: string | null) {
  if (!d) return ''
  return new Date(d + 'T00:00').toLocaleDateString('fr-CA', { day: '2-digit', month: 'short' })
}

// ── Shared hook ───────────────────────────────────────────────────────

function useFollowupState(followup: CmFollowup) {
  const [local,    setLocal]    = useState(followup)
  const [pending,  start]       = useTransition()
  const [editNotes, setEditNotes] = useState(false)
  const [notesVal,  setNotesVal]  = useState(followup.notes ?? '')

  function toggleMsg(num: 1 | 2 | 3 | 4 | 5) {
    const key     = `message_${num}` as keyof CmFollowup
    const dateKey = `message_${num}_date` as keyof CmFollowup
    const next    = !local[key]
    setLocal(prev => ({ ...prev, [key]: next, [dateKey]: next ? new Date().toISOString().split('T')[0] : null }))
    start(() => toggleCmMessage(followup.id, num, next))
  }

  function cycleStatus() {
    const next = STATUS_CONFIG[local.status].next
    setLocal(prev => ({ ...prev, status: next }))
    start(() => setCmStatus(followup.id, next))
  }

  function saveNotes() {
    start(async () => {
      await updateCmNotes(followup.id, notesVal)
      setLocal(prev => ({ ...prev, notes: notesVal.trim() || null }))
      setEditNotes(false)
    })
  }

  function handleDelete(clientName: string) {
    if (!confirm(`Supprimer "${clientName}" ?`)) return
    start(() => supprimerCmFollowup(followup.id))
  }

  const msgs: [1 | 2 | 3 | 4 | 5, boolean, string | null][] = [
    [1, local.message_1, local.message_1_date],
    [2, local.message_2, local.message_2_date],
    [3, local.message_3, local.message_3_date],
    [4, local.message_4, local.message_4_date],
    [5, local.message_5, local.message_5_date],
  ]
  const progress = msgs.filter(([, done]) => done).length

  return { local, pending, editNotes, setEditNotes, notesVal, setNotesVal,
           toggleMsg, cycleStatus, saveNotes, handleDelete, msgs, progress }
}

// ── Composants atomiques ──────────────────────────────────────────────

function MsgCircle({ num, done, date, onClick, disabled }: {
  num: number; done: boolean; date: string | null; onClick: () => void; disabled: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      title={done && date ? `M${num} — ${fmtShort(date)}` : `Message ${num}`}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
        transition-all border select-none shrink-0
        ${done ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-white/5 text-gray-500 border-white/10'}
        ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      {done ? <CheckCircle2 className="w-4 h-4" /> : num}
    </button>
  )
}

function StatusBadge({ status, onClick, disabled }: {
  status: CmStatus; onClick: () => void; disabled: boolean
}) {
  const cfg  = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
        border transition-all ${cfg.badge} ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {cfg.label}
    </button>
  )
}

function SourceBadges({ f }: { f: CmFollowup }) {
  return (
    <>
      {f.csm_client_id && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">CSM</span>
      )}
      {f.cash_entry_id && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Vente</span>
      )}
    </>
  )
}

// ── Carte mobile ──────────────────────────────────────────────────────

function CarteMobile({ followup, isPrivileged }: { followup: CmFollowup; isPrivileged: boolean }) {
  const s = useFollowupState(followup)

  return (
    <div className={`bg-white/[0.04] border border-white/8 rounded-xl p-4 space-y-3 ${s.pending ? 'opacity-70' : ''}`}>
      {/* Nom + delete */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm text-white leading-tight">{s.local.client_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[11px] text-gray-500">{fmtDate(s.local.created_at)}</span>
            <SourceBadges f={s.local} />
          </div>
        </div>
        {isPrivileged && (
          <button onClick={() => s.handleDelete(s.local.client_name)} disabled={s.pending}
            className="p-1.5 shrink-0 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div>
        <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">Messages — {s.progress}/5</p>
        <div className="flex items-center gap-2">
          {s.msgs.map(([num, done, date]) => (
            <MsgCircle key={num} num={num} done={done} date={date}
              onClick={() => s.toggleMsg(num)} disabled={s.pending} />
          ))}
        </div>
      </div>

      {/* Statut + notes */}
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={s.local.status} onClick={s.cycleStatus} disabled={s.pending} />
        {s.editNotes ? (
          <div className="flex gap-1.5 flex-1">
            <input autoFocus value={s.notesVal} onChange={e => s.setNotesVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && s.saveNotes()}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white
                focus:outline-none focus:border-violet-500 min-w-0" />
            <button onClick={s.saveNotes} disabled={s.pending}
              className="px-2 py-1 bg-violet-600 text-white text-xs rounded">OK</button>
            <button onClick={() => { s.setEditNotes(false); s.setNotesVal(s.local.notes ?? '') }}
              className="px-1 text-gray-500"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button onClick={() => s.setEditNotes(true)}
            className="text-xs text-gray-500 hover:text-white transition-colors text-right truncate max-w-[40%]">
            {s.local.notes ? s.local.notes : <span className="italic text-gray-700">+ note</span>}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Ligne desktop ─────────────────────────────────────────────────────

function LigneDesktop({ followup, isPrivileged }: { followup: CmFollowup; isPrivileged: boolean }) {
  const s = useFollowupState(followup)

  return (
    <tr className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${s.pending ? 'opacity-70' : ''}`}>
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-white">{s.local.client_name}</div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-500">{fmtDate(s.local.created_at)}</span>
          <SourceBadges f={s.local} />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {s.msgs.map(([num, done, date]) => (
            <MsgCircle key={num} num={num} done={done} date={date}
              onClick={() => s.toggleMsg(num)} disabled={s.pending} />
          ))}
          <span className="ml-1 text-[11px] text-gray-500 tabular-nums">{s.progress}/5</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={s.local.status} onClick={s.cycleStatus} disabled={s.pending} />
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        {s.editNotes ? (
          <div className="flex gap-1.5">
            <input autoFocus value={s.notesVal} onChange={e => s.setNotesVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && s.saveNotes()}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white
                focus:outline-none focus:border-violet-500" />
            <button onClick={s.saveNotes} disabled={s.pending}
              className="px-2 py-1 bg-violet-600 text-white text-xs rounded">OK</button>
            <button onClick={() => { s.setEditNotes(false); s.setNotesVal(s.local.notes ?? '') }}
              className="px-1 text-gray-500"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button onClick={() => s.setEditNotes(true)}
            className="text-left text-xs text-gray-400 hover:text-white transition-colors truncate block w-full">
            {s.local.notes ? s.local.notes : <span className="italic text-gray-600">+ note</span>}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        {isPrivileged && (
          <button onClick={() => s.handleDelete(s.local.client_name)} disabled={s.pending}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Modal ajout ───────────────────────────────────────────────────────

function ModalAjout({ onClose }: { onClose: () => void }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null)
    const fd = new FormData(e.currentTarget)
    start(async () => {
      try { await ajouterCmFollowup(fd); onClose() }
      catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur') }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#1a1d2e] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Ajouter un client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom du client *</label>
            <input name="client_name" required autoFocus placeholder="Prénom Nom"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm
                text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300">Annuler</button>
            <button type="submit" disabled={pending}
              className="flex-1 px-4 py-2 bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              {pending ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────

export default function CmView({
  followups, isPrivileged,
}: {
  followups:     CmFollowup[]
  isPrivileged:  boolean
  currentUserId: string
}) {
  const [showModal, setShowModal] = useState(false)
  const [search,    setSearch]   = useState('')
  const [filtre,    setFiltre]   = useState<'tous' | CmStatus>('tous')

  const filtered = useMemo(() => {
    let list = followups
    if (filtre !== 'tous') list = list.filter(f => f.status === filtre)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f => f.client_name.toLowerCase().includes(q))
    }
    return list
  }, [followups, filtre, search])

  const kpis = useMemo(() => ({
    total:         followups.length,
    en_cours:      followups.filter(f => f.status === 'en_cours').length,
    pas_reponse_1: followups.filter(f => f.status === 'pas_reponse_1').length,
    pas_reponse_2: followups.filter(f => f.status === 'pas_reponse_2').length,
  }), [followups])

  const empty = filtered.length === 0

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-pink-400" />
              Community Manager
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Suivi des messages clients</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700
              text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter un client</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total',         value: kpis.total,          cls: 'text-white'     },
            { label: 'En cours',      value: kpis.en_cours,       cls: 'text-blue-400'  },
            { label: 'Pas de rép. 1', value: kpis.pas_reponse_1,  cls: 'text-amber-400' },
            { label: 'Pas de rép. 2', value: kpis.pas_reponse_2,  cls: 'text-red-400'   },
          ].map(k => (
            <div key={k.label} className="bg-white/[0.04] border border-white/8 rounded-xl p-3 md:p-4">
              <p className="text-[11px] text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.cls}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2
                text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_OPTS.map(opt => (
              <button key={opt.key} onClick={() => setFiltre(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                  ${filtre === opt.key ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Vue mobile : cartes (jamais dans un tbody) ── */}
        <div className="md:hidden space-y-3">
          {empty
            ? <p className="text-center text-sm text-gray-500 py-12">
                {search || filtre !== 'tous' ? 'Aucun résultat' : 'Aucun client — cliquer sur « Ajouter »'}
              </p>
            : filtered.map(f => <CarteMobile key={f.id} followup={f} isPrivileged={isPrivileged} />)
          }
        </div>

        {/* ── Vue desktop : tableau ── */}
        <div className="hidden md:block bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Messages</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {empty
                ? <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                    {search || filtre !== 'tous' ? 'Aucun résultat' : 'Aucun client'}
                  </td></tr>
                : filtered.map(f => <LigneDesktop key={f.id} followup={f} isPrivileged={isPrivileged} />)
              }
            </tbody>
          </table>
          {!empty && (
            <div className="px-4 py-3 border-t border-white/5 text-xs text-gray-600">
              {filtered.length} client{filtered.length > 1 ? 's' : ''}
              {filtre !== 'tous' || search ? ` (sur ${followups.length} total)` : ''}
            </div>
          )}
        </div>

      </div>
      {showModal && <ModalAjout onClose={() => setShowModal(false)} />}
    </div>
  )
}
