'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge, fmt } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getETFs } from '@/lib/featureData'

type Etf = ReturnType<typeof getETFs>[number]

export default function EtfAnalyzerPage() {
  const etfs = getETFs()
  const cols: Column<Etf>[] = [
    { key: 'symbol', header: 'ETF', render: (e) => (
      <div className="text-left"><div className="font-semibold">{e.symbol}</div><div className="text-[11px] text-muted truncate max-w-[160px]">{e.name}</div></div>
    ) },
    { key: 'category', header: 'Category', render: (e) => <Badge tone="neutral">{e.category}</Badge> },
    { key: 'price', header: 'Price', align: 'right', render: (e) => `₹${fmt(e.price)}` },
    { key: 'changePct', header: 'Change', align: 'right', render: (e) => <Change value={e.changePct} showArrow={false} /> },
    { key: 'aum', header: 'AUM (Cr)', align: 'right', render: (e) => fmt(e.aum, { decimals: 0 }) },
    { key: 'expense', header: 'Expense', align: 'right', render: (e) => `${e.expense}%` },
    { key: 'trackingError', header: 'Track Err', align: 'right', render: (e) => `${e.trackingError}%` },
    { key: 'volume', header: 'Volume', align: 'right', render: (e) => fmt(e.volume, { compact: true, decimals: 0 }) },
  ]
  return (
    <PageShell category="Assets & Funds" title="ETF Analyzer" subtitle="Track expense ratios, tracking error, and liquidity across ETFs." icon="solar:box-linear">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><div className="text-xs text-soft">Total ETFs</div><div className="text-2xl font-bold mt-1">{etfs.length}</div></Card>
        <Card><div className="text-xs text-soft">Avg Expense</div><div className="text-2xl font-bold mt-1">{(etfs.reduce((s, e) => s + e.expense, 0) / etfs.length).toFixed(2)}%</div></Card>
        <Card><div className="text-xs text-soft">Total AUM (Cr)</div><div className="text-2xl font-bold tabular-nums mt-1">{fmt(etfs.reduce((s, e) => s + e.aum, 0), { compact: true })}</div></Card>
        <Card><div className="text-xs text-soft">Gainers</div><div className="text-2xl font-bold mt-1">{etfs.filter((e) => e.changePct >= 0).length}/{etfs.length}</div></Card>
      </div>
      <Card>
        <SectionTitle title="ETF Universe" icon="solar:box-linear" />
        <DataTable columns={cols} rows={etfs} />
      </Card>
    </PageShell>
  )
}
