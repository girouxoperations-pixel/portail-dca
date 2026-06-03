import { cn } from '@/lib/utils'

type Color = 'green' | 'blue' | 'violet' | 'amber' | 'red'

const COLOR: Record<Color, { bg: string; text: string }> = {
  green:  { bg: 'bg-green-100',  text: 'text-green-600'  },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-600'   },
  violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-600'  },
  red:    { bg: 'bg-red-100',    text: 'text-red-600'    },
}

interface Props {
  label:  string
  value:  string | number
  sub?:   string
  color:  Color
  icon?:  React.ComponentType<{ size?: number; className?: string }>
}

export default function MetricCard({ label, value, sub, color, icon: Icon }: Props) {
  const c = COLOR[color]
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {Icon && (
        <div className={cn('inline-flex rounded-lg p-2.5 mb-3', c.bg)}>
          <Icon size={18} className={c.text} />
        </div>
      )}
      <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {sub && (
        <p className="text-xs text-gray-400 border-t border-gray-50 pt-2.5 mt-3 truncate">{sub}</p>
      )}
    </div>
  )
}
