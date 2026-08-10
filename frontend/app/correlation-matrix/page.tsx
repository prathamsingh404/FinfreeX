'use client'

import React, { useEffect, useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, StatTile, KpiRow, Note, EmptyState, SkeletonBlock, cx } from '@/components/ui/kit'
import { Reveal, Segmented } from '@/components/ui/controls'
import { fetchCorrelation } from '@/lib/api'

/* A correlation matrix only works as a matrix: the value of the grid is
   that you can find any pair by crossing a row and a column. Colour
   encodes sign and strength; the number stays visible because traders
   size positions off the number, not the shade. */

function cellStyle(v: number) {
  const mag = Math.min(1, Math.abs(v))
  const rgb = v >= 0 ? '38, 169, 107' : '226, 80, 79'
  return {
    backgroundColor: `rgba(${rgb}, ${(mag * 0.5).toFixed(3)})`,
    color: mag > 0.6 ? '#fff' : 'var(--text)',
  }
}

const PERIODS = [
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
] as const

export default function CorrelationMatrixPage() {
  const [period, setPeriod] = useState<string>('1y')
  const [assets, setAssets] = useState<string[]>([])
  const [matrix, setMatrix] = useState<(number | null)[][]>([])
  const [observations, setObservations] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetchCorrelation(period)
        if (cancelled) return
        setAssets(res.assets ?? [])
        setMatrix(res.matrix ?? [])
        setObservations(res.observations ?? 0)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Correlations could not be computed.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [period])

  // Every unique off-diagonal pair with a computed coefficient, ranked.
  const pairs = useMemo(() => {
    const out: { a: string; b: string; v: number }[] = []
    assets.forEach((a, i) => {
      assets.forEach((b, j) => {
        const v = matrix[i]?.[j]
        if (j > i && v != null) out.push({ a, b, v })
      })
    })
    return out.sort((x, y) => y.v - x.v)
  }, [assets, matrix])

  if (loading || error || pairs.length === 0) {
    return (
      <PageShell
        category="Professional"
        title="Correlation Matrix"
        subtitle="How the major asset classes move against each other, and which pairs actually diversify."
        icon="solar:scanner-linear"
        backdrop="mesh"
        actions={<Segmented options={PERIODS} value={period} onChange={setPeriod} size="sm" />}
      >
        <Panel label="Cross-asset correlation">
          {loading ? (
            <div className="p-3"><SkeletonBlock height={340} /></div>
          ) : (
            <EmptyState
              icon="solar:scanner-linear"
              title="Correlations unavailable"
              body={error ?? 'Not enough price history came back to compute a matrix over this window.'}
            />
          )}
        </Panel>
      </PageShell>
    )
  }

  const strongest = pairs[0]
  const mostInverse = pairs[pairs.length - 1]
  const avg = pairs.reduce((s, p) => s + p.v, 0) / pairs.length
  const diversifiers = pairs.filter((p) => Math.abs(p.v) < 0.3).length

  return (
    <PageShell
      category="Professional"
      title="Correlation Matrix"
      subtitle="How the major asset classes move against each other, and which pairs actually diversify."
      icon="solar:scanner-linear"
      backdrop="mesh"
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="Most correlated pair" value={`${strongest.a} · ${strongest.b}`} tone="up" hint={`${strongest.v.toFixed(2)} coefficient`} />
        <StatTile label="Most inverse pair" value={`${mostInverse.a} · ${mostInverse.b}`} tone="down" hint={`${mostInverse.v.toFixed(2)} coefficient`} />
        <StatTile label="Average correlation" value={avg.toFixed(2)} hint={`${pairs.length} unique pairs`} />
        <StatTile label="Genuine diversifiers" value={diversifiers} hint="Pairs under 0.30 either way" />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 items-start">
        <Reveal>
          <Panel label="Cross-asset correlation" meta={hover ? `${assets[hover.i]} vs ${assets[hover.j]}` : 'Trailing window'} pad>
            <div className="overflow-auto custom-scrollbar">
              <table className="w-full border-separate border-spacing-0 min-w-[520px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-surface z-10" />
                    {assets.map((a, j) => (
                      <th
                        key={a}
                        className={cx(
                          'p-1.5 text-micro font-semibold uppercase tracking-wide text-center transition-colors',
                          hover?.j === j ? 'text-foreground' : 'text-muted',
                        )}
                      >
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a, i) => (
                    <tr key={a}>
                      <th
                        className={cx(
                          'sticky left-0 bg-surface z-10 p-1.5 pr-3 text-micro font-semibold uppercase tracking-wide text-right whitespace-nowrap transition-colors',
                          hover?.i === i ? 'text-foreground' : 'text-muted',
                        )}
                      >
                        {a}
                      </th>
                      {assets.map((b, j) => {
                        const v = matrix[i]?.[j] ?? null
                        const isDiag = i === j
                        const lit = hover?.i === i || hover?.j === j
                        // A pair with too little overlapping history is hatched
                        // out rather than shaded as if it were near zero.
                        const uncomputed = !isDiag && v == null
                        return (
                          <td key={b} className="p-0.5">
                            <div
                              onMouseEnter={() => setHover({ i, j })}
                              onMouseLeave={() => setHover(null)}
                              style={isDiag || uncomputed ? undefined : cellStyle(v as number)}
                              className={cx(
                                'h-9 flex items-center justify-center text-xs font-medium tabular-nums rounded-sm transition-[outline] cursor-default',
                                (isDiag || uncomputed) && 'hatch-texture text-muted',
                                lit && 'outline outline-1 outline-[var(--border-accent)]',
                              )}
                              title={uncomputed ? 'Not enough overlapping history' : undefined}
                            >
                              {isDiag ? '1.00' : v == null ? '—' : v.toFixed(2)}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-xs text-muted">
              <span>−1.0</span>
              <div className="flex-1 h-2 rounded-sm flex overflow-hidden">
                {Array.from({ length: 20 }, (_, k) => {
                  const v = -1 + (k / 19) * 2
                  return <div key={k} className="flex-1" style={cellStyle(v)} />
                })}
              </div>
              <span>+1.0</span>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel label="Pairs, ranked" meta={`${pairs.length}`} scroll>
            <div className="px-3 py-1.5">
              {pairs.map((p) => (
                <div key={`${p.a}-${p.b}`} className="flex items-center gap-2 py-1.5 border-b border-border last:border-none">
                  <span className="text-xs text-soft flex-1 truncate">
                    {p.a} <span className="text-faint">·</span> {p.b}
                  </span>
                  <div className="relative w-16 h-1.5 bg-sunken rounded-sm shrink-0 overflow-hidden">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
                    <span
                      className={cx('absolute inset-y-0', p.v >= 0 ? 'bg-up' : 'bg-down')}
                      style={p.v >= 0 ? { left: '50%', width: `${Math.abs(p.v) * 50}%` } : { right: '50%', width: `${Math.abs(p.v) * 50}%` }}
                    />
                  </div>
                  <span className={cx('text-xs tabular-nums w-11 text-right', p.v >= 0 ? 'val-up' : 'val-down')}>
                    {p.v.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Note>
            Two holdings with a correlation near 1.0 are one position wearing two names. Diversification only comes from pairs that sit near zero or below it.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
