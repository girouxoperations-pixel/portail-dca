'use client'

import { useState, useTransition } from 'react'
import { Settings, RotateCcw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mettreAJourConfig, sauvegarderOverride, confirmerSemaine, confirmerElimination, reassignerPosition } from '@/app/(portal)/chasse/actions'

const dollar = (n: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' $'

const INPUT = 'w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white'

interface Props {
  config: {
    show_cash: boolean
    cerf_oct_closer: number; cerf_oct_setter: number
    cerf_nov_closer: number; cerf_nov_setter: number
    cerf_dec_closer: number; cerf_dec_setter: number
  } | null
  players: Array<{ id: string; position: string; groupe: string; profiles: { full_name: string | null } | null }>
  currentWeek: { id: string; week_number: number; week_start: string; week_end: string; month: number } | null
  duelsCurrentWeek: Array<{
    id: string; groupe: string; is_cerf: boolean
    player1_id: string; player2_id: string | null
    player1_cash_override: number | null; player2_cash_override: number | null
  }>
  cashCloser: Record<string, number>
  cashSetter: Record<string, number>
}

export default function AdminPanel({ config, players, currentWeek, duelsCurrentWeek, cashCloser, cashSetter }: Props) {
  const [pending, startT] = useTransition()
  const [msg, setMsg]     = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  // Config state
  const [showCash, setShowCash]           = useState(config?.show_cash ?? false)
  const [cerfOctC, setCerfOctC]           = useState(String(config?.cerf_oct_closer ?? 0))
  const [cerfOctS, setCerfOctS]           = useState(String(config?.cerf_oct_setter ?? 0))
  const [cerfNovC, setCerfNovC]           = useState(String(config?.cerf_nov_closer ?? 0))
  const [cerfNovS, setCerfNovS]           = useState(String(config?.cerf_nov_setter ?? 0))
  const [cerfDecC, setCerfDecC]           = useState(String(config?.cerf_dec_closer ?? 0))
  const [cerfDecS, setCerfDecS]           = useState(String(config?.cerf_dec_setter ?? 0))

  // Override state par duel
  const [overrides, setOverrides] = useState<Record<string, { v1: string; v2: string; reason: string }>>({})

  function getOverride(duelId: string) {
    return overrides[duelId] ?? { v1: '', v2: '', reason: '' }
  }

  function setOverrideField(duelId: string, field: 'v1' | 'v2' | 'reason', val: string) {
    setOverrides(prev => ({ ...prev, [duelId]: { ...getOverride(duelId), [field]: val } }))
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 4000) }

  async function saveConfig() {
    startT(async () => {
      await mettreAJourConfig({
        showCash,
        cerfOctCloser: Number(cerfOctC), cerfOctSetter: Number(cerfOctS),
        cerfNovCloser: Number(cerfNovC), cerfNovSetter: Number(cerfNovS),
        cerfDecCloser: Number(cerfDecC), cerfDecSetter: Number(cerfDecS),
      })
      flash('Configuration sauvegardée ✓')
    })
  }

  async function saveOverride(duelId: string, player: '1' | '2') {
    const ov = getOverride(duelId)
    const val = player === '1' ? ov.v1 : ov.v2
    if (val === '') return
    startT(async () => {
      await sauvegarderOverride(duelId, player, Number(val), ov.reason)
      flash('Override sauvegardé ✓')
    })
  }

  async function confirmerSem() {
    if (!currentWeek) return
    if (!confirm(`Confirmer la semaine ${currentWeek.week_number} ?`)) return
    startT(async () => {
      await confirmerSemaine(currentWeek.id, currentWeek.week_start, currentWeek.week_end)
      flash('Semaine confirmée ✓')
    })
  }

  async function confirmerElim() {
    if (!currentWeek) return
    if (!confirm(`Confirmer l'élimination du mois ${currentWeek.month} ?`)) return
    startT(async () => {
      await confirmerElimination(currentWeek.month)
      flash('Élimination confirmée ✓')
    })
  }

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setShowConfig(v => !v)}
        className="w-full flex items-center gap-2 px-5 py-4 text-left hover:bg-amber-50 transition-colors"
      >
        <Settings size={14} className="text-amber-600" />
        <span className="text-sm font-semibold text-amber-900">Panneau Admin</span>
        <span className="ml-auto text-xs text-amber-400">{showConfig ? '▲' : '▼'}</span>
      </button>

      {showConfig && (
        <div className="border-t border-amber-100 divide-y divide-stone-100">

          {/* Config générale */}
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">Configuration</p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCash}
                onChange={e => setShowCash(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-400"
              />
              <span className="text-sm text-stone-700">Montants de cash visibles pour l&apos;équipe</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Cerf Oct. Closers', val: cerfOctC, set: setCerfOctC },
                { label: 'Cerf Oct. Setters', val: cerfOctS, set: setCerfOctS },
                { label: 'Cerf Nov. Closers', val: cerfNovC, set: setCerfNovC },
                { label: 'Cerf Nov. Setters', val: cerfNovS, set: setCerfNovS },
                { label: 'Cerf Déc. Closers', val: cerfDecC, set: setCerfDecC },
                { label: 'Cerf Déc. Setters', val: cerfDecS, set: setCerfDecS },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs font-medium text-stone-500 block mb-1">{f.label} ($)</label>
                  <input type="number" min="0" step="1000" value={f.val}
                    onChange={e => f.set(e.target.value)} className={INPUT} />
                </div>
              ))}
            </div>

            <button onClick={saveConfig} disabled={pending}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
              Sauvegarder la config
            </button>
          </div>

          {/* Cash semaine courante + overrides */}
          {currentWeek && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                Semaine {currentWeek.week_number} — Cash (auto-calculé)
              </p>

              {duelsCurrentWeek.map(duel => {
                const p1 = players.find(p => p.id === duel.player1_id)
                const p2 = players.find(p => p.id === duel.player2_id)
                const cashMap = duel.groupe === 'closer' ? cashCloser : cashSetter
                const c1 = duel.player1_cash_override ?? (cashMap[p1?.profiles ? '' : ''] ?? 0)
                const c2 = duel.player2_cash_override ?? (p2 ? (cashMap[''] ?? 0) : 0)
                const ov = getOverride(duel.id)

                return (
                  <div key={duel.id} className="bg-stone-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                      <span>{duel.is_cerf ? '🦌' : '⚔️'}</span>
                      <span>{p1?.profiles?.full_name ?? '?'}</span>
                      {!duel.is_cerf && <span>vs {p2?.profiles?.full_name ?? '?'}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-stone-400 block mb-1">Cash P1 (override)</label>
                        <input type="number" min="0" step="0.01"
                          placeholder={dollar(c1)}
                          value={ov.v1}
                          onChange={e => setOverrideField(duel.id, 'v1', e.target.value)}
                          className={INPUT + ' text-xs'}
                        />
                      </div>
                      {!duel.is_cerf && (
                        <div>
                          <label className="text-[10px] text-stone-400 block mb-1">Cash P2 (override)</label>
                          <input type="number" min="0" step="0.01"
                            placeholder={dollar(c2)}
                            value={ov.v2}
                            onChange={e => setOverrideField(duel.id, 'v2', e.target.value)}
                            className={INPUT + ' text-xs'}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Raison de l'override…"
                        value={ov.reason}
                        onChange={e => setOverrideField(duel.id, 'reason', e.target.value)}
                        className={INPUT + ' flex-1 text-xs'}
                      />
                      <button onClick={() => saveOverride(duel.id, '1')} disabled={pending || !ov.v1}
                        className="px-3 py-1.5 text-xs font-medium bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg transition-colors disabled:opacity-40">
                        P1
                      </button>
                      {!duel.is_cerf && (
                        <button onClick={() => saveOverride(duel.id, '2')} disabled={pending || !ov.v2}
                          className="px-3 py-1.5 text-xs font-medium bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg transition-colors disabled:opacity-40">
                          P2
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Actions */}
          {currentWeek && (
            <div className="px-5 py-4 flex flex-wrap gap-3">
              <button onClick={confirmerSem} disabled={pending}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                <CheckCircle2 size={14} />
                Confirmer semaine {currentWeek.week_number}
              </button>
              <button onClick={confirmerElim} disabled={pending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                <RotateCcw size={14} />
                Élimination mois {currentWeek.month}
              </button>
            </div>
          )}

          {msg && (
            <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-100">
              <p className="text-sm font-medium text-emerald-700">{msg}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
