'use client'
import PageShell from '@/components/PageShell'
import { StatCard, Card, SectionTitle } from '@/components/ui/kit'
import { getRiskMetrics } from '@/lib/featureData'

export default function RiskCalculatorPage() {
  const m = getRiskMetrics()
  return (
    <PageShell
      title="Risk Management"
      category="Risk"
      subtitle="Portfolio risk decomposition — VaR, drawdown, beta and risk-adjusted returns."
      icon="solar:shield-warning-bold-duotone"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="VaR (95%)" value={`${m.var95.toFixed(2)}%`} icon="solar:danger-triangle-bold-duotone" />
        <StatCard label="VaR (99%)" value={`${m.var99.toFixed(2)}%`} icon="solar:danger-bold-duotone" />
        <StatCard label="Max Drawdown" value={`${m.maxDrawdown.toFixed(1)}%`} icon="solar:graph-down-bold-duotone" />
        <StatCard label="Volatility" value={`${m.volatility.toFixed(1)}%`} icon="solar:pulse-bold-duotone" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle title="Risk-Adjusted Returns" icon="solar:medal-ribbon-bold-duotone" />
          <div className="grid grid-cols-3 gap-4 mt-2">
            {[['Sharpe', m.sharpe], ['Sortino', m.sortino], ['Alpha', m.alpha]].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-emerald/8 border border-emerald/20 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-bright tabular-nums">{(v as number).toFixed(2)}</div>
                <div className="text-[11px] text-soft mt-1">{l}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Market Sensitivity" icon="solar:tuning-2-bold-duotone" />
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <div className="text-2xl font-bold tabular-nums">{m.beta.toFixed(2)}</div>
              <div className="text-[11px] text-soft mt-1">Portfolio Beta</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <div className="text-2xl font-bold tabular-nums text-amber">{m.volatility.toFixed(1)}%</div>
              <div className="text-[11px] text-soft mt-1">Annualized Vol</div>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
