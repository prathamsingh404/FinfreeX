'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge, fmt } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { AreaChart } from '@/components/ui/AreaChart'
import { getBonds, getYieldCurve } from '@/lib/featureData'

type Bond = ReturnType<typeof getBonds>[number]

export default function FixedIncomePage() {
  const bonds = getBonds()
  const curve = getYieldCurve()
  const cols: Column<Bond>[] = [
    { key: 'name', header: 'Instrument', render: (b) => <span className="font-semibold">{b.name}</span> },
    { key: 'type', header: 'Type', render: (b) => <Badge tone="neutral">{b.type}</Badge> },
    { key: 'yield', header: 'Yield', align: 'right', render: (b) => <span className="font-semibold tabular-nums">{b.yield}%</span> },
    { key: 'change', header: 'Δ (bps)', align: 'right', render: (b) => <Change value={b.change * 100} showArrow={false} suffix=" bps" /> },
    { key: 'price', header: 'Price', align: 'right', render: (b) => fmt(b.price) },
    { key: 'duration', header: 'Duration', align: 'right', render: (b) => `${b.duration}y` },
  ]
  return (
    <PageShell category="Fixed Income & Rates" title="Fixed Income & Bonds" subtitle="Government and corporate bond yields, prices, and the yield curve." icon="solar:bill-linear">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionTitle title="Bond Yields" icon="solar:bill-linear" />
          <DataTable columns={cols} rows={bonds} />
        </Card>
        <Card>
          <SectionTitle title="Yield Curve" subtitle="G-Sec term structure" icon="solar:graph-up-linear" />
          <AreaChart data={curve.map((c) => c.yield)} height={160} up labels={curve.map((c) => c.tenor)} />
          <div className="mt-3 text-xs text-soft">Steepening curve — 10Y at {curve.find((c) => c.tenor === '10Y')?.yield}%</div>
        </Card>
      </div>
    </PageShell>
  )
}
