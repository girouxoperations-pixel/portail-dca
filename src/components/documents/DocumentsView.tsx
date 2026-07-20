'use client'

import { useState, useTransition } from 'react'
import {
  File, FileText, FileSpreadsheet, FileImage,
  Upload, Trash2, ExternalLink, Plus, X,
} from 'lucide-react'
import { uploadDocument, supprimerDocument } from '@/app/(portal)/documents/actions'

// ── Types ────────────────────────────────────────────────────────────

type Doc = {
  id:            string
  name:          string
  description:   string | null
  section:       string | null
  file_url:      string
  file_type:     string | null
  file_size:     number | null
  uploaded_by:   string | null
  uploader_name: string
  created_at:    string
}

// ── Constantes ───────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'general',     label: 'Général'      },
  { key: 'suivi',       label: 'Suivi'        },
  { key: 'payes',       label: 'Payes'        },
  { key: 'feedback',    label: 'Feedback'     },
  { key: 'cash',        label: 'Cash / Stats' },
] as const

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp'
const MAX_SIZE  = 50 * 1024 * 1024

// ── Helpers ──────────────────────────────────────────────────────────

function FileIcon({ type }: { type: string | null }) {
  const t = type?.toLowerCase() ?? ''
  if (t === 'pdf')                        return <FileText       className="w-8 h-8 text-red-400"    />
  if (['doc', 'docx'].includes(t))        return <FileText       className="w-8 h-8 text-blue-400"   />
  if (['xls', 'xlsx'].includes(t))        return <FileSpreadsheet className="w-8 h-8 text-green-400" />
  if (['ppt', 'pptx'].includes(t))        return <FileText       className="w-8 h-8 text-orange-400" />
  if (['png','jpg','jpeg','gif','webp'].includes(t))
                                          return <FileImage      className="w-8 h-8 text-purple-400" />
  return                                         <File           className="w-8 h-8 text-gray-400"   />
}

function fmtSize(b: number | null): string {
  if (!b) return '—'
  if (b < 1024)        return `${b} o`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Composant carte ──────────────────────────────────────────────────

function DocCard({
  doc, canDel, onDelete, deleting,
}: {
  doc: Doc
  canDel: boolean
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="p-2 rounded-lg bg-white/5 shrink-0">
          <FileIcon type={doc.file_type} />
        </div>
        {canDel && (
          <button
            onClick={onDelete}
            disabled={deleting}
            title="Supprimer"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white line-clamp-2 break-words">{doc.name}</p>
        {doc.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{doc.description}</p>
        )}
      </div>

      <div className="text-[11px] text-gray-500 space-y-0.5">
        <div className="flex gap-1.5 flex-wrap">
          <span>{fmtSize(doc.file_size)}</span>
          <span>·</span>
          <span>{fmtDate(doc.created_at)}</span>
        </div>
        <div>Par {doc.uploader_name}</div>
      </div>

      <a
        href={doc.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-xs font-medium rounded-lg transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Ouvrir / Télécharger
      </a>
    </div>
  )
}

// ── Modal upload ─────────────────────────────────────────────────────

function ModalUpload({
  defaultSection,
  onClose,
}: {
  defaultSection: string
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error,    setError]         = useState<string | null>(null)
  const [file,     setFile]          = useState<File | null>(null)

  function handleFile(f: File | null) {
    if (!f) { setFile(null); return }
    if (f.size > MAX_SIZE) { setError('Fichier trop grand (max 50 Mo)'); return }
    setError(null)
    setFile(f)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!file) { setError('Veuillez sélectionner un fichier'); return }

    const fd = new FormData(e.currentTarget)
    fd.set('file', file)

    startTransition(async () => {
      try {
        await uploadDocument(fd)
        onClose()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#1a1d2e] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Ajouter un document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom du document *</label>
            <input
              name="name"
              required
              placeholder="ex. Grille de commissions 2025"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Description courte (optionnel)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors"
            />
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Section *</label>
            <select
              name="section"
              required
              defaultValue={defaultSection}
              className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
            >
              {SECTIONS.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Fichier */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Fichier *</label>
            <label
              className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                file
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <input
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="text-center px-4">
                  <p className="text-sm font-medium text-violet-300 break-all line-clamp-2">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{fmtSize(file.size)}</p>
                </div>
              ) : (
                <div className="text-center px-4">
                  <Upload className="w-6 h-6 text-gray-500 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-400">PDF, DOCX, XLSX, PPTX, images</p>
                  <p className="text-xs text-gray-500 mt-0.5">Max 50 Mo</p>
                </div>
              )}
            </label>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:border-white/20 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isPending ? 'Envoi en cours…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────

export default function DocumentsView({
  documents,
  userId,
  role,
}: {
  documents: Doc[]
  userId:    string
  role:      string
}) {
  const [activeSection, setActiveSection] = useState<string>('general')
  const [showModal,     setShowModal]     = useState(false)
  const [isPending,     startTransition]  = useTransition()
  const [deleteError,   setDeleteError]   = useState<string | null>(null)

  const isAdmin = role === 'admin' || role === 'csm'
  const canDelete = (doc: Doc) => isAdmin || doc.uploaded_by === userId

  const filtered = documents.filter(d => (d.section ?? 'general') === activeSection)

  function handleDelete(doc: Doc) {
    if (!confirm(`Supprimer "${doc.name}" ?`)) return
    setDeleteError(null)
    startTransition(async () => {
      try {
        await supprimerDocument(doc.id, doc.file_url)
      } catch (err: unknown) {
        setDeleteError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-sm text-gray-400 mt-1">Ressources partagées de l'équipe</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter un document
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {deleteError}
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto">
        {SECTIONS.map(s => {
          const count = documents.filter(d => (d.section ?? 'general') === s.key).length
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
                activeSection === s.key
                  ? 'text-violet-400 border-b-2 border-violet-400 bg-violet-500/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {s.label}
              {count > 0 && (
                <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${
                  activeSection === s.key ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Grille de documents */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <File className="w-14 h-14 mb-4 opacity-20" />
          <p className="text-sm font-medium text-gray-400">Aucun document dans cette section</p>
          <p className="text-xs text-gray-600 mt-1">Cliquez sur « Ajouter un document » pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              canDel={canDelete(doc)}
              onDelete={() => handleDelete(doc)}
              deleting={isPending}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ModalUpload
          defaultSection={activeSection}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
