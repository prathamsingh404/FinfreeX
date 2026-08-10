'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Change, StatTile, KpiRow, EmptyState, SkeletonRows, cx } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { SearchInput, Reveal } from '@/components/ui/controls'
import { useForex } from '@/lib/hooks/useMarketData'

type Fx = { pair: string; rate: number; change_pct: number; high: number; low: number }

/** Where the current rate sits inside the day's range. */
function RangeMarker({ low, high, rate }: { low: number; high: number; rate: number }) {
  const span = high - low || 1
  const pct = Math.max(0, Math.min(100, ((rate - low) / span) * 100))
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-xs tabular-nums text-muted">{low}</span>
      <div className="relative w-24 h-1 bg-sunken rounded-full">
        <span className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 bg-foreground rounded-sm" style={{ left: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted">{high}</span>
    </div>
  )
}

export default function ForexPage() {
  const { data: fxData, loading } = useForex()
  const fx: Fx[] = fxData || []
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? fx.filter((p) => p.pair.toLowerCase().includes(q)) : fx
  }, [fx, query])

  const advancing = fx.filter((p) => p.change_pct >= 0).length
  const strongest = fx.length ? [...fx].sort((a, b) => b.change_pct - a.change_pct)[0] : null
  const weakest = fx.length ? [...fx].sort((a, b) => a.change_pct - b.change_pct)[0] : null

  const cols: Column<Fx>[] = [
    { key: 'pair', header: 'Pair', width: '120px', render: (p) => <span className="font-medium text-foreground">{p.pair}</span> },
    { key: 'rate', header: 'Rate', align: 'right', render: (p) => <span className="font-medium tabular-nums">{p.rate}</span> },
    { key: 'change_pct', header: 'Change', align: 'right', render: (p) => <Change value={p.change_pct} showArrow={false} /> },
    { key: 'low', header: 'Day range', align: 'right', sortable: false, render: (p) => <RangeMarker low={p.low} high={p.high} rate={p.rate} /> },
  ]

  return (
    <PageShell
      category="Assets"
      title="Forex"
      subtitle="Live exchange rates with each pair placed inside its own session range."
      icon="solar:dollar-linear"
      backdrop="tape"
      status={<><span className="live-dot" /> 30s refresh</>}
    >
      {loading && !fx.length ? (
        <Panel label="Currency pairs"><SkeletonRows rows={8} cols={4} /></Panel>
      ) : fx.length === 0 ? (
        <Panel label="Currency pairs">
          <EmptyState
            icon="solar:dollar-linear"
            title="No rates available right now"
            body="The currency feed returned nothing. It will populate as soon as the market data service responds."
          />
        </Panel>
      ) : (
        <>
          <KpiRow cols={4} className="mb-3">
            <StatTile label="Pairs tracked" value={fx.length} hint={`${advancing} advancing`} />
            {strongest && <StatTile label="Strongest today" value={strongest.pair} change={strongest.change_pct} hint={`at ${strongest.rate}`} />}
            {weakest && <StatTile label="Weakest today" value={weakest.pair} change={weakest.change_pct} hint={`at ${weakest.rate}`} />}
            <StatTile label="Session breadth" value={`${advancing} / ${fx.length}`} tone={advancing * 2 >= fx.length ? 'up' : 'down'} hint="Advancing versus total" />
          </KpiRow>

          <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            {fx.slice(0, 4).map((p) => (
              <div key={p.pair} className="panel p-3 card-hover">
                <div className="eyebrow mb-1.5">{p.pair}</div>
                <div className="text-lg font-semibold tabular-nums">{p.rate}</div>
                <Change value={p.change_pct} className="text-xs mt-0.5" />
              </div>
            ))}
          </Reveal>

          <Reveal delay={80}>
            <Panel
              label="All currency pairs"
              meta={`${rows.length} of ${fx.length}`}
              actions={<SearchInput value={query} onChange={setQuery} placeholder="Search pairs" className="w-40" />}
            >
              <DataTable columns={cols} rows={rows} dense emptyTitle="No pair matches that search" />
            </Panel>
          </Reveal>
        </>
      )}
    </PageShell>
  )
}
