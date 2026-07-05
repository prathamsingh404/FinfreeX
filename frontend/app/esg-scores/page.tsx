'use client'
import PageShell from '@/components/PageShell'
import { Card, Badge, ProgressBar } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getESG } from '@/lib/featureData'

type Row = ReturnType<typeof getESG>[number]

export default function ESGScoresPage() {
  const rows = getESG()
  const cols: Column<Row>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-bold text-foreground">{r.symbol}</span> },
    { key: 'name', header: 'Company', className: 'text-soft' },
    { key: 'sector', header: 'Sector', className: 'text-soft' },
    { key: 'environmental', header: 'E', align: 'right', render: (r) => r.environmental },
    { key: 'social', header: 'S', align: 'right', render: (r) => r.social },
    { key: 'governance', header: 'G', align: 'right', render: (r) => r.governance },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-bold text-emerald-bright">{r.total}</span> },
    { key: 'rating', header: 'Rating', align: 'right', render: (r) => <Badge tone={r.total >= 70 ? 'emerald' : r.total >= 55 ? 'amber' : 'coral'}>{r.rating}</Badge> },
  ]
  return (
    <PageShell
      title="ESG Scores"
      category="Sustainable Investing"
      subtitle="Environmental, social and governance ratings across the coverage universe."
      icon="solar:leaf-bold-duotone"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {rows.slice(0, 3).map((r) => (
          <Card key={r.symbol}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold">{r.symbol}</span>
              <Badge tone={r.total >= 70 ? 'emerald' : r.total >= 55 ? 'amber' : 'coral'}>{r.rating}</Badge>
            </div>
            <div className="space-y-2.5 text-xs">
              {[['Environmental', r.environmental, 'emerald'], ['Social', r.social, 'amber'], ['Governance', r.governance, 'coral']].map(([l, v, t]) => (
                <div key={l as string}>
                  <div className="flex justify-between mb-1"><span className="text-soft">{l}</span><span className="font-semibold">{v as number}</span></div>
                  <ProgressBar value={v as number} tone={t as 'emerald' | 'coral' | 'amber'} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Card pad={false} className="p-2">
        <DataTable columns={cols} rows={rows} />
      </Card>
    </PageShell>
  )
}
