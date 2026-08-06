'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Panel,
  Handle,
  Position,
  MarkerType,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveOrgChart } from './actions'

// ── Types ──────────────────────────────────────────────────────────────

type NodeData = { name: string; title: string; color: string }
type OrgNode  = Node<NodeData>

// Old tree format (migration)
interface OldNode { id: string; name: string; title: string; color: string; children: OldNode[] }
interface FlowData { nodes: OrgNode[]; edges: Edge[] }

// ── Colors ─────────────────────────────────────────────────────────────

const COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#db2777', '#dc2626', '#0891b2', '#4b5563',
]

// ── Migration from old nested tree ─────────────────────────────────────

function treeToFlow(node: OldNode): FlowData {
  const nodes: OrgNode[] = []
  const edges: Edge[]    = []

  function walk(n: OldNode, x: number, y: number, spread: number) {
    nodes.push({ id: n.id, type: 'orgNode', data: { name: n.name, title: n.title, color: n.color }, position: { x, y } })
    const count = n.children.length
    if (!count) return
    const totalW = (count - 1) * spread
    n.children.forEach((child, i) => {
      edges.push({
        id: `${n.id}→${child.id}`,
        source: n.id, sourceHandle: 'bottom',
        target: child.id, targetHandle: 'top',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
        style: { stroke: '#9ca3af' },
      })
      walk(child, x - totalW / 2 + i * spread, y + 160, Math.max(spread * 0.7, 200))
    })
  }

  walk(node, 0, 0, 240)
  return { nodes, edges }
}

function parseData(raw: unknown): FlowData {
  if (raw && typeof raw === 'object' && 'children' in raw) return treeToFlow(raw as OldNode)
  const fd = raw as FlowData
  if (fd?.nodes && fd?.edges) return fd
  return {
    nodes: [{ id: 'root', type: 'orgNode', data: { name: 'She Closes', title: 'Direction', color: '#7c3aed' }, position: { x: 0, y: 0 } }],
    edges: [],
  }
}

function genId() { return Math.random().toString(36).slice(2, 10) }

// ── Custom node card ───────────────────────────────────────────────────

const handleStyle: React.CSSProperties = {
  width:        14,
  height:       14,
  background:   '#7c3aed',
  border:       '2px solid white',
  borderRadius: '50%',
  opacity:      1,
  cursor:       'crosshair',
  boxShadow:    '0 0 0 2px #ddd6fe',
}

function OrgNodeCard({ data, selected }: NodeProps) {
  const d = data as NodeData
  return (
    <div
      className={cn(
        'bg-white rounded-xl border-2 shadow-sm px-5 py-3 min-w-[140px] max-w-[180px] flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none',
        selected ? 'border-violet-500 shadow-violet-200 shadow-md' : 'border-gray-100 hover:border-gray-300 hover:shadow-md',
      )}
      style={{ borderLeftColor: d.color, borderLeftWidth: 4 }}
    >
      <Handle type="source" position={Position.Top}    id="top"    style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="source" position={Position.Left}   id="left"   style={handleStyle} />
      <Handle type="source" position={Position.Right}  id="right"  style={handleStyle} />
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: d.color }}
      >
        {d.name.charAt(0).toUpperCase()}
      </div>
      <p className="text-[13px] font-bold text-gray-900 text-center leading-tight">{d.name}</p>
      {d.title && <p className="text-[10px] text-gray-400 text-center leading-tight">{d.title}</p>}
    </div>
  )
}

const nodeTypes = { orgNode: OrgNodeCard }

// ── Edit panel ─────────────────────────────────────────────────────────

