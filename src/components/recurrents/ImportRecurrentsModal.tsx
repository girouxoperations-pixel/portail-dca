'use client'

import { useState, useRef, useTransition } from 'react'
import Papa from 'papaparse'
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, X, Trash2 } from 'lucide-react'
import { importerRecurringDeals, type RecurringDealRow } from '@/app/(portal)/cash/actions'
import { supprimerImportRecent } from '@/app/(portal)/recurrents/actions'

// ── Template générique ────────────────────────────────────────────

const TEMPLATE = [
  'client,montant,date,versements,closer,setter,methode,notes',
  'Marie Tremblay,1333,2026-07-15,3,Emma Tardif,Kim Fontaine,Interac,',
  'Sophie Roy,2000,2026-07-20,2,Audrey Lavallee,Rose Langlois,Financement,',
].join('\n')

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function parseMontant(s: string): number {
  return parseFloat((s ?? '').replace(/[^0-9.]/g, '')) || 0
}

interface Parsed {
  rows:  RecurringDealRow[]
  year:  number
  month: number
}

function parseGeneric(data: Record<string, string>[]): Parsed | null {
  if (!['client', 'montant', 'date'].every(k => k in data[0])) return null
  const rows: RecurringDealRow[] = data
    .filter(r => r.client?.trim())
    .map(r => ({
      originalDate:    r.date?.trim() || new Date().toISOString().slice(0, 10),
      client:          r.client.trim(),
      montant:         String(parseMontant(r.montant) || 0),
      collecte:        '0',
      methode:         (r.methode ?? '').trim(),
      closer:          (r.closer ?? '').trim(),
      setter:          (r.setter ?? '').trim(),
      notes:           (r.notes ?? '').trim(),
      versementsTotal: Number(r.versements) || undefined,
    }))
  const [y, m] = (rows[0]?.originalDate ?? '').split('-').map(Number)
  return rows.length ? { rows, year: y || new Date().getFullYear(), month: m || new Date().getMonth() + 1 } : null
}

// DCA Google Sheet format — NO deduplication, all rows kept
function parseDcaGoogleSheet(data: Record<string, string>[]): Parsed | null {
  if (!('nom' in data[0])) return null
  const rows: RecurringDealRow[] = data
    .filter(r => (r['nom'] ?? '').trim())
    .map(r => ({
      originalDate:    (r['date'] ?? '').trim() || new Date().toISOString().slice(0, 10),
      client:          r['nom'].trim(),
      montant:         String(parseMontant(r['montant'] ?? '')),
      collecte:        '0',
      methode:         (r['méthode'] ?? r['methode'] ?? '').trim(),
      closer:          (r['closer'] ?? '').trim(),
      setter:          (r['setter'] ?? '').trim(),
      notes:           (r['notes'] ?? '').trim(),
      versementsTotal: undefined,
    }))
  const [y, m] = (rows[0]?.originalDate ?? '').split('-').map(Number)
  return rows.length ? { rows, year: y || new Date().getFullYear(), month: m || new Date().getMonth() + 1 } : null
}

function parseFile(data: Record<string, string>[]): Parsed | null {
  return parseDcaGoogleSheet(data) ?? parseGeneric(data)
}

const MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

// ── Component ─────────────────────────────────────────────────────

