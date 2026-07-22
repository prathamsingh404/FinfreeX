'use client'
import PageShell from '@/components/PageShell'
import { Card, Badge, fmt } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getInsiderTrades } from '@/lib/featureData'

type Row = ReturnType<typeof getInsiderTrades>[number]

export default function InsiderTradingPage() {
  const rows = getInsiderTrades()
  const buys = rows.filter((r) => r.type === 'BUY').length
  const cols: Column<Row>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-bold text-foreground">{r.symbol}</span> },
    { key: 'name', header: 'Company', className: 'text-soft' },
    { key: 'insider', header: 'Insider', render: (r) => <Badge tone="neutral">{r.insider}</Badge> },
    { key: 'type', header: 'Type', render: (r) => <Badge tone={r.type === 'BUY' ? 'emerald' : 'coral'}>{r.type}</Badge> },
    { key: 'shares', header: 'Shares', align: 'right', render: (r) => fmt(r.shares, { compact: true, decimals: 0 }) },
    { key: 'value', header: 'Value', align: 'right', render: (r) => fmt(r.value, { compact: true, prefix: '₹' }) },
    { key: 'date', header: 'Date', align: 'right', className: 'text-soft' },
  ]
  return (
    <PageShell
      title="Insider Trading"
      category="Smart Money"
      subtitle="Promoter, executive and bulk-deal transactions flagged in near real time."
      icon="solar:user-speak-rounded-bold-duotone"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><div className="text-xs text-soft">Transactions</div><div className="text-2xl font-bold mt-1">{rows.length}</div></Card>
        <Card><div className="text-xs text-soft">Buy Signals</div><div className="text-2xl font-bold mt-1 text-emerald-bright">{buys}</div></Card>
        <Card><div className="text-xs text-soft">Sell Signals</div><div className="text-2xl font-bold mt-1 text-coral">{rows.length - buys}</div></Card>
        <Card><div className="text-xs text-soft">Net Bias</div><div className="text-2xl font-bold mt-1">{buys >= rows.length / 2 ? 'Bullish' : 'Bearish'}</div></Card>
      </div>
      <Card pad={false} className="p-2">
        <DataTable columns={cols} rows={rows} />
      </Card>
    </PageShell>
  )
}
