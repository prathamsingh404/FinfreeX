'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { cx } from './kit'

/* ============================================================
   Interactive primitives. Client-only counterpart to kit.tsx.
   ============================================================ */

/* ---------- Reveal: scroll-triggered entrance ----------
   Elements arrive as they enter the viewport, once, in sequence.
   Reduced motion is handled in CSS — the element simply starts
   visible instead of animating. */
export function Reveal({
  children,
  delay = 0,
  variant = 'up',
  as: Tag = 'div',
  className,
  threshold = 0.12,
  ...rest
}: {
  children: React.ReactNode
  /** ms; use to stagger siblings */
  delay?: number
  variant?: 'up' | 'left' | 'right' | 'scale' | 'rule'
  as?: any
  className?: string
  threshold?: number
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  const variantClass = {
    up: 'reveal',
    left: 'reveal reveal-left',
    right: 'reveal reveal-right',
    scale: 'reveal reveal-scale',
    rule: 'reveal-rule',
  }[variant]

  return (
    <Tag
      ref={ref}
      data-visible={visible ? 'true' : 'false'}
      style={{ ['--reveal-delay' as any]: `${delay}ms` }}
      className={cx(variantClass, className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Reveals children one after another without hand-numbering delays. */
export function RevealGroup({
  children, step = 60, className, variant = 'up',
}: { children: React.ReactNode; step?: number; className?: string; variant?: 'up' | 'left' | 'right' | 'scale' }) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <Reveal delay={i * step} variant={variant}>
          {child}
        </Reveal>
      ))}
    </div>
  )
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({
  options, value, onChange, className, size = 'md',
}: {
  // `as const` on a caller's array makes every property readonly, so the
  // option shape has to accept that or the generic collapses to `string`.
  options: readonly T[] | readonly { readonly value: T; readonly label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  const items = options.map((o) =>
    typeof o === 'string' ? { value: o as T, label: o as string } : (o as { value: T; label: string }),
  )
  return (
    <div role="tablist" className={cx('segmented', size === 'sm' && '[&>button]:h-[22px] [&>button]:px-2', className)}>
      {items.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className="cursor-pointer"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Underline tabs ---------- */
export function Tabs<T extends string>({
  tabs, value, onChange, className,
}: { tabs: readonly T[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('flex items-center gap-5 px-3 border-b border-border overflow-x-auto no-scrollbar shrink-0', className)}>
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={value === t} onClick={() => onChange(t)} className="tab cursor-pointer">
          {t}
        </button>
      ))}
    </div>
  )
}

/* ---------- Search input ---------- */
export function SearchInput({
  value, onChange, placeholder = 'Search', className, autoFocus,
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <div className={cx('relative', className)}>
      <iconify-icon
        icon="solar:magnifer-linear"
        width="13"
        class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      ></iconify-icon>
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-7 pr-7"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
        >
          <iconify-icon icon="solar:close-circle-linear" width="13"></iconify-icon>
        </button>
      )}
    </div>
  )
}

/* ---------- Select ---------- */
export function Select({
  value, onChange, options, className, label,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly (string | { value: string; label: string })[]
  className?: string
  label?: string
}) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <label className={cx('inline-flex items-center gap-2 min-w-0', className)}>
      {label && <span className="eyebrow shrink-0">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="select w-auto min-w-[110px]">
        {items.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

/* ---------- Sortable table header ---------- */
export type SortDir = 'asc' | 'desc'
export interface SortState<K extends string> { key: K; dir: SortDir }

export function useSort<K extends string>(initial: SortState<K>) {
  const [sort, setSort] = useState<SortState<K>>(initial)
  const toggle = useCallback((key: K) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  }, [])
  const compare = useCallback(
    (a: any, b: any) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const dir = sort.dir === 'asc' ? 1 : -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir
    },
    [sort],
  )
  return { sort, toggle, compare }
}

export function Th<K extends string>({
  children, sortKey, sort, onSort, num, className,
}: {
  children: React.ReactNode
  sortKey?: K
  sort?: SortState<K>
  onSort?: (k: K) => void
  num?: boolean
  className?: string
}) {
  const active = sortKey && sort?.key === sortKey
  if (!sortKey || !onSort) return <th className={cx(num && 'num', className)}>{children}</th>
  return (
    <th className={cx(num && 'num', className)}>
      <button
        onClick={() => onSort(sortKey)}
        className={cx(
          'inline-flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors uppercase tracking-[0.07em]',
          active && 'text-foreground',
          num && 'flex-row-reverse',
        )}
      >
        {children}
        <iconify-icon
          icon={active ? (sort!.dir === 'asc' ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear') : 'solar:sort-vertical-linear'}
          width="11"
          class={active ? 'text-primary' : 'text-faint'}
        ></iconify-icon>
      </button>
    </th>
  )
}

/* ---------- Switch ---------- */
export function Switch({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 cursor-pointer group"
    >
      <span
        className={cx(
          'relative w-8 h-[18px] rounded-full transition-colors border',
          checked ? 'bg-primary border-transparent' : 'bg-sunken border-border',
        )}
      >
        <span
          className={cx(
            'absolute top-[2px] w-[12px] h-[12px] rounded-full transition-[left] duration-200 ease-out',
            // White reads against the filled track; off state needs a tone
            // that survives a light canvas.
            checked ? 'left-[17px] bg-white' : 'left-[2px] bg-[var(--text-muted)]',
          )}
        />
      </span>
      {label && <span className="text-xs text-soft group-hover:text-foreground transition-colors">{label}</span>}
    </button>
  )
}
