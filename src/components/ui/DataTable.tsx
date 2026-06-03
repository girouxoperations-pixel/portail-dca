import { cn } from '@/lib/utils'

export interface Column<T> {
  key:        string
  label:      string
  align?:     'left' | 'right' | 'center'
  className?: string
  render?:    (row: T) => React.ReactNode
}

interface Props<T extends Record<string, unknown>> {
  columns:     Column<T>[]
  data:        T[]
  emptyState?: React.ReactNode
  isLoading?:  boolean
  footer?:     React.ReactNode
  getKey?:     (row: T) => string
}

export default function DataTable<T extends Record<string, unknown>>({
  columns, data, emptyState, isLoading, footer, getKey,
}: Props<T>) {
  const alignCls = (align?: 'left' | 'right' | 'center') => {
    if (align === 'right')  return 'text-right'
    if (align === 'center') return 'text-center'
    return 'text-left'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {isLoading ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-gray-400">Chargement…</p>
        </div>
      ) : data.length === 0 ? (
        <div className="px-5 py-12 text-center">
          {emptyState ?? <p className="text-sm text-gray-400">Aucune donnée</p>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={cn('px-4 py-2.5', alignCls(col.align), col.className)}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, i) => (
                <tr
                  key={getKey ? getKey(row) : i}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={cn('px-4 py-3', alignCls(col.align), col.className)}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {footer && <tfoot>{footer}</tfoot>}
          </table>
        </div>
      )}
    </div>
  )
}
