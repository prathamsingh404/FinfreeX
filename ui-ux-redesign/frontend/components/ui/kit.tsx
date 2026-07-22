import React from 'react'

/* ============================================================
   FinfreeX UI Kit — flat vibrant primitives (Emerald + Coral)
   Server-safe (no client hooks). Pure presentational components.
   ============================================================ */

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function fmt(n: number, opts?: { compact?: boolean; decimals?: number; prefix?: string }) {
  const { compact, decimals = 2, prefix = '' } = opts ?? {}
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
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-emerald/10 border border-emerald/20 text-emerald-bright flex items-center justify-center shrink-0">
            <iconify-icon icon={icon} width="18"></iconify-icon>
          </div>
        )}
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-soft mt-0.5">{subtitle}</p>}
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
    <span className={cx('inline-flex items-center gap-1 font-semibold tabular-nums', up ? 'text-emerald-bright' : 'text-coral', className)}>
      {showArrow && (
        <iconify-icon icon={up ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width="14"></iconify-icon>
      )}
      {up ? '+' : ''}{value.toFixed(2)}{suffix}
    </span>
  )
}

/* ---------- Badge ---------- */
export function Badge({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: 'emerald' | 'coral' | 'amber' | 'neutral'; className?: string }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald/12 text-emerald-bright border-emerald/25',
    coral: 'bg-coral/12 text-coral border-coral/25',
    amber: 'bg-amber/12 text-amber border-amber/25',
    neutral: 'bg-white/5 text-soft border-white/10',
  }
  return (
    <span className={cx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border', tones[tone], className)}>
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
  const color = isUp ? '#34D399' : '#FF6B57'
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d - min) / span) * (height - 4) - 2
    return [x, y]
  })
  const path = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)},${p[1].toFixed(1)}` : `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(' ')
  const area = `${path} L${width},${height} L0,${height} Z`
  const id = `sg-${Math.round(pts[0][1])}-${data.length}-${isUp ? 1 : 0}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
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
        <div className="flex items-center gap-2 text-soft">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-bright">
              <iconify-icon icon={icon} width="16"></iconify-icon>
            </div>
          )}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {typeof change === 'number' && <Change value={change} />}
      </div>
      <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {spark && <Sparkline data={spark} up={sparkUp} width={220} height={40} />}
      {hint && <div className="text-[11px] text-muted">{hint}</div>}
    </Card>
  )
}

/* ---------- Progress bar ---------- */
export function ProgressBar({ value, tone = 'emerald', className }: { value: number; tone?: 'emerald' | 'coral' | 'amber'; className?: string }) {
  const colors: Record<string, string> = { emerald: 'bg-emerald', coral: 'bg-coral', amber: 'bg-amber' }
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
    primary: 'bg-emerald text-[#04120C] hover:bg-emerald-bright',
    coral: 'bg-coral text-[#1a0703] hover:bg-coral-bright',
    ghost: 'bg-white/5 text-foreground hover:bg-white/10 border border-white/10',
    outline: 'bg-transparent text-emerald-bright border border-emerald/40 hover:bg-emerald/10',
  }
  return (
    <button className={cx('px-4 py-2 rounded-xl text-sm font-semibold transition-all magnetic-btn', v[variant], className)} {...rest}>
      {children}
    </button>
  )
}
