'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge, Sparkline, ProgressBar, fmt } from '@/components/ui/kit'
import { getSectorPerformance, getSparkline } from '@/lib/mockData'

const SECTOR_ICONS: Record<string, string> = {
  Technology: 'solar:laptop-linear',
  Financials: 'solar:bank-linear',
  Energy: 'solar:bolt-linear',
  Healthcare: 'solar:health-linear',
  'Consumer Disc.': 'solar:cart-large-2-linear',
  'Consumer Staples': 'solar:bag-smile-linear',
  Industrials: 'solar:buildings-2-linear',
  Materials: 'solar:layers-minimalistic-linear',
  Utilities: 'solar:socket-linear',
  Communication: 'solar:phone-rounded-linear',
}

export default function SectorsPage() {
  const sectors = getSectorPerformance()
  const best = sectors[0]
  const worst = sectors[sectors.length - 1]
  const maxCap = Math.max(...sectors.map((s) => s.marketCap))

  return (
    <PageShell
      category="Equities & Fundamentals"
      title="Sector Intelligence"
      subtitle="Rotation, momentum, and relative strength across every market sector."
      icon="solar:layers-linear"
    >
      {/* Heatmap grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {sectors.map((s) => {
          const up = s.changePct >= 0
          return (
            <div key={s.name} className={`glass-card card-hover p-4 border-l-2 ${up ? 'border-emerald' : 'border-coral'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${up ? 'bg-emerald/12 text-emerald-bright' : 'bg-coral/12 text-coral'}`}>
                  <iconify-icon icon={SECTOR_ICONS[s.name] ?? 'solar:layers-linear'} width="16"></iconify-icon>
                </div>
              </div>
              <div className="text-xs font-semibold text-soft truncate">{s.name}</div>
              <div className="mt-1"><Change value={s.changePct} /></div>
              <div className="mt-2"><Sparkline data={getSparkline('sector-' + s.name)} up={up} width={160} height={28} /></div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionTitle title="Sector Leaderboard" subtitle="Ranked by daily performance" icon="solar:ranking-linear" />
          <div className="space-y-3">
            {sectors.map((s, i) => (
              <div key={s.name} className="flex items-center gap-4">
                <span className="text-xs text-muted w-5 tabular-nums">{i + 1}</span>
                <div className="flex items-center gap-2 w-40 shrink-0">
                  <iconify-icon icon={SECTOR_ICONS[s.name] ?? 'solar:layers-linear'} width="16" className="text-emerald-bright"></iconify-icon>
                  <span className="text-sm font-medium truncate">{s.name}</span>
                </div>
                <div className="flex-1"><ProgressBar value={(s.marketCap / maxCap) * 100} tone={s.changePct >= 0 ? 'emerald' : 'coral'} /></div>
                <span className="text-xs text-soft w-16 text-right tabular-nums">P/E {s.pe}</span>
                <div className="w-20 text-right"><Change value={s.changePct} showArrow={false} /></div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionTitle title="Top Performer" icon="solar:cup-star-linear" />
            <div className="text-lg font-bold">{best.name}</div>
            <Change value={best.changePct} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {best.leaders.map((l) => <Badge key={l} tone="emerald">{l}</Badge>)}
            </div>
          </Card>
          <Card>
            <SectionTitle title="Laggard" icon="solar:graph-down-linear" />
            <div className="text-lg font-bold">{worst.name}</div>
            <Change value={worst.changePct} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {worst.leaders.map((l) => <Badge key={l} tone="coral">{l}</Badge>)}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
