'use client'

import { useState, useTransition } from 'react'
import Papa from 'papaparse'
import Link from 'next/link'
import { Upload, CheckCircle2, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react'
import { importCsmClients, deleteAllCsmClients } from './actions'

// Mirror of server parseDate for preview
const FR_MONTHS: Record<string, string> = {
  janvier: '01', jan: '01', janv: '01',
  février: '02', fevrier: '02', fév: '02', fev: '02',
  mars: '03', mar: '03',
  avril: '04', avr: '04',
  mai: '05',
  juin: '06',
  juillet: '07', juil: '07',
  août: '08', aout: '08',
  septembre: '09', sep: '09', sept: '09',
  octobre: '10', oct: '10',
  novembre: '11', nov: '11',
  décembre: '12', decembre: '12', déc: '12', dec: '12',
}

function smartYear(month: string, day: string): string {
  const now = new Date()
  const currentYear = now.getFullYear()
  const candidate = new Date(`${currentYear}-${month}-${day}T00:00`)
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() + 2)
  return candidate > cutoff ? String(currentYear - 1) : String(currentYear)
}

function parseDate(raw: string | undefined | null): string | null {
  if (!raw || !raw.trim()) return null
  const s = raw.trim().replace(/\./g, '')
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  const frFull = s.toLowerCase().match(/^(\d{1,2})\s+([a-zéûôàèùâêîœç]+)\s*(\d{4})?$/)
  if (frFull) {
    const [, d, mRaw, y] = frFull
    const m = FR_MONTHS[mRaw.replace(/[éè]/g, 'e').replace('û', 'u').replace('â', 'a')] ?? FR_MONTHS[mRaw]
    if (m) {
      const day = d.padStart(2, '0')
      const year = y ?? smartYear(m, day)
      return `${year}-${m}-${day}`
    }
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

function normalizeKey(k: string): string {
  return k.trim().replace(/[''ʼ]/g, "'").replace(/^["']|["']$/g, '')
}

function get(row: Record<string, string>, ...keys: string[]): string | undefined {
  const normalized: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) normalized[normalizeKey(k)] = v
  for (const key of keys) {
    const nk = normalizeKey(key)
    if (normalized[nk] !== undefined) return normalized[nk]
  }
  return undefined
}

function formatParsedDate(raw: string | undefined | null): { display: string; ok: boolean } {
  if (!raw || !raw.trim()) return { display: '—', ok: false }
  const parsed = parseDate(raw)
  if (!parsed) return { display: `⚠ "${raw}"`, ok: false }
  const d = new Date(parsed + 'T00:00')
  const display = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  return { display, ok: true }
}

export default function CsmImportClient() {
  const [rows, setRows]           = useState<Record<string, string>[] | null>(null)
  const [filename, setFilename]   = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<number | null>(null)
  const [pending, start]          = useTransition()
  const [deleting, startDelete]   = useTransition()
  const [deleted, setDeleted]     = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFilename(file.name)
    setError(null)
    setSuccess(null)
    setDeleted(false)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (results.errors.length > 0) {
          setError('Erreur de lecture CSV : ' + results.errors[0].message)
          return
        }
        setRows(results.data)
      },
      error(err) {
        setError('Impossible de lire le fichier : ' + err.message)
      },
    })
  }

  function handleDelete() {
    if (!confirm('Supprimer TOUTES les clientes CSM ? Cette action est irréversible.')) return
    startDelete(async () => {
      try {
        await deleteAllCsmClients()
        setDeleted(true)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  function handleImport() {
    if (!rows) return
    setError(null)
    start(async () => {
      try {
        const result = await importCsmClients(rows)
        setSuccess(result.count)
        setRows(null)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  // Preview: name + raw date + parsed date + payment
  const preview = rows?.slice(0, 8).map(r => {
    const name    = get(r, 'Noms', 'Nom', 'name') ?? ''
    const rawDate = get(r, "DATE D'INSCRIPTION", "DATE D'INSCRIPTION", 'Date inscription', 'enrollment_date', 'Date') ?? ''
    const payment = get(r, 'Paiement', 'payment_type') ?? ''
    const parsed  = formatParsedDate(rawDate)
    return { name, rawDate, parsed, payment }
  })

  const badDates = rows?.filter(r => {
    const rawDate = get(r, "DATE D'INSCRIPTION", "DATE D'INSCRIPTION", 'Date inscription', 'enrollment_date', 'Date') ?? ''
    return !parseDate(rawDate)
  }).length ?? 0

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/csm" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import CSV — Clientes CSM</h1>
          <p className="text-sm text-gray-500">Importer vos clientes depuis votre fichier</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <Trash2 size={12} />
          {deleting ? 'Suppression…' : 'Vider la table'}
        </button>
      </div>

      {/* Deleted confirmation */}
      {deleted && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
          <CheckCircle2 size={15} /> Table vidée — vous pouvez maintenant importer.
        </div>
      )}

      {/* Upload zone */}
      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
        <Upload size={24} className="text-gray-300 mb-2" />
        <p className="text-sm font-medium text-gray-500">
          {filename ? filename : 'Cliquer pour choisir votre fichier CSV'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Fichier .csv uniquement</p>
        <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </label>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Success */}
      {success !== null && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle2 size={18} />
          <div>
            <p className="font-semibold">{success} cliente{success !== 1 ? 's' : ''} importée{success !== 1 ? 's' : ''} avec succès !</p>
            <Link href="/csm" className="text-sm underline mt-0.5 block">Voir le suivi CSM →</Link>
          </div>
        </div>
      )}

      {/* Preview */}
      {rows && rows.length > 0 && preview && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {rows.length} ligne{rows.length !== 1 ? 's' : ''} détectée{rows.length !== 1 ? 's' : ''}
            </p>
            {badDates > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <AlertCircle size={12} /> {badDates} date{badDates > 1 ? 's' : ''} non reconnue{badDates > 1 ? 's' : ''} — vérifiez l&apos;aperçu ci-dessous.
              </p>
            )}
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Date brute (CSV)</th>
                  <th className="px-3 py-2 text-left">Date parsée ✓</th>
                  <th className="px-3 py-2 text-left">Paiement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{row.name || <span className="text-red-400">⚠ vide</span>}</td>
                    <td className="px-3 py-2 text-gray-400 font-mono">{row.rawDate || '—'}</td>
                    <td className={`px-3 py-2 font-medium ${row.parsed.ok ? 'text-green-700' : 'text-red-500'}`}>
                      {row.parsed.display}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{row.payment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 8 && (
              <p className="text-xs text-gray-400 text-center py-2 border-t border-gray-50">
                … et {rows.length - 8} autre{rows.length - 8 !== 1 ? 's' : ''} ligne{rows.length - 8 !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={pending}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {pending ? 'Import en cours…' : `Importer ${rows.length} cliente${rows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
