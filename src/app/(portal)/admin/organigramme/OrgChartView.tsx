'use client'

import { useState, useCallback, useTransition } from 'react'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Check, Network } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveOrgChart } from './actions'

// ── Types ─────────────────────────────────────────────────────────────

export interface OrgNode {
  id:       string
  name:     string
  title:    string
  color:    string
  children: OrgNode[]
}

// ── Palette de couleurs ───────────────────────────────────────────────

const COLORS = [
  { value: '#7c3aed', label: 'Violet'   },
  { value: '#2563eb', label: 'Bleu'     },
  { value: '#059669', label: 'Vert'     },
  { value: '#d97706', label: 'Orange'   },
  { value: '#db2777', label: 'Rose'     },
  { value: '#dc2626', label: 'Rouge'    },
  { value: '#0891b2', label: 'Cyan'     },
  { value: '#4b5563', label: 'Gris'     },
]

// ── Opérations sur l'arbre ────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 10) }

function updateNode(tree: OrgNode, id: string, patch: Partial<OrgNode>): OrgNode {
  if (tree.id === id) return { ...tree, ...patch }
  return { ...tree, children: tree.children.map(c => updateNode(c, id, patch)) }
}

function deleteNode(tree: OrgNode, id: string): OrgNode {
  return {
    ...tree,
    children: tree.children
      .filter(c => c.id !== id)
      .map(c => deleteNode(c, id)),
  }
}

function addChild(tree: OrgNode, parentId: string, child: OrgNode): OrgNode {
  if (tree.id === parentId) return { ...tree, children: [...tree.children, child] }
  return { ...tree, children: tree.children.map(c => addChild(c, parentId, child)) }
}

function moveSibling(tree: OrgNode, id: string, dir: 'up' | 'down'): OrgNode {
  const idx = tree.children.findIndex(c => c.id === id)
  if (idx !== -1) {
    const next = dir === 'up' ? idx - 1 : idx + 1
    if (next >= 0 && next < tree.children.length) {
      const arr = [...tree.children]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return { ...tree, children: arr }
    }
  }
  return { ...tree, children: tree.children.map(c => moveSibling(c, id, dir)) }
}

function findParent(tree: OrgNode, id: string): OrgNode | null {
  if (tree.children.some(c => c.id === id)) return tree
  for (const c of tree.children) {
    const found = findParent(c, id)
    if (found) return found
  }
  return null
}

// ── Node card ─────────────────────────────────────────────────────────

interface NodeCardProps {
  node:      OrgNode
  isRoot:    boolean
  siblings:  number
  sibIdx:    number
  onSelect:  (id: string) => void
  selectedId: string | null
}

