'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { useForex } from '@/lib/hooks/useMarketData'

type Fx = {
  pair: string;
  rate: number;
  change_pct: number;
  high: number;
  low: number;
}

export default function ForexPage() {
  const { data: fxData, loading } = useForex()
  const fx: Fx[] = fxData || []

  const cols: Column<Fx>[] = [
    { key: 'pair', header: 'Pair', render: (p) => <span className="font-semibold">{p.pair}</span> },
    { key: 'rate', header: 'Rate', align: 'right', render: (p) => p.rate },
    { key: 'change_pct', header: 'Change', align: 'right', render: (p) => <Change value={p.change_pct} showArrow={false} /> },
    { key: 'high', header: 'Day High', align: 'right', render: (p) => p.high },
    { key: 'low', header: 'Day Low', align: 'right', render: (p) => p.low },
  ]

  return (
    <PageShell category="Assets & Funds" title="Forex & Currencies" subtitle="Live exchange rates and intraday ranges for major currency pairs." icon="solar:dollar-linear">
      {loading ? (
        <div className="flex items-center justify-center h-32 text-soft">Loading live forex rates...</div>
      ) : fx.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-soft">No forex data available.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {fx.slice(0, 4).map((p) => (
              <Card key={p.pair} className="flex flex-col gap-1.5 border-border">
                <span className="text-xs text-soft font-semibold">{p.pair}</span>
                <span className="text-xl font-bold tabular-nums">{p.rate}</span>
                <Change value={p.change_pct} />
              </Card>
            ))}
          </div>
          <Card className="border-border">
            <SectionTitle title="All Currency Pairs" icon="solar:dollar-linear" />
            <DataTable columns={cols} rows={fx} />
          </Card>
        </>
      )}
    </PageShell>
  )
}
