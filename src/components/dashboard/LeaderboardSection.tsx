'use client'

import { useState } from 'react'

const RANK_MEDAL = ['🥇', '🥈', '🥉']

type LeaderRow  = { nom: string; primary: string; secondary: string }
type PeriodData = { closers: LeaderRow[]; setters: LeaderRow[] }
type Periode    = 'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee'

const TABS: { key: Periode; label: string }[] = [
  { key: 'jour',      label: 'Hier'      },
  { key: 'semaine',   label: 'Semaine'   },
  { key: 'mois',      label: 'Mois'      },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'annee',     label: 'Année'     },
]

function LeaderboardCard({ title, emoji, rows }: { title: string; emoji: string; rows: LeaderRow[] }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-base">{emoji}</span>
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="space-y-1">
        {rows.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Aucune donnée</p>
        )}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            <span className="text-lg w-6 text-center shrink-0">{RANK_MEDAL[i] ?? `#${i + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{r.nom}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.secondary}</p>
            </div>
            <span className="text-sm font-bold text-violet-600 tabular-nums shrink-0">{r.primary}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LeaderboardSection({ leaderboard }: { leaderboard: Record<Periode, PeriodData> }) {
  const [active, setActive] = useState<Periode>('mois')
  const { closers, setters } = leaderboard[active]

  if (Object.values(leaderboard).every(p => p.closers.length === 0 && p.setters.length === 0)) {
    return null
  }

  return (
    <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Leaderboard</p>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                active === t.key
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 flex gap-6 flex-1">
        <LeaderboardCard title="Top Closers" emoji="🎯" rows={closers} />
        <div className="w-px bg-gray-100" />
        <LeaderboardCard title="Top Setters" emoji="📞" rows={setters} />
      </div>
    </div>
  )
}
