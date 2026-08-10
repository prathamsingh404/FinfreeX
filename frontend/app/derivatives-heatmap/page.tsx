'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Badge, Change, StatTile, KpiRow, Note, cx } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Segmented, Reveal } from '@/components/ui/controls'
import { getDerivHeatmap } from '@/lib/featureData'

type Row = ReturnType<typeof getDerivHeatmap>[number]

/* Open interest and price together classify a position build-up into one
   of four states, so the primary view is that quadrant map. Which corner a
   name sits in is the whole read; a card grid throws that away. */

const BUILDUP_TONE: Record<string, 'up' | 'down' | 'warn' | 'neutral'> = {
  'Long Buildup': 'up',
  'Short Covering': 'up',
  'Short Buildup': 'down',
  'Long Unwinding': 'warn',
}

const QUADRANTS = [
  { label: 'Long buildup', hint: 'Price up, OI up', x: 'right', y: 'top' },
  { label: 'Short buildup', hint: 'Price down, OI up', x: 'left', y: 'top' },
  { label: 'Short covering', hint: 'Price up, OI down', x: 'right', y: 'bottom' },
  { label: 'Long unwinding', hint: 'Price down, OI down', x: 'left', y: 'bottom' },
]

function QuadrantMap({ rows, onPick, selected }: { rows: Row[]; onPick: (r: Row) => void; selected?: Row }) {
  const maxPrice = Math.max(...rows.map((r) => Math.abs(r.priceChange)), 1)
  const maxOi = Math.max(...rows.map((r) => Math.abs(r.oiChange)), 1)

  return (
    <div className="relative aspect-[4/3] w-full grid-fine rounded border border-border overflow-hidden">
      {/* Axes */}
      <span className="absolute left-0 right-0 top-1/2 h-px bg-border-strong" aria-hidden="true" />
      <span className="absolute top-0 bottom-0 left-1/2 w-px bg-border-strong" aria-hidden="true" />

      {QUADRANTS.map((q) => (
        <div
          key={q.label}
          className={cx(
            'absolute px-2 py-1 pointer-events-none',
            q.x === 'left' ? 'left-2' : 'right-2',
            q.y === 'top' ? 'top-2' : 'bottom-2',
            q.x === 'right' && 'text-right',
          )}
        >
          <div className="eyebrow">{q.label}</div>
          <div className="text-micro text-faint mt-0.5">{q.hint}</div>
        </div>
      ))}

      {rows.map((r) => {
        const left = 50 + (r.priceChange / maxPrice) * 42
        const top = 50 - (r.oiChange / maxOi) * 42
        const active = selected?.symbol === r.symbol
        return (
          <button
            key={r.symbol}
            onClick={() => onPick(r)}
            style={{ left: `${left}%`, top: `${top}%` }}
            className={cx(
              'absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-sm text-micro font-medium tabular-nums border transition-colors cursor-pointer whitespace-nowrap',
              active
                ? 'bg-primary text-[var(--on-primary)] border-primary z-10'
                : r.priceChange >= 0
                  ? 'bg-up-wash border-up/40 val-up hover:border-up'
                  : 'bg-down-wash border-down/40 val-down hover:border-down',
            )}
          >
            {r.symbol}
          </button>
        )
      })}

      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-micro text-faint">Price change →</span>
      <span className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-micro text-faint">OI change →</span>
    </div>
  )
}

export default function DerivativesHeatmapPage() {
  const rows = useMemo(() => getDerivHeatmap(), [])
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState<Row>(rows[0])

  const buildups = ['All', ...Array.from(new Set(rows.map((r) => r.buildup)))]
  const shown = filter === 'All' ? rows : rows.filter((r) => r.buildup === filter)

  const longBuildup = rows.filter((r) => r.buildup === 'Long Buildup').length
  const shortBuildup = rows.filter((r) => r.buildup === 'Short Buildup').length
  const avgPcr = rows.reduce((s, r) => s + r.pcr, 0) / rows.length
  const netOi = rows.reduce((s, r) => s + r.oiChange, 0)

  const cols: Column<Row>[] = [
    { key: 'symbol', header: 'Symbol', width: '120px', render: (r) => <span className="font-medium text-foreground">{r.symbol}</span> },
    { key: 'priceChange', header: 'Price', align: 'right', render: (r) => <Change value={r.priceChange} showArrow={false} /> },
    { key: 'oiChange', header: 'Open interest', align: 'right', render: (r) => <Change value={r.oiChange} showArrow={false} /> },
    {
      key: 'pcr',
      header: 'Put/call ratio',
      align: 'right',
      render: (r) => (
        <span className={cx('tabular-nums', r.pcr > 1.2 ? 'val-up' : r.pcr < 0.8 ? 'val-down' : 'text-foreground')}>
          {r.pcr.toFixed(2)}
        </span>
      ),
    },
    { key: 'buildup', header: 'Read', render: (r) => <Badge tone={BUILDUP_TONE[r.buildup] ?? 'neutral'}>{r.buildup}</Badge> },
  ]

  return (
    <PageShell
      category="Professional"
      title="Derivatives Heatmap"
      subtitle="Where open interest is building against price, and what that combination implies."
      icon="solar:map-arrow-up-linear"
      backdrop="mesh"
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="Long buildup" value={longBuildup} tone="up" hint="Price up on rising open interest" />
        <StatTile label="Short buildup" value={shortBuildup} tone="down" hint="Price down on rising open interest" />
        <StatTile label="Average put/call ratio" value={avgPcr.toFixed(2)} hint={avgPcr > 1 ? 'Put-heavy positioning' : 'Call-heavy positioning'} />
        <StatTile label="Net OI change" value={`${netOi >= 0 ? '+' : '−'}${Math.abs(netOi).toFixed(1)}%`} tone={netOi >= 0 ? 'up' : 'down'} hint={`Across ${rows.length} names`} />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
        <Reveal>
          <Panel label="Position map" meta={`${rows.length} F&O names`} pad>
            <QuadrantMap rows={rows} onPick={setSelected} selected={selected} />
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{selected.symbol}</span>
                <Badge tone={BUILDUP_TONE[selected.buildup] ?? 'neutral'}>{selected.buildup}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <div className="eyebrow mb-0.5">Price</div>
                  <Change value={selected.priceChange} showArrow={false} className="text-sm" />
                </div>
                <div>
                  <div className="eyebrow mb-0.5">Open interest</div>
                  <Change value={selected.oiChange} showArrow={false} className="text-sm" />
                </div>
                <div>
                  <div className="eyebrow mb-0.5">Put/call</div>
                  <span className="text-sm tabular-nums">{selected.pcr.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel
            label="Build-up table"
            meta={`${shown.length} of ${rows.length}`}
            actions={<Segmented options={buildups} value={filter} onChange={setFilter} size="sm" />}
          >
            <DataTable
              columns={cols}
              rows={shown}
              dense
              defaultSort={{ key: 'oiChange', dir: 'desc' }}
              onRowClick={(r) => setSelected(r)}
              selectedIndex={shown.findIndex((r) => r.symbol === selected.symbol)}
            />
          </Panel>

          <Note>
            Rising open interest confirms a move: new positions are backing it. Falling open interest on a move means positions are being closed, which makes the move less durable.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
