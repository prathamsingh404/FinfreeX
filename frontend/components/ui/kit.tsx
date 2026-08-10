import React from 'react'

/* ============================================================
   FinfreeX UI Kit — instrument primitives
   Server-safe (no client hooks). Pure presentational components.

   The system's signature is the panel rail: every container names
   itself with a micro-label on the left and carries its live meta
   on the right, under a hairline. It is how a dense page stays
   readable without a heading every 40px.
   ============================================================ */

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function fmt(n: number | null | undefined, opts?: { compact?: boolean; decimals?: number; prefix?: string }) {
  const { compact, decimals = 2, prefix = '' } = opts ?? {}
  if (n == null || isNaN(n)) return prefix + '—'
  if (compact) {
    const abs = Math.abs(n)
    if (abs >= 1e12) return prefix + (n / 1e12).toFixed(2) + 'T'
    if (abs >= 1e9) return prefix + (n / 1e9).toFixed(2) + 'B'
    if (abs >= 1e7) return prefix + (n / 1e7).toFixed(2) + 'Cr'
    if (abs >= 1e5) return prefix + (n / 1e5).toFixed(2) + 'L'
    if (abs >= 1e3) return prefix + (n / 1e3).toFixed(1) + 'K'
  }
  return prefix + n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/* ---------- Panel: the primary container ---------- */
export function Panel({
  children,
  className,
  label,
  meta,
  actions,
  pad = false,
  scroll = false,
}: {
  children: React.ReactNode
  className?: string
  /** Micro-label naming what this panel holds */
  label?: string
  /** Right-aligned status, count or timestamp */
  meta?: React.ReactNode
  actions?: React.ReactNode
  pad?: boolean
  scroll?: boolean
}) {
  return (
    <section className={cx('panel flex flex-col min-w-0 overflow-hidden', className)}>
      {(label || meta || actions) && (
        <header className="panel-rail shrink-0">
          <span className="eyebrow truncate">{label}</span>
          <div className="flex items-center gap-2 shrink-0">
            {meta && <span className="text-xs text-muted tabular-nums">{meta}</span>}
            {actions}
          </div>
        </header>
      )}
      <div className={cx('min-w-0', pad && 'p-4', scroll && 'overflow-auto custom-scrollbar', 'flex-1')}>{children}</div>
    </section>
  )
}

/* ---------- Card: legacy container, kept for unmigrated pages ---------- */
export function Card({
  children, className, hover = true, pad = true,
}: {
  children: React.ReactNode; className?: string; hover?: boolean; pad?: boolean
}) {
  return (
    <div className={cx('panel', hover && 'card-hover', pad && 'p-4', className)}>
      {children}
    </div>
  )
}

/* ---------- Section title ---------- */
export function SectionTitle({
  title, subtitle, icon, action,
}: {
  title: string; subtitle?: string; icon?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <iconify-icon icon={icon} width="15" class="text-muted shrink-0"></iconify-icon>}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ---------- Change value (up/down colored) ---------- */
export function Change({
  value, suffix = '%', showArrow = true, className, decimals = 2,
}: { value: number | null | undefined; suffix?: string; showArrow?: boolean; className?: string; decimals?: number }) {
  if (value == null || isNaN(value)) return <span className={cx('text-muted tabular-nums', className)}>—</span>
  const up = value >= 0
  return (
    <span className={cx('inline-flex items-center gap-0.5 tabular-nums', up ? 'val-up' : 'val-down', className)}>
      {showArrow && (
        <iconify-icon icon={up ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width="12"></iconify-icon>
      )}
      {up ? '+' : '−'}{Math.abs(value).toFixed(decimals)}{suffix}
    </span>
  )
}

/* ---------- Badge ---------- */
export function Badge({
  children, tone = 'neutral', className,
}: { children: React.ReactNode; tone?: 'primary' | 'emerald' | 'up' | 'coral' | 'down' | 'amber' | 'warn' | 'neutral'; className?: string }) {
  const tones: Record<string, string> = {
    primary: 'text-primary border-primary/30 bg-primary-wash',
    emerald: 'val-up border-up/30 bg-up-wash',
    up: 'val-up border-up/30 bg-up-wash',
    coral: 'val-down border-down/30 bg-down-wash',
    down: 'val-down border-down/30 bg-down-wash',
    amber: 'text-warn border-warn/30 bg-[var(--warn-wash)]',
    warn: 'text-warn border-warn/30 bg-[var(--warn-wash)]',
    neutral: 'text-soft border-border bg-surface-2',
  }
  return (
    <span className={cx('inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm text-micro font-semibold uppercase tracking-wide border', tones[tone], className)}>
      {children}
    </span>
  )
}

/* ---------- Sparkline (pure SVG) ---------- */
export function Sparkline({
  data, width = 120, height = 36, up, strokeWidth = 1.5, fill = true,
}: { data: number[]; width?: number; height?: number; up?: boolean; strokeWidth?: number; fill?: boolean }) {
  if (!data?.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const isUp = up ?? data[data.length - 1] >= data[0]
  const color = isUp ? 'var(--up)' : 'var(--down)'
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * width
    const y = height - ((d - min) / span) * (height - 4) - 2
    return [x, y]
  })
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {fill && <path d={`${path} L${width},${height} L0,${height} Z`} fill={color} fillOpacity="0.09" />}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ---------- Stat tile ----------
   A quotation, not a marketing stat: label above, value in mono,
   change and context beneath. Used in rows of 3–6. */
export function StatTile({
  label, value, change, changeSuffix = '%', hint, spark, sparkUp, tone, className,
}: {
  label: string
  value: React.ReactNode
  change?: number | null
  changeSuffix?: string
  hint?: string
  spark?: number[]
  sparkUp?: boolean
  tone?: 'up' | 'down' | 'neutral'
  className?: string
}) {
  const valueColor = tone === 'up' ? 'val-up' : tone === 'down' ? 'val-down' : 'text-foreground'
  return (
    <div className={cx('panel p-3 flex flex-col gap-1.5 card-hover', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow truncate">{label}</span>
        {change != null && <Change value={change} suffix={changeSuffix} showArrow={false} className="text-xs" />}
      </div>
      <div className={cx('text-lg font-semibold tabular-nums leading-none', valueColor)}>{value}</div>
      {spark && <Sparkline data={spark} up={sparkUp} width={200} height={28} />}
      {hint && <div className="text-xs text-muted truncate">{hint}</div>}
    </div>
  )
}

/** Back-compat alias — older pages import StatCard. */
export const StatCard = ({
  label, value, change, spark, sparkUp, hint,
}: { label: string; value: string; change?: number; icon?: string; spark?: number[]; sparkUp?: boolean; hint?: string }) => (
  <StatTile label={label} value={value} change={change} spark={spark} sparkUp={sparkUp} hint={hint} />
)

/* ---------- KPI strip: stat tiles as one continuous instrument ---------- */
export function KpiRow({ children, cols = 4, className }: { children: React.ReactNode; cols?: 2 | 3 | 4 | 5 | 6; className?: string }) {
  const map = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
    6: 'sm:grid-cols-3 lg:grid-cols-6',
  } as const
  return <div className={cx('grid grid-cols-1 gap-2', map[cols], className)}>{children}</div>
}

/* ---------- Progress bar ---------- */
export function ProgressBar({
  value, tone = 'primary', className, height = 4,
}: { value: number; tone?: 'primary' | 'emerald' | 'up' | 'coral' | 'down' | 'amber' | 'warn' | 'neutral'; className?: string; height?: number }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary', emerald: 'bg-up', up: 'bg-up',
    coral: 'bg-down', down: 'bg-down', amber: 'bg-warn', warn: 'bg-warn',
    neutral: 'bg-border-accent',
  }
  return (
    <div className={cx('w-full rounded-full bg-sunken overflow-hidden', className)} style={{ height }}>
      <div className={cx('h-full rounded-full transition-[width] duration-500 ease-out', colors[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

/* ---------- Bipolar bar: negative left, positive right of a centre rule ---------- */
export function BipolarBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = Math.min(100, (Math.abs(value) / (max || 1)) * 100) / 2
  const up = value >= 0
  return (
    <div className={cx('relative h-2.5 w-full bg-sunken rounded-sm overflow-hidden', className)}>
      <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
      <div
        className={cx('absolute inset-y-0 rounded-sm', up ? 'bg-up' : 'bg-down')}
        style={up ? { left: '50%', width: `${pct}%` } : { right: '50%', width: `${pct}%` }}
      />
    </div>
  )
}

/* ---------- Donut ring ---------- */
export function Donut({
  segments, size = 140, thickness = 14, center,
}: { segments: { value: number; color: string; label?: string }[]; size?: number; thickness?: number; center?: React.ReactNode }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          )
          offset += len
          return el
        })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  )
}

/* ---------- Mini vertical bars ---------- */
export function MiniBars({ data, height = 40, up }: { data: number[]; height?: number; up?: boolean }) {
  const max = Math.max(...data) || 1
  return (
    <div className="flex items-end gap-px w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className={cx('flex-1 rounded-t-sm', (up ?? true) ? 'bg-up/70' : 'bg-down/70')} style={{ height: `${(d / max) * 100}%` }} />
      ))}
    </div>
  )
}

