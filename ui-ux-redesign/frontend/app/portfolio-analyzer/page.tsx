'use client'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Donut, StatCard, fmt, Change } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getPortfolio } from '@/lib/mockData'
import { getRiskMetrics } from '@/lib/featureData'

export default function PortfolioAnalyzerPage() {
  const p = getPortfolio()
  const risk = getRiskMetrics()
  const palette = ['#34D399', '#F5B942', '#FF6B57', '#2DD4BF', '#38BDF8', '#A3E635', '#FB923C']
  const bySector = new Map<string, number>()
  p.holdings.forEach((h) => bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.value))
  const allocation = Array.from(bySector.entries()).map(([sector, value]) => ({ sector, value }))
  const alloc = allocation.map((a, i) => ({ value: a.value, color: palette[i % palette.length], label: a.sector }))

  type H = typeof p.holdings[number]
  const cols: Column<H>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-bold text-foreground">{r.symbol}</span> },
    { key: 'qty', header: 'Qty', align: 'right' },
    { key: 'value', header: 'Value', align: 'right', render: (r) => fmt(r.value, { compact: true, prefix: '₹' }) },
    { key: 'weight', header: 'Weight', align: 'right', render: (r) => `${r.weight.toFixed(1)}%` },
    { key: 'pnlPct', header: 'P&L', align: 'right', render: (r) => <Change value={r.pnlPct} suffix="%" /> },
  ]

  return (
    <PageShell
      title="Portfolio Analyzer"
      category="Portfolio"
      subtitle="Allocation, concentration and risk decomposition for your holdings."
      icon="solar:pie-chart-2-bold-duotone"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Value" value={fmt(p.totalValue, { compact: true, prefix: '₹' })} icon="solar:wallet-money-bold-duotone" change={p.dayChange} />
        <StatCard label="Total P&L" value={fmt(p.totalPnl, { compact: true, prefix: '₹' })} icon="solar:graph-up-bold-duotone" change={p.totalPnlPct} />
        <StatCard label="Sharpe Ratio" value={risk.sharpe.toFixed(2)} icon="solar:medal-ribbon-bold-duotone" />
        <StatCard label="Beta" value={risk.beta.toFixed(2)} icon="solar:tuning-2-bold-duotone" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center">
          <SectionTitle title="Sector Allocation" icon="solar:pie-chart-3-bold-duotone" />
          <Donut segments={alloc} size={180} center={<div><div className="text-lg font-bold">{allocation.length}</div><div className="text-[11px] text-soft">Sectors</div></div>} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full text-xs">
            {alloc.map((a) => (
              <span key={a.label} className="flex items-center gap-1.5 text-soft"><span className="w-2 h-2 rounded-full" style={{ background: a.color }} />{a.label}</span>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2" pad={false}>
          <div className="p-5 pb-0"><SectionTitle title="Holdings" subtitle={`${p.holdings.length} positions`} icon="solar:list-bold-duotone" /></div>
          <div className="p-2"><DataTable columns={cols} rows={p.holdings} /></div>
        </Card>
      </div>
    </PageShell>
  )
}
