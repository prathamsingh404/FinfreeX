'use client'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, StatCard, ProgressBar, Badge } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { getRatios } from '@/lib/featureData'
import { getSparkline } from '@/lib/mockData'

export default function FundamentalAnalysisPage() {
  const company = getRatios()[0]
  const revenue = getSparkline('fa-rev', 8).map((v, i) => 100 + i * 12 + v / 5)
  return (
    <PageShell
      title="Fundamental Analysis"
      category="Fundamentals"
      subtitle={`Deep-dive financial health snapshot — ${company.name} (${company.symbol}).`}
      icon="solar:document-text-bold-duotone"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="P/E Ratio" value={company.pe.toFixed(1)} icon="solar:tag-price-bold-duotone" />
        <StatCard label="ROE" value={`${company.roe.toFixed(1)}%`} icon="solar:chart-bold-duotone" change={2.4} />
        <StatCard label="Net Margin" value={`${company.netMargin.toFixed(1)}%`} icon="solar:wallet-money-bold-duotone" />
        <StatCard label="EV/EBITDA" value={company.evEbitda.toFixed(1)} icon="solar:pie-chart-2-bold-duotone" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionTitle title="Revenue Trend" subtitle="8-quarter trajectory (indexed)" icon="solar:graph-up-bold-duotone" />
          <AreaChart data={revenue} height={240} up />
        </Card>
        <Card>
          <SectionTitle title="Financial Health" icon="solar:health-bold-duotone" />
          <div className="space-y-4 mt-2 text-sm">
            {[['Profitability', company.roe * 2.5], ['Solvency', 100 - company.debtEquity * 30], ['Efficiency', company.roce * 2.4], ['Valuation', 100 - company.pe]].map(([l, v]) => (
              <div key={l as string}>
                <div className="flex justify-between mb-1"><span className="text-soft">{l}</span><span className="font-semibold">{Math.max(0, Math.min(100, v as number)).toFixed(0)}</span></div>
                <ProgressBar value={Math.max(0, Math.min(100, v as number))} tone="emerald" />
              </div>
            ))}
            <Badge tone="emerald" className="mt-2">Overall: Strong Fundamentals</Badge>
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
