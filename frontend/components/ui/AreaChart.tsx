import React from 'react'

/* Lightweight responsive area chart (pure SVG, no deps). Flat vibrant fill. */
export function AreaChart({
  data, height = 220, color, up, showGrid = true, labels,
}: {
  data: number[]; height?: number; color?: string; up?: boolean; showGrid?: boolean; labels?: string[]
}) {
  color = color ?? (up === false ? '#FF6B57' : '#34D399')
  const W = 800
  const H = height
  const pad = 8
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = pad + (1 - (d - min) / span) * (H - pad * 2)
    return [x, y]
  })
  const line = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)},${p[1].toFixed(1)}` : `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(' ')
  const area = `${line} L${W - pad},${H} L${pad},${H} Z`
  const id = `area-${color.replace('#', '')}-${data.length}`
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {showGrid &&
          [0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={pad} x2={W - pad} y1={pad + f * (H - pad * 2)} y2={pad + f * (H - pad * 2)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {labels && (
        <div className="flex justify-between mt-2 px-2 text-[10px] text-muted">
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  )
}

/* Candlestick chart (pure SVG) */
export function CandleChart({ candles, height = 300 }: { candles: { open: number; high: number; low: number; close: number }[]; height?: number }) {
  const W = 900
  const H = height
  const pad = 10
  if (!candles.length) return null
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  const max = Math.max(...highs)
  const min = Math.min(...lows)
  const span = max - min || 1
  const cw = (W - pad * 2) / candles.length
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pad} x2={W - pad} y1={pad + f * (H - pad * 2)} y2={pad + f * (H - pad * 2)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {candles.map((c, i) => {
        const x = pad + i * cw + cw / 2
        const up = c.close >= c.open
        const color = up ? '#34D399' : '#FF6B57'
        const bodyTop = y(Math.max(c.open, c.close))
        const bodyBot = y(Math.min(c.open, c.close))
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1" opacity="0.7" />
            <rect x={x - cw * 0.3} y={bodyTop} width={cw * 0.6} height={Math.max(1, bodyBot - bodyTop)} fill={color} rx="1" />
          </g>
        )
      })}
    </svg>
  )
}
