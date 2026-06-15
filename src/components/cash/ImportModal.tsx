'use client'

import { useState, useRef, useTransition } from 'react'
import Papa from 'papaparse'
import { Upload, Download, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  importerCashEntries,
  importerWeeklyPerfs,
  type CashImportRow,
  type PerfImportRow,
} from '@/app/(portal)/cash/actions'

// ── Templates ─────────────────────────────────────────────────────

const DEAL_TEMPLATE = [
  'date,client,montant,collecte,methode,type_close,closer,setter,source,notes',
  '2024-01-15,Nom Client,5000,2500,Virement,on_the_spot,John Doe,Jane Smith,webi,',
  '2024-01-20,Autre Client,8000,8000,Stripe,follow_up,John Doe,,vsl,',
].join('\n')

const PERF_TEMPLATE = [
  'annee,trimestre,semaine,source,budget,leads,presentes_webi,bookes,shows,closes,revenue,cash_collect,notes',
  '2024,1,1,webi,5000,100,30,20,15,5,25000,12000,',
  '2024,1,1,vsl,3000,50,,18,12,4,18000,9000,',
].join('\n')

// ── Column hints ──────────────────────────────────────────────────

const DEAL_COLS = [
  { name: 'date',       req: true,  hint: 'Format AAAA-MM-JJ (ex: 2024-01-15)' },
  { name: 'client',     req: false, hint: 'Nom du client' },
  { name: 'montant',    req: true,  hint: 'Montant total de la deal' },
  { name: 'collecte',   req: false, hint: 'Montant collecté' },
  { name: 'methode',    req: false, hint: 'Virement / Stripe / Interac / Chèque / Espèces' },
  { name: 'type_close', req: false, hint: 'on_the_spot ou follow_up' },
  { name: 'closer',     req: false, hint: 'Prénom Nom exact du closer (doit exister dans la plateforme)' },
  { name: 'setter',     req: false, hint: 'Prénom Nom exact du setter' },
  { name: 'source',     req: false, hint: 'webi ou vsl' },
  { name: 'notes',      req: false, hint: 'Notes libres' },
]

const PERF_COLS = [
  { name: 'annee',          req: true,  hint: 'Ex: 2024' },
  { name: 'trimestre',      req: true,  hint: '1, 2, 3 ou 4' },
  { name: 'semaine',        req: true,  hint: '1 à 13 (dans le trimestre)' },
  { name: 'source',         req: true,  hint: 'webi ou vsl' },
  { name: 'budget',         req: false, hint: 'Budget pub ($)' },
  { name: 'leads',          req: false, hint: 'Nb de leads' },
  { name: 'presentes_webi', req: false, hint: 'Participants webinaire (WEBI seulement)' },
  { name: 'bookes',         req: false, hint: 'Nb d\'appels bookés' },
  { name: 'shows',          req: false, hint: 'Nb de shows (appels présentés)' },
  { name: 'closes',         req: false, hint: 'Nb de closes' },
  { name: 'revenue',        req: false, hint: 'Revenue total ($)' },
  { name: 'cash_collect',   req: false, hint: 'Cash collecté ($)' },
  { name: 'notes',          req: false, hint: 'Notes' },
]

// ── Helpers ───────────────────────────────────────────────────────

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main component ────────────────────────────────────────────────

export default function ImportModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'deals' | 'perfs'>('deals')
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const cols = tab === 'deals' ? DEAL_COLS : PERF_COLS

  function handleFile(file: File) {
    setRows([])
    setError('')
    setSuccess('')
    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase(),
      complete: (result) => {
        const data = result.data as Record<string, string>[]
        if (data.length === 0) {
          setError('Fichier vide ou format invalide.')
          return
        }
        // Check required columns
        const required = cols.filter(c => c.req).map(c => c.name)
        const missing = required.filter(r => !Object.keys(data[0]).includes(r))
        if (missing.length > 0) {
          setError(`Colonnes manquantes : ${missing.join(', ')}`)
          return
        }
        setRows(data)
      },
      error: (err) => setError(err.message),
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleImport() {
    setError('')
    setSuccess('')
    startTransition(async () => {
      try {
        if (tab === 'deals') {
          const result = await importerCashEntries(rows as unknown as CashImportRow[])
          setSuccess(`${result.count} deal${result.count > 1 ? 's' : ''} importée${result.count > 1 ? 's' : ''} avec succès.`)
        } else {
          const result = await importerWeeklyPerfs(rows as unknown as PerfImportRow[])
          setSuccess(`${result.count} semaine${result.count > 1 ? 's' : ''} importée${result.count > 1 ? 's' : ''} avec succès.`)
        }
        setRows([])
        setFileName('')
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  const preview = rows.slice(0, 5)
  const previewCols = preview.length > 0 ? Object.keys(preview[0]) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Importer depuis CSV / Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm w-fit">
            {(['deals', 'perfs'] as const).map((t, i) => (
              <button
                key={t}
                onClick={() => { setTab(t); setRows([]); setFileName(''); setError(''); setSuccess('') }}
                className={cn(
                  'px-4 py-2 font-medium transition-colors',
                  i > 0 ? 'border-l border-gray-200' : '',
                  tab === t ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50',
                )}
              >
                {t === 'deals' ? 'Deals (cash)' : 'Perf hebdo'}
              </button>
            ))}
          </div>

          {/* Template download */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Télécharger le template</p>
              <p className="text-xs text-gray-400 mt-0.5">Remplis ce fichier dans Excel, puis exporte en CSV (UTF-8)</p>
            </div>
            <button
              onClick={() => downloadCsv(
                tab === 'deals' ? DEAL_TEMPLATE : PERF_TEMPLATE,
                tab === 'deals' ? 'template_deals.csv' : 'template_perf_hebdo.csv',
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
            >
              <Download size={13} />
              Template
            </button>
          </div>

          {/* Column reference */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-gray-400 uppercase tracking-wide select-none">
              Colonnes attendues ▾
            </summary>
            <div className="mt-2 grid grid-cols-1 gap-1">
              {cols.map(c => (
                <div key={c.name} className="flex items-start gap-2 text-xs">
                  <code className={cn('px-1.5 py-0.5 rounded font-mono shrink-0', c.req ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600')}>
                    {c.name}
                  </code>
                  <span className="text-gray-500">{c.hint}</span>
                  {c.req && <span className="text-red-400 shrink-0">*</span>}
                </div>
              ))}
            </div>
          </details>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
          >
            <Upload size={24} className="mx-auto text-gray-300 mb-2" />
            {fileName
              ? <p className="text-sm font-medium text-gray-700">{fileName}</p>
              : <p className="text-sm text-gray-400">Glisse ton fichier CSV ici ou <span className="text-violet-600 underline">clique pour parcourir</span></p>
            }
            {rows.length > 0 && (
              <p className="text-xs text-green-600 mt-1 font-medium">{rows.length} lignes détectées</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
              <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Aperçu — {rows.length} ligne{rows.length > 1 ? 's' : ''} ({preview.length < rows.length ? `5 premières sur ${rows.length}` : rows.length})
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 font-semibold uppercase tracking-wide">
                      {previewCols.map(c => (
                        <th key={c} className="px-3 py-2 text-left whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {previewCols.map(c => (
                          <td key={c} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-32 truncate">
                            {row[c] || <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Fermer
          </button>
          <button
            onClick={handleImport}
            disabled={rows.length === 0 || pending}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {pending
              ? <><Loader2 size={14} className="animate-spin" />Import en cours…</>
              : <><Upload size={14} />Importer {rows.length > 0 ? `${rows.length} ligne${rows.length > 1 ? 's' : ''}` : ''}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
