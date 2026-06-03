'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, X, UserCircle2, Mail, Shield, Users,
  Trophy, Award, TrendingUp, CheckCircle2, Wallet, Star,
  BarChart3,
} from 'lucide-react'
import {
  inviterMembre, modifierMembre, supprimerMembre, assignerMVP,
} from '@/app/(portal)/admin/actions'

// ── Types ────────────────────────────────────────────────────────────

type Membre = {
  id:         string
  full_name:  string | null
  email:      string | null
  role:       string
  avatar_url: string | null
  created_at: string
}

type BonusMembre = {
  id:        string
  nom:       string
  collected: number
}

type StatsGlobales = {
  totalCloses:  number
  cashCollecte: number
  scoreIaMoyen: number | null
  moisLabel:    string
}

type Tab = 'membres' | 'stats' | 'bonus'

// ── Constantes ───────────────────────────────────────────────────────

type RoleKey = 'admin' | 'csm' | 'closer' | 'setter'

const ROLES: { key: RoleKey; label: string }[] = [
  { key: 'admin',  label: 'Administrateur' },
  { key: 'csm',    label: 'CSM'            },
  { key: 'closer', label: 'Closer'         },
  { key: 'setter', label: 'Setter'         },
]

const ROLE_STYLE: Record<string, { badge: string; dot: string; initials: string }> = {
  admin:  { badge: 'bg-violet-500/20 text-violet-300 border-violet-500/20',  dot: 'bg-violet-400',  initials: 'bg-violet-600' },
  csm:    { badge: 'bg-blue-500/20   text-blue-300   border-blue-500/20',    dot: 'bg-blue-400',    initials: 'bg-blue-600'   },
  closer: { badge: 'bg-green-500/20  text-green-300  border-green-500/20',   dot: 'bg-green-400',   initials: 'bg-green-700'  },
  setter: { badge: 'bg-amber-500/20  text-amber-300  border-amber-500/20',   dot: 'bg-amber-400',   initials: 'bg-amber-600'  },
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrateur', csm: 'CSM', closer: 'Closer', setter: 'Setter',
}

const PALIERS = [
  { seuil: 130_000, closer: 1_800, setter:   900 },
  { seuil: 100_000, closer: 1_500, setter:   750 },
  { seuil:  85_000, closer: 1_200, setter:   600 },
  { seuil:  70_000, closer: 1_000, setter:   500 },
  { seuil:  50_000, closer:   700, setter:   350 },
]

// ── Helpers ──────────────────────────────────────────────────────────

function initiales(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]?.toUpperCase() ?? '').slice(0, 2).join('')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dollar(n: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} $`
}

function getPalier(collected: number) {
  return PALIERS.find(p => collected >= p.seuil) ?? null
}

function progressVersPalier(collected: number) {
  const palier = getPalier(collected)
  if (!palier) {
    const cible = PALIERS[PALIERS.length - 1].seuil
    return Math.min(94, (collected / cible) * 100)
  }
  const idx = PALIERS.indexOf(palier)
  if (idx === 0) return 100
  const next = PALIERS[idx - 1]
  return Math.min(94, ((collected - palier.seuil) / (next.seuil - palier.seuil)) * 100)
}

// ── Sous-composants ───────────────────────────────────────────────────

function Avatar({ membre, size = 'md' }: { membre: Membre; size?: 'sm' | 'md' | 'lg' }) {
  const style   = ROLE_STYLE[membre.role] ?? ROLE_STYLE.closer
  const szClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'
  if (membre.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={membre.avatar_url} alt={membre.full_name ?? ''} className={`${szClass} rounded-full object-cover`} />
  }
  return (
    <div className={`${szClass} ${style.initials} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}>
      {initiales(membre.full_name)}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLE[role] ?? ROLE_STYLE.closer
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {ROLE_LABEL[role] ?? role}
    </span>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#1a1d2e] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────

function ModalInviter({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try { await inviterMembre(fd); onClose() }
      catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur') }
    })
  }

  return (
    <Modal title="Inviter un membre" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Adresse e-mail *" name="email" type="email" required placeholder="prenom@example.com" />
        <Field label="Nom complet *"     name="full_name"          required placeholder="Prénom Nom" />
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Rôle *</label>
          <SelectRole name="role" />
        </div>
        <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
          <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Un e-mail d'invitation sera envoyé à l'adresse indiquée.
        </p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Boutons onClose={onClose} pending={isPending} labelSubmit="Inviter" />
      </form>
    </Modal>
  )
}

