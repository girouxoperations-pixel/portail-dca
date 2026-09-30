'use client'

import { useMemo, useState } from 'react'
import { Crown, Skull, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import DuelCard   from './DuelCard'
import Standings  from './Standings'
import AdminPanel from './AdminPanel'
import type { WEEKS } from '@/lib/chasse/types'
import { classerJoueuses, cashEffectif, type PlayerScore } from '@/lib/chasse/engine'

// ── Types ─────────────────────────────────────────────────────────────

interface Player {
  id: string; profile_id: string; groupe: string; position: string
  status: string; eliminated_month: number | null
  profiles: { full_name: string | null } | null
}

interface Week {
  id: string; week_number: number; week_start: string; week_end: string
  month: number; status: string
}

interface Duel {
  id: string; week_id: string; groupe: string
  player1_id: string; player2_id: string | null
  is_cerf: boolean; cerf_target: number | null
  player1_cash_override: number | null
  player2_cash_override: number | null
  winner_id: string | null
  points_p1: number; points_p2: number
  is_confirmed: boolean; override_note: string | null
}

interface MonthlyResult {
  month: number; groupe: string; player_id: string
  total_points: number; total_cash: number; rank: number; eliminated: boolean
}

interface Props {
  config:         { show_cash: boolean; cerf_oct_closer: number; cerf_oct_setter: number; cerf_nov_closer: number; cerf_nov_setter: number; cerf_dec_closer: number; cerf_dec_setter: number } | null
  players:        Player[]
  weeks:          Week[]
  duels:          Duel[]
  monthlyResults: MonthlyResult[]
  isAdmin:        boolean
  userId:         string
  closerCashMap:  Record<string, number>
  setterCashMap:  Record<string, number>
}

const MONTH_LABELS: Record<number, string> = { 10: 'Octobre', 11: 'Novembre', 12: 'Décembre' }
const dollar = (n: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' $'

// ── Composant principal ────────────────────────────────────────────────

export default function ChassView({ config, players, weeks, duels, monthlyResults, isAdmin, userId, closerCashMap, setterCashMap }: Props) {
  const showCash   = config?.show_cash ?? false
  const [tab, setTab] = useState<'duels' | 'classement' | 'bracket' | 'historique'>('duels')

  // Semaine courante / prochaine
  const now    = new Date()
  const todayS = now.toISOString().split('T')[0]

  const currentWeek = useMemo(() =>
    weeks.find(w => w.status === 'active') ??
    weeks.find(w => w.week_start <= todayS && w.week_end >= todayS) ??
    weeks.find(w => w.status === 'pending'),
  [weeks, todayS])

  const currentMonth = currentWeek?.month ?? 10

  // Compte à rebours
  const countdownLabel = useMemo(() => {
    const elim = weeks.find(w => w.month === currentMonth)
    if (!elim) return null
    const lastWeekOfMonth = weeks.filter(w => w.month === currentMonth).sort((a, b) => b.week_number - a.week_number)[0]
    if (!lastWeekOfMonth) return null
    const diffMs = new Date(lastWeekOfMonth.week_end + 'T23:59:59').getTime() - now.getTime()
    if (diffMs < 0) return 'Mois terminé'
    const days = Math.floor(diffMs / 86400000)
    return `Élimination dans ${days}j`
  }, [weeks, currentMonth, now])

  // Players map
  const playerMap = useMemo(() =>
    new Map(players.map(p => [p.id, p])),
  [players])

  // Cash d'un joueur pour la semaine courante
  function getCash(playerId: string, groupe: string): number {
    const player = playerMap.get(playerId)
    if (!player) return 0
    const cashMap = groupe === 'closer' ? closerCashMap : setterCashMap
    return cashMap[player.profile_id] ?? 0
  }

  // Duels de la semaine courante
  const currentDuels = useMemo(() =>
    currentWeek ? duels.filter(d => d.week_id === currentWeek.id) : [],
  [duels, currentWeek])

  // Calcul des scores par groupe pour le mois en cours
  function computeScores(groupe: 'closer' | 'setter'): PlayerScore[] {
    const groupePlayers = players.filter(p => p.groupe === groupe && p.status === 'active')
    const monthDuels = duels.filter(d => {
      const week = weeks.find(w => w.id === d.week_id)
      return week?.month === currentMonth && d.groupe === groupe && d.is_confirmed
    })

    return groupePlayers.map(p => {
      const myDuels = monthDuels.filter(d => d.player1_id === p.id || d.player2_id === p.id)
      const totalPoints = myDuels.reduce((s, d) => {
        if (d.player1_id === p.id) return s + (d.points_p1 ?? 0)
        return s + (d.points_p2 ?? 0)
      }, 0)
      const totalCash = getCash(p.id, groupe)
      return {
        playerId:    p.id,
        nom:         p.profiles?.full_name?.split(' ')[0] ?? '?',
        totalPoints,
        totalCash,
      }
    })
  }

  const closerScores = computeScores('closer')
  const setterScores = computeScores('setter')
  const closerStandings = classerJoueuses(closerScores)
  const setterStandings = classerJoueuses(setterScores)

  // Tombées au combat
  const tombees = players.filter(p => p.status === 'eliminated')

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a1209 0%, #2d1e0f 50%, #1a1209 100%)' }}>
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Bannière */}
      <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #3d2b0f, #5c3d14)' }}>
        <div className="px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🏹</span>
                <h1 className="text-xl font-bold text-amber-100 tracking-tight">Saison de la Chasse</h1>
                <span className="text-xl">🦌</span>
              </div>
              <p className="text-sm text-amber-300">
                {MONTH_LABELS[currentMonth]} · Semaine {currentWeek?.week_number ?? '—'}
              </p>
            </div>
            {countdownLabel && (
              <div className="shrink-0 text-right">
                <div className="flex items-center gap-1.5 text-amber-200">
                  <Clock size={13} />
                  <span className="text-xs font-semibold">{countdownLabel}</span>
                </div>
              </div>
            )}
          </div>

          {/* Période */}
          {currentWeek && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Closers actives', value: players.filter(p => p.groupe === 'closer' && p.status === 'active').length },
                { label: 'Setters actives', value: players.filter(p => p.groupe === 'setter' && p.status === 'active').length },
                { label: 'Duels cette semaine', value: currentDuels.filter(d => !d.is_cerf).length },
              ].map(kpi => (
                <div key={kpi.label} className="bg-black/20 rounded-xl px-3 py-3 text-center">
                  <p className="text-2xl font-bold text-amber-100">{kpi.value}</p>
                  <p className="text-[10px] text-amber-400 mt-0.5 uppercase tracking-wide">{kpi.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-stone-900/50 p-1 rounded-xl">
        {([
          { key: 'duels',      label: '⚔️ Duels'      },
          { key: 'classement', label: '🏆 Classement' },
          { key: 'bracket',    label: '📋 Bracket'    },
          { key: 'historique', label: '📖 Historique' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
              tab === t.key
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Duels ─────────────────────────────────────────────────── */}
      {tab === 'duels' && (
        <div className="space-y-6">
          {currentWeek ? (
            <>
              {(['closer', 'setter'] as const).map(groupe => {
                const groupeDuels = currentDuels.filter(d => d.groupe === groupe)
                if (groupeDuels.length === 0) return null
                return (
                  <div key={groupe}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm">{groupe === 'closer' ? '🏹' : '📞'}</span>
                      <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wider capitalize">{groupe}s</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {groupeDuels.map(duel => {
                        const p1 = playerMap.get(duel.player1_id)
                        const p2 = duel.player2_id ? playerMap.get(duel.player2_id) : null
                        const cash1 = cashEffectif(getCash(duel.player1_id, groupe), duel.player1_cash_override)
                        const cash2 = p2 ? cashEffectif(getCash(duel.player2_id!, groupe), duel.player2_cash_override) : 0
                        return (
                          <DuelCard
                            key={duel.id}
                            duel={duel}
                            player1={{ id: p1?.id ?? '', nom: p1?.profiles?.full_name?.split(' ')[0] ?? '?', position: p1?.position ?? '' }}
                            player2={p2 ? { id: p2.id, nom: p2.profiles?.full_name?.split(' ')[0] ?? '?', position: p2.position } : null}
                            cash1={cash1}
                            cash2={cash2}
                            showCash={showCash || isAdmin}
                            isAdmin={isAdmin}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {currentDuels.length === 0 && (
                <div className="bg-stone-800/50 rounded-xl p-8 text-center">
                  <p className="text-stone-400 text-sm">Les duels de cette semaine n&apos;ont pas encore été générés.</p>
                  {isAdmin && <p className="text-stone-500 text-xs mt-1">Utilise le panneau admin pour les créer.</p>}
                </div>
              )}
            </>
          ) : (
            <div className="bg-stone-800/50 rounded-xl p-8 text-center">
              <p className="text-amber-200 font-semibold text-sm">La saison débute le 5 octobre 2026 🏹</p>
            </div>
          )}
        </div>
      )}

      {/* ── Classement ────────────────────────────────────────────── */}
      {tab === 'classement' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Standings
            groupe="closer"
            month={MONTH_LABELS[currentMonth]}
            showCash={showCash || isAdmin}
            rows={closerStandings.map(s => ({
              playerId:     s.playerId,
              nom:          s.nom,
              position:     playerMap.get(s.playerId)?.position ?? '',
              points:       s.totalPoints,
              cash:         s.totalCash,
              rank:         s.rank,
              isEliminated: playerMap.get(s.playerId)?.status === 'eliminated',
            }))}
          />
          <Standings
            groupe="setter"
            month={MONTH_LABELS[currentMonth]}
            showCash={showCash || isAdmin}
            rows={setterStandings.map(s => ({
              playerId:     s.playerId,
              nom:          s.nom,
              position:     playerMap.get(s.playerId)?.position ?? '',
              points:       s.totalPoints,
              cash:         s.totalCash,
              rank:         s.rank,
              isEliminated: playerMap.get(s.playerId)?.status === 'eliminated',
            }))}
          />
        </div>
      )}

      {/* ── Bracket ───────────────────────────────────────────────── */}
      {tab === 'bracket' && (
        <div className="bg-stone-800/50 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-amber-200">Calendrier de la saison</h3>
          {[10, 11, 12].map(month => {
            const monthWeeks = weeks.filter(w => w.month === month)
            return (
              <div key={month}>
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">
                  {MONTH_LABELS[month]}
                </p>
                <div className="space-y-1.5">
                  {monthWeeks.map(w => {
                    const isFuture = w.status === 'pending'
                    const isHidden = isFuture && !isAdmin
                    return (
                      <div key={w.id} className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg',
                        w.status === 'confirmed' ? 'bg-emerald-900/30 border border-emerald-800' :
                        w.status === 'active'    ? 'bg-amber-900/30 border border-amber-700' :
                        'bg-stone-800/30 border border-stone-700',
                      )}>
                        <span className="text-xs font-bold text-stone-400 w-6">S{w.week_number}</span>
                        <span className="text-xs text-stone-300 flex-1">
                          {isHidden ? '??? → ???' : `${w.week_start} → ${w.week_end}`}
                        </span>
                        <span className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          w.status === 'confirmed' ? 'bg-emerald-900 text-emerald-400' :
                          w.status === 'active'    ? 'bg-amber-900 text-amber-400' :
                          'bg-stone-700 text-stone-400',
                        )}>
                          {w.status === 'confirmed' ? '✓ Confirmée' : w.status === 'active' ? '● En cours' : '🔒 À venir'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {month < 12 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-px flex-1 bg-red-900/50" />
                    <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">☠️ Élimination</span>
                    <div className="h-px flex-1 bg-red-900/50" />
                  </div>
                )}
              </div>
            )
          })}
          <div className="border-t border-amber-800 pt-4 text-center">
            <p className="text-sm text-amber-300 font-bold">👑 Grande Finale · 14–18 déc.</p>
            <p className="text-xs text-stone-400 mt-1">Meilleure closer vs meilleure setter</p>
          </div>
        </div>
      )}

      {/* ── Historique ────────────────────────────────────────────── */}
      {tab === 'historique' && (
        <div className="space-y-4">
          {weeks.filter(w => w.status === 'confirmed').length === 0 ? (
            <div className="bg-stone-800/50 rounded-xl p-8 text-center">
              <p className="text-stone-400 text-sm">Aucune semaine confirmée pour l&apos;instant.</p>
            </div>
          ) : (
            weeks.filter(w => w.status === 'confirmed').map(week => {
              const weekDuels = duels.filter(d => d.week_id === week.id)
              return (
                <div key={week.id} className="bg-stone-800/50 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-700 flex items-center gap-3">
                    <span className="text-xs font-bold text-emerald-400">S{week.week_number}</span>
                    <span className="text-xs text-stone-300">{week.week_start} → {week.week_end}</span>
                    <span className="ml-auto text-[10px] text-emerald-400 font-semibold">✓ Confirmée</span>
                  </div>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {weekDuels.map(duel => {
                      const p1 = playerMap.get(duel.player1_id)
                      const p2 = duel.player2_id ? playerMap.get(duel.player2_id) : null
                      const cash1 = duel.player1_cash_override ?? 0
                      const cash2 = duel.player2_cash_override ?? 0
                      return (
                        <DuelCard
                          key={duel.id}
                          duel={duel}
                          player1={{ id: p1?.id ?? '', nom: p1?.profiles?.full_name?.split(' ')[0] ?? '?', position: p1?.position ?? '' }}
                          player2={p2 ? { id: p2.id, nom: p2.profiles?.full_name?.split(' ')[0] ?? '?', position: p2.position } : null}
                          cash1={cash1}
                          cash2={cash2}
                          showCash={showCash || isAdmin}
                          isAdmin={false}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Tombées au combat */}
      {tombees.length > 0 && (
        <div className="bg-stone-900/50 border border-stone-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-700 flex items-center gap-2">
            <Skull size={13} className="text-stone-400" />
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">Tombées au combat</span>
          </div>
          <div className="divide-y divide-stone-800">
            {tombees.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center text-[11px] font-bold text-stone-400">
                  {p.position}
                </div>
                <span className="flex-1 text-sm text-stone-400 line-through">
                  {p.profiles?.full_name?.split(' ')[0] ?? '?'}
                </span>
                <span className="text-[10px] text-stone-500">
                  {p.eliminated_month ? MONTH_LABELS[p.eliminated_month] : ''}
                </span>
                <span className="text-[10px] text-stone-500 capitalize">{p.groupe}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panneau admin */}
      {isAdmin && (
        <AdminPanel
          config={config}
          players={players}
          currentWeek={currentWeek ?? null}
          duelsCurrentWeek={currentDuels}
          cashCloser={closerCashMap}
          cashSetter={setterCashMap}
        />
      )}

    </div>
    </div>
  )
}
