'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge, Sparkline, fmt } from '@/components/ui/kit'
import { getIndices, getForex, getCommodities, getSparkline } from '@/lib/mockData'

export default function GlobalMarketsPage() {
  const indices = getIndices()
  const fx = getForex().slice(0, 6)
  const commodities = getCommodities().slice(0, 6)
  const regions = ['India', 'US', 'Europe', 'Asia']

  return (
    <PageShell
      category="Market & Economics"
      title="Global Markets"
      subtitle="A worldwide view of indices, currencies, and commodities in real time."
      icon="solar:globe-linear"
    >
      {regions.map((region) => {
        const list = indices.filter((i) => i.region === region)
        if (!list.length) return null
        return (
          <div key={region} className="mb-6">
            <SectionTitle title={region} icon="solar:map-point-linear" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {list.map((idx) => (
                <Card key={idx.symbol} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{idx.name}</span>
                    <Badge tone={idx.changePct >= 0 ? 'emerald' : 'coral'}>{idx.symbol}</Badge>
                  </div>
                  <div className="text-xl font-bold tabular-nums">{fmt(idx.value, { decimals: 0 })}</div>
                  <Change value={idx.changePct} />
                  <Sparkline data={getSparkline('idx-' + idx.symbol)} up={idx.changePct >= 0} width={220} height={34} />
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle title="Currencies" subtitle="Major FX pairs" icon="solar:dollar-linear" />
          <div className="space-y-1">
            {fx.map((p) => (
              <div key={p.pair} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm font-medium">{p.pair}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm tabular-nums">{p.rate}</span>
                  <div className="w-20 text-right"><Change value={p.changePct} showArrow={false} /></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Commodities" subtitle="Spot prices" icon="solar:gold-linear" />
          <div className="space-y-1">
            {commodities.map((c) => (
              <div key={c.symbol} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-[11px] text-muted ml-1">{c.unit}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm tabular-nums">${fmt(c.price)}</span>
                  <div className="w-20 text-right"><Change value={c.changePct} showArrow={false} /></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
