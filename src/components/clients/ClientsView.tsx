'use client'

import { useState, useMemo, useTransition } from 'react'
import { Search, X, Download, Users, CheckCircle2, AlertCircle, XCircle, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import { updateCsmClientContact } from '@/app/(portal)/clients/actions'

// ── Types ──────────────────────────────────────────────────────────

interface HistoricalClient {
  id: string
  year: number
  name: string
  phone: string | null
  email: string | null
  entry_date: string | null
  exit_date: string | null
  methode: string | null
  montant_reste: number | null
  status: string
  notes: string | null
}

interface LiveClient {
  id: string
  year: number
  name: string
  phone: string | null
  email: string | null
  entry_date: string | null
  exit_date: string | null
  methode: string | null
  montant_courant: number | null
  montant_reste: number
  payment_type: string | null
  status: string
  notes: string | null
}

type AnyClient = HistoricalClient | LiveClient

// ── Helpers ────────────────────────────────────────────────────────

function dollar(n: number) {
  return `${new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 2 }).format(n)} $`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  if (status?.toLowerCase() === 'dropped') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
      <XCircle size={9} />Sortie
    </span>
  )
  return null
}

function BalanceCell({ montantReste, status }: { montantReste: number | null; status: string }) {
  if (status?.toLowerCase() === 'dropped') return <span className="text-xs text-red-500 font-semibold">Sortie</span>
  if (!montantReste || montantReste <= 0) return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
      <CheckCircle2 size={10} />PIF
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
      <AlertCircle size={10} />manque {dollar(montantReste)}
    </span>
  )
}

function MethBadge({ m }: { m: string | null }) {
  if (!m) return <span className="text-gray-300">—</span>
  const ml = m.toLowerCase()
  const cls = ml.includes('financement') ? 'bg-purple-50 text-purple-700'
    : ml.includes('crédit') || ml.includes('credit') ? 'bg-blue-50 text-blue-700'
    : 'bg-gray-50 text-gray-600'
  const label = ml.includes('financement') ? 'Financement'
    : ml.includes('crédit') || ml.includes('credit') ? 'Crédit'
    : 'Interac'
  return <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', cls)}>{label}</span>
}

// ── Modal édition contact (2026) ───────────────────────────────────

const INPUT = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
const METHODES = ['Interac', 'Crédit', 'Financement'] as const

