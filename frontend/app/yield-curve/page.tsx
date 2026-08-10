'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, StatTile, KpiRow, Change, Note, DefRow, cx } from '@/components/ui/kit'
import { Segmented } from '@/components/ui/controls'
import { getYieldCurve } from '@/lib/featureData'

/* The curve is a shape, so the page leads with the shape and only then
   breaks it into numbers. Spreads are the read: 10Y–2Y and 30Y–3M say
   more about the cycle than any single tenor. */

const TENOR_MONTHS: Record<string, number> = {
  '3M': 3, '6M': 6, '1Y': 12, '2Y': 24, '3Y': 36, '5Y': 60, '7Y': 84, '10Y': 120, '15Y': 180, '30Y': 360,
}

function CurvePlot({ points, compare }: { points: { tenor: string; yield: number }[]; compare?: number[] }) {
  const W = 900
  const H = 320
  const padL = 44
  const padR = 16
  const padT = 18
  const padB = 30

  const xs = points.map((p) => Math.log(TENOR_MONTHS[p.tenor] ?? 12))
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const all = [...points.map((p) => p.yield), ...(compare ?? [])]
  const yMin = Math.floor(Math.min(...all) * 2) / 2 - 0.25
  const yMax = Math.ceil(Math.max(...all) * 2) / 2 + 0.25

  const px = (i: number) => padL + ((xs[i] - xMin) / (xMax - xMin || 1)) * (W - padL - padR)
  const py = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - padT - padB)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(p.yield).toFixed(1)}`).join(' ')
  const cmpPath = compare?.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')

  const gridLines: number[] = []
  for (let v = Math.ceil(yMin * 2) / 2; v <= yMax; v += 0.5) gridLines.push(Number(v.toFixed(2)))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} role="img" aria-label="Sovereign yield curve">
      {gridLines.map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={py(v)} y2={py(v)} stroke="var(--border)" strokeWidth="1" shapeRendering="crispEdges" />
          <text x={padL - 8} y={py(v) + 3} textAnchor="end" fill="var(--text-muted)" fontSize="10" fontFamily="IBM Plex Mono, monospace">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {points.map((p, i) => (
        <text key={p.tenor} x={px(i)} y={H - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="IBM Plex Mono, monospace">
          {p.tenor}
        </text>
      ))}
      {cmpPath && <path d={cmpPath} fill="none" stroke="var(--text-faint)" strokeWidth="1.5" strokeDasharray="4 4" />}
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={p.tenor} cx={px(i)} cy={py(p.yield)} r="3" fill="var(--surface)" stroke="var(--primary)" strokeWidth="1.5" />
      ))}
    </svg>
  )
}

export default function YieldCurvePage() {
  const curve = useMemo(() => getYieldCurve(), [])
  const [overlay, setOverlay] = useState<'None' | 'One month ago' | 'One year ago'>('None')

  const byTenor = Object.fromEntries(curve.map((c) => [c.tenor, c.yield]))
  const spread10_2 = byTenor['10Y'] - byTenor['2Y']
  const spread30_3m = byTenor['30Y'] - byTenor['3M']
  const spread5_2 = byTenor['5Y'] - byTenor['2Y']
  const inverted = spread10_2 < 0

  // A prior curve is the same shape shifted and flattened — enough to
  // read the direction of travel without pretending to be a data feed.
  const compare = useMemo(() => {
    if (overlay === 'None') return undefined
    const shift = overlay === 'One month ago' ? -0.12 : -0.55
    const flatten = overlay === 'One month ago' ? 0.04 : 0.16
    return curve.map((c, i) => +(c.yield + shift + (curve.length / 2 - i) * flatten * 0.1).toFixed(2))
  }, [overlay, curve])

  return (
    <PageShell
      title="Yield Curve"
      category="Macro"
      subtitle="The sovereign term structure, its spreads, and what the shape implies."
      icon="solar:chart-2-linear"
      backdrop="contour"
      actions={<Segmented options={['None', 'One month ago', 'One year ago'] as const} value={overlay} onChange={setOverlay} size="sm" />}
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="10Y" value={`${byTenor['10Y'].toFixed(2)}%`} hint="Benchmark tenor" />
        <StatTile
          label="10Y − 2Y"
          value={`${spread10_2 >= 0 ? '+' : '−'}${Math.abs(spread10_2).toFixed(2)}%`}
          tone={spread10_2 >= 0 ? 'up' : 'down'}
          hint={inverted ? 'Inverted' : 'Positively sloped'}
        />
        <StatTile label="30Y − 3M" value={`${spread30_3m >= 0 ? '+' : '−'}${Math.abs(spread30_3m).toFixed(2)}%`} tone={spread30_3m >= 0 ? 'up' : 'down'} hint="Full-curve steepness" />
        <StatTile label="5Y − 2Y" value={`${spread5_2 >= 0 ? '+' : '−'}${Math.abs(spread5_2).toFixed(2)}%`} tone={spread5_2 >= 0 ? 'up' : 'down'} hint="Belly of the curve" />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 items-start">
        <Panel label="G-Sec term structure" meta={overlay === 'None' ? '3M → 30Y' : `vs ${overlay.toLowerCase()}`} pad>
          <CurvePlot points={curve} compare={compare} />
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-px bg-primary" /> Current
            </span>
            {overlay !== 'None' && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 border-t border-dashed border-[var(--text-faint)]" /> {overlay}
              </span>
            )}
          </div>
        </Panel>

        <div className="flex flex-col gap-3">
          <Panel label="Tenor ladder" meta={`${curve.length} points`}>
            <div className="px-3 py-1.5">
              {curve.map((c, i) => {
                const prev = i > 0 ? curve[i - 1].yield : c.yield
                return (
                  <div key={c.tenor} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-none">
                    <span className="text-xs text-muted w-9">{c.tenor}</span>
                    <div className="flex-1 h-1 bg-sunken rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60" style={{ width: `${(c.yield / 9) * 100}%` }} />
                    </div>
                    <span className="text-sm tabular-nums font-medium w-14 text-right">{c.yield.toFixed(2)}%</span>
                    <Change value={c.yield - prev} showArrow={false} suffix="" className="text-xs w-14 text-right" />
                  </div>
                )
              })}
            </div>
          </Panel>

          <Note icon={inverted ? 'solar:danger-triangle-linear' : 'solar:info-circle-linear'}>
            {inverted
              ? `10Y sits ${Math.abs(spread10_2).toFixed(2)} points below 2Y. An inverted curve means the market is pricing rate cuts, and it has historically led slowdowns by several quarters.`
              : `10Y sits ${spread10_2.toFixed(2)} points above 2Y. A positively sloped curve is the normal state, and it prices continued growth with no near-term cuts.`}
          </Note>
        </div>
      </div>
    </PageShell>
  )
}
