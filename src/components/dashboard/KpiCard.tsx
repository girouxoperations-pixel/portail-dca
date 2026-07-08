import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Color = 'green' | 'blue' | 'violet' | 'amber' | 'red'

interface KpiCardProps {
  title:     string
  value:     string | number
  icon:      LucideIcon
  color:     Color
  subtitle?: string
  trend?: {
    label:     string
    direction: 'up' | 'down' | 'neutral'
  }
}

const COLOR: Record<Color, { iconBg: string; iconText: string }> = {
  green:  { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  blue:   { iconBg: 'bg-blue-100',    iconText: 'text-blue-600'    },
  violet: { iconBg: 'bg-violet-100',  iconText: 'text-violet-600'  },
  amber:  { iconBg: 'bg-amber-100',   iconText: 'text-amber-600'   },
  red:    { iconBg: 'bg-red-100',     iconText: 'text-red-600'     },
}

export default function KpiCard({ title, value, icon: Icon, color, subtitle, trend }: KpiCardProps) {
  const c = COLOR[color]

  const TrendIcon =
    trend?.direction === 'up'   ? TrendingUp  :
    trend?.direction === 'down' ? TrendingDown : Minus

  const trendCls =
    trend?.direction === 'up'   ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
    trend?.direction === 'down' ? 'bg-red-50 text-red-700 ring-1 ring-red-200'             :
    'bg-gray-100 text-gray-500 ring-1 ring-gray-200'

  return (
    <div className="bg-white border border-gray-150 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn('rounded-xl p-2.5', c.iconBg)}>
          <Icon size={18} className={c.iconText} />
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', trendCls)}>
            <TrendIcon size={11} />
            {trend.label}
          </div>
        )}
      </div>

      <div>
        <p className="text-3xl font-bold tabular-nums text-gray-900 tracking-tight">{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-0.5 uppercase tracking-wide">{title}</p>
      </div>

      {subtitle && (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-3 truncate">
          {subtitle}
        </p>
      )}
    </div>
  )
}
