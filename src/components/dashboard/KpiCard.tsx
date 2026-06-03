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
    label: string        // ex: "+12% vs mois dernier"
    direction: 'up' | 'down' | 'neutral'
  }
}

const COLOR: Record<Color, { iconBg: string; iconText: string; valueCls: string }> = {
  green:  { iconBg: 'bg-green-100',  iconText: 'text-green-600',  valueCls: 'text-gray-900' },
  blue:   { iconBg: 'bg-blue-100',   iconText: 'text-blue-600',   valueCls: 'text-gray-900' },
  violet: { iconBg: 'bg-violet-100', iconText: 'text-violet-600', valueCls: 'text-gray-900' },
  amber:  { iconBg: 'bg-amber-100',  iconText: 'text-amber-600',  valueCls: 'text-gray-900' },
  red:    { iconBg: 'bg-red-100',    iconText: 'text-red-600',    valueCls: 'text-gray-900' },
}

export default function KpiCard({
  title, value, icon: Icon, color, subtitle, trend,
}: KpiCardProps) {
  const c = COLOR[color]

  const TrendIcon =
    trend?.direction === 'up'   ? TrendingUp   :
    trend?.direction === 'down' ? TrendingDown  : Minus

  const trendColor =
    trend?.direction === 'up'      ? 'text-green-500'  :
    trend?.direction === 'down'    ? 'text-red-500'    :
    'text-gray-400'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3
      shadow-sm hover:shadow-md transition-shadow">
      {/* Icône + titre */}
      <div className="flex items-center justify-between">
        <div className={cn('rounded-lg p-2.5', c.iconBg)}>
          <Icon size={18} className={c.iconText} />
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon size={12} />
            {trend.label}
          </div>
        )}
      </div>

      {/* Valeur principale */}
      <div>
        <p className={cn('text-2xl font-bold tabular-nums', c.valueCls)}>{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-0.5">{title}</p>
      </div>

      {/* Sous-titre optionnel */}
      {subtitle && (
        <p className="text-xs text-gray-400 border-t border-gray-50 pt-2.5 truncate">
          {subtitle}
        </p>
      )}
    </div>
  )
}