function ModalModifier({ membre, onClose }: { membre: Membre; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try { await modifierMembre(membre.id, fd); onClose() }
      catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur') }
    })
  }

  return (
    <Modal title="Modifier le membre" onClose={onClose}>
      <div className="flex items-center gap-3 mb-5 p-3 bg-white/5 rounded-xl">
        <Avatar membre={membre} size="lg" />
        <div>
          <p className="text-sm font-semibold text-white">{membre.full_name ?? '—'}</p>
          <p className="text-xs text-gray-400">{membre.email ?? '—'}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom complet *" name="full_name" required defaultValue={membre.full_name ?? ''} />
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Rôle *</label>
          <SelectRole name="role" defaultValue={membre.role} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Boutons onClose={onClose} pending={isPending} labelSubmit="Enregistrer" />
      </form>
    </Modal>
  )
}

function ModalMVP({ membres, onClose }: { membres: Membre[]; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try { await assignerMVP(fd); onClose() }
      catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur') }
    })
  }

  return (
    <Modal title="🏆 Assigner le MVP du mois" onClose={onClose}>
      <p className="text-sm text-gray-400 mb-4">
        Le membre sélectionné recevra un bonus de <span className="text-white font-semibold">500 $</span> visible dans ses payes.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Membre *</label>
          <select
            name="member_id"
            required
            defaultValue=""
            className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="" disabled>Choisir un membre</option>
            {membres.map(m => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? '—'} — {ROLE_LABEL[m.role] ?? m.role}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Boutons onClose={onClose} pending={isPending} labelSubmit="Attribuer le bonus" pendingLabel="Attribution…" />
      </form>
    </Modal>
  )
}

// ── Micro-composants formulaires ──────────────────────────────────────

function Field({
  label, name, type = 'text', required = false,
  placeholder = '', defaultValue = '',
}: {
  label: string; name: string; type?: string
  required?: boolean; placeholder?: string; defaultValue?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input
        name={name} type={type} required={required}
        placeholder={placeholder} defaultValue={defaultValue}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
      />
    </div>
  )
}

