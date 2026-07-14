'use client'
import PageShell from '@/components/PageShell'
import { Card, Badge } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getCorpActions } from '@/lib/featureData'

type Row = ReturnType<typeof getCorpActions>[number]

export default function CorporateActionsPage() {
  const rows = getCorpActions()
  const toneFor: Record<string, 'emerald' | 'coral' | 'amber' | 'neutral'> = {
    Dividend: 'emerald', Bonus: 'amber', Split: 'neutral', Buyback: 'coral', Rights: 'amber',
  }
  const cols: Column<Row>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-bold text-foreground">{r.symbol}</span> },
    { key: 'name', header: 'Company', className: 'text-soft' },
    { key: 'action', header: 'Action', render: (r) => <Badge tone={toneFor[r.action] ?? 'neutral'}>{r.action}</Badge> },
    { key: 'detail', header: 'Detail', align: 'right', render: (r) => <span className="font-semibold">{r.detail}</span> },
    { key: 'recordDate', header: 'Record Date', align: 'right', className: 'text-soft' },
  ]
  return (
    <PageShell
      title="Corporate Actions"
      category="Market Intelligence"
      subtitle="Track dividends, bonuses, splits, buybacks and rights issues across listed companies."
      icon="solar:posts-carousel-vertical-bold-duotone"
    >
      <Card pad={false} className="p-2">
        <DataTable columns={cols} rows={rows} />
      </Card>
    </PageShell>
  )
}
