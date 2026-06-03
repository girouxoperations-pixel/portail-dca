import { cn } from '@/lib/utils'

interface Props {
  score:      number
  showLabel?: boolean
  className?: string
}

function scoreStyle(score: number) {
  if (score >= 80) return { bar: 'bg-green-500', text: 'text-green-600' }
  if (score >= 65) return { bar: 'bg-blue-500',  text: 'text-blue-600'  }
  return                  { bar: 'bg-red-500',   text: 'text-red-600'   }
}

export default function ScoreBar({ score, showLabel = true, className }: Props) {
  const s = scoreStyle(score)
  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-400">Score</span>
          <span className={cn('text-sm font-bold tabular-nums', s.text)}>
            {score}
            <span className="text-xs font-normal text-gray-400">/100</span>
          </span>
        </div>
      )}
      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full', s.bar)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
