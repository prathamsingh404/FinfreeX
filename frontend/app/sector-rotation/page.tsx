'use client'

import React, { useEffect, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Badge, Change, StatTile, KpiRow, Note, EmptyState, SkeletonBlock, cx } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Reveal } from '@/components/ui/controls'
import { fetchSectorRotation, type RotationRow } from '@/lib/api'

type Row = RotationRow

/* Rotation is a cycle, and a cycle needs a two-axis plot to read. Relative
   strength on the horizontal, momentum on the vertical: sectors travel
   clockwise through improving, leading, weakening and lagging. */

const PHASE_TONE: Record<string, 'up' | 'down' | 'warn' | 'neutral'> = {
  Leading: 'up',
  Improving: 'warn',
  Weakening: 'down',
  Lagging: 'neutral',
}

const QUADRANTS = [
  { label: 'Improving', hint: 'Weak but gaining', pos: 'top-2 left-2' },
  { label: 'Leading', hint: 'Strong and gaining', pos: 'top-2 right-2 text-right' },
  { label: 'Lagging', hint: 'Weak and losing', pos: 'bottom-2 left-2' },
  { label: 'Weakening', hint: 'Strong but losing', pos: 'bottom-2 right-2 text-right' },
]

export default function SectorRotationPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Row | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchSectorRotation()
        if (cancelled) return
        setRows(res.sectors ?? [])
        setSelected(res.sectors?.[0] ?? null)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'The sector feed is unavailable.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || error || rows.length === 0 || !selected) {
    return (
      <PageShell
        category="Professional"
        title="Sector Rotation"
        subtitle="Relative strength against momentum, plotted on the cycle every sector travels."
        icon="solar:refresh-circle-linear"
        backdrop="radial"
      >
        <Panel label="Rotation map">
          {loading ? (
            <div className="p-3"><SkeletonBlock height={320} /></div>
          ) : (
            <EmptyState
              icon="solar:refresh-circle-linear"
              title="No sector data available"
              body={error ?? 'The sector board returned nothing. It will populate once the market data service responds.'}
            />
          )}
        </Panel>
      </PageShell>
    )
  }

  const leading = rows.filter((r) => r.phase === 'Leading')
  const lagging = rows.filter((r) => r.phase === 'Lagging')
  const strongest = [...rows].sort((a, b) => b.rs - a.rs)[0]
  const fastest = [...rows].sort((a, b) => b.momentum - a.momentum)[0]

  const cols: Column<Row>[] = [
    { key: 'sector', header: 'Sector', width: '160px', render: (r) => <span className="font-medium text-foreground">{r.sector}</span> },
    { key: 'rs', header: 'Relative strength', align: 'right', render: (r) => <span className="tabular-nums font-medium">{r.rs.toFixed(1)}</span> },
    { key: 'momentum', header: 'Momentum', align: 'right', render: (r) => <Change value={r.momentum} suffix="" showArrow={false} /> },
    { key: 'phase', header: 'Phase', render: (r) => <Badge tone={PHASE_TONE[r.phase] ?? 'neutral'}>{r.phase}</Badge> },
  ]

  return (
    <PageShell
      category="Professional"
      title="Sector Rotation"
      subtitle="Relative strength against momentum, plotted on the cycle every sector travels."
      icon="solar:refresh-circle-linear"
      backdrop="radial"
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="Leading sectors" value={leading.length} tone="up" hint={leading.map((s) => s.sector).slice(0, 2).join(', ') || 'None'} />
        <StatTile label="Lagging sectors" value={lagging.length} tone="down" hint={lagging.map((s) => s.sector).slice(0, 2).join(', ') || 'None'} />
        <StatTile label="Strongest" value={strongest.sector} hint={`Relative strength ${strongest.rs.toFixed(1)}`} />
        <StatTile label="Fastest gaining" value={fastest.sector} change={fastest.momentum} changeSuffix="" hint="Momentum reading" />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
        <Reveal>
          <Panel label="Rotation map" meta="Relative strength × momentum" pad>
            <div className="relative aspect-square w-full grid-fine rounded border border-border overflow-hidden">
              <span className="absolute left-0 right-0 top-1/2 h-px bg-border-strong" aria-hidden="true" />
              <span className="absolute top-0 bottom-0 left-1/2 w-px bg-border-strong" aria-hidden="true" />

              {QUADRANTS.map((q) => (
                <div key={q.label} className={cx('absolute px-2 py-1 pointer-events-none', q.pos)}>
                  <div className="eyebrow">{q.label}</div>
                  <div className="text-micro text-faint mt-0.5">{q.hint}</div>
                </div>
              ))}

              {rows.map((r) => {
                const left = 50 + (r.rs - 100) * 3.4
                const top = 50 - r.momentum * 4.6
                const active = selected.sector === r.sector
                return (
                  <button
                    key={r.sector}
                    onClick={() => setSelected(r)}
                    style={{ left: `${Math.max(6, Math.min(94, left))}%`, top: `${Math.max(6, Math.min(94, top))}%` }}
                    className={cx(
                      'absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-sm text-micro font-medium border transition-colors cursor-pointer whitespace-nowrap',
                      active
                        ? 'bg-primary text-[var(--on-primary)] border-primary z-10'
                        : 'bg-surface border-border text-soft hover:border-border-accent hover:text-foreground',
                    )}
                  >
                    {r.sector}
                  </button>
                )
              })}

              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-micro text-faint">Relative strength →</span>
              <span className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-micro text-faint">Momentum →</span>
            </div>

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{selected.sector}</div>
                <div className="text-xs text-muted mt-0.5">
                  Relative strength {selected.rs.toFixed(1)} · momentum {selected.momentum.toFixed(1)}
                </div>
              </div>
              <Badge tone={PHASE_TONE[selected.phase] ?? 'neutral'}>{selected.phase}</Badge>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel label="Sector table" meta={`${rows.length} sectors`}>
            <DataTable
              columns={cols}
              rows={rows}
              dense
              defaultSort={{ key: 'rs', dir: 'desc' }}
              onRowClick={(r) => setSelected(r)}
              selectedIndex={rows.findIndex((r) => r.sector === selected.sector)}
            />
          </Panel>

          <Note>
            Sectors move clockwise: improving to leading, leading to weakening, weakening to lagging. A name in the improving quadrant is early; one in weakening is late.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
