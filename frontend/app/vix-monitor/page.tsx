'use client'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { getVolatility } from '@/lib/featureData'

export default function VixMonitorPage() {
  const vol = getVolatility()
  return (
    <PageShell
      title="Volatility Monitor"
      category="Risk"
      subtitle="India VIX levels, term structure and volatility regime classification."
      icon="solar:pulse-bold-duotone"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between">
          <SectionTitle title="India VIX" icon="solar:pulse-2-bold-duotone" />
          <div>
            <div className="text-5xl font-extrabold tabular-nums">{vol.vix.toFixed(2)}</div>
            <div className="mt-2"><Change value={vol.change} suffix="%" /></div>
            <div className="mt-4"><Badge tone={vol.vix < 15 ? 'emerald' : vol.vix < 20 ? 'amber' : 'coral'}>{vol.regime}</Badge></div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle title="VIX History" subtitle="Trailing sessions" icon="solar:chart-square-bold-duotone" />
          <AreaChart data={vol.history} height={240} up={false} />
        </Card>
      </div>
    </PageShell>
  )
}
