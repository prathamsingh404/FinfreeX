import React from 'react'
import { cx } from './kit'

/* ============================================================
   Backdrop — drawn section artwork, not stock photography.

   Every plate is generated from deterministic math (no Math.random,
   so server and client render the same markup) and inked entirely in
   var(--texture), so it re-tints with the theme and never becomes a
   decorative color. Each variant depicts something true about the
   section it sits behind.
   ============================================================ */

type Variant = 'contour' | 'lattice' | 'mesh' | 'tape' | 'radial'

/** Smooth pseudo-random in [0,1] from an integer seed. Stable across renders. */
function noise(i: number, salt = 1) {
  const x = Math.sin(i * 12.9898 * salt + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/* ---------- Contour: pressure isolines. Macro and economics. ---------- */
function Contour() {
  const lines = Array.from({ length: 14 }, (_, band) => {
    const amp = 26 + band * 2.4
    const phase = band * 0.42
    const yBase = 40 + band * 34
    const pts = Array.from({ length: 41 }, (_, i) => {
      const x = (i / 40) * 1200
      const y =
        yBase +
        Math.sin(i * 0.24 + phase) * amp +
        Math.sin(i * 0.09 + phase * 2.1) * amp * 0.55
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return { d: `M${pts.join(' L')}`, key: band }
  })
  return (
    <svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden="true">
      {lines.map((l, i) => (
        <path key={l.key} d={l.d} fill="none" stroke="var(--texture-strong)" strokeWidth={i % 4 === 0 ? 1.4 : 0.7} />
      ))}
    </svg>
  )
}

/* ---------- Lattice: a wall of candles. Assets and instruments. ---------- */
function Lattice() {
  const bars = Array.from({ length: 60 }, (_, i) => {
    const mid = 260 + Math.sin(i * 0.31) * 90 + Math.sin(i * 0.11) * 50
    const body = 14 + noise(i) * 52
    const wick = body + 12 + noise(i, 3) * 40
    return { x: i * 20 + 6, mid, body, wick, key: i }
  })
  return (
    <svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden="true">
      {bars.map((b) => (
        <g key={b.key}>
          <line x1={b.x + 5} x2={b.x + 5} y1={b.mid - b.wick / 2} y2={b.mid + b.wick / 2} stroke="var(--texture)" strokeWidth="1" />
          <rect x={b.x} y={b.mid - b.body / 2} width="10" height={b.body} fill="none" stroke="var(--texture-strong)" strokeWidth="1" />
        </g>
      ))}
    </svg>
  )
}

/* ---------- Mesh: correlation graph. Professional and derivatives. ---------- */
function Mesh() {
  const nodes = Array.from({ length: 34 }, (_, i) => ({
    x: 40 + noise(i, 1) * 1120,
    y: 30 + noise(i, 7) * 460,
    r: 1.5 + noise(i, 13) * 2.5,
  }))
  const edges: [number, number][] = []
  nodes.forEach((n, i) => {
    nodes.forEach((m, j) => {
      if (j <= i) return
      const d = Math.hypot(n.x - m.x, n.y - m.y)
      if (d < 175) edges.push([i, j])
    })
  })
  return (
    <svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden="true">
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke="var(--texture)" strokeWidth="0.8" />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r} fill="var(--texture-strong)" />
      ))}
    </svg>
  )
}

/* ---------- Tape: a continuous price step. Markets. ---------- */
function Tape() {
  let y = 300
  const pts: string[] = ['0,300']
  for (let i = 1; i <= 120; i++) {
    y += (noise(i, 5) - 0.48) * 46
    y = Math.max(70, Math.min(450, y))
    pts.push(`${i * 10},${y.toFixed(1)}`)
  }
  const d = `M${pts.join(' L')}`
  return (
    <svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden="true">
      <path d={d} fill="none" stroke="var(--texture-strong)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={`${d} L1200,520 L0,520 Z`} fill="var(--texture)" opacity="0.5" />
    </svg>
  )
}

/* ---------- Radial: concentric range rings. Risk and volatility. ---------- */
function Radial() {
  return (
    <svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden="true">
      {Array.from({ length: 11 }, (_, i) => (
        <circle key={i} cx="600" cy="260" r={40 + i * 58} fill="none" stroke="var(--texture)" strokeWidth={i % 3 === 0 ? 1.3 : 0.7} />
      ))}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        return (
          <line
            key={`r${i}`}
            x1={600 + Math.cos(a) * 40}
            y1={260 + Math.sin(a) * 40}
            x2={600 + Math.cos(a) * 620}
            y2={260 + Math.sin(a) * 620}
            stroke="var(--texture)"
            strokeWidth="0.6"
          />
        )
      })}
    </svg>
  )
}

const PLATES: Record<Variant, () => JSX.Element> = {
  contour: Contour,
  lattice: Lattice,
  mesh: Mesh,
  tape: Tape,
  radial: Radial,
}

/**
 * Drops a generated plate behind a section. Absolutely positioned and
 * inert, masked so it fades out rather than tiling to the edges.
 */
export default function Backdrop({
  variant = 'contour',
  className,
  fade = 'top',
  opacity = 1,
}: {
  variant?: Variant
  className?: string
  fade?: 'top' | 'center' | 'none'
  opacity?: number
}) {
  const Plate = PLATES[variant]
  return (
    <div
      aria-hidden="true"
      style={{ opacity }}
      className={cx(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        fade === 'top' && 'texture-fade-top',
        fade === 'center' && 'texture-fade',
        className,
      )}
    >
      <Plate />
    </div>
  )
}
