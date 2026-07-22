'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Badge, fmt } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getDividends } from '@/lib/featureData'

type Div = ReturnType<typeof getDividends>[number]

export default function DividendTrackerPage() {
  const divs = getDividends().sort((a, b) => b.yield - a.yield)
  const avgYield = (divs.reduce((s, d) => s + d.yield, 0) / divs.length).toFixed(2)
  const cols: Column<Div>[] = [
    { key: 'symbol', header: 'Company', render: (d) => (
      <div className="text-left"><div className="font-semibold">{d.symbol}</div><div className="text-[11px] text-muted truncate max-w-[150px]">{d.name}</div></div>
    ) },
    { key: 'yield', header: 'Yield', align: 'right', render: (d) => <span className="font-semibold text-emerald-bright">{d.yield}%</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (d) => `₹${d.amount}` },
    { key: 'payout', header: 'Payout', align: 'right', render: (d) => `${d.payout}%` },
    { key: 'type', header: 'Type', align: 'center', render: (d) => <Badge tone={d.type === 'Special' ? 'amber' : 'neutral'}>{d.type}</Badge> },
    { key: 'exDate', header: 'Ex-Date', align: 'right', render: (d) => d.exDate },
  ]
  return (
    <PageShell category="Equities & Fundamentals" title="Dividend Tracker" subtitle="Upcoming dividends, yields, and payout ratios." icon="solar:money-bag-linear">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><div className="text-xs text-soft">Avg Yield</div><div className="text-2xl font-bold text-emerald-bright mt-1">{avgYield}%</div></Card>
        <Card><div className="text-xs text-soft">Top Yield</div><div className="text-2xl font-bold tabular-nums mt-1">{divs[0].yield}%</div></Card>
        <Card><div className="text-xs text-soft">Upcoming Ex-Dates</div><div className="text-2xl font-bold mt-1">{divs.length}</div></Card>
        <Card><div className="text-xs text-soft">Special Dividends</div><div className="text-2xl font-bold mt-1">{divs.filter((d) => d.type === 'Special').length}</div></Card>
      </div>
      <Card>
        <SectionTitle title="Dividend Calendar" subtitle="Ranked by yield" icon="solar:money-bag-linear" />
        <DataTable columns={cols} rows={divs} />
      </Card>
    </PageShell>
  )
}
