import React from 'react'

/* ============================================================
   Pure-SVG charts. No dependencies, no gradients — an area is a
   flat low-opacity wash so it reads the same in both themes and at
   any print size. All ink comes from theme variables.
   ============================================================ */

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1
  const step = Math.pow(10, Math.floor(Math.log10(span / count)))
  const err = (span / count) / step
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1
  const s = step * mult
  const start = Math.ceil(min / s) * s
  const out: number[] = []
  for (let v = start; v <= max + 1e-9; v += s) out.push(Number(v.toFixed(10)))
  return out
}

function tickLabel(v: number) {
  const a = Math.abs(v)
  if (a >= 1e7) return (v / 1e7).toFixed(1) + 'Cr'
  if (a >= 1e5) return (v / 1e5).toFixed(1) + 'L'
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return a >= 100 ? v.toFixed(0) : v.toFixed(2)
}

export function AreaChart({
  data, height = 220, color, up, showGrid = true, showAxis = true, labels,
}: {
  data: number[]
  height?: number
  color?: string
  up?: boolean
  showGrid?: boolean
  showAxis?: boolean
  labels?: string[]
}) {
  if (!data?.length) return null
  const stroke = color ?? (up === false ? 'var(--down)' : 'var(--up)')
  const W = 800
  const H = height
  const padY = 10
  const padR = showAxis ? 46 : 8
  const padL = 8

  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const x = (i: number) => padL + (i / (data.length - 1 || 1)) * (W - padL - padR)
  const y = (d: number) => padY + (1 - (d - min) / span) * (H - padY * 2)

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - padY} L${padL},${H - padY} Z`
  const ticks = showGrid || showAxis ? niceTicks(min, max) : []

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img">
        {ticks.map((t) => (
          <g key={t}>
            {showGrid && (
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" shapeRendering="crispEdges" />
            )}
            {showAxis && (
              <text
                x={W - padR + 6}
                y={y(t) + 3}
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="IBM Plex Mono, monospace"
              >
                {tickLabel(t)}
              </text>
            )}
          </g>
        ))}
        <path d={area} fill={stroke} fillOpacity="0.08" />
        <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {labels && (
        <div className="flex justify-between mt-1.5 px-1 text-micro text-muted tabular-nums">
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  )
}

/* Candlestick chart (pure SVG) */
export function CandleChart({
  candles, height = 300, showGrid = true,
}: {
  candles: { open: number; high: number; low: number; close: number }[]
  height?: number
  showGrid?: boolean
}) {
  if (!candles?.length) return null
  const W = 900
  const H = height
  const pad = 10
  const padR = 46
  const max = Math.max(...candles.map((c) => c.high))
  const min = Math.min(...candles.map((c) => c.low))
  const span = max - min || 1
  const cw = (W - pad - padR) / candles.length
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2)
  const ticks = niceTicks(min, max)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img">
      {showGrid &&
        ticks.map((t) => (
          <g key={t}>
            <line x1={pad} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" shapeRendering="crispEdges" />
            <text x={W - padR + 6} y={y(t) + 3} fill="var(--text-muted)" fontSize="10" fontFamily="IBM Plex Mono, monospace">
              {tickLabel(t)}
            </text>
          </g>
        ))}
      {candles.map((c, i) => {
        const x = pad + i * cw + cw / 2
        const up = c.close >= c.open
        const color = up ? 'var(--up)' : 'var(--down)'
        const bodyTop = y(Math.max(c.open, c.close))
        const bodyBot = y(Math.min(c.open, c.close))
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1" />
            <rect x={x - cw * 0.32} y={bodyTop} width={Math.max(1, cw * 0.64)} height={Math.max(1, bodyBot - bodyTop)} fill={color} />
          </g>
        )
      })}
    </svg>
  )
}

/* Horizontal bar series — ranked comparisons (sector performance, holdings) */
export function BarSeries({
  items, height = 18, showValue = true,
}: {
  items: { label: string; value: number }[]
  height?: number
  showValue?: boolean
}) {
  if (!items?.length) return null
  const max = Math.max(...items.map((i) => Math.abs(i.value))) || 1
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((it) => {
        const up = it.value >= 0
        return (
          <div key={it.label} className="flex items-center gap-3">
            <span className="text-xs text-soft w-28 shrink-0 truncate">{it.label}</span>
            <div className="flex-1 relative bg-sunken rounded-sm overflow-hidden" style={{ height }}>
              <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
              <div
                className={up ? 'absolute inset-y-0 bg-up/70' : 'absolute inset-y-0 bg-down/70'}
                style={up
                  ? { left: '50%', width: `${(Math.abs(it.value) / max) * 50}%` }
                  : { right: '50%', width: `${(Math.abs(it.value) / max) * 50}%` }}
              />
            </div>
            {showValue && (
              <span className={`text-xs tabular-nums w-16 text-right shrink-0 ${up ? 'val-up' : 'val-down'}`}>
                {up ? '+' : '−'}{Math.abs(it.value).toFixed(2)}%
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
