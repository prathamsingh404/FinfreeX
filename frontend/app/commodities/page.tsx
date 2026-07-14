'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, Change, fmt } from '@/components/ui/kit'
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

export default function CommoditiesPage() {
  const { data: itemsData, loading } = useCommodities()
  const items = itemsData || []

  return (
    <PageShell category="Assets & Funds" title="Commodities" subtitle="Spot prices and momentum across metals and energy." icon="solar:gold-linear">
      {loading ? (
        <div className="flex items-center justify-center h-48 text-soft">Fetching live commodities data...</div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-soft">No commodities data found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((c) => {
            const up = c.change_pct >= 0
            return (
              <Card key={c.symbol} className="flex flex-col gap-3 border-border">
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${up ? 'bg-primary/12 text-primary' : 'bg-coral/12 text-coral'}`}>
                    <iconify-icon icon={ICONS[c.name] ?? 'solar:box-linear'} width="18"></iconify-icon>
                  </div>
                  <Change value={c.change_pct} />
                </div>
                <div>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-[11px] text-muted">{c.symbol} · {c.unit}</div>
                </div>
                <div className="text-2xl font-bold tabular-nums">${fmt(c.price)}</div>
              </Card>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
