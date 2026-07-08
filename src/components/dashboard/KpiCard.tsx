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
  green:  { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-400' },
  blue:   { iconBg: 'bg-blue-500/10',    iconText: 'text-blue-400'    },
  violet: { iconBg: 'bg-violet-500/10',  iconText: 'text-violet-400'  },
  amber:  { iconBg: 'bg-amber-500/10',   iconText: 'text-amber-400'   },
  red:    { iconBg: 'bg-red-500/10',     iconText: 'text-red-400'     },
}

export default function KpiCard({ title, value, icon: Icon, color, subtitle, trend }: KpiCardProps) {
  const c = COLOR[color]

  const TrendIcon =
    trend?.direction === 'up'   ? TrendingUp  :
    trend?.direction === 'down' ? TrendingDown : Minus

  const trendCls =
    trend?.direction === 'up'   ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' :
    trend?.direction === 'down' ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'             :
    'bg-white/5 text-gray-500 ring-1 ring-white/10'

  return (
    <div className="bg-[#1e1f2e] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
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
        <p className="text-3xl font-bold tabular-nums text-white tracking-tight">{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-0.5 uppercase tracking-wide">{title}</p>
      </div>

      {subtitle && (
        <p className="text-xs text-gray-600 border-t border-white/[0.05] pt-3 truncate">
          {subtitle}
        </p>
      )}
    </div>
  )
}
