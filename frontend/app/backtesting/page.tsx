'use client'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, StatCard, Btn, fmt } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { getBacktest } from '@/lib/featureData'

export default function BacktestingPage() {
  const bt = getBacktest()
  return (
    <PageShell
      title="Backtesting Engine"
      category="Strategy Lab"
      subtitle="Simulate strategies over historical data with full performance analytics."
      icon="solar:history-2-bold-duotone"
      actions={<Btn variant="primary">Run Backtest</Btn>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Return" value={`${bt.totalReturn.toFixed(1)}%`} icon="solar:graph-up-bold-duotone" change={bt.totalReturn} />
        <StatCard label="CAGR" value={`${bt.cagr.toFixed(1)}%`} icon="solar:chart-2-bold-duotone" />
        <StatCard label="Sharpe" value={bt.sharpe.toFixed(2)} icon="solar:medal-ribbon-bold-duotone" />
        <StatCard label="Max Drawdown" value={`${bt.maxDD.toFixed(1)}%`} icon="solar:graph-down-bold-duotone" />
      </div>
      <Card className="mb-6">
        <SectionTitle title="Equity Curve" subtitle="Starting capital ₹1,00,000" icon="solar:chart-square-bold-duotone" />
        <AreaChart data={bt.equity} height={280} up />
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Win Rate', `${bt.winRate.toFixed(1)}%`], ['Total Trades', String(bt.trades)], ['Profit Factor', bt.profitFactor.toFixed(2)], ['Final Equity', fmt(bt.equity[bt.equity.length - 1], { compact: true, prefix: '₹' })]].map(([l, v]) => (
          <Card key={l} className="text-center">
            <div className="text-2xl font-bold tabular-nums">{v}</div>
            <div className="text-[11px] text-soft mt-1">{l}</div>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
