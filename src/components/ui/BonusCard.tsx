import { Trophy, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PALIERS, dollar } from '@/lib/constants'

interface Palier {
  seuil:  number
  closer: number
  setter: number
}

interface Props {
  nom:        string
  collected:  number
  palier:     Palier | null
  type:       'closer' | 'setter'
  onClick?:   () => void
  isSelected?: boolean
}

function BarreProgression({ collected, palier }: { collected: number; palier: Palier | null }) {
  const idx = PALIERS.findIndex(p => collected >= p.seuil)
  let progress: number

  if (idx === -1) {
    progress = Math.min(98, (collected / PALIERS[PALIERS.length - 1].seuil) * 100)
  } else if (idx === 0) {
    progress = 100
  } else {
    const cur  = PALIERS[idx]
    const next = PALIERS[idx - 1]
    progress = Math.min(98, ((collected - cur.seuil) / (next.seuil - cur.seuil)) * 100)
  }

  return (
    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1">
      <div
        className={cn('h-full rounded-full', palier ? 'bg-violet-500' : 'bg-gray-300')}
        style={{ width: `${Math.max(2, progress)}%` }}
      />
    </div>
  )
}

export default function BonusCard({ nom, collected, palier, type, onClick, isSelected }: Props) {
  const bonus = palier ? (type === 'closer' ? palier.closer : palier.setter) : null

  const inner = (
    <>
      {bonus !== null
        ? <Trophy size={13} className="text-amber-400 shrink-0" />
        : <Award  size={13} className="text-gray-200 shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm font-medium truncate', isSelected ? 'text-violet-700' : 'text-gray-800')}>{nom}</span>
          {bonus !== null && (
            <span className="text-xs font-semibold text-amber-600 shrink-0">
              +{dollar(bonus)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-gray-400">{dollar(collected)} collecté</span>
          {palier && (
            <span className="text-[11px] text-violet-600">Palier {dollar(palier.seuil)}</span>
          )}
        </div>
        <BarreProgression collected={collected} palier={palier} />
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 text-left rounded-lg px-2 -mx-2 transition-colors',
          isSelected ? 'bg-violet-50' : 'hover:bg-gray-50',
        )}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {inner}
    </div>
  )
}
