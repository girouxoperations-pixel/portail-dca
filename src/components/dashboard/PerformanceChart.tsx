'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'

export interface ChartBar {
  key:   string
  label: string
  color: string
}

interface PerformanceChartProps {
  title:    string
  data:     Record<string, number | string>[]
  bars:     ChartBar[]
  subtitle?: string
  className?: string
}

// Tooltip personnalisé
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">Sem. {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-gray-500">{p.name}</span>
          <span className="font-semibold text-gray-800 ml-auto pl-3">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function PerformanceChart({
  title, data, bars, subtitle, className,
}: PerformanceChartProps) {
  const hasData = data.length > 0 && data.some(d =>
    bars.some(b => (d[b.key] as number) > 0)
  )

  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 p-5 shadow-sm', className)}>
      {/* En-tête */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      {!hasData ? (
        /* État vide */
        <div className="h-52 flex flex-col items-center justify-center gap-2 text-gray-300">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="24" width="8" height="12" rx="2" fill="currentColor" opacity=".4"/>
            <rect x="16" y="14" width="8" height="22" rx="2" fill="currentColor" opacity=".4"/>
            <rect x="28" y="8" width="8" height="28" rx="2" fill="currentColor" opacity=".4"/>
          </svg>
          <p className="text-sm">Aucune donnée pour cette période</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data}
            barGap={3}
            barCategoryGap="32%"
            margin={{ top: 0, right: 4, left: -8, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f3f4f6"
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `Sem. ${v}`}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 14 }}
              iconType="square"
              iconSize={10}
            />
            {bars.map((bar) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                name={bar.label}
                fill={bar.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
