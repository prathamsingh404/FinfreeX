'use client'

import React from 'react'
import Link from 'next/link'
import MarketTicker from '@/components/home/MarketTicker'
import { Card, Change, Badge, Btn } from '@/components/ui/kit'
import { useMovers, useIndices } from '@/lib/hooks/useMarketData'

const FEATURES = [
  { icon: 'solar:cpu-bolt-linear', title: 'AI Analyst', desc: 'Multi-persona AI runs Buffett, Graham & Burry style analysis on any stock.', href: '/ai-analyst' },
  { icon: 'solar:filter-linear', title: 'Equities Screener', desc: 'Filter thousands of stocks across 20+ fundamental & technical metrics.', href: '/equities-screener' },
  { icon: 'solar:diagram-down-linear', title: 'Options Chain', desc: 'Full option chains with live OI, IV and Greeks visualization.', href: '/options-chain' },
  { icon: 'solar:pie-chart-2-linear', title: 'Portfolio Analytics', desc: 'Institutional-grade risk, attribution and exposure breakdowns.', href: '/portfolio-analyzer' },
  { icon: 'solar:globe-linear', title: 'Global Markets', desc: 'Track indices, forex, commodities and crypto in one command center.', href: '/global-markets' },
  { icon: 'solar:shield-warning-linear', title: 'Risk Engine', desc: 'VaR, drawdown, beta and correlation matrices at your fingertips.', href: '/risk-calculator' },
]

const STATS = [
  { label: 'Assets tracked', value: '18,400+' },
  { label: 'Data points / day', value: '2.4B' },
  { label: 'AI models', value: '12' },
  { label: 'Markets covered', value: '40+' },
]

export default function HomePage() {
  const { data: moversData, loading: moversLoading } = useMovers('NSE')
  const { data: indicesData } = useIndices()

  const gainers = moversData?.gainers || []
  const losers = moversData?.losers || []

  // Derive sectors from indices
  const sectors = indicesData ? Object.entries(indicesData).map(([name, data]) => ({ name, ...data })).slice(0, 6) : []

  return (
    <main className="relative">
      {/* ─── Hero ─── */}
      <section className="relative z-0 pt-32 pb-24 px-4 sm:px-6 border-b border-border overflow-hidden min-h-[80vh] flex items-center">
        {/* Background Image aligned to the right/center with subtle low opacity */}
        <img 
          src="/hero-bg.webp" 
          alt="FinfreeX Background" 
          className="absolute inset-0 z-0 w-full h-full object-cover object-right sm:object-center opacity-40 pointer-events-none"
        />
        {/* Clean dark overlay to ensure readability */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0c1017] via-[#0c1017]/80 to-transparent pointer-events-none" />

        <div className="mx-auto max-w-6xl w-full grid lg:grid-cols-12 gap-10 items-center relative z-10">
          <div className="fade-up lg:col-span-7">
            <Badge tone="emerald" className="mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary ticker-live mr-2"></span>
              Institutional intelligence, for everyone
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-balance">
              Trade with a<br />
              <span className="text-primary">hedge-fund</span> edge.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-soft max-w-lg text-pretty leading-relaxed">
              FinfreeX blends real-time market data with multi-persona AI analysis, deep
              screening and pro-grade risk tools — all in one immersive workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <Btn variant="primary" className="px-6 py-3">Launch Platform</Btn>
              </Link>
              <Link href="/ai-analyst">
                <Btn variant="ghost" className="px-6 py-3">
                  <span className="inline-flex items-center gap-2">
                    <iconify-icon icon="solar:magic-stick-3-linear" width="18"></iconify-icon>
                    Try AI Analyst
                  </span>
                </Btn>
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-border/60 pt-8">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold text-foreground tabular-nums">{s.value}</div>
                  <div className="text-xs text-muted mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Keep the right side empty so the background chart is visible */}
          <div className="hidden lg:block lg:col-span-5" />
        </div>
      </section>

      <MarketTicker />

      {/* ─── Feature bento ─── */}
      <section className="px-4 sm:px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">The platform</div>
            <h2 className="text-3xl font-extrabold tracking-tight text-balance">Everything a modern investor needs</h2>
            <p className="text-soft mt-3 max-w-xl mx-auto text-pretty">One workspace for research, execution intelligence and risk — powered by AI.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <Link key={f.title} href={f.href}>
                <Card className="h-full border-border">
                  <div className="w-11 h-11 rounded-md bg-primary/12 border border-primary/25 text-primary flex items-center justify-center mb-4">
                    <iconify-icon icon={f.icon} width="22"></iconify-icon>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-sm text-soft leading-relaxed">{f.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Explore <iconify-icon icon="solar:arrow-right-linear" width="14"></iconify-icon>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Movers ─── */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-4">
          {[
            { title: 'Top Gainers', tone: 'emerald' as const, rows: gainers },
            { title: 'Top Losers', tone: 'coral' as const, rows: losers },
          ].map((col) => (
            <Card key={col.title} hover={false} className="border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">{col.title}</h3>
                <Badge tone={col.tone}>NSE</Badge>
              </div>
              <div className="space-y-1">
                {moversLoading ? (
                   <div className="py-4 text-center text-sm text-muted">Loading live data...</div>
                ) : col.rows.length === 0 ? (
                   <div className="py-4 text-center text-sm text-muted">No data available</div>
                ) : col.rows.slice(0, 6).map((r: any) => (
                  <div key={r.symbol} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.03]">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{r.symbol}</div>
                      <div className="text-[11px] text-muted truncate max-w-[140px]">{r.exchange}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{r.current_price.toLocaleString('en-IN')}</div>
                      <Change value={r.change_pct} className="text-xs" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Sector strip ─── */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between mb-5">
            <h2 className="text-2xl font-extrabold tracking-tight">Market Indices</h2>
            <Link href="/market" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
              Live market <iconify-icon icon="solar:arrow-right-linear" width="14"></iconify-icon>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {sectors.map((s) => {
              const up = s.change_pct >= 0
              return (
                <div key={s.name} className={`glass-card card-hover p-4 border-l-2 ${up ? 'border-l-primary' : 'border-l-coral'}`}>
                  <div className="text-xs text-soft mb-2 truncate">{s.name}</div>
                  <Change value={s.change_pct} className="text-lg" />
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-4 sm:px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <Card hover={false} className="text-center py-14 px-6 border-primary/20">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-balance">Ready to invest smarter?</h2>
            <p className="text-soft mt-3 max-w-md mx-auto text-pretty">Join thousands using FinfreeX to make data-driven decisions with confidence.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/auth"><Btn variant="primary" className="px-7 py-3">Create free account</Btn></Link>
              <Link href="/pricing"><Btn variant="outline" className="px-7 py-3">View pricing</Btn></Link>
            </div>
          </Card>
        </div>
      </section>
    </main>
  )
}