function ModalEditContact({ client, onClose }: { client: LiveClient; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      phone:   (fd.get('phone')   as string) || null,
      email:   (fd.get('email')   as string) || null,
      methode: (fd.get('methode') as string) || null,
    }
    setError(null)
    startTransition(async () => {
      try {
        await updateCsmClientContact(client.id, data)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Modifier les coordonnées</h2>
            <p className="text-xs text-gray-400 mt-0.5">{client.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Téléphone</label>
            <input name="phone" type="tel" defaultValue={client.phone ?? ''} placeholder="(514) 000-0000" className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Email</label>
            <input name="email" type="email" defaultValue={client.email ?? ''} placeholder="cliente@exemple.com" className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Méthode de paiement</label>
            <select name="methode" defaultValue={client.methode ?? ''} className={INPUT}>
              <option value="">— Non spécifiée —</option>
              {METHODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={pending}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── CSV export ─────────────────────────────────────────────────────

function exportCSV(clients: AnyClient[], year: number) {
  const headers = ['Nom', 'Téléphone', 'Email', 'Date entrée', 'Date sortie', 'Méthode', 'Montant qui reste', 'Statut', 'Notes']
  const rows = clients.map(c => [
    c.name,
    c.phone ?? '',
    c.email ?? '',
    c.entry_date ?? '',
    c.exit_date ?? '',
    c.methode ?? '',
    c.montant_reste != null ? c.montant_reste : '',
    c.status ?? '',
    c.notes ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `clients_${year}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Composant principal ────────────────────────────────────────────

export default function ClientsView({
  historical, clients2026,
}: {
  historical: HistoricalClient[]
  clients2026: LiveClient[]
}) {
  const currentYear = new Date().getFullYear()
  const [year,        setYear]        = useState<number | 'sorties'>(currentYear)
  const [search,      setSearch]      = useState('')
  const [editClient,  setEditClient]  = useState<LiveClient | null>(null)

  const allSorties: AnyClient[] = useMemo(() => {
    const all = [...clients2026, ...historical].filter(c => c.status === 'dropped')
    return all.sort((a, b) => (b.year - a.year) || (b.entry_date ?? '').localeCompare(a.entry_date ?? ''))
  }, [historical, clients2026])

  const clients: AnyClient[] = useMemo(() => {
    if (year === 'sorties') return allSorties
    const live = clients2026.filter(c => c.year === year)
    const hist = historical.filter(c => c.year === year)
    return [...live, ...hist].sort((a, b) =>
      (b.entry_date ?? '').localeCompare(a.entry_date ?? '')
    )
  }, [year, historical, clients2026, allSorties])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    )
  }, [clients, search])

  const stats = useMemo(() => {
    const total   = clients.length
    const pif     = clients.filter(c => (c.montant_reste ?? 0) <= 0 && c.status !== 'dropped').length
    const avecDette = clients.filter(c => (c.montant_reste ?? 0) > 0 && c.status !== 'dropped').length
    const sortie  = clients.filter(c => c.status === 'dropped').length
    const totalReste = clients.reduce((s, c) => {
      if (c.status === 'dropped') return s
      return s + (c.montant_reste ?? 0)
    }, 0)
    return { total, pif, avecDette, sortie, totalReste }
  }, [clients])

  const liveYears = Array.from(new Set(clients2026.map(c => c.year)))
  const histYears = Array.from(new Set(historical.map(c => c.year))).sort((a, b) => b - a)
  const YEARS = Array.from(new Set([currentYear, ...liveYears, ...histYears])).sort((a, b) => b - a)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        titre="Clients"
        subtitle="Registre complet de toutes les clientes — 2024, 2025 et 2026"
        action={
          <button
            onClick={() => exportCSV(filtered, year)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
          >
            <Download size={14} />
            Exporter CSV
          </button>
        }
      />

      {/* ── Year tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {YEARS.map((y, i) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={cn(
                'px-5 py-2.5 font-semibold transition-colors',
                i > 0 && 'border-l border-gray-200',
                year === y ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50',
              )}
            >
              {y}
              <span className={cn(
                'ml-1.5 text-xs font-normal',
                year === y ? 'text-violet-200' : 'text-gray-400',
              )}>
                ({clients2026.filter(c => c.year === y).length + historical.filter(c => c.year === y).length})
              </span>
            </button>
          ))}
          <button
            onClick={() => setYear('sorties')}
            className={cn(
              'px-5 py-2.5 font-semibold transition-colors border-l border-gray-200',
              year === 'sorties' ? 'bg-red-600 text-white' : 'text-red-500 hover:bg-red-50',
            )}
          >
            Sortie / Refund
            <span className={cn(
              'ml-1.5 text-xs font-normal',
              year === 'sorties' ? 'text-red-200' : 'text-red-300',
            )}>
              ({allSorties.length})
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, email…"
            className="pl-7 pr-7 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 w-72"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── KPI summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total clientes', value: stats.total, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'PIF', value: stats.pif, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Balance restante', value: stats.avecDette, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Sorties / Refund', value: stats.sortie, icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
              <Icon size={15} className={color} />
            </span>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {stats.totalReste > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-red-600 font-medium">Balance totale restante à collecter</span>
          <span className="text-base font-bold text-red-700 tabular-nums">{dollar(stats.totalReste)}</span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {year === 'sorties' ? 'Sortie / Refund' : year}
          </span>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
            {search && ` sur ${clients.length}`}
          </span>
          {year === currentYear && (
            <span className="text-[10px] text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full font-medium ml-auto">
              Données live — balance mise à jour automatiquement
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            {search ? `Aucun résultat pour « ${search} »` : 'Aucune cliente pour cette année'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-gray-400 bg-gray-50/40">
                  <th className="px-4 py-3 text-left whitespace-nowrap">#</th>
                  <th className="px-4 py-3 text-left">Nom</th>
                  {year === 'sorties' && <th className="px-4 py-3 text-left whitespace-nowrap">Année</th>}
                  <th className="px-4 py-3 text-left whitespace-nowrap">Téléphone</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Date entrée</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Date sortie</th>
                  <th className="px-4 py-3 text-left">Méthode</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Montant</th>
                  {year === currentYear && <th className="px-4 py-3 w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c, idx) => {
                  const missingContact = !c.phone || !c.email || !c.methode
                  return (
                  <tr key={c.id} className={cn(
                    'hover:bg-gray-50/50 transition-colors',
                    c.status === 'dropped' && 'opacity-50',
                  )}>
                    <td className="px-4 py-3 text-xs text-gray-300 tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <div className="font-medium text-gray-800 truncate">{c.name}</div>
                      <StatusBadge status={c.status} />
                    </td>
                    {year === 'sorties' && (
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.year}</span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {c.phone
                        ? <a href={`tel:${c.phone}`} className="hover:text-violet-600 transition-colors">{c.phone}</a>
                        : <span className="text-gray-200">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                      {c.email
                        ? <a href={`mailto:${c.email}`} className="hover:text-violet-600 transition-colors">{c.email}</a>
                        : <span className="text-gray-200">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(c.entry_date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(c.exit_date)}</td>
                    <td className="px-4 py-3"><MethBadge m={c.methode} /></td>
                    <td className="px-4 py-3">
                      <BalanceCell montantReste={c.montant_reste ?? null} status={c.status} />
                    </td>
                    {year === currentYear && (
                      <td className="px-2 py-3">
                        <button
                          onClick={() => setEditClient(c as LiveClient)}
                          title={missingContact ? 'Compléter les infos' : 'Modifier'}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            missingContact
                              ? 'text-amber-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-gray-200 hover:text-violet-500 hover:bg-violet-50',
                          )}
                        >
                          <Pencil size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editClient && (
        <ModalEditContact client={editClient} onClose={() => setEditClient(null)} />
      )}
    </div>
  )
}
