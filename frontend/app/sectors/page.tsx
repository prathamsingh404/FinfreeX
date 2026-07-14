'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge, ProgressBar, fmt } from '@/components/ui/kit'
import { useSectors } from '@/lib/hooks/useMarketData'

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
  const { data, loading } = useSectors()
  const sectors = data || []
  
  const best = sectors.length > 0 ? sectors.reduce((prev, curr) => (curr.changePct > prev.changePct ? curr : prev)) : null
  const worst = sectors.length > 0 ? sectors.reduce((prev, curr) => (curr.changePct < prev.changePct ? curr : prev)) : null
  const maxCap = sectors.length > 0 ? Math.max(...sectors.map((s) => s.marketCap || 0)) : 1

  return (
    <PageShell
      category="Equities & Fundamentals"
      title="Sector Intelligence"
      subtitle="Rotation, momentum, and relative strength across every market sector."
      icon="solar:layers-linear"
    >
      {loading ? (
        <div className="flex items-center justify-center h-48 text-soft">Loading sector performance...</div>
      ) : sectors.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-soft border border-dashed border-border rounded-xl">
          Live sector API not yet connected.
        </div>
      ) : (
        <>
          {/* Heatmap grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {sectors.map((s) => {
              const up = s.changePct >= 0
              return (
                <div key={s.name} className={`glass-card p-4 border-l-2 ${up ? 'border-primary' : 'border-coral'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${up ? 'bg-primary/12 text-primary' : 'bg-coral/12 text-coral'}`}>
                      <iconify-icon icon={SECTOR_ICONS[s.name] ?? 'solar:layers-linear'} width="16"></iconify-icon>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-soft truncate">{s.name}</div>
                  <div className="mt-1"><Change value={s.changePct} /></div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border">
              <SectionTitle title="Sector Leaderboard" subtitle="Ranked by daily performance" icon="solar:ranking-linear" />
              <div className="space-y-3">
                {sectors.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-4">
                    <span className="text-xs text-muted w-5 tabular-nums">{i + 1}</span>
                    <div className="flex items-center gap-2 w-40 shrink-0">
                      <iconify-icon icon={SECTOR_ICONS[s.name] ?? 'solar:layers-linear'} width="16" className="text-primary"></iconify-icon>
                      <span className="text-sm font-medium truncate">{s.name}</span>
                    </div>
                    <div className="flex-1"><ProgressBar value={(s.marketCap / maxCap) * 100} tone={s.changePct >= 0 ? 'primary' : 'coral'} /></div>
                    <span className="text-xs text-soft w-16 text-right tabular-nums">P/E {s.pe || '-'}</span>
                    <div className="w-20 text-right"><Change value={s.changePct} showArrow={false} /></div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-6">
              {best && (
                <Card className="border-border">
                  <SectionTitle title="Top Performer" icon="solar:cup-star-linear" />
                  <div className="text-lg font-bold">{best.name}</div>
                  <Change value={best.changePct} />
                  {best.leaders && best.leaders.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {best.leaders.map((l: string) => <Badge key={l} tone="primary">{l}</Badge>)}
                    </div>
                  )}
                </Card>
              )}
              {worst && (
                <Card className="border-border">
                  <SectionTitle title="Laggard" icon="solar:graph-down-linear" />
                  <div className="text-lg font-bold">{worst.name}</div>
                  <Change value={worst.changePct} />
                  {worst.leaders && worst.leaders.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {worst.leaders.map((l: string) => <Badge key={l} tone="coral">{l}</Badge>)}
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </PageShell>
  )
}
