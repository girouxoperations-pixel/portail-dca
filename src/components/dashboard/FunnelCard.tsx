'use client'

import { cn } from '@/lib/utils'

interface FunnelStep {
  label:    string
  value:    number
  pct:      number
  convRate: number
}

interface Props {
  steps: FunnelStep[]
}

const COLORS = [
  { bar: 'bg-violet-600',  badge: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200' },
  { bar: 'bg-violet-500',  badge: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200' },
  { bar: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200' },
  { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' },
]

export default function FunnelCard({ steps }: Props) {
  const max = steps[0]?.value ?? 1

  return (
    <div className="space-y-3.5">
      {steps.map((step, i) => {
        const col   = COLORS[i] ?? COLORS[COLORS.length - 1]
        const width = max > 0 ? Math.max((step.value / max) * 100, step.value > 0 ? 4 : 0) : 0

        return (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">{step.label}</span>
              <div className="flex items-center gap-2.5">
                {i > 0 && (
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums', col.badge)}>
                    {step.convRate} %
                  </span>
                )}
                <span className="text-sm font-bold text-gray-900 tabular-nums w-8 text-right">
                  {step.value}
                </span>
              </div>
            </div>
            <div className="h-5 bg-gray-100 rounded-md overflow-hidden relative">
              <div
                className={cn('h-full rounded-md transition-all duration-500', col.bar)}
                style={{ width: `${width}%` }}
              />
              {step.value > 0 && i > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 tabular-nums">
                  {step.pct} %
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
