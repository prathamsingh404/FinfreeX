'use client'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Donut, ProgressBar } from '@/components/ui/kit'
import { getBreadth } from '@/lib/featureData'

export default function MarketBreadthPage() {
  const b = getBreadth()
  return (
    <PageShell
      title="Market Breadth"
      category="Market Internals"
      subtitle="Advance-decline dynamics, new highs/lows and moving-average participation."
      icon="solar:chart-2-bold-duotone"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center">
          <SectionTitle title="Advances vs Declines" icon="solar:pie-chart-2-bold-duotone" />
          <Donut
            size={180}
            segments={[
              { value: b.advances, color: '#34D399' },
              { value: b.declines, color: '#FF6B57' },
              { value: b.unchanged, color: '#F5B942' },
            ]}
            center={<div><div className="text-2xl font-bold">{b.advDecRatio}</div><div className="text-[11px] text-soft">A/D Ratio</div></div>}
          />
          <div className="flex gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald" />Adv {b.advances}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-coral" />Dec {b.declines}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber" />Unch {b.unchanged}</span>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle title="Participation" icon="solar:ranking-bold-duotone" />
          <div className="space-y-5 mt-2">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-soft">Above 50-DMA</span><span className="font-semibold">{b.aboveMA50}%</span></div>
              <ProgressBar value={b.aboveMA50} tone="emerald" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-soft">Above 200-DMA</span><span className="font-semibold">{b.aboveMA200}%</span></div>
              <ProgressBar value={b.aboveMA200} tone="amber" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl bg-emerald/8 border border-emerald/20 p-4"><div className="text-xs text-soft">New 52W Highs</div><div className="text-2xl font-bold text-emerald-bright mt-1">{b.newHighs}</div></div>
              <div className="rounded-xl bg-coral/8 border border-coral/20 p-4"><div className="text-xs text-soft">New 52W Lows</div><div className="text-2xl font-bold text-coral mt-1">{b.newLows}</div></div>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