/* ---------- Button ---------- */
export function Btn({
  children, variant = 'primary', size = 'md', icon, className, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'subtle' | 'danger' | 'coral'
  size?: 'sm' | 'md'
  icon?: string
}) {
  const v: Record<string, string> = {
    primary: 'bg-primary text-[var(--on-primary)] hover:bg-primary-hover border border-transparent',
    danger:  'bg-down text-white hover:bg-down-bright border border-transparent',
    coral:   'bg-down text-white hover:bg-down-bright border border-transparent',
    outline: 'bg-transparent text-primary border border-primary/40 hover:bg-primary-wash',
    ghost:   'bg-transparent text-soft hover:text-foreground border border-transparent hover-fill',
    subtle:  'bg-surface-2 text-soft hover:text-foreground border border-border hover:border-border-strong',
  }
  const s = size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm'
  return (
    <button className={cx('inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed', v[variant], s, className)} {...rest}>
      {icon && <iconify-icon icon={icon} width="14"></iconify-icon>}
      {children}
    </button>
  )
}

/* ---------- Toolbar: the filter rail above a data grid ---------- */
export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-surface-2 shrink-0', className)}>
      {children}
    </div>
  )
}

export function ToolbarDivider() {
  return <span className="w-px h-4 bg-border shrink-0" aria-hidden="true" />
}

