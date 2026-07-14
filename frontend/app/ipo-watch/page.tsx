'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Badge, Change, fmt } from '@/components/ui/kit'
import { getIPOs } from '@/lib/featureData'

const TONE: Record<string, 'emerald' | 'amber' | 'neutral'> = { Open: 'emerald', Upcoming: 'amber', Listed: 'neutral' }

export default function IpoWatchPage() {
  const ipos = getIPOs()
  return (
    <PageShell category="Equities & Fundamentals" title="IPO Watch" subtitle="Open, upcoming, and recently listed public offerings with GMP." icon="solar:rocket-linear">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ipos.map((ipo) => (
          <Card key={ipo.name} className="space-y-4 card-hover">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-bold text-balance">{ipo.name}</div>
                <div className="text-[11px] text-muted mt-0.5">Opens {ipo.date}</div>
              </div>
              <Badge tone={TONE[ipo.status]}>{ipo.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                <div className="text-[10px] text-muted">Price Band</div>
                <div className="text-sm font-semibold">{ipo.priceBand}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                <div className="text-[10px] text-muted">Issue Size (Cr)</div>
                <div className="text-sm font-semibold tabular-nums">{fmt(ipo.size, { decimals: 0 })}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                <div className="text-[10px] text-muted">Subscription</div>
                <div className="text-sm font-semibold tabular-nums">{ipo.subscription ? `${ipo.subscription}x` : '—'}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                <div className="text-[10px] text-muted">GMP</div>
                <div className={`text-sm font-semibold ${ipo.gmp >= 0 ? 'text-emerald-bright' : 'text-coral'}`}>{ipo.gmp > 0 ? '+' : ''}₹{ipo.gmp}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