function EditPanel({
  node, onUpdate, onDelete, onClose,
}: {
  node:     OrgNode
  onUpdate: (id: string, patch: Partial<NodeData>) => void
  onDelete: (id: string) => void
  onClose:  () => void
}) {
  const [name,  setName]  = useState(node.data.name)
  const [title, setTitle] = useState(node.data.title)
  const [color, setColor] = useState(node.data.color)
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div className="w-64 bg-white border border-gray-100 rounded-2xl shadow-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Modifier le nœud</p>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors"><X size={14} /></button>
      </div>

      <div className="p-4 space-y-3 flex-1">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Nom</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom ou département"
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Titre / Rôle</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: CEO, Closer, CSM…"
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Couleur</label>
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} title={c}
                className={cn('w-6 h-6 rounded-full transition-all', color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105')}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 space-y-2">
        <button
          onClick={() => { onUpdate(node.id, { name: name.trim() || node.data.name, title: title.trim(), color }); onClose() }}
          className="w-full py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Check size={13} /> Appliquer
        </button>
        {confirmDel ? (
          <div className="flex gap-2">
            <button onClick={() => onDelete(node.id)}
              className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors">
              Confirmer
            </button>
            <button onClick={() => setConfirmDel(false)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)}
            className="w-full py-1.5 border border-red-100 text-red-500 hover:bg-red-50 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Trash2 size={12} /> Supprimer
          </button>
        )}
      </div>
    </div>
  )
}

// ── Inner canvas (needs ReactFlowProvider context) ─────────────────────

function OrgChartInner({ initialData }: { initialData: unknown }) {
  const { nodes: initNodes, edges: initEdges } = parseData(initialData)
  const [nodes, setNodes, onNodesChange] = useNodesState<OrgNode>(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)
  const [selectedId, setSelectedId]      = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)
  const [pending, startT]     = useTransition()
  const { screenToFlowPosition } = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedNode = nodes.find(n => n.id === selectedId) ?? null

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
      style: { stroke: '#9ca3af' },
    }, eds))
  }, [setEdges])

  const handleAddNode = useCallback(() => {
    const id = genId()
    let position = { x: 0, y: 100 }
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      position = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }
    setNodes(ns => [...ns, { id, type: 'orgNode', data: { name: 'Nouveau', title: '', color: '#7c3aed' }, position }])
    setSelectedId(id)
  }, [setNodes, screenToFlowPosition])

  const handleUpdate = useCallback((id: string, patch: Partial<NodeData>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
  }, [setNodes])

  const handleDelete = useCallback((id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(es => es.filter(e => e.source !== id && e.target !== id))
    setSelectedId(null)
  }, [setNodes, setEdges])

  function handleSave() {
    startT(async () => {
      await saveOrgChart({ nodes, edges })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex gap-4 h-[640px]">
      <div ref={wrapperRef} className="flex-1 rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedId(prev => prev === node.id ? null : node.id)}
          onPaneClick={() => setSelectedId(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode="Delete"
          defaultEdgeOptions={{
            markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
            style: { stroke: '#9ca3af' },
          }}
        >
          <Background color="#e5e7eb" gap={24} />
          <Controls />
          <Panel position="top-left">
            <p className="text-[11px] text-gray-400 bg-white/80 px-2 py-1 rounded-md">
              Glisser un bloc pour le déplacer · Cliquer-glisser depuis un point violet <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-600 align-middle mx-0.5" /> pour tracer une flèche · Suppr pour effacer
            </p>
          </Panel>
          <Panel position="top-right" className="flex gap-2">
            <button
              onClick={handleAddNode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 bg-white border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors shadow-sm"
            >
              <Plus size={12} /> Ajouter un nœud
            </button>
            <button
              onClick={handleSave}
              disabled={pending}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm',
                saved    ? 'bg-green-600 text-white'
                         : 'bg-violet-600 hover:bg-violet-700 text-white',
                pending && 'opacity-60 cursor-not-allowed',
              )}
            >
              {saved ? <><Check size={12} /> Sauvegardé</> : pending ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="shrink-0">
          <EditPanel
            node={selectedNode}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  )
}

// ── Export (wrapped in provider) ───────────────────────────────────────

export default function OrgChartView({ initialData }: { initialData: unknown }) {
  return (
    <ReactFlowProvider>
      <OrgChartInner initialData={initialData} />
    </ReactFlowProvider>
  )
}
