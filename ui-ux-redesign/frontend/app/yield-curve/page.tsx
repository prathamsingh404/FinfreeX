'use client'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getYieldCurve } from '@/lib/featureData'

type Row = ReturnType<typeof getYieldCurve>[number]

export default function YieldCurvePage() {
  const curve = getYieldCurve()
  const cols: Column<Row>[] = [
    { key: 'tenor', header: 'Tenor', render: (r) => <span className="font-bold text-foreground">{r.tenor}</span> },
    { key: 'yield', header: 'Yield %', align: 'right', render: (r) => <span className="font-semibold tabular-nums">{r.yield.toFixed(2)}</span> },
  ]
  const spread = (curve[curve.length - 1].yield - curve[0].yield).toFixed(2)
  return (
    <PageShell
      title="Yield Curve"
      category="Fixed Income"
      subtitle="Sovereign term structure across tenors with steepness and spread analytics."
      icon="solar:graph-up-bold-duotone"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionTitle title="G-Sec Term Structure" subtitle={`3M → 30Y · Curve spread ${spread}%`} icon="solar:chart-2-bold-duotone" />
          <AreaChart data={curve.map((c) => c.yield)} labels={curve.map((c) => c.tenor)} height={280} up />
        </Card>
        <Card pad={false} className="p-2">
          <DataTable columns={cols} rows={curve} dense />
        </Card>
      </div>
    </PageShell>
  )
}
