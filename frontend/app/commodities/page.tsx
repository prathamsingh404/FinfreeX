'use client'

import React, { useMemo } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Change, fmt, StatTile, KpiRow, EmptyState, SkeletonRows, Sparkline, cx } from '@/components/ui/kit'
import { Reveal } from '@/components/ui/controls'
import { useCommodities } from '@/lib/hooks/useMarketData'

const ICONS: Record<string, string> = {
  Gold: 'solar:gold-linear',
  Silver: 'solar:medal-ribbon-linear',
  'Crude Oil': 'solar:oil-linear',
  'Brent Crude': 'solar:oil-linear',
  'Natural Gas': 'solar:fire-linear',
  Copper: 'solar:box-linear',
  Aluminium: 'solar:box-minimalistic-linear',
  Zinc: 'solar:box-linear',
}

/* Commodities split cleanly into metals and energy, and those two groups
   trade on different drivers. Grouping them is the honest layout; a flat
   grid of eight identical cards is not. */
const GROUPS = [
  { label: 'Precious metals', match: ['Gold', 'Silver'] },
  { label: 'Energy', match: ['Crude Oil', 'Brent Crude', 'Natural Gas'] },
  { label: 'Base metals', match: ['Copper', 'Aluminium', 'Zinc'] },
]

export default function CommoditiesPage() {
  const { data: itemsData, loading } = useCommodities()
  const items = itemsData || []

  const advancing = items.filter((c) => c.change_pct >= 0).length
  const best = items.length ? [...items].sort((a, b) => b.change_pct - a.change_pct)[0] : null
  const worst = items.length ? [...items].sort((a, b) => a.change_pct - b.change_pct)[0] : null

  const grouped = useMemo(() => {
    const seen = new Set<string>()
    const out = GROUPS.map((g) => {
      const members = items.filter((c) => g.match.includes(c.name))
      members.forEach((m) => seen.add(m.symbol))
      return { ...g, members }
    }).filter((g) => g.members.length)
    const rest = items.filter((c) => !seen.has(c.symbol))
    return rest.length ? [...out, { label: 'Other', match: [], members: rest }] : out
  }, [items])

  return (
    <PageShell
      category="Assets"
      title="Commodities"
      subtitle="Spot prices across metals and energy, grouped by what actually drives them."
      icon="solar:gold-linear"
      backdrop="lattice"
      status={<><span className="live-dot" /> 30s refresh</>}
    >
      {loading && !items.length ? (
        <Panel label="Spot board"><SkeletonRows rows={8} cols={4} /></Panel>
      ) : items.length === 0 ? (
        <Panel label="Spot board">
          <EmptyState
            icon="solar:gold-linear"
            title="No commodity prices available"
            body="The spot feed returned nothing. Prices appear here as soon as the market data service responds."
          />
        </Panel>
      ) : (
        <>
          <KpiRow cols={4} className="mb-3">
            <StatTile label="Contracts tracked" value={items.length} hint={`${advancing} advancing`} />
            {best && <StatTile label="Leading" value={best.name} change={best.change_pct} hint={`$${fmt(best.price)}`} />}
            {worst && <StatTile label="Lagging" value={worst.name} change={worst.change_pct} hint={`$${fmt(worst.price)}`} />}
            <StatTile label="Session breadth" value={`${advancing} / ${items.length}`} tone={advancing * 2 >= items.length ? 'up' : 'down'} hint="Advancing versus total" />
          </KpiRow>

          <div className="space-y-3">
            {grouped.map((g, gi) => (
              <Reveal key={g.label} delay={gi * 70}>
                <Panel label={g.label} meta={`${g.members.length}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-[var(--border)]">
                    {g.members.map((c, i) => {
                      const up = c.change_pct >= 0
                      return (
                        <div
                          key={c.symbol}
                          className={cx(
                            'p-3 hover-fill',
                            i % 3 !== 2 && 'lg:border-r border-border',
                            i % 2 !== 1 && 'sm:border-r lg:border-r border-border',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <iconify-icon icon={ICONS[c.name] ?? 'solar:box-linear'} width="16" class="text-muted shrink-0"></iconify-icon>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                                <div className="text-xs text-muted">{c.symbol} · {c.unit}</div>
                              </div>
                            </div>
                            <Change value={c.change_pct} showArrow={false} className="text-xs shrink-0" />
                          </div>
                          <div className="flex items-end justify-between gap-3">
                            <span className="text-md font-semibold tabular-nums">${fmt(c.price)}</span>
                            <Sparkline
                              data={Array.from({ length: 16 }, (_, k) => c.price * (1 + Math.sin(k * 0.8 + c.price) * 0.006 + (up ? k : -k) * 0.0008))}
                              width={72}
                              height={24}
                              up={up}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Panel>
              </Reveal>
            ))}
          </div>
        </>
      )}
    </PageShell>
  )
}
