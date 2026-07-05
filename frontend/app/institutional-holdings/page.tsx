'use client'
import PageShell from '@/components/PageShell'
import { Card, Change, ProgressBar } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getInstitutional } from '@/lib/featureData'

type Row = ReturnType<typeof getInstitutional>[number]

export default function InstitutionalHoldingsPage() {
  const rows = getInstitutional()
  const cols: Column<Row>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-bold text-foreground">{r.symbol}</span> },
    { key: 'name', header: 'Company', className: 'text-soft' },
    { key: 'fii', header: 'FII %', align: 'right', render: (r) => <span className="font-semibold">{r.fii.toFixed(1)}</span> },
    { key: 'dii', header: 'DII %', align: 'right', render: (r) => <span className="font-semibold">{r.dii.toFixed(1)}</span> },
    { key: 'promoter', header: 'Promoter %', align: 'right', render: (r) => r.promoter.toFixed(1) },
    { key: 'public', header: 'Public %', align: 'right', render: (r) => r.public.toFixed(1) },
    { key: 'fiiChange', header: 'FII Δ QoQ', align: 'right', render: (r) => <Change value={r.fiiChange} suffix="%" /> },
  ]
  return (
    <PageShell
      title="Institutional Holdings"
      category="Ownership"
      subtitle="FII / DII / promoter shareholding patterns and quarter-on-quarter flows."
      icon="solar:buildings-3-bold-duotone"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {rows.slice(0, 3).map((r) => (
          <Card key={r.symbol}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">{r.symbol}</div>
              <Change value={r.fiiChange} suffix="% FII" />
            </div>
            <div className="space-y-2.5 text-xs">
              {[['FII', r.fii, 'emerald'], ['DII', r.dii, 'amber'], ['Promoter', r.promoter, 'coral']].map(([l, v, t]) => (
                <div key={l as string}>
                  <div className="flex justify-between mb-1"><span className="text-soft">{l}</span><span className="font-semibold">{(v as number).toFixed(1)}%</span></div>
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
