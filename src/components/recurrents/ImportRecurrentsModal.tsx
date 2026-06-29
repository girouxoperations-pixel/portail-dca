'use client'

import { useState, useRef, useTransition } from 'react'
import Papa from 'papaparse'
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react'
import { importerRecurringDeals, type RecurringDealRow } from '@/app/(portal)/cash/actions'

const TEMPLATE = [
  'client,montant,date,versements,closer,setter,methode,notes',
  'Marie Tremblay,1333,2026-06-15,3,Emma Tardif,Kim Fontaine,Interac,',
  'Sophie Roy,2000,2026-06-20,2,Audrey Lavallee,Rose Langlois,Financement,',
].join('\n')

const COLS = [
  { name: 'client',     req: true,  hint: 'Nom complet du client' },
  { name: 'montant',    req: true,  hint: 'Montant par versement ($)' },
  { name: 'date',       req: true,  hint: 'Date du 1er versement (AAAA-MM-JJ)' },
  { name: 'versements', req: true,  hint: 'Nombre de versements total (ex: 2 ou 3)' },
  { name: 'closer',     req: false, hint: 'Prénom Nom du closer (doit exister dans la plateforme)' },
  { name: 'setter',     req: false, hint: 'Prénom Nom du setter' },
  { name: 'methode',    req: false, hint: 'Interac / Financement / Crédit / Virement' },
  { name: 'notes',      req: false, hint: 'Notes libres' },
]

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ImportRecurrentsModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows]       = useState<RecurringDealRow[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [pending, start]      = useTransition()
  const fileRef               = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setRows([]); setError(''); setSuccess(''); setFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
      complete: (result) => {
        const data = result.data as Record<string, string>[]
        if (data.length === 0) { setError('Fichier vide ou format invalide.'); return }
        const missing = COLS.filter(c => c.req).map(c => c.name)
          .filter(r => !Object.keys(data[0]).includes(r))
        if (missing.length > 0) { setError(`Colonnes manquantes : ${missing.join(', ')}`); return }

        const now = new Date()
        const parsed: RecurringDealRow[] = data
          .filter(r => r.client?.trim())
          .map(r => ({
            originalDate: r.date?.trim() || now.toISOString().slice(0, 10),
            client:       r.client?.trim()     ?? '',
            montant:      r.montant?.trim()    ?? '0',
            collecte:     '0',
            methode:      r.methode?.trim()    ?? '',
            closer:       r.closer?.trim()     ?? '',
            setter:       r.setter?.trim()     ?? '',
            notes:        r.notes?.trim()      ?? '',
            versementsTotal: Number(r.versements) || 2,
          }))
        setRows(parsed)
      },
      error: (err: { message: string }) => setError(err.message),
    })
  }

  function handleImport() {
    start(async () => {
      const now = new Date()
      try {
        const result = await importerRecurringDeals(rows, now.getFullYear(), now.getMonth() + 1)
        setSuccess(`${result.count} entente${result.count > 1 ? 's' : ''} créée${result.count > 1 ? 's' : ''} avec succès.`)
        setRows([])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur lors de l\'import.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Importer des récurrents (CSV)</h2>
            <p className="text-xs text-gray-400 mt-0.5">Importez votre liste depuis Google Sheets</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Step 1 — Download template */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Étape 1 — Préparer le fichier
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-sm text-gray-700">
                Télécharge le gabarit CSV, remplis-le depuis ton Google Sheet (copy-paste), puis réimporte-le ici. Les noms de closers et setters doivent correspondre exactement aux noms dans la plateforme.
              </p>
              <button
                onClick={() => downloadCsv(TEMPLATE, 'gabarit_recurrents.csv')}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download size={13} />
                Télécharger le gabarit
              </button>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {COLS.map(c => (
                        <th key={c.name} className="text-left pb-1.5 pr-4 font-semibold text-gray-500">
                          {c.name}{c.req ? <span className="text-red-400 ml-0.5">*</span> : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COLS.map(c => (
                      <tr key={c.name}>
                        <td className="pr-4 py-1 text-gray-400 text-[11px]" colSpan={1}>{c.hint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Step 2 — Upload */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Étape 2 — Charger le fichier
            </p>
            <label
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onDragOver={e => e.preventDefault()}
            >
              <Upload size={22} className="text-gray-400" />
              <span className="text-sm text-gray-500">{fileName || 'Glisser-déposer ou cliquer pour choisir un fichier CSV'}</span>
              <input
                ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </label>
          </div>

          {/* Errors / feedback */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700">
              <CheckCircle2 size={15} className="shrink-0" />
              {success}
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Aperçu — {rows.length} entente{rows.length > 1 ? 's' : ''} détectée{rows.length > 1 ? 's' : ''}
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      {['Client', 'Montant', 'Date', 'Versements', 'Closer', 'Setter', 'Méthode'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{r.client}</td>
                        <td className="px-3 py-2 text-gray-600">{r.montant} $</td>
                        <td className="px-3 py-2 text-gray-600">{r.originalDate}</td>
                        <td className="px-3 py-2 text-gray-600">{r.versementsTotal ?? 2}</td>
                        <td className="px-3 py-2 text-gray-600">{r.closer || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{r.setter || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{r.methode || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annuler
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
