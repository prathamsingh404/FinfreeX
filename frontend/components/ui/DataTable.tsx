'use client'

import React, { useMemo, useState } from 'react'
import { cx, EmptyState, SkeletonRows } from './kit'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  render?: (row: T) => React.ReactNode
  className?: string
  /** Set false to lock a column out of sorting; defaults to sortable */
  sortable?: boolean
  /** Value used for sorting when the cell renders something else */
  sortValue?: (row: T) => number | string
  width?: string
}

type Dir = 'asc' | 'desc'

/**
 * The workhorse grid. Sticky header, click-to-sort, sticky first column
 * on narrow screens, and its own empty and loading states so callers
 * never have to hand-roll them.
 */
export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  className,
  dense,
  loading,
  emptyTitle = 'Nothing to show yet',
  emptyBody,
  emptyAction,
  onRowClick,
  selectedIndex,
  stickyFirst = true,
  maxHeight,
  defaultSort,
}: {
  columns: Column<T>[]
  rows: T[]
  className?: string
  dense?: boolean
  loading?: boolean
  emptyTitle?: string
  emptyBody?: string
  emptyAction?: React.ReactNode
  onRowClick?: (row: T, index: number) => void
  selectedIndex?: number
  stickyFirst?: boolean
  maxHeight?: number | string
  defaultSort?: { key: string; dir: Dir }
}) {
  const [sort, setSort] = useState<{ key: string; dir: Dir } | null>(defaultSort ?? null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    const get = (r: T) => (col?.sortValue ? col.sortValue(r) : r[sort.key])
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = get(a)
      const bv = get(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir
    })
  }, [rows, sort, columns])

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))

  if (loading) return <SkeletonRows rows={dense ? 10 : 7} cols={Math.min(columns.length, 6)} />

  if (!rows.length) {
    return <EmptyState icon="solar:database-linear" title={emptyTitle} body={emptyBody} action={emptyAction} compact />
  }

  const alignOf = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left')

  return (
    <div
      className={cx('w-full overflow-auto custom-scrollbar', className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c, ci) => {
              const sortable = c.sortable !== false
              const active = sort?.key === c.key
              return (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={cx(
                    alignOf(c.align),
                    stickyFirst && ci === 0 && 'sticky left-0 z-[6] bg-surface-2',
                  )}
                >
                  {sortable ? (
                    <button
                      onClick={() => toggle(c.key)}
                      aria-label={`Sort by ${c.header}`}
                      className={cx(
                        'inline-flex items-center gap-1 cursor-pointer transition-colors hover:text-foreground uppercase tracking-[0.07em]',
                        active && 'text-foreground',
                        c.align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {c.header}
                      <iconify-icon
                        icon={
                          active
                            ? sort!.dir === 'asc'
                              ? 'solar:alt-arrow-up-linear'
                              : 'solar:alt-arrow-down-linear'
                            : 'solar:sort-vertical-linear'
                        }
                        width="10"
                        class={active ? 'text-primary' : 'text-faint'}
                      ></iconify-icon>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              data-selected={selectedIndex === i ? 'true' : undefined}
              className={cx(
                onRowClick && 'cursor-pointer',
                selectedIndex === i && 'bg-primary-wash shadow-[inset_2px_0_0_var(--primary)]',
              )}
            >
              {columns.map((c, ci) => (
                <td
                  key={c.key}
                  className={cx(
                    dense && 'py-1.5',
                    alignOf(c.align),
                    c.align === 'right' && 'tabular-nums',
                    stickyFirst && ci === 0 && 'sticky-cell sticky left-0',
                    c.className,
                  )}
                >
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
