'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, ProgressBar, fmt } from '@/components/ui/kit'
import { getREITs } from '@/lib/featureData'

export default function ReitAnalyzerPage() {
  const reits = getREITs()
  return (
    <PageShell category="Assets & Funds" title="REIT Analyzer" subtitle="Yields, occupancy, and NAV premiums across listed REITs." icon="solar:buildings-linear">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {reits.map((r) => (
          <Card key={r.name} className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-bold">{r.name}</div>
                <div className="text-[11px] text-muted">Real Estate Investment Trust</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold tabular-nums">₹{fmt(r.price)}</div>
                <Change value={r.changePct} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                <div className="text-[10px] text-muted">Dist. Yield</div>
                <div className="text-lg font-bold text-emerald-bright">{r.yield}%</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                <div className="text-[10px] text-muted">NOI (Cr)</div>
                <div className="text-lg font-bold tabular-nums">{fmt(r.noi, { decimals: 0 })}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                <div className="text-[10px] text-muted">NAV Prem.</div>
                <div className={`text-lg font-bold ${r.navPremium >= 0 ? 'text-emerald-bright' : 'text-coral'}`}>{r.navPremium > 0 ? '+' : ''}{r.navPremium}%</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-soft">Occupancy</span><span className="tabular-nums">{r.occupancy}%</span></div>
              <ProgressBar value={r.occupancy} />
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