function NodeCard({ node, isRoot, siblings, sibIdx, onSelect, selectedId }: NodeCardProps) {
  const isSelected = selectedId === node.id
  const hasChildren = node.children.length > 0

  return (
    <li className="org-li">
      {/* Card */}
      <div
        onClick={() => onSelect(node.id)}
        className={cn(
          'org-card group relative cursor-pointer select-none',
          'bg-white rounded-xl border-2 shadow-sm transition-all duration-150',
          'flex flex-col items-center gap-1 px-5 py-3 min-w-[140px] max-w-[180px]',
          isSelected
            ? 'border-violet-500 shadow-violet-100 shadow-md scale-[1.03]'
            : 'border-gray-100 hover:border-gray-300 hover:shadow-md',
        )}
        style={{ borderLeftColor: node.color, borderLeftWidth: 4 }}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: node.color }}>
          {node.name.charAt(0).toUpperCase()}
        </div>
        <p className="text-[13px] font-bold text-gray-900 text-center leading-tight">{node.name}</p>
        {node.title && (
          <p className="text-[10px] text-gray-400 text-center leading-tight">{node.title}</p>
        )}
      </div>

      {/* Recursive children */}
      {hasChildren && (
        <ol className="org-ol">
          {node.children.map((child, i) => (
            <NodeCard
              key={child.id}
              node={child}
              isRoot={false}
              siblings={node.children.length}
              sibIdx={i}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </ol>
      )}
    </li>
  )
}

// ── Edit panel ────────────────────────────────────────────────────────

interface EditPanelProps {
  node:     OrgNode
  isRoot:   boolean
  sibIdx:   number
  siblings: number
  onUpdate: (id: string, patch: Partial<OrgNode>) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  onMove:   (id: string, dir: 'up' | 'down') => void
  onClose:  () => void
}

function EditPanel({ node, isRoot, sibIdx, siblings, onUpdate, onDelete, onAddChild, onMove, onClose }: EditPanelProps) {
  const [name,  setName]  = useState(node.name)
  const [title, setTitle] = useState(node.title)
  const [color, setColor] = useState(node.color)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSave() {
    onUpdate(node.id, { name: name.trim() || node.name, title: title.trim(), color })
    onClose()
  }

  return (
    <div className="w-72 bg-white border border-gray-100 rounded-2xl shadow-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Modifier le nœud</p>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Name */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Nom</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nom de la personne / département"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Titre / Rôle</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="ex: CEO, Closer, CSM Manager…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Color */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Couleur</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                title={c.label}
                className={cn(
                  'w-7 h-7 rounded-full transition-all',
                  color === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105',
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        {/* Move siblings */}
        {!isRoot && siblings > 1 && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ordre</label>
            <div className="flex gap-2">
              <button
                disabled={sibIdx === 0}
                onClick={() => onMove(node.id, 'up')}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronUp size={13} /> Gauche
              </button>
              <button
                disabled={sibIdx === siblings - 1}
                onClick={() => onMove(node.id, 'down')}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Droite <ChevronDown size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 space-y-2">
        <button
          onClick={handleSave}
          className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Check size={14} /> Sauvegarder
        </button>
        <button
          onClick={() => onAddChild(node.id)}
          className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-gray-200"
        >
          <Plus size={14} /> Ajouter un sous-nœud
        </button>
        {!isRoot && (
          confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={() => onDelete(node.id)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Confirmer la suppression
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2 border border-red-100 text-red-500 hover:bg-red-50 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 size={13} /> Supprimer ce nœud
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────

export default function OrgChartView({ initialData }: { initialData: OrgNode }) {
  const [tree,       setTree]       = useState<OrgNode>(initialData)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saved,      setSaved]      = useState(false)
  const [pending,    startT]        = useTransition()

  const selectedNode   = selectedId ? findNodeById(tree, selectedId) : null
  const parentNode     = selectedId ? findParent(tree, selectedId)   : null
  const sibIdx         = parentNode ? parentNode.children.findIndex(c => c.id === selectedId) : 0
  const siblingsCount  = parentNode ? parentNode.children.length : 0

  function findNodeById(node: OrgNode, id: string): OrgNode | null {
    if (node.id === id) return node
    for (const c of node.children) {
      const f = findNodeById(c, id)
      if (f) return f
    }
    return null
  }

  const handleUpdate = useCallback((id: string, patch: Partial<OrgNode>) => {
    setTree(t => updateNode(t, id, patch))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setTree(t => deleteNode(t, id))
    setSelectedId(null)
  }, [])

  const handleAddChild = useCallback((parentId: string) => {
    const child: OrgNode = {
      id:       genId(),
      name:     'Nouveau',
      title:    '',
      color:    '#7c3aed',
      children: [],
    }
    setTree(t => addChild(t, parentId, child))
    setSelectedId(child.id)
  }, [])

  const handleMove = useCallback((id: string, dir: 'up' | 'down') => {
    setTree(t => moveSibling(t, id, dir))
  }, [])

  function handleSave() {
    startT(async () => {
      await saveOrgChart(tree)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tree CSS */}
      <style>{`
        .org-root { list-style: none; margin: 0; padding: 0; display: flex; justify-content: center; }
        .org-ol   { list-style: none; margin: 0; padding: 0; display: flex; justify-content: center; padding-top: 28px; position: relative; }
        .org-ol::before { content: ''; position: absolute; top: 0; left: 50%; width: 0; height: 28px; border-left: 2px solid #d1d5db; transform: translateX(-50%); }
        .org-li   { list-style: none; float: left; text-align: center; position: relative; padding: 28px 12px 0 12px; display: flex; flex-direction: column; align-items: center; }
        .org-li::before, .org-li::after { content: ''; position: absolute; top: 0; right: 50%; border-top: 2px solid #d1d5db; width: 50%; height: 28px; }
        .org-li::after { right: auto; left: 50%; border-left: 2px solid #d1d5db; border-top: 2px solid #d1d5db; }
        .org-li:only-child::before, .org-li:only-child::after { display: none; }
        .org-li:first-child::before, .org-li:last-child::after { border: 0 none; }
        .org-li:last-child::before { border-right: 2px solid #d1d5db; border-radius: 0 5px 0 0; }
        .org-li:first-child::after { border-radius: 5px 0 0 0; }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-200">
            <Network size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Organigramme</h1>
            <p className="text-xs text-gray-400">Cliquer sur un nœud pour le modifier · Admin uniquement</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAddChild('root')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
          >
            <Plus size={12} /> Ajouter
          </button>
          <button
            onClick={handleSave}
            disabled={pending}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all',
              saved
                ? 'bg-green-600 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200',
              pending && 'opacity-60 cursor-not-allowed',
            )}
          >
            {saved ? <><Check size={14} /> Sauvegardé</> : pending ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Canvas + panel */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Tree canvas */}
        <div className="flex-1 overflow-auto p-10">
          <div className="min-w-max mx-auto">
            <ol className="org-root">
              <NodeCard
                node={tree}
                isRoot
                siblings={1}
                sibIdx={0}
                onSelect={id => setSelectedId(prev => prev === id ? null : id)}
                selectedId={selectedId}
              />
            </ol>
          </div>

          {tree.children.length === 0 && (
            <p className="text-center text-sm text-gray-400 mt-12">
              Clique sur <strong>+ Ajouter</strong> pour créer le premier niveau de l&apos;organigramme.
            </p>
          )}
        </div>

        {/* Edit panel */}
        {selectedNode && (
          <div className="border-l border-gray-100 p-4 bg-white shrink-0">
            <EditPanel
              node={selectedNode}
              isRoot={selectedNode.id === 'root'}
              sibIdx={sibIdx}
              siblings={siblingsCount}
              onUpdate={(id, patch) => { handleUpdate(id, patch) }}
              onDelete={handleDelete}
              onAddChild={id => { handleAddChild(id); }}
              onMove={handleMove}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
