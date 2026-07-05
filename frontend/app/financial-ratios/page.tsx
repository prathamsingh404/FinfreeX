'use client'
import PageShell from '@/components/PageShell'
import { Card } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getRatios } from '@/lib/featureData'

type Row = ReturnType<typeof getRatios>[number]

export default function FinancialRatiosPage() {
  const rows = getRatios()
  const cols: Column<Row>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-bold text-foreground">{r.symbol}</span> },
    { key: 'sector', header: 'Sector', className: 'text-soft' },
    { key: 'pe', header: 'P/E', align: 'right', render: (r) => r.pe.toFixed(1) },
    { key: 'pb', header: 'P/B', align: 'right', render: (r) => r.pb.toFixed(1) },
    { key: 'roe', header: 'ROE %', align: 'right', render: (r) => <span className="text-emerald-bright font-semibold">{r.roe.toFixed(1)}</span> },
    { key: 'roce', header: 'ROCE %', align: 'right', render: (r) => r.roce.toFixed(1) },
    { key: 'debtEquity', header: 'D/E', align: 'right', render: (r) => r.debtEquity.toFixed(2) },
    { key: 'netMargin', header: 'Net Margin %', align: 'right', render: (r) => r.netMargin.toFixed(1) },
    { key: 'evEbitda', header: 'EV/EBITDA', align: 'right', render: (r) => r.evEbitda.toFixed(1) },
  ]
  return (
    <PageShell
      title="Financial Ratios"
      category="Fundamentals"
      subtitle="Valuation, profitability and leverage ratios across the coverage universe."
      icon="solar:calculator-bold-duotone"
    >
      <Card pad={false} className="p-2">
        <DataTable columns={cols} rows={rows} />
      </Card>
    </PageShell>
  )
}