function SelectRole({ name, defaultValue = '' }: { name: string; defaultValue?: string }) {
  return (
    <select
      name={name}
      required
      defaultValue={defaultValue || ''}
      className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
    >
      {!defaultValue && <option value="" disabled>Choisir un rôle</option>}
      {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
    </select>
  )
}

function Boutons({
  onClose, pending, labelSubmit, pendingLabel = 'Enregistrement…',
}: {
  onClose: () => void; pending: boolean; labelSubmit: string; pendingLabel?: string
}) {
  return (
    <div className="flex gap-3 pt-1">
      <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:border-white/20 transition-colors">
        Annuler
      </button>
      <button type="submit" disabled={pending} className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
        {pending ? pendingLabel : labelSubmit}
      </button>
    </div>
  )
}

// ── Ligne membre ──────────────────────────────────────────────────────

function LigneMembre({
  membre, isSelf, isAdmin, onEdit, onDelete, deleting,
}: {
  membre: Membre; isSelf: boolean; isAdmin: boolean
  onEdit: () => void; onDelete: () => void; deleting: boolean
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar membre={membre} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{membre.full_name ?? '—'}</p>
              {isSelf && <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-gray-400 rounded-full shrink-0">Vous</span>}
            </div>
            <p className="text-xs text-gray-500 truncate">{membre.email ?? '—'}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5"><RoleBadge role={membre.role} /></td>
      <td className="px-5 py-3.5 text-xs text-gray-500 tabular-nums">{fmtDate(membre.created_at)}</td>
      <td className="px-5 py-3.5">
        {isAdmin && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} title="Modifier" className="p-1.5 rounded-lg text-gray-500 hover:text-violet-300 hover:bg-violet-500/10 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {!isSelf && (
              <button onClick={onDelete} disabled={deleting} title="Supprimer" className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Section bonus ─────────────────────────────────────────────────────

function LigneBonus({ item, type }: { item: BonusMembre; type: 'closer' | 'setter' }) {
  const palier   = getPalier(item.collected)
  const bonus    = palier ? (type === 'closer' ? palier.closer : palier.setter) : null
  const progress = progressVersPalier(item.collected)

  const prochainSeuil = palier
    ? (PALIERS.indexOf(palier) > 0 ? PALIERS[PALIERS.indexOf(palier) - 1].seuil : null)
    : PALIERS[PALIERS.length - 1].seuil

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      {bonus !== null
        ? <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
        : <Award  className="w-4 h-4 text-gray-600 shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-white truncate">{item.nom}</span>
          <div className="flex items-center gap-2 shrink-0">
            {bonus !== null && (
              <span className="text-xs font-semibold text-amber-400">+{dollar(bonus)}</span>
            )}
            {palier && (
              <span className="text-[11px] text-gray-500">Palier {dollar(palier.seuil)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${palier ? 'bg-violet-500' : 'bg-gray-600'}`}
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-500 shrink-0 tabular-nums w-20 text-right">
            {dollar(item.collected)}
            {!palier && prochainSeuil && <span className="text-gray-600"> / {dollar(prochainSeuil)}</span>}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────

export default function AdminView({
  membres,
  currentUserId,
  isAdmin,
  stats,
  bonusClosers,
  bonusSetters,
  mvpActuelNom,
}: {
  membres:       Membre[]
  currentUserId: string
  isAdmin:       boolean
  stats:         StatsGlobales
  bonusClosers:  BonusMembre[]
  bonusSetters:  BonusMembre[]
  mvpActuelNom:  string | null
}) {
  const [activeTab,   setActiveTab]   = useState<Tab>('membres')
  const [filtreRole,  setFiltreRole]  = useState<string>('tous')
  const [modalInviter, setModalInviter] = useState(false)
  const [membreEdit,   setMembreEdit]   = useState<Membre | null>(null)
  const [showModalMVP, setShowModalMVP] = useState(false)
  const [isPending,    startTransition] = useTransition()
  const [deleteError,  setDeleteError]  = useState<string | null>(null)

  const counts = useMemo(() => ({
    total:  membres.length,
    admin:  membres.filter(m => m.role === 'admin').length,
    csm:    membres.filter(m => m.role === 'csm').length,
    closer: membres.filter(m => m.role === 'closer').length,
    setter: membres.filter(m => m.role === 'setter').length,
  }), [membres])

  const filtres = [
    { key: 'tous',   label: 'Tous',            count: counts.total  },
    { key: 'admin',  label: 'Administrateurs', count: counts.admin  },
    { key: 'csm',    label: 'CSM',             count: counts.csm    },
    { key: 'closer', label: 'Closers',         count: counts.closer },
    { key: 'setter', label: 'Setters',         count: counts.setter },
  ]

  const membresAffiches = filtreRole === 'tous'
    ? membres
    : membres.filter(m => m.role === filtreRole)

  function handleDelete(m: Membre) {
    if (!confirm(`Supprimer le compte de "${m.full_name}" ? Cette action est irréversible.`)) return
    setDeleteError(null)
    startTransition(async () => {
      try { await supprimerMembre(m.id) }
      catch (err: unknown) { setDeleteError(err instanceof Error ? err.message : 'Erreur') }
    })
  }

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'membres', label: 'Membres',         icon: Users      },
    { key: 'stats',   label: 'Statistiques',    icon: BarChart3  },
    { key: 'bonus',   label: 'Bonus & MVP',     icon: Trophy     },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Administration</h1>
          <p className="text-sm text-gray-400 mt-1">Gérez les membres et suivez les performances</p>
        </div>
        {isAdmin && activeTab === 'membres' && (
          <button
            onClick={() => setModalInviter(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Inviter un membre
          </button>
        )}
        {isAdmin && activeTab === 'bonus' && !mvpActuelNom && (
          <button
            onClick={() => setShowModalMVP(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            <Star className="w-4 h-4" />
            Assigner MVP du mois
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 border-b border-white/10">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === key
                ? 'text-violet-400 border-b-2 border-violet-400 bg-violet-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB : MEMBRES ──────────────────────────────────────────────── */}
      {activeTab === 'membres' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Administrateurs', count: counts.admin,  icon: Shield, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'CSM',             count: counts.csm,    icon: Shield, color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
              { label: 'Closers',         count: counts.closer, icon: Users,  color: 'text-green-400',  bg: 'bg-green-500/10'  },
              { label: 'Setters',         count: counts.setter, icon: Users,  color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
            ].map(({ label, count, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`${bg} p-2 rounded-lg shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white tabular-nums">{count}</p>
                  <p className="text-[11px] text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {deleteError && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {deleteError}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {filtres.map(f => (
              <button
                key={f.key}
                onClick={() => setFiltreRole(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filtreRole === f.key
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                }`}
              >
                {f.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  filtreRole === f.key ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-500'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {membresAffiches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <UserCircle2 className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Aucun membre dans cette catégorie</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-medium text-gray-500">
                      <th className="px-5 py-3 text-left">Membre</th>
                      <th className="px-5 py-3 text-left">Rôle</th>
                      <th className="px-5 py-3 text-left">Membre depuis</th>
                      <th className="px-5 py-3 text-left w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membresAffiches.map(m => (
                      <LigneMembre
                        key={m.id}
                        membre={m}
                        isSelf={m.id === currentUserId}
                        isAdmin={isAdmin}
                        onEdit={() => setMembreEdit(m)}
                        onDelete={() => handleDelete(m)}
                        deleting={isPending}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB : STATISTIQUES ─────────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Performance — {stats.moisLabel}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label:    'Total closes du mois',
                  value:    stats.totalCloses,
                  icon:     CheckCircle2,
                  color:    'text-green-400',
                  bg:       'bg-green-500/10',
                  sub:      'Tous closers confondus',
                },
                {
                  label:    'Cash collecté du mois',
                  value:    dollar(stats.cashCollecte),
                  icon:     Wallet,
                  color:    'text-blue-400',
                  bg:       'bg-blue-500/10',
                  sub:      'Encaissements cash_entries',
                },
                {
                  label:    'Score IA moyen',
                  value:    stats.scoreIaMoyen !== null ? `${stats.scoreIaMoyen} / 100` : '—',
                  icon:     TrendingUp,
                  color:    'text-violet-400',
                  bg:       'bg-violet-500/10',
                  sub:      'Feedback appels IA ce mois',
                },
              ].map(({ label, value, icon: Icon, color, bg, sub }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className={`${bg} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
                  <p className="text-xs font-medium text-gray-400 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-white/5">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Composition de l'équipe
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Administrateurs', count: counts.admin,  role: 'admin'  },
                { label: 'CSM',             count: counts.csm,    role: 'csm'    },
                { label: 'Closers',         count: counts.closer, role: 'closer' },
                { label: 'Setters',         count: counts.setter, role: 'setter' },
              ].map(({ label, count, role }) => {
                const style = ROLE_STYLE[role]
                return (
                  <div key={role} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 bg-white/5`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                    </div>
                    <p className="text-3xl font-bold text-white tabular-nums">{count}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500">
              Total équipe : <span className="text-white font-semibold">{counts.total} membres</span>
            </p>
          </div>
        </div>
      )}

      {/* ── TAB : BONUS & MVP ──────────────────────────────────────────── */}
      {activeTab === 'bonus' && (
        <div className="space-y-6">

          {/* MVP actuel ou invitation */}
          {mvpActuelNom ? (
            <div className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">MVP du mois — {stats.moisLabel}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="text-white font-medium">{mvpActuelNom}</span> a reçu un bonus de 500 $ ce mois-ci.
                </p>
              </div>
            </div>
          ) : isAdmin ? (
            <div className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-white">Aucun MVP assigné — {stats.moisLabel}</p>
                <p className="text-xs text-gray-500 mt-0.5">Choisissez un membre à récompenser ce mois.</p>
              </div>
              <button
                onClick={() => setShowModalMVP(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
              >
                <Star className="w-4 h-4" />
                Assigner
              </button>
            </div>
          ) : null}

          {/* Paliers */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Bonus automatiques — {stats.moisLabel}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Calculés sur le cash collecté associé à chaque membre</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500">
                    <th className="px-4 py-2.5 text-left">Palier collecté</th>
                    <th className="px-4 py-2.5 text-right">Closer</th>
                    <th className="px-4 py-2.5 text-right">Setter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {PALIERS.map(p => (
                    <tr key={p.seuil} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-white">{dollar(p.seuil)}</td>
                      <td className="px-4 py-2.5 text-right text-green-400 font-semibold">+{dollar(p.closer)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-400 font-semibold">+{dollar(p.setter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bonus par closer / setter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Closers */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <h3 className="text-sm font-semibold text-white">Closers</h3>
              </div>
              <div className="px-5">
                {bonusClosers.length === 0 ? (
                  <p className="py-6 text-sm text-gray-500 text-center">Aucune donnée ce mois</p>
                ) : (
                  bonusClosers.map(item => (
                    <LigneBonus key={item.id} item={item} type="closer" />
                  ))
                )}
              </div>
            </div>

            {/* Setters */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-sm font-semibold text-white">Setters</h3>
              </div>
              <div className="px-5">
                {bonusSetters.length === 0 ? (
                  <p className="py-6 text-sm text-gray-500 text-center">Aucune donnée ce mois</p>
                ) : (
                  bonusSetters.map(item => (
                    <LigneBonus key={item.id} item={item} type="setter" />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalInviter     && <ModalInviter onClose={() => setModalInviter(false)} />}
      {membreEdit       && <ModalModifier membre={membreEdit} onClose={() => setMembreEdit(null)} />}
      {showModalMVP     && <ModalMVP membres={membres} onClose={() => setShowModalMVP(false)} />}
    </div>
  )
}
