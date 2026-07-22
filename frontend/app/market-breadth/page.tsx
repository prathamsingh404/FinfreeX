'use client'

import { useMemo } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Donut, ProgressBar } from '@/components/ui/kit'
import { useScreener } from '@/lib/hooks/useMarketData'

export default function MarketBreadthPage() {
  const { data: stocks, loading } = useScreener({})

  const breadth = useMemo(() => {
    if (!stocks || stocks.length === 0) return null
    const advances = stocks.filter((s: any) => (s.return_1m ?? 0) > 0).length
    const declines = stocks.filter((s: any) => (s.return_1m ?? 0) < 0).length
    const unchanged = stocks.length - advances - declines
    const advDecRatio = declines > 0 ? +(advances / declines).toFixed(2) : advances

    // 52W high/low approximation: stocks near their 52W high/low
    const newHighs = stocks.filter((s: any) => {
      if (!s['52w_high'] || !s.current_price) return false
      return s.current_price >= s['52w_high'] * 0.97 // within 3% of 52W high
    }).length
    const newLows = stocks.filter((s: any) => {
      if (!s['52w_low'] || !s.current_price) return false
      return s.current_price <= s['52w_low'] * 1.03 // within 3% of 52W low
    }).length

    // Use return_1m as proxy for trend participation (positive = above trend)
    const aboveMA50 = Math.round((advances / stocks.length) * 100)
    const aboveMA200 = Math.round(
      (stocks.filter((s: any) => (s.return_1y ?? 0) > 0).length / stocks.length) * 100
    )

    return { advances, declines, unchanged, advDecRatio, newHighs, newLows, aboveMA50, aboveMA200 }
  }, [stocks])

  const b = breadth || { advances: 0, declines: 0, unchanged: 0, advDecRatio: 0, newHighs: 0, newLows: 0, aboveMA50: 0, aboveMA200: 0 }

  return (
    <PageShell
      title="Market Breadth"
      category="Market Internals"
      subtitle="Advance-decline dynamics, new highs/lows and moving-average participation."
      icon="solar:chart-2-bold-duotone"
    >
      {loading && !breadth ? (
        <div className="flex items-center justify-center h-64 text-soft">Loading breadth data...</div>
      ) : (
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
                <div className="flex justify-between text-sm mb-1"><span className="text-soft">Above 50-DMA (approx)</span><span className="font-semibold">{b.aboveMA50}%</span></div>
                <ProgressBar value={b.aboveMA50} tone="emerald" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="text-soft">Above 200-DMA (approx)</span><span className="font-semibold">{b.aboveMA200}%</span></div>
                <ProgressBar value={b.aboveMA200} tone="amber" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl bg-emerald/8 border border-emerald/20 p-4"><div className="text-xs text-soft">Near 52W Highs</div><div className="text-2xl font-bold text-emerald-bright mt-1">{b.newHighs}</div></div>
                <div className="rounded-xl bg-coral/8 border border-coral/20 p-4"><div className="text-xs text-soft">Near 52W Lows</div><div className="text-2xl font-bold text-coral mt-1">{b.newLows}</div></div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  )
}
