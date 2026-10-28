'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Clock, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { creerTache, modifierTache, changerStatut, supprimerTache } from './actions'
import type { TaskCategory, TaskStatus, TaskPayload } from './actions'

// ── Types ─────────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  category: TaskCategory
  assigned_to: string | null
  due_date: string | null
  status: TaskStatus
  notes: string | null
  created_at: string
  assigned_profile: { full_name: string | null } | null
  creator_profile:  { full_name: string | null } | null
}

interface Member {
  id: string
  full_name: string | null
  role: string
}

interface Props {
  tasks:         Task[]
  members:       Member[]
  currentUserId: string
  isAdmin:       boolean
}

// ── Constantes ────────────────────────────────────────────────────

const CATEGORIES: { value: TaskCategory; label: string; color: string }[] = [
  { value: 'remboursement', label: 'Remboursement', color: 'bg-red-100 text-red-700' },
  { value: 'plateforme',    label: 'Plateforme',    color: 'bg-blue-100 text-blue-700' },
  { value: 'paie',          label: 'Paie',          color: 'bg-yellow-100 text-yellow-700' },
  { value: 'csm',           label: 'CSM',           color: 'bg-purple-100 text-purple-700' },
  { value: 'admin',         label: 'Admin',         color: 'bg-gray-100 text-gray-700' },
  { value: 'autre',         label: 'Autre',         color: 'bg-slate-100 text-slate-600' },
]

const STATUS_OPTS: { value: TaskStatus; label: string }[] = [
  { value: 'a_faire',   label: 'À faire'   },
  { value: 'en_cours',  label: 'En cours'  },
  { value: 'complete',  label: 'Complété'  },
]

function catStyle(cat: TaskCategory) {
  return CATEGORIES.find(c => c.value === cat)?.color ?? 'bg-gray-100 text-gray-600'
}
function catLabel(cat: TaskCategory) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(task: Task) {
  if (task.status === 'complete' || !task.due_date) return false
  return task.due_date < new Date().toISOString().split('T')[0]
}

function isToday(task: Task) {
  if (task.status === 'complete' || !task.due_date) return false
  return task.due_date === new Date().toISOString().split('T')[0]
}

// ── Modal formulaire ──────────────────────────────────────────────

interface ModalProps {
  task?:    Task | null
  members:  Member[]
  onClose:  () => void
}

