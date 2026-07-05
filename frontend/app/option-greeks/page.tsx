'use client'
import PageShell from '@/components/PageShell'
import { Card } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getGreeksTable } from '@/lib/featureData'

type Row = ReturnType<typeof getGreeksTable>[number]

export default function OptionGreeksPage() {
  const rows = getGreeksTable('NIFTY')
  const cols: Column<Row>[] = [
    { key: 'strike', header: 'Strike', render: (r) => <span className="font-bold text-foreground">{r.strike}</span> },
    { key: 'delta', header: 'Delta', align: 'right', render: (r) => <span className={r.delta >= 0 ? 'text-emerald-bright' : 'text-coral'}>{r.delta.toFixed(2)}</span> },
    { key: 'gamma', header: 'Gamma', align: 'right', render: (r) => r.gamma.toFixed(4) },
    { key: 'theta', header: 'Theta', align: 'right', render: (r) => <span className="text-coral">{r.theta.toFixed(2)}</span> },
    { key: 'vega', header: 'Vega', align: 'right', render: (r) => r.vega.toFixed(2) },
    { key: 'rho', header: 'Rho', align: 'right', render: (r) => r.rho.toFixed(2) },
    { key: 'iv', header: 'IV %', align: 'right', render: (r) => <span className="font-semibold text-amber">{r.iv.toFixed(1)}</span> },
  ]
  return (
    <PageShell
      title="Option Greeks"
      category="Derivatives"
      subtitle="Delta, gamma, theta, vega and implied volatility across the NIFTY strike ladder."
      icon="solar:calculator-minimalistic-bold-duotone"
    >
      <Card pad={false} className="p-2">
        <DataTable columns={cols} rows={rows} />
      </Card>
    </PageShell>
  )
}