/* ---------- Empty state ----------
   An empty screen is an invitation to act, so it always offers the
   next move rather than only reporting the absence of data. */
export function EmptyState({
  icon = 'solar:inbox-linear', title, body, action, compact,
}: { icon?: string; title: string; body?: string; action?: React.ReactNode; compact?: boolean }) {
  return (
    <div className={cx('flex flex-col items-center justify-center text-center', compact ? 'py-8 px-4' : 'py-16 px-6')}>
      <div className="w-10 h-10 rounded-lg border border-border bg-surface-2 flex items-center justify-center mb-3">
        <iconify-icon icon={icon} width="18" class="text-muted"></iconify-icon>
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {body && <p className="text-xs text-muted mt-1 max-w-sm leading-relaxed">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------- Loading skeletons ---------- */
export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-3 space-y-2" aria-busy="true" aria-label="Loading data">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-4" style={{ flex: c === 0 ? 2.4 : 1, opacity: 1 - r * 0.08 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonBlock({ height = 200, className }: { height?: number; className?: string }) {
  return <div className={cx('skeleton w-full', className)} style={{ height }} aria-busy="true" />
}

/* ---------- Table shell ---------- */
export function DataGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('w-full overflow-auto custom-scrollbar', className)}>
      <table className="data-table">{children}</table>
    </div>
  )
}

/* ---------- Heat cell: value mapped to up/down wash intensity ---------- */
export function HeatCell({
  value, max, children, className,
}: { value: number; max: number; children?: React.ReactNode; className?: string }) {
  const ratio = Math.min(1, Math.abs(value) / (max || 1))
  const color = value >= 0 ? '38, 169, 107' : '226, 80, 79'
  return (
    <div
      className={cx('flex items-center justify-center tabular-nums text-xs font-medium', className)}
      style={{
        backgroundColor: `rgba(${color}, ${(0.08 + ratio * 0.42).toFixed(3)})`,
        color: ratio > 0.55 ? '#fff' : 'var(--text)',
      }}
    >
      {children ?? value.toFixed(2)}
    </div>
  )
}

/* ---------- Key/value definition row ---------- */
export function DefRow({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'up' | 'down' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border last:border-none">
      <span className="text-xs text-muted truncate">{label}</span>
      <span className={cx('text-sm tabular-nums font-medium', tone === 'up' ? 'val-up' : tone === 'down' ? 'val-down' : 'text-foreground')}>{value}</span>
    </div>
  )
}

/* ---------- Inline note: explains why a number looks the way it does ---------- */
export function Note({ children, icon = 'solar:info-circle-linear' }: { children: React.ReactNode; icon?: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded border border-border bg-surface-2 text-xs text-soft leading-relaxed">
      <iconify-icon icon={icon} width="14" class="text-muted mt-px shrink-0"></iconify-icon>
      <span>{children}</span>
    </div>
  )
}