function TaskModal({ task, members, onClose }: ModalProps) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<TaskPayload>({
    title:       task?.title       ?? '',
    category:    task?.category    ?? 'autre',
    assigned_to: task?.assigned_to ?? null,
    due_date:    task?.due_date    ?? null,
    notes:       task?.notes       ?? null,
  })

  function set<K extends keyof TaskPayload>(k: K, v: TaskPayload[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function submit() {
    if (!form.title.trim()) return
    startTransition(async () => {
      if (task) {
        await modifierTache(task.id, form)
      } else {
        await creerTache(form)
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Titre */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ex: Rembourser Julie Martin"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Catégorie</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value as TaskCategory)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Assignée à */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Assignée à</label>
            <select
              value={form.assigned_to ?? ''}
              onChange={e => set('assigned_to', e.target.value || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">— Non assigné —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>
              ))}
            </select>
          </div>

          {/* Échéance */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Échéance</label>
            <input
              type="date"
              value={form.due_date ?? ''}
              onChange={e => set('due_date', e.target.value || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value || null)}
              rows={3}
              placeholder="Détails supplémentaires..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={pending || !form.title.trim()}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors font-medium"
          >
            {pending ? 'Sauvegarde...' : task ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────

interface RowProps {
  task:    Task
  isAdmin: boolean
  onEdit:  () => void
}

function TaskRow({ task, isAdmin, onEdit }: RowProps) {
  const [pending, startTransition] = useTransition()

  const overdue = isOverdue(task)
  const today   = isToday(task)

  const nextStatus: TaskStatus =
    task.status === 'a_faire'  ? 'en_cours' :
    task.status === 'en_cours' ? 'complete' :
    'a_faire'

  function cycleStatus() {
    startTransition(() => changerStatut(task.id, nextStatus))
  }

  function handleDelete() {
    if (!confirm(`Supprimer "${task.title}" ?`)) return
    startTransition(() => supprimerTache(task.id))
  }

  const StatusIcon =
    task.status === 'complete' ? CheckCircle2 :
    task.status === 'en_cours' ? Clock :
    Circle

  const statusColor =
    task.status === 'complete' ? 'text-green-500' :
    task.status === 'en_cours' ? 'text-orange-500' :
    'text-gray-300'

  return (
    <tr className={cn(
      'border-b border-gray-50 hover:bg-gray-50/50 transition-colors group',
      task.status === 'complete' && 'opacity-60',
    )}>
      {/* Statut toggle */}
      <td className="w-10 px-3 py-3">
        <button
          onClick={cycleStatus}
          disabled={pending}
          title={`Passer à: ${STATUS_OPTS.find(s => s.value === nextStatus)?.label}`}
          className={cn('transition-colors hover:scale-110', statusColor, pending && 'opacity-40')}
        >
          <StatusIcon size={18} />
        </button>
      </td>

      {/* Titre + notes */}
      <td className="px-3 py-3 min-w-0">
        <p className={cn('text-sm font-medium text-gray-800', task.status === 'complete' && 'line-through text-gray-400')}>
          {task.title}
        </p>
        {task.notes && (
          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{task.notes}</p>
        )}
      </td>

      {/* Catégorie */}
      <td className="px-3 py-3 hidden sm:table-cell">
        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium', catStyle(task.category))}>
          {catLabel(task.category)}
        </span>
      </td>

      {/* Assignée à */}
      <td className="px-3 py-3 hidden md:table-cell">
        <span className="text-sm text-gray-600">
          {task.assigned_profile?.full_name ?? <span className="text-gray-300 italic">Non assigné</span>}
        </span>
      </td>

      {/* Échéance */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <span className={cn(
          'text-sm',
          overdue ? 'text-red-600 font-medium' : today ? 'text-orange-500 font-medium' : 'text-gray-500'
        )}>
          {overdue && <AlertCircle size={12} className="inline mr-1 mb-0.5" />}
          {fmtDate(task.due_date)}
        </span>
      </td>

      {/* Actions (admin seulement) */}
      {isAdmin && (
        <td className="px-3 py-3 w-20">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}

// ── Vue principale ────────────────────────────────────────────────

export default function ManagementView({ tasks, members, currentUserId, isAdmin }: Props) {
  const [modal, setModal]         = useState<'new' | Task | null>(null)
  const [filterStatus, setFilter] = useState<TaskStatus | 'all'>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterAssignee !== 'all' && t.assigned_to !== filterAssignee) return false
    return true
  })

  const overdueCount = tasks.filter(t => isOverdue(t)).length
  const todayCount   = tasks.filter(t => isToday(t)).length
  const pending      = tasks.filter(t => t.status !== 'complete').length

  const STATUS_FILTERS: { value: TaskStatus | 'all'; label: string; count?: number }[] = [
    { value: 'all',      label: 'Toutes',   count: tasks.length },
    { value: 'a_faire',  label: 'À faire',  count: tasks.filter(t => t.status === 'a_faire').length },
    { value: 'en_cours', label: 'En cours', count: tasks.filter(t => t.status === 'en_cours').length },
    { value: 'complete', label: 'Complétées', count: tasks.filter(t => t.status === 'complete').length },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tâches management</h1>
            <p className="text-sm text-gray-500 mt-1">
              {pending} tâche{pending !== 1 ? 's' : ''} active{pending !== 1 ? 's' : ''}
              {overdueCount > 0 && (
                <span className="ml-2 text-red-500 font-medium">· {overdueCount} en retard</span>
              )}
              {todayCount > 0 && (
                <span className="ml-2 text-orange-500 font-medium">· {todayCount} pour aujourd'hui</span>
              )}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setModal('new')}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Nouvelle tâche
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  filterStatus === f.value
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                {f.label}
                {f.count !== undefined && (
                  <span className={cn('ml-1.5', filterStatus === f.value ? 'text-violet-200' : 'text-gray-400')}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Filtre assignée */}
          {isAdmin && (
            <select
              value={filterAssignee}
              onChange={e => setFilterAssignee(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="all">Toute l'équipe</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <CheckCircle2 size={40} className="mb-3 text-gray-200" />
              <p className="text-sm font-medium">Aucune tâche</p>
              {isAdmin && (
                <button onClick={() => setModal('new')} className="mt-3 text-xs text-violet-500 hover:text-violet-700 underline underline-offset-2">
                  Créer une tâche
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="w-10 px-3 py-2" />
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Tâche</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Catégorie</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Assignée à</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Échéance</th>
                  {isAdmin && <th className="w-20 px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isAdmin={isAdmin}
                    onEdit={() => setModal(task)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Légende statuts */}
        <div className="flex items-center gap-4 mt-4 px-1">
          <p className="text-xs text-gray-400">Cliquer sur l'icône de statut pour avancer la tâche :</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Circle size={12} className="text-gray-300" /> À faire
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={12} className="text-orange-400" /> En cours
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <CheckCircle2 size={12} className="text-green-500" /> Complété
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <TaskModal
          task={modal === 'new' ? null : modal}
          members={members}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
