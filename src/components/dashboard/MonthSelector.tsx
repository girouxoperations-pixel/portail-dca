import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface MonthOption { key: string; label: string }

export default function MonthSelector({ options, selected }: { options: MonthOption[]; selected: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map(o => (
        <Link
          key={o.key}
          href={`/dashboard?mois=${o.key}`}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
            o.key === selected
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700',
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}
