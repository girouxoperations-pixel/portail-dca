'use client'

import { useState, useCallback, useTransition, useRef } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, X, Check, GripVertical } from 'lucide-react'
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

// ── Palette ───────────────────────────────────────────────────────────

const COLORS = [
  { value: '#7c3aed', label: 'Violet' },
  { value: '#2563eb', label: 'Bleu'   },
  { value: '#059669', label: 'Vert'   },
  { value: '#d97706', label: 'Orange' },
  { value: '#db2777', label: 'Rose'   },
  { value: '#dc2626', label: 'Rouge'  },
  { value: '#0891b2', label: 'Cyan'   },
  { value: '#4b5563', label: 'Gris'   },
]

// ── Tree operations ───────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 10) }

function findNodeById(tree: OrgNode, id: string): OrgNode | null {
  if (tree.id === id) return tree
  for (const c of tree.children) {
    const f = findNodeById(c, id)
    if (f) return f
  }
  return null
}

function findParent(tree: OrgNode, id: string): OrgNode | null {
  if (tree.children.some(c => c.id === id)) return tree
  for (const c of tree.children) {
    const found = findParent(c, id)
    if (found) return found
  }
  return null
}

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

function moveSibling(tree: OrgNode, id: string, dir: 'left' | 'right'): OrgNode {
  const idx = tree.children.findIndex(c => c.id === id)
  if (idx !== -1) {
    const next = dir === 'left' ? idx - 1 : idx + 1
    if (next >= 0 && next < tree.children.length) {
      const arr = [...tree.children]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return { ...tree, children: arr }
    }
  }
  return { ...tree, children: tree.children.map(c => moveSibling(c, id, dir)) }
}

// Move dragged node to be a child of target node
function moveNodeToParent(tree: OrgNode, draggedId: string, targetId: string): OrgNode {
  if (draggedId === targetId) return tree
  const dragged = findNodeById(tree, draggedId)
  if (!dragged) return tree
  // Prevent dropping into own descendants
  if (findNodeById(dragged, targetId)) return tree
  const without = deleteNode(tree, draggedId)
  return addChild(without, targetId, dragged)
}

// ── Node card ─────────────────────────────────────────────────────────

interface NodeCardProps {
  node:        OrgNode
  isRoot:      boolean
  selectedId:  string | null
  draggedId:   string | null
  dragOverId:  string | null
  onSelect:    (id: string) => void
  onDragStart: (id: string) => void
  onDragOver:  (id: string) => void
  onDragLeave: () => void
  onDrop:      (targetId: string) => void
}

