import React from 'react'
import { cx } from './kit'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  render?: (row: T) => React.ReactNode
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  columns, rows, className, dense,
}: {
  columns: Column<T>[]; rows: T[]; className?: string; dense?: boolean
}) {
  return (
    <div className={cx('overflow-x-auto -mx-1', className)}>
      <table className="w-full text-sm border-collapse min-w-full">
        <thead>
          <tr className="border-b border-white/[0.08]">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cx(
                  'px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-muted whitespace-nowrap',
                  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cx(
                    dense ? 'px-3 py-2' : 'px-3 py-3.5',
                    'whitespace-nowrap tabular-nums',
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                    c.className
                  )}
                >
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="text-center py-10 text-sm text-muted">No data available.</div>}
    </div>
  )
}