export default function ImportRecurrentsModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows]               = useState<RecurringDealRow[]>([])
  const [importYear, setImportYear]   = useState(0)
  const [importMonth, setImportMonth] = useState(0)
  const [fileName, setFileName]       = useState('')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [lastImportAt, setLastImportAt] = useState('')
  const [showUndo, setShowUndo]       = useState(false)
  const [pending, start]              = useTransition()
  const [undoPending, startUndo]      = useTransition()
  const fileRef                       = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setRows([]); setError(''); setSuccess(''); setFileName(file.name)

    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete: (result) => {
        const rawRows = result.data as string[][]
        const headerIdx = rawRows.findIndex(row =>
          row.some(cell => { const c = cell.trim().toLowerCase(); return c === 'nom' || c === 'client' })
        )
        if (headerIdx === -1) {
          setError('Format non reconnu. Utilise le gabarit fourni ou le format Google Sheet DCA (colonnes Nom, Montant, Date, Closer, Setter, Méthode).')
          return
        }
        const headers = rawRows[headerIdx].map(h => h.trim().toLowerCase())
        const data: Record<string, string>[] = rawRows
          .slice(headerIdx + 1)
          .filter(row => row.some(cell => cell.trim()))
          .map(row => {
            const obj: Record<string, string> = {}
            headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim() })
            return obj
          })
        const parsed = parseFile(data)
        if (!parsed || parsed.rows.length === 0) {
          setError('Aucune ligne valide trouvée.')
          return
        }
        setRows(parsed.rows)
        setImportYear(parsed.year)
        setImportMonth(parsed.month)
      },
      error: (err: { message: string }) => setError(err.message),
    })
  }

  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleImport() {
    const importedAt = new Date().toISOString()
    start(async () => {
      try {
        const result = await importerRecurringDeals(rows, importYear, importMonth, true)
        const msg = result.count === 0
          ? 'Aucune entente importée.'
          : `${result.created} entente${result.created > 1 ? 's' : ''} créée${result.created > 1 ? 's' : ''}${result.updated > 0 ? ` · ${result.updated} mise${result.updated > 1 ? 's' : ''} à jour` : ''}.`
        setSuccess(msg)
        setLastImportAt(importedAt)
        setRows([])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur lors de l\'import.')
      }
    })
  }

  function handleUndo(since?: string) {
    // If no timestamp given, delete everything created in the last 2 hours
    const sinceISO = since ?? new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    startUndo(async () => {
      try {
        const result = await supprimerImportRecent(sinceISO)
        setSuccess(`${result.count} entente${result.count > 1 ? 's' : ''} supprimée${result.count > 1 ? 's' : ''}.`)
        setLastImportAt('')
        setShowUndo(false)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur lors de la suppression.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Importer des récurrents (CSV)</h2>
            <p className="text-xs text-gray-400 mt-0.5">Compatible avec votre format Google Sheet ou le gabarit ci-dessous</p>
          </div>
          <div className="flex items-center gap-3">
            {!showUndo ? (
              <button
                onClick={() => setShowUndo(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Annuler dernier import
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                <span className="text-xs text-red-700">Supprimer les deals créés dans les 2 dernières heures ?</span>
                <button
                  onClick={() => handleUndo()}
                  disabled={undoPending}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-40"
                >
                  {undoPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  Confirmer
                </button>
                <button onClick={() => setShowUndo(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              </div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Formats acceptés</p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li><strong>Format Google Sheet DCA</strong> : colonnes <code className="bg-white px-1 rounded border border-gray-200">Nom, Montant, Date, Closer, Setter, Méthode</code></li>
              <li><strong>Format gabarit</strong> : colonnes <code className="bg-white px-1 rounded border border-gray-200">client, montant, date, versements, closer, setter, methode, notes</code></li>
            </ul>
            <button
              onClick={() => downloadCsv(TEMPLATE, 'gabarit_recurrents.csv')}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={13} />
              Télécharger le gabarit
            </button>
          </div>

          <label
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-6 cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={e => e.preventDefault()}
          >
            <Upload size={20} className="text-gray-400" />
            <span className="text-sm text-gray-500">{fileName || 'Glisser-déposer ou cliquer pour choisir un fichier CSV'}</span>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </label>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl p-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 size={15} className="shrink-0" />{success}
              </div>
              {lastImportAt && (
                <button
                  onClick={() => handleUndo(lastImportAt)}
                  disabled={undoPending}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-40"
                >
                  {undoPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Annuler cet import
                </button>
              )}
            </div>
          )}

          {rows.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {rows.length} ligne{rows.length > 1 ? 's' : ''} — clique ✕ pour en retirer
                </p>
                {importYear > 0 && (
                  <span className="text-xs bg-violet-50 text-violet-700 font-medium px-2 py-0.5 rounded-full">
                    {MOIS_FR[importMonth - 1]} {importYear}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      {['Client', 'Montant', 'Date', 'Closer', 'Setter', 'Méthode', 'Notes', ''].map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 group">
                        <td className="px-3 py-2 font-medium text-gray-800">{r.client}</td>
                        <td className="px-3 py-2 text-gray-600 tabular-nums">{Number(r.montant).toLocaleString('fr-CA')} $</td>
                        <td className="px-3 py-2 text-gray-600">{r.originalDate}</td>
                        <td className="px-3 py-2 text-gray-600">{r.closer || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{r.setter || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{r.methode || '—'}</td>
                        <td className="px-3 py-2 text-gray-400 max-w-[140px] truncate">{r.notes || ''}</td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => removeRow(i)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                          >
                            <X size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Fermer
          </button>
          <button
            onClick={handleImport}
            disabled={rows.length === 0 || pending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {pending ? 'Import en cours…' : `Importer ${rows.length > 0 ? `${rows.length} entente${rows.length > 1 ? 's' : ''}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