function NodeCard({
  node, isRoot, selectedId, draggedId, dragOverId,
  onSelect, onDragStart, onDragOver, onDragLeave, onDrop,
}: NodeCardProps) {
  const isSelected  = selectedId === node.id
  const isDragging  = draggedId  === node.id
  const isDropTarget = dragOverId === node.id && draggedId !== node.id

  return (
    <li className="org-li">
      <div
        draggable={!isRoot}
        onClick={() => onSelect(node.id)}
        onDragStart={e => { e.stopPropagation(); onDragStart(node.id) }}
        onDragOver={e  => { e.preventDefault(); e.stopPropagation(); onDragOver(node.id) }}
        onDragLeave={e => { e.stopPropagation(); onDragLeave() }}
        onDrop={e      => { e.preventDefault(); e.stopPropagation(); onDrop(node.id) }}
        className={cn(
          'org-card relative cursor-pointer select-none transition-all duration-150',
          'bg-white rounded-xl border-2 shadow-sm',
          'flex flex-col items-center gap-1 px-5 py-3 min-w-[140px] max-w-[180px]',
          isSelected   && 'border-violet-500 shadow-violet-100 shadow-md scale-[1.03]',
          !isSelected && !isDropTarget && 'border-gray-100 hover:border-gray-300 hover:shadow-md',
          isDropTarget && 'border-blue-400 shadow-blue-100 shadow-md bg-blue-50 scale-[1.03]',
          isDragging   && 'opacity-40 scale-95',
        )}
        style={{ borderLeftColor: isDropTarget ? '#60a5fa' : node.color, borderLeftWidth: 4 }}
      >
        {!isRoot && (
          <GripVertical size={10} className="absolute top-1 right-1 text-gray-300" />
        )}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: node.color }}
        >
          {node.name.charAt(0).toUpperCase()}
        </div>
        <p className="text-[13px] font-bold text-gray-900 text-center leading-tight">{node.name}</p>
        {node.title && (
          <p className="text-[10px] text-gray-400 text-center leading-tight">{node.title}</p>
        )}
        {isDropTarget && (
          <p className="text-[9px] text-blue-500 font-semibold mt-0.5">Déposer ici</p>
        )}
      </div>

      {node.children.length > 0 && (
        <ol className="org-ol">
          {node.children.map((child, i) => (
            <NodeCard
              key={child.id}
              node={child}
              isRoot={false}
              selectedId={selectedId}
              draggedId={draggedId}
              dragOverId={dragOverId}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </ol>
      )}
    </li>
  )
}

// ── Edit panel ────────────────────────────────────────────────────────

interface EditPanelProps {
  node:       OrgNode
  isRoot:     boolean
  sibIdx:     number
  siblings:   number
  onUpdate:   (id: string, patch: Partial<OrgNode>) => void
  onDelete:   (id: string) => void
  onAddChild: (parentId: string) => void
  onMove:     (id: string, dir: 'left' | 'right') => void
  onClose:    () => void
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
    <div className="w-64 bg-white border border-gray-100 rounded-2xl shadow-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Modifier</p>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-3 flex-1">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Nom</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nom ou département"
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Titre / Rôle</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="ex: CEO, Closer, CSM…"
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Couleur</label>
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                title={c.label}
                className={cn(
                  'w-6 h-6 rounded-full transition-all',
                  color === c.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105',
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        {!isRoot && siblings > 1 && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Position</label>
            <div className="flex gap-2">
              <button
                disabled={sibIdx === 0}
                onClick={() => onMove(node.id, 'left')}
                className="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={12} /> Gauche
              </button>
              <button
                disabled={sibIdx === siblings - 1}
                onClick={() => onMove(node.id, 'right')}
                className="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Droite <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pt-0 space-y-2">
        <button
          onClick={handleSave}
          className="w-full py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Check size={13} /> Appliquer
        </button>
        <button
          onClick={() => onAddChild(node.id)}
          className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-gray-200"
        >
          <Plus size={13} /> Ajouter un sous-nœud
        </button>
        {!isRoot && (
          confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={() => onDelete(node.id)}
                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Confirmer
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-1.5 border border-red-100 text-red-500 hover:bg-red-50 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 size={12} /> Supprimer
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

export default function OrgChartView({ initialData }: { initialData: OrgNode }) {
  const [tree,       setTree]       = useState<OrgNode>(initialData)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggedId,  setDraggedId]  = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [saved,      setSaved]      = useState(false)
  const [pending,    startT]        = useTransition()

  const selectedNode  = selectedId ? findNodeById(tree, selectedId) : null
  const parentNode    = selectedId ? findParent(tree, selectedId)   : null
  const sibIdx        = parentNode ? parentNode.children.findIndex(c => c.id === selectedId) : 0
  const siblingsCount = parentNode ? parentNode.children.length : 0

  const handleUpdate = useCallback((id: string, patch: Partial<OrgNode>) => {
    setTree(t => updateNode(t, id, patch))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setTree(t => deleteNode(t, id))
    setSelectedId(null)
  }, [])

  const handleAddChild = useCallback((parentId: string) => {
    const child: OrgNode = { id: genId(), name: 'Nouveau', title: '', color: '#7c3aed', children: [] }
    setTree(t => addChild(t, parentId, child))
    setSelectedId(child.id)
  }, [])

  const handleMove = useCallback((id: string, dir: 'left' | 'right') => {
    setTree(t => moveSibling(t, id, dir))
  }, [])

  // Drag handlers
  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id)
    setSelectedId(null)
  }, [])

  const handleDragOver = useCallback((id: string) => {
    setDragOverId(id)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
  }, [])

  const handleDrop = useCallback((targetId: string) => {
    if (draggedId && draggedId !== targetId) {
      setTree(t => moveNodeToParent(t, draggedId, targetId))
    }
    setDraggedId(null)
    setDragOverId(null)
  }, [draggedId])

  function handleSave() {
    startT(async () => {
      await saveOrgChart(tree)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <>
      {/* Tree CSS */}
      <style>{`
        .org-root { list-style:none; margin:0; padding:0; display:flex; justify-content:center; }
        .org-ol   { list-style:none; margin:0; padding:0; display:flex; justify-content:center; padding-top:28px; position:relative; }
        .org-ol::before { content:''; position:absolute; top:0; left:50%; width:0; height:28px; border-left:2px solid #d1d5db; transform:translateX(-50%); }
        .org-li   { list-style:none; float:left; text-align:center; position:relative; padding:28px 12px 0 12px; display:flex; flex-direction:column; align-items:center; }
        .org-li::before,.org-li::after { content:''; position:absolute; top:0; right:50%; border-top:2px solid #d1d5db; width:50%; height:28px; }
        .org-li::after { right:auto; left:50%; border-left:2px solid #d1d5db; border-top:2px solid #d1d5db; }
        .org-li:only-child::before,.org-li:only-child::after { display:none; }
        .org-li:first-child::before,.org-li:last-child::after { border:0 none; }
        .org-li:last-child::before { border-right:2px solid #d1d5db; border-radius:0 5px 0 0; }
        .org-li:first-child::after { border-radius:5px 0 0 0; }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">
          Glisser un nœud sur un autre pour le déplacer · Cliquer pour modifier
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddChild('root')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
          >
            <Plus size={12} /> Ajouter un nœud
          </button>
          <button
            onClick={handleSave}
            disabled={pending}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all',
              saved    ? 'bg-green-600 text-white'
                       : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm',
              pending && 'opacity-60 cursor-not-allowed',
            )}
          >
            {saved ? <><Check size={12} /> Sauvegardé</> : pending ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Canvas + edit panel side by side */}
      <div className="flex gap-4 h-[560px]">
        {/* Tree canvas */}
        <div
          className="flex-1 bg-gray-50 rounded-xl border border-gray-100 overflow-auto p-8"
          onDragOver={e => e.preventDefault()}
          onDrop={() => { setDraggedId(null); setDragOverId(null) }}
        >
          <div className="min-w-max mx-auto">
            <ol className="org-root">
              <NodeCard
                node={tree}
                isRoot
                selectedId={selectedId}
                draggedId={draggedId}
                dragOverId={dragOverId}
                onSelect={id => setSelectedId(prev => prev === id ? null : id)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            </ol>
          </div>

          {tree.children.length === 0 && (
            <p className="text-center text-sm text-gray-400 mt-12">
              Clique sur <strong>+ Ajouter un nœud</strong> pour créer le premier niveau.
            </p>
          )}
        </div>

        {/* Edit panel */}
        {selectedNode && (
          <div className="shrink-0">
            <EditPanel
              node={selectedNode}
              isRoot={selectedNode.id === 'root'}
              sibIdx={sibIdx}
              siblings={siblingsCount}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAddChild={handleAddChild}
              onMove={handleMove}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </>
  )
}
