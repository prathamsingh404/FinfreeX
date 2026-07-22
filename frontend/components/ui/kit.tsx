import React from 'react'

/* ============================================================
   FinfreeX UI Kit — flat institutional primitives
   Server-safe (no client hooks). Pure presentational components.
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


/* ---------- Card ---------- */
export function Card({
  children, className, hover = true, pad = true,
}: {
  children: React.ReactNode; className?: string; hover?: boolean; pad?: boolean
}) {
  return (
    <div className={cx('glass-card', hover && 'card-hover', pad && 'p-5', className)}>
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
    <div className="flex items-end justify-between gap-4 mb-4">
      <div className="flex items-center gap-2.5">
        {icon && <iconify-icon icon={icon} width="16" class="text-muted shrink-0"></iconify-icon>}
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ---------- Change value (up/down colored) ---------- */
export function Change({ value, suffix = '%', showArrow = true, className }: { value: number; suffix?: string; showArrow?: boolean; className?: string }) {
  const up = value >= 0
  return (
    <span className={cx('inline-flex items-center gap-1 tabular-nums', up ? 'text-emerald-bright' : 'text-coral', className)}>
      {showArrow && (
        <iconify-icon icon={up ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width="13"></iconify-icon>
      )}
      {up ? '+' : '−'}{Math.abs(value).toFixed(2)}{suffix}
    </span>
  )
}

/* ---------- Badge ---------- */
export function Badge({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: 'primary' | 'emerald' | 'coral' | 'amber' | 'neutral'; className?: string }) {
  const tones: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/25',
    emerald: 'bg-emerald/10 text-emerald-bright border-emerald/25',
    coral: 'bg-coral/10 text-coral border-coral/25',
    amber: 'bg-amber/10 text-amber border-amber/25',
    neutral: 'bg-white/[0.04] text-soft border-border',
  }
  return (
    <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border', tones[tone], className)}>
      {children}
    </span>
  )
}

/* ---------- Sparkline (pure SVG) ---------- */
export function Sparkline({ data, width = 120, height = 36, up, strokeWidth = 2 }: { data: number[]; width?: number; height?: number; up?: boolean; strokeWidth?: number }) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const isUp = up ?? data[data.length - 1] >= data[0]
  const color = isUp ? 'var(--up, #089981)' : 'var(--down, #f23645)'
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d - min) / span) * (height - 4) - 2
    return [x, y]
  })
  const path = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)},${p[1].toFixed(1)}` : `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(' ')
  const area = `${path} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <path d={area} fill={color} fillOpacity="0.08" />
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ---------- Stat card ---------- */
export function StatCard({
  label, value, change, icon, spark, sparkUp, hint,
}: {
  label: string; value: string; change?: number; icon?: string; spark?: number[]; sparkUp?: boolean; hint?: string
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-muted">
          {icon && <iconify-icon icon={icon} width="14"></iconify-icon>}
          <span className="text-xs">{label}</span>
        </div>
        {typeof change === 'number' && <Change value={change} />}
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {spark && <Sparkline data={spark} up={sparkUp} width={220} height={40} />}
      {hint && <div className="text-[11px] text-muted">{hint}</div>}
    </Card>
  )
}

/* ---------- Progress bar ---------- */
export function ProgressBar({ value, tone = 'emerald', className }: { value: number; tone?: 'primary' | 'emerald' | 'coral' | 'amber'; className?: string }) {
  const colors: Record<string, string> = { primary: 'bg-primary', emerald: 'bg-emerald', coral: 'bg-coral', amber: 'bg-amber' }
  return (
    <div className={cx('h-1.5 w-full rounded-full bg-white/8 overflow-hidden', className)}>
      <div className={cx('h-full rounded-full', colors[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

/* ---------- Donut ring ---------- */
export function Donut({ segments, size = 140, thickness = 16, center }: { segments: { value: number; color: string; label?: string }[]; size?: number; thickness?: number; center?: React.ReactNode }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
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
export function MiniBars({ data, height = 44, up }: { data: number[]; height?: number; up?: boolean }) {
  const max = Math.max(...data) || 1
  const color = up ?? true ? 'bg-emerald/70' : 'bg-coral/70'
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className={cx('flex-1 rounded-sm', color)} style={{ height: `${(d / max) * 100}%` }} />
      ))}
    </div>
  )
}

/* ---------- Simple button ---------- */
export function Btn({ children, variant = 'primary', className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'coral' | 'outline' }) {
  const v: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    coral: 'bg-coral text-white hover:bg-coral-bright',
    ghost: 'bg-transparent text-soft hover:text-foreground border border-border hover:border-border-strong',
    outline: 'bg-transparent text-primary border border-primary/40 hover:bg-primary/10',
  }
  return (
    <button className={cx('px-3.5 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer', v[variant], className)} {...rest}>
      {children}
    </button>
  )
}
