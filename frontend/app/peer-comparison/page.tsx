'use client'
import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, fmt, Change, Btn } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getPeers } from '@/lib/featureData'
import { SECTORS } from '@/lib/mockData'

type Row = ReturnType<typeof getPeers>[number]

export default function PeerComparisonPage() {
  const [sector, setSector] = useState('Technology')
  const rows = getPeers(sector)
  const cols: Column<Row>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-bold text-foreground">{r.symbol}</span> },
    { key: 'name', header: 'Company', className: 'text-soft' },
    { key: 'marketCap', header: 'Market Cap', align: 'right', render: (r) => fmt(r.marketCap, { compact: true, prefix: '₹' }) },
    { key: 'pe', header: 'P/E', align: 'right', render: (r) => r.pe.toFixed(1) },
    { key: 'roe', header: 'ROE %', align: 'right', render: (r) => <span className="text-emerald-bright font-semibold">{r.roe.toFixed(1)}</span> },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => fmt(r.revenue, { compact: true, prefix: '₹' }) },
    { key: 'growth', header: 'Growth', align: 'right', render: (r) => <Change value={r.growth} suffix="%" /> },
  ]
  return (
    <PageShell
      title="Peer Comparison"
      category="Fundamentals"
      subtitle="Benchmark companies within a sector on scale, valuation and growth."
      icon="solar:users-group-two-rounded-bold-duotone"
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {SECTORS.slice(0, 8).map((s) => (
          <Btn key={s} variant={s === sector ? 'primary' : 'ghost'} onClick={() => setSector(s)} className="text-xs px-3 py-1.5">{s}</Btn>
        ))}
      </div>
      <Card pad={false} className="p-2">
        <DataTable columns={cols} rows={rows} />
      </Card>
    </PageShell>
  )
}
