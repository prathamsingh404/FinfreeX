'use client'
import PageShell from '@/components/PageShell'
import { Card, Badge, Change } from '@/components/ui/kit'
import { getDerivHeatmap } from '@/lib/featureData'

export default function DerivativesHeatmapPage() {
  const rows = getDerivHeatmap()
  const toneFor: Record<string, 'emerald' | 'coral' | 'amber' | 'neutral'> = {
    'Long Buildup': 'emerald', 'Short Covering': 'emerald', 'Short Buildup': 'coral', 'Long Unwinding': 'coral',
  }
  return (
    <PageShell
      title="Derivatives Heatmap"
      category="Derivatives"
      subtitle="Open-interest build-up, price action and put-call ratios across F&O names."
      icon="solar:widget-5-bold-duotone"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rows.map((r) => (
          <Card key={r.symbol} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold">{r.symbol}</span>
              <Change value={r.priceChange} suffix="%" />
            </div>
            <div className="flex items-center justify-between text-xs text-soft">
              <span>OI Change</span>
              <span className={r.oiChange >= 0 ? 'text-emerald-bright font-semibold' : 'text-coral font-semibold'}>{r.oiChange >= 0 ? '+' : ''}{r.oiChange.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-soft">
              <span>PCR</span><span className="font-semibold text-foreground">{r.pcr.toFixed(2)}</span>
            </div>
            <Badge tone={toneFor[r.buildup] ?? 'neutral'} className="self-start">{r.buildup}</Badge>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
