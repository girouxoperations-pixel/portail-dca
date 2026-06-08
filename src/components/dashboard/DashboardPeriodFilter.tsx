'use client'

import { useRouter } from 'next/navigation'
import PeriodFilter, { computeRange, type Periode } from '@/components/ui/PeriodFilter'

interface Props {
  periode:      Periode
  offset:       number
  customStart?: string
  customEnd?:   string
}

export default function DashboardPeriodFilter({
  periode, offset, customStart = '', customEnd = '',
}: Props) {
  const router = useRouter()

  function navigate(p: Periode, o: number, start?: string, end?: string) {
    const params = new URLSearchParams()
    params.set('p', p)
    params.set('o', String(o))
    if (p === 'personnalise' && start && end) {
      params.set('start', start)
      params.set('end', end)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <PeriodFilter
      periode={periode}
      offset={offset}
      onChange={(p, o) => navigate(p, o)}
      customStart={customStart}
      customEnd={customEnd}
      onCustomRange={(start, end) => navigate('personnalise', 0, start, end)}
    />
  )
}
