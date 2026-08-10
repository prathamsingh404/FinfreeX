'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Change, Badge, fmt, StatTile, KpiRow, Note, cx } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Segmented, Reveal } from '@/components/ui/controls'
import { AreaChart } from '@/components/ui/AreaChart'
import { getBonds, getYieldCurve } from '@/lib/featureData'

type Bond = ReturnType<typeof getBonds>[number]

export default function FixedIncomePage() {
  const bonds = useMemo(() => getBonds(), [])
  const curve = useMemo(() => getYieldCurve(), [])
  const types = ['All', ...Array.from(new Set(bonds.map((b) => b.type)))]
  const [type, setType] = useState('All')

  const rows = type === 'All' ? bonds : bonds.filter((b) => b.type === type)

  const tenYear = curve.find((c) => c.tenor === '10Y')?.yield ?? 0
  const spread = curve[curve.length - 1].yield - curve[0].yield
  const avgYield = bonds.reduce((s, b) => s + b.yield, 0) / bonds.length
  const highest = [...bonds].sort((a, b) => b.yield - a.yield)[0]
  const maxDuration = Math.max(...bonds.map((b) => b.duration))

  const cols: Column<Bond>[] = [
    { key: 'name', header: 'Instrument', width: '200px', render: (b) => <span className="font-medium text-foreground">{b.name}</span> },
    { key: 'type', header: 'Type', render: (b) => <Badge tone="neutral">{b.type}</Badge> },
    { key: 'yield', header: 'Yield', align: 'right', render: (b) => <span className="font-medium tabular-nums">{b.yield.toFixed(2)}%</span> },
    { key: 'change', header: 'Change', align: 'right', sortValue: (b) => b.change, render: (b) => <Change value={b.change * 100} showArrow={false} suffix=" bps" /> },
    { key: 'price', header: 'Price', align: 'right', render: (b) => fmt(b.price) },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      render: (b) => (
        <div className="flex items-center justify-end gap-2">
          <span className="tabular-nums">{b.duration.toFixed(1)}y</span>
          <div className="w-14 h-1 bg-sunken rounded-full overflow-hidden shrink-0">
            <div className="h-full bg-primary/60" style={{ width: `${(b.duration / maxDuration) * 100}%` }} />
          </div>
        </div>
      ),
    },
  ]

  return (
    <PageShell
      category="Assets"
      title="Fixed Income"
      subtitle="Sovereign and corporate yields, priced against the curve they sit on."
      icon="solar:bill-list-linear"
      backdrop="contour"
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="10Y benchmark" value={`${tenYear.toFixed(2)}%`} hint="Government of India" />
        <StatTile label="Curve spread" value={`${spread >= 0 ? '+' : '−'}${Math.abs(spread).toFixed(2)}%`} tone={spread >= 0 ? 'up' : 'down'} hint="30Y minus 3M" />
        <StatTile label="Average yield" value={`${avgYield.toFixed(2)}%`} hint={`${bonds.length} instruments`} />
        <StatTile label="Highest yield" value={`${highest.yield.toFixed(2)}%`} hint={highest.name} />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 items-start">
        <Reveal>
          <Panel
            label="Bond board"
            meta={`${rows.length} of ${bonds.length}`}
            actions={<Segmented options={types} value={type} onChange={setType} size="sm" />}
          >
            <DataTable columns={cols} rows={rows} dense defaultSort={{ key: 'yield', dir: 'desc' }} />
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel label="G-Sec term structure" meta="3M → 30Y" pad>
            <AreaChart data={curve.map((c) => c.yield)} height={180} up labels={curve.map((c) => c.tenor)} />
          </Panel>

          <Panel label="Yield by type" pad>
            {types.slice(1).map((t) => {
              const set = bonds.filter((b) => b.type === t)
              const avg = set.reduce((s, b) => s + b.yield, 0) / set.length
              return (
                <div key={t} className="flex items-center gap-2 py-1.5 border-b border-border last:border-none">
                  <span className="text-xs text-soft flex-1 truncate">{t}</span>
                  <div className="w-20 h-1 bg-sunken rounded-full overflow-hidden shrink-0">
                    <div className="h-full bg-primary/60" style={{ width: `${(avg / 9) * 100}%` }} />
                  </div>
                  <span className="text-xs tabular-nums w-12 text-right">{avg.toFixed(2)}%</span>
                </div>
              )
            })}
          </Panel>

          <Note>
            Duration is how much a bond's price moves for a one-point shift in yields. A ten-year duration means roughly a ten percent price move — in the opposite direction to rates.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
