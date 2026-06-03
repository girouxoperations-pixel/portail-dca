'use client'

import { cn } from '@/lib/utils'

interface Option {
  value:  string
  label:  string
  count?: number
}

interface Props {
  selected:  string
  onChange:  (value: string) => void
  options:   Option[]
  allLabel?: string
  allCount?: number
}

export default function MonthFilter({
  selected, onChange, options, allLabel = 'Tout', allCount,
}: Props) {
  if (options.length === 0) return null

  function label(opt: Option) {
    return opt.count !== undefined ? `${opt.label} (${opt.count})` : opt.label
  }

  const allText = allCount !== undefined ? `${allLabel} (${allCount})` : allLabel

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onChange('tout')}
        className={cn(
          'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
          selected === 'tout'
            ? 'bg-violet-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        )}
      >
        {allText}
      </button>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            selected === o.value
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          {label(o)}
        </button>
      ))}
    </div>
  )
}
