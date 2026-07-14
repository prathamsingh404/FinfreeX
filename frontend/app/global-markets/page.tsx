'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge, fmt } from '@/components/ui/kit'
import { useIndices, useForex, useCommodities } from '@/lib/hooks/useMarketData'

export default function GlobalMarketsPage() {
  const { data: indicesData } = useIndices()
  const { data: forexData } = useForex()
  const { data: commoditiesData } = useCommodities()

  const indices = indicesData ? Object.entries(indicesData).map(([name, data]) => ({ name, ...data })) : []
  const fx = forexData?.slice(0, 6) || []
  const commodities = commoditiesData?.slice(0, 6) || []
  
  // Use categories from the backend instead of static regions
  const categories = Array.from(new Set(indices.map(i => i.category)))

  return (
    <PageShell
      category="Market & Economics"
      title="Global Markets"
      subtitle="A worldwide view of indices, currencies, and commodities in real time."
      icon="solar:globe-linear"
    >
      {categories.map((category) => {
        const list = indices.filter((i) => i.category === category)
        if (!list.length) return null
        return (
          <div key={category} className="mb-6">
            <SectionTitle title={category} icon="solar:map-point-linear" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {list.map((idx) => (
                <Card key={idx.name} className="flex flex-col gap-2 border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{idx.name}</span>
                    <Badge tone={idx.change_pct >= 0 ? 'emerald' : 'coral'}>{idx.category}</Badge>
                  </div>
                  <div className="text-xl font-bold tabular-nums">{fmt(idx.price, { decimals: 0 })}</div>
                  <Change value={idx.change_pct} />
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <SectionTitle title="Currencies" subtitle="Major FX pairs" icon="solar:dollar-linear" />
          <div className="space-y-1">
            {fx.length > 0 ? fx.map((p) => (
              <div key={p.pair} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm font-medium">{p.pair}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm tabular-nums">{p.rate}</span>
                  <div className="w-20 text-right"><Change value={p.change_pct} showArrow={false} /></div>
                </div>
              </div>
            )) : (
              <div className="py-4 text-center text-sm text-muted">Loading currencies...</div>
            )}
          </div>
        </Card>
        <Card className="border-border">
          <SectionTitle title="Commodities" subtitle="Spot prices" icon="solar:gold-linear" />
          <div className="space-y-1">
            {commodities.length > 0 ? commodities.map((c) => (
              <div key={c.symbol} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-[11px] text-muted ml-1">{c.unit}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm tabular-nums">${fmt(c.price)}</span>
                  <div className="w-20 text-right"><Change value={c.change_pct} showArrow={false} /></div>
                </div>
              </div>
            )) : (
              <div className="py-4 text-center text-sm text-muted">Loading commodities...</div>
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
