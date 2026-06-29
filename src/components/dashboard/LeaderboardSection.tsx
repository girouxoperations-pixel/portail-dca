'use client'

import { useState } from 'react'

const RANK_MEDAL = ['🥇', '🥈', '🥉']

type LeaderRow = { nom: string; primary: string; secondary: string }

type PeriodData = {
  closers: LeaderRow[]
  setters: LeaderRow[]
}

type Periode = 'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee'

const TABS: { key: Periode; label: string }[] = [
  { key: 'jour',      label: 'Hier'      },
  { key: 'semaine',   label: 'Semaine'   },
  { key: 'mois',      label: 'Mois'      },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'annee',     label: 'Année'     },
]

function LeaderboardCard({ title, emoji, rows }: { title: string; emoji: string; rows: LeaderRow[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {rows.length === 0 && (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucune donnée</p>
        )}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            <span className="text-xl w-7 text-center shrink-0">{RANK_MEDAL[i] ?? `#${i + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{r.nom}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.secondary}</p>
            </div>
            <span className="text-sm font-bold text-violet-700 tabular-nums shrink-0">{r.primary}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LeaderboardSection({
  leaderboard,
}: {
  leaderboard: Record<Periode, PeriodData>
}) {
  const [active, setActive] = useState<Periode>('mois')
  const { closers, setters } = leaderboard[active]

  if (Object.values(leaderboard).every(p => p.closers.length === 0 && p.setters.length === 0)) {
    return null
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Leaderboard</p>
        <div className="flex gap-1 ml-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active === t.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LeaderboardCard title="Top Closers" emoji="🎯" rows={closers} />
        <LeaderboardCard title="Top Setters" emoji="📞" rows={setters} />
      </div>
    </div>
  )
}
