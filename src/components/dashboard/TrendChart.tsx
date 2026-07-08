'use client'

import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export interface TrendPoint {
  mois:    string
  cash:    number
  revenue: number
  closes:  number
}

interface Props {
  data:        TrendPoint[]
  weeklyData?: TrendPoint[]
}

const fmt$ = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(0)}k $` : `${v} $`

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { dataKey: string; name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums text-gray-900">
            {p.dataKey === 'closes' ? p.value : `${p.value.toLocaleString('fr-CA')} $`}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ data, weeklyData }: Props) {
  const [mode, setMode] = useState<'mois' | 'semaine'>('mois')

  const active = mode === 'semaine' && weeklyData && weeklyData.length > 0 ? weeklyData : data
  if (active.length === 0) return null

  return (
    <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Tendance</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {mode === 'mois' ? 'Cash collecté et closes par mois' : 'Cash collecté et closes par semaine'}
          </p>
        </div>
        {weeklyData && weeklyData.length > 0 && (
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 shrink-0">
            <button
              onClick={() => setMode('mois')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'mois'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setMode('semaine')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'semaine'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Hebdo
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-5">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={active} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="mois"
              tick={{ fontSize: mode === 'semaine' ? 10 : 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              interval={mode === 'semaine' ? 'preserveStartEnd' : 0}
            />
            <YAxis
              yAxisId="cash"
              tickFormatter={fmt$}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <YAxis
              yAxisId="closes"
              orientation="right"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              formatter={(value) => <span style={{ color: '#6b7280' }}>{value}</span>}
            />
            <Bar yAxisId="cash" dataKey="cash" name="Cash collecté" fill="#6366f1" radius={[4,4,0,0]} maxBarSize={48} />
            <Bar yAxisId="cash" dataKey="revenue" name="Revenue" fill="#c7d2fe" radius={[4,4,0,0]} maxBarSize={48} />
            <Line
              yAxisId="closes"
              dataKey="closes"
              name="Closes"
              stroke="#7c3aed"
              strokeWidth={2.5}
              dot={{ fill: '#7c3aed', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
