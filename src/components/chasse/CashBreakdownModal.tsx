'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { getCashBreakdown, type CashBreakdownEntry } from '@/app/(portal)/chasse/actions'

const dollar = (n: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' $'

function fmtDate(d: string) {
  return new Date(d + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface Props {
  profileId: string
  nom:       string
  groupe:    'closer' | 'setter'
  weekStart: string
  weekEnd:   string
  onClose:   () => void
}

export default function CashBreakdownModal({ profileId, nom, groupe, weekStart, weekEnd, onClose }: Props) {
  const [entries, setEntries] = useState<CashBreakdownEntry[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getCashBreakdown(profileId, groupe, weekStart, weekEnd)
      .then(data => { setEntries(data); setLoading(false) })
      .catch(() => { setEntries([]); setLoading(false) })
  }, [profileId, groupe, weekStart, weekEnd])

  const total = (entries ?? []).reduce((s, e) => s + e.collected, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-700 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #3d2b0f, #5c3d14)' }}
        >
          <div>
            <p className="text-sm font-bold text-amber-100">{nom}</p>
            <p className="text-xs text-amber-400 capitalize">{groupe} — semaine du {fmtDate(weekStart)}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-amber-500 animate-spin" />
            </div>
          ) : (entries ?? []).length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-12">Aucune vente cette semaine</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 border-b border-stone-800">
                  <th className="px-5 py-2.5 text-left">Cliente</th>
                  <th className="px-5 py-2.5 text-left">Date</th>
                  <th className="px-5 py-2.5 text-right">Collecté</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {(entries ?? []).map(e => (
                  <tr key={e.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-stone-200">{e.client_name ?? '—'}</p>
                      {e.notes && (
                        <p className="text-[11px] text-stone-500 mt-0.5 truncate">{e.notes}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-stone-400 whitespace-nowrap">{fmtDate(e.entry_date)}</td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-amber-300">{dollar(e.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer total */}
        {entries && entries.length > 0 && (
          <div className="px-5 py-3 border-t border-stone-700 flex items-center justify-between bg-stone-800/60">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Total</span>
            <span className="text-base font-bold tabular-nums text-amber-300">{dollar(total)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
