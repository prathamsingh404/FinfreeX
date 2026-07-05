'use client'
import PageShell from '@/components/PageShell'
import { Card, Badge, fmt } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getDarkPool } from '@/lib/featureData'

type Row = ReturnType<typeof getDarkPool>[number]

export default function DarkPoolPage() {
  const rows = getDarkPool()
  const cols: Column<Row>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-bold text-foreground">{r.symbol}</span> },
    { key: 'name', header: 'Company', className: 'text-soft' },
    { key: 'darkVolume', header: 'Dark Volume', align: 'right', render: (r) => fmt(r.darkVolume, { compact: true, decimals: 1 }) },
    { key: 'darkPct', header: 'Dark %', align: 'right', render: (r) => <span className="font-semibold">{r.darkPct.toFixed(1)}%</span> },
    { key: 'blockTrades', header: 'Block Trades', align: 'right' },
    {
      key: 'sentiment', header: 'Sentiment', align: 'right',
      render: (r) => <Badge tone={r.sentiment >= 0.15 ? 'emerald' : r.sentiment <= -0.15 ? 'coral' : 'neutral'}>
        {r.sentiment >= 0.15 ? 'Accumulation' : r.sentiment <= -0.15 ? 'Distribution' : 'Neutral'}
      </Badge>,
    },
  ]
  return (
    <PageShell
      title="Dark Pool Activity"
      category="Smart Money"
      subtitle="Off-exchange block prints and hidden liquidity flows aggregated by symbol."
      icon="solar:eye-closed-bold-duotone"
    >
      <Card pad={false} className="p-2">
        <DataTable columns={cols} rows={rows} />
      </Card>
    </PageShell>
  )
}
