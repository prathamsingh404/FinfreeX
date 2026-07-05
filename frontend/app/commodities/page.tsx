'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Sparkline, fmt } from '@/components/ui/kit'
import { getCommodities, getSparkline } from '@/lib/mockData'

const ICONS: Record<string, string> = {
  Gold: 'solar:gold-linear', Silver: 'solar:medal-ribbon-linear',
  'Crude Oil (WTI)': 'solar:oil-linear', 'Brent Crude': 'solar:oil-linear',
  'Natural Gas': 'solar:fire-linear', Copper: 'solar:box-linear',
  Aluminium: 'solar:box-minimalistic-linear', Zinc: 'solar:box-linear',
}

export default function CommoditiesPage() {
  const items = getCommodities()
  return (
    <PageShell category="Assets & Funds" title="Commodities" subtitle="Spot prices and momentum across metals and energy." icon="solar:gold-linear">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((c) => {
          const up = c.changePct >= 0
          return (
            <Card key={c.symbol} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${up ? 'bg-emerald/12 text-emerald-bright' : 'bg-coral/12 text-coral'}`}>
                  <iconify-icon icon={ICONS[c.name] ?? 'solar:box-linear'} width="18"></iconify-icon>
                </div>
                <Change value={c.changePct} />
              </div>
              <div>
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="text-[11px] text-muted">{c.symbol} · {c.unit}</div>
              </div>
              <div className="text-2xl font-bold tabular-nums">${fmt(c.price)}</div>
              <Sparkline data={getSparkline('cmdty-' + c.symbol)} up={up} width={240} height={38} />
            </Card>
          )
        })}
      </div>
    </PageShell>
  )
}
