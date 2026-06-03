'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, UserCircle2, Mail, Shield, Users } from 'lucide-react'
import { inviterMembre, modifierMembre, supprimerMembre } from '@/app/(portal)/admin/actions'

// ── Types ────────────────────────────────────────────────────────────

type Membre = {
  id:         string
  full_name:  string | null
  email:      string | null
  role:       string
  avatar_url: string | null
  created_at: string
}

type RoleKey = 'admin' | 'csm' | 'closer' | 'setter'

// ── Constantes ───────────────────────────────────────────────────────

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
  admin:  'Administrateur',
  csm:    'CSM',
  closer: 'Closer',
  setter: 'Setter',
}

// ── Helpers ──────────────────────────────────────────────────────────

function initiales(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]?.toUpperCase() ?? '').slice(0, 2).join('')
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Avatar ───────────────────────────────────────────────────────────

function Avatar({ membre, size = 'md' }: { membre: Membre; size?: 'sm' | 'md' | 'lg' }) {
  const style   = ROLE_STYLE[membre.role] ?? ROLE_STYLE.closer
  const szClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'

  if (membre.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={membre.avatar_url} alt={membre.full_name ?? ''} className={`${szClass} rounded-full object-cover`} />
    )
  }
  return (
    <div className={`${szClass} ${style.initials} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}>
      {initiales(membre.full_name)}
    </div>
  )
}

// ── Badge rôle ───────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLE[role] ?? ROLE_STYLE.closer
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {ROLE_LABEL[role] ?? role}
    </span>
  )
}

// ── Modal base ───────────────────────────────────────────────────────

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

// ── Modal Inviter ────────────────────────────────────────────────────

function ModalInviter({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error,     setError]        = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await inviterMembre(fd)
        onClose()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <Modal title="Inviter un membre" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Adresse e-mail *</label>
          <input
            name="email"
            type="email"
            required
            placeholder="prenom@example.com"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom complet *</label>
          <input
            name="full_name"
            required
            placeholder="Prénom Nom"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Rôle *</label>
          <select
            name="role"
            required
            defaultValue=""
            className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="" disabled>Choisir un rôle</option>
            {ROLES.map(r => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>

        <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
          <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Un e-mail d'invitation sera envoyé à l'adresse indiquée.
        </p>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:border-white/20 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {isPending ? 'Envoi…' : 'Inviter'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal Modifier ───────────────────────────────────────────────────

function ModalModifier({ membre, onClose }: { membre: Membre; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error,     setError]        = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await modifierMembre(membre.id, fd)
        onClose()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
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
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom complet *</label>
          <input
            name="full_name"
            required
            defaultValue={membre.full_name ?? ''}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Rôle *</label>
          <select
            name="role"
            required
            defaultValue={membre.role}
            className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
          >
            {ROLES.map(r => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:border-white/20 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Ligne de membre ──────────────────────────────────────────────────

function LigneMembre({
  membre,
  isSelf,
  isAdmin,
  onEdit,
  onDelete,
  deleting,
}: {
  membre:   Membre
  isSelf:   boolean
  isAdmin:  boolean
  onEdit:   () => void
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/3 transition-colors group">
      {/* Membre */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar membre={membre} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{membre.full_name ?? '—'}</p>
              {isSelf && (
                <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-gray-400 rounded-full shrink-0">
                  Vous
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{membre.email ?? '—'}</p>
          </div>
        </div>
      </td>

      {/* Rôle */}
      <td className="px-5 py-3.5">
        <RoleBadge role={membre.role} />
      </td>

      {/* Depuis */}
      <td className="px-5 py-3.5 text-xs text-gray-500 tabular-nums">
        {fmtDate(membre.created_at)}
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        {isAdmin && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              title="Modifier"
              className="p-1.5 rounded-lg text-gray-500 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {!isSelf && (
              <button
                onClick={onDelete}
                disabled={deleting}
                title="Supprimer"
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Composant principal ──────────────────────────────────────────────

export default function AdminView({
  membres,
  currentUserId,
  isAdmin,
}: {
  membres:       Membre[]
  currentUserId: string
  isAdmin:       boolean
}) {
  const [filtreRole,    setFiltreRole]    = useState<string>('tous')
  const [modalInviter,  setModalInviter]  = useState(false)
  const [membreEdit,    setMembreEdit]    = useState<Membre | null>(null)
  const [isPending,     startTransition]  = useTransition()
  const [deleteError,   setDeleteError]   = useState<string | null>(null)

  const counts = useMemo(() => ({
    total:  membres.length,
    admin:  membres.filter(m => m.role === 'admin').length,
    csm:    membres.filter(m => m.role === 'csm').length,
    closer: membres.filter(m => m.role === 'closer').length,
    setter: membres.filter(m => m.role === 'setter').length,
  }), [membres])

  const filtres = [
    { key: 'tous',   label: 'Tous',           count: counts.total  },
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
      try {
        await supprimerMembre(m.id)
      } catch (err: unknown) {
        setDeleteError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Administration</h1>
          <p className="text-sm text-gray-400 mt-1">Gérez les membres et les accès de votre équipe</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModalInviter(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Inviter un membre
          </button>
        )}
      </div>

      {/* Bande de statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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

      {/* Filtre rôles */}
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

      {/* Tableau */}
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

      {/* Modals */}
      {modalInviter && <ModalInviter onClose={() => setModalInviter(false)} />}
      {membreEdit   && <ModalModifier membre={membreEdit} onClose={() => setMembreEdit(null)} />}
    </div>
  )
}
