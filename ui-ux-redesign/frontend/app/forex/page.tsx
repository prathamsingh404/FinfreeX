'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Sparkline, fmt } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getForex, getSparkline } from '@/lib/mockData'

type Fx = ReturnType<typeof getForex>[number]

export default function ForexPage() {
  const fx = getForex()
  const cols: Column<Fx>[] = [
    { key: 'pair', header: 'Pair', render: (p) => <span className="font-semibold">{p.pair}</span> },
    { key: 'rate', header: 'Rate', align: 'right', render: (p) => p.rate },
    { key: 'changePct', header: 'Change', align: 'right', render: (p) => <Change value={p.changePct} showArrow={false} /> },
    { key: 'high', header: 'Day High', align: 'right', render: (p) => p.high },
    { key: 'low', header: 'Day Low', align: 'right', render: (p) => p.low },
    { key: 'spark', header: 'Trend', align: 'right', render: (p) => <div className="flex justify-end"><Sparkline data={getSparkline('fx-' + p.pair)} up={p.changePct >= 0} width={110} height={28} /></div> },
  ]
  return (
    <PageShell category="Assets & Funds" title="Forex & Currencies" subtitle="Live exchange rates and intraday ranges for major currency pairs." icon="solar:dollar-linear">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {fx.slice(0, 4).map((p) => (
          <Card key={p.pair} className="flex flex-col gap-1.5">
            <span className="text-xs text-soft font-semibold">{p.pair}</span>
            <span className="text-xl font-bold tabular-nums">{p.rate}</span>
            <Change value={p.changePct} />
          </Card>
        ))}
      </div>
      <Card>
        <SectionTitle title="All Currency Pairs" icon="solar:dollar-linear" />
        <DataTable columns={cols} rows={fx} />
      </Card>
    </PageShell>
  )
}
