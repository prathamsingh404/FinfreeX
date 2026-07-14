'use client'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Donut, StatCard, fmt, Change } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { usePortfolio, usePortfolioHoldings } from '@/lib/hooks/useMarketData'
import { useAuth } from '@/context/AuthContext'

export default function PortfolioAnalyzerPage() {
  const { user } = useAuth()
  const userId = user?.id || 'demo-user-123'

  const { data: portfolioData, loading: pfLoading } = usePortfolio(userId)
  const { data: holdingsData, loading: holdingsLoading } = usePortfolioHoldings(userId)

  const p = portfolioData || { totalValue: 0, totalPnl: 0, totalPnlPct: 0, dayChange: 0 }
  const holdings = holdingsData || []
  
  const palette = ['#34D399', '#F5B942', '#FF6B57', '#2DD4BF', '#38BDF8', '#A3E635', '#FB923C']
  
  const bySector = new Map<string, number>()
  holdings.forEach((h: any) => bySector.set(h.sector || 'Other', (bySector.get(h.sector || 'Other') ?? 0) + (h.value || 0)))
  const allocation = Array.from(bySector.entries()).map(([sector, value]) => ({ sector, value }))
  const alloc = allocation.map((a, i) => ({ value: a.value, color: palette[i % palette.length], label: a.sector }))

  type H = any
  const cols: Column<H>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-bold text-foreground">{r.symbol}</span> },
    { key: 'qty', header: 'Qty', align: 'right' },
    { key: 'value', header: 'Value', align: 'right', render: (r) => fmt(r.value, { compact: true, prefix: '₹' }) },
    { key: 'weight', header: 'Weight', align: 'right', render: (r) => r.weight ? `${r.weight.toFixed(1)}%` : '-' },
    { key: 'pnlPct', header: 'P&L', align: 'right', render: (r) => <Change value={r.pnlPct} suffix="%" /> },
  ]

  // Temporary mock for risk metrics since we don't have a backend endpoint yet
  const risk = { sharpe: 1.2, beta: 0.95 }

  return (
    <PageShell
      title="Portfolio Analyzer"
      category="Portfolio"
      subtitle="Allocation, concentration and risk decomposition for your holdings."
      icon="solar:pie-chart-2-bold-duotone"
    >
      {pfLoading || holdingsLoading ? (
        <div className="flex items-center justify-center h-64 text-soft">Loading live portfolio data...</div>
      ) : holdings.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-soft border border-dashed border-border rounded-xl">
          Connect your broker API or add manual holdings to view live analysis.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Value" value={fmt(p.totalValue, { compact: true, prefix: '₹' })} icon="solar:wallet-money-bold-duotone" change={p.dayChange} />
            <StatCard label="Total P&L" value={fmt(p.totalPnl, { compact: true, prefix: '₹' })} icon="solar:graph-up-bold-duotone" change={p.totalPnlPct} />
            <StatCard label="Sharpe Ratio" value={risk.sharpe.toFixed(2)} icon="solar:medal-ribbon-bold-duotone" />
            <StatCard label="Beta" value={risk.beta.toFixed(2)} icon="solar:tuning-2-bold-duotone" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="flex flex-col items-center border-border">
              <SectionTitle title="Sector Allocation" icon="solar:pie-chart-3-bold-duotone" />
              <Donut segments={alloc} size={180} center={<div><div className="text-lg font-bold">{allocation.length}</div><div className="text-[11px] text-soft">Sectors</div></div>} />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full text-xs">
                {alloc.map((a) => (
                  <span key={a.label} className="flex items-center gap-1.5 text-soft"><span className="w-2 h-2 rounded-full" style={{ background: a.color }} />{a.label}</span>
                ))}
              </div>
            </Card>
            <Card className="lg:col-span-2 border-border" pad={false}>
              <div className="p-5 pb-0"><SectionTitle title="Holdings" subtitle={`${holdings.length} positions`} icon="solar:list-bold-duotone" /></div>
              <div className="p-2"><DataTable columns={cols} rows={holdings} /></div>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  )
}
