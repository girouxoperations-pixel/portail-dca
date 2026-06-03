import { cn } from '@/lib/utils'

type Variant = 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'gray'

const VARIANT: Record<Variant, string> = {
  green:  'bg-green-50 text-green-600',
  amber:  'bg-amber-50 text-amber-600',
  red:    'bg-red-50 text-red-600',
  blue:   'bg-blue-50 text-blue-700',
  violet: 'bg-violet-50 text-violet-700',
  gray:   'bg-gray-100 text-gray-500',
}

interface Props {
  children:  React.ReactNode
  variant:   Variant
  icon?:     React.ReactNode
  className?: string
}

export default function Badge({ children, variant, icon, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
        VARIANT[variant],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
