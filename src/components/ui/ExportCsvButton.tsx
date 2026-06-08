'use client'

import { Download } from 'lucide-react'

interface Props {
  filename: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data:     Record<string, any>[]
  label?:   string
}

function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  const headers = Object.keys(data[0])
  const escape  = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const rows = data.map(row => headers.map(h => escape(row[h])).join(','))
  return [headers.join(','), ...rows].join('\n')
}

export default function ExportCsvButton({ filename, data, label = 'Exporter CSV' }: Props) {
  function handleClick() {
    const csv  = toCSV(data)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
    >
      <Download size={13} />
      {label}
    </button>
  )
}
