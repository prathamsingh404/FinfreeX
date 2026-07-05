'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, StatCard, SectionTitle, Change, Badge, Sparkline, Donut, ProgressBar, Btn } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import {
  getPortfolio, getIndices, getTopMovers, getSectorPerformance,
  getNews, getSparkline, getCandles,
} from '@/lib/mockData'
import { fmt } from '@/components/ui/kit'
import Link from 'next/link'

const SECTOR_COLORS = ['#34D399', '#FF6B57', '#FBBF24', '#38BDF8', '#A78BFA', '#F472B6', '#4ADE80', '#FB923C', '#22D3EE', '#E879F9']

export default function DashboardPage() {
  const pf = getPortfolio()
  const indices = getIndices()
  const { gainers, losers } = getTopMovers()
  const sectors = getSectorPerformance()
  const news = getNews(6)
  const equity = getCandles('RELIANCE', 60).map((c) => c.close)

  const donut = sectors.slice(0, 6).map((s, i) => ({ value: Math.abs(s.marketCap), color: SECTOR_COLORS[i], label: s.name }))

  return (
    <PageShell
      category="Core Intelligence"
      title="Overview Dashboard"
      subtitle="Your unified command center — portfolio health, market pulse, and actionable intelligence in one view."
      icon="solar:widget-5-linear"
      actions={<Btn variant="outline"><span className="inline-flex items-center gap-2"><iconify-icon icon="solar:export-linear" width="16"></iconify-icon>Export</span></Btn>}
    >
      {/* Stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Portfolio" value={fmt(pf.totalValue, { compact: true, prefix: '₹' })} change={pf.dayChange} icon="solar:wallet-money-linear" spark={getSparkline('pf-total')} sparkUp={pf.dayChange >= 0} />
        <StatCard label="Total P&L" value={fmt(pf.totalPnl, { compact: true, prefix: '₹' })} change={pf.totalPnlPct} icon="solar:chart-2-linear" spark={getSparkline('pf-pnl')} sparkUp={pf.totalPnl >= 0} />
        <StatCard label="Invested" value={fmt(pf.investedValue, { compact: true, prefix: '₹' })} icon="solar:safe-square-linear" hint={`Cash ₹${fmt(pf.cash, { compact: true })}`} />
        <StatCard label="Day Change" value={`${pf.dayChange >= 0 ? '+' : ''}${pf.dayChange}%`} change={pf.dayChange} icon="solar:pulse-linear" spark={getSparkline('pf-day')} sparkUp={pf.dayChange >= 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity curve */}
        <Card className="lg:col-span-2">
          <SectionTitle title="Portfolio Equity Curve" subtitle="Trailing 60 sessions" icon="solar:graph-up-linear"
            action={<Badge tone="emerald">+18.4% YTD</Badge>} />
          <AreaChart data={equity} height={260} />
        </Card>

        {/* Allocation donut */}
        <Card>
          <SectionTitle title="Allocation" subtitle="By sector" icon="solar:pie-chart-2-linear" />
          <div className="flex flex-col items-center gap-4">
            <Donut segments={donut} center={<><span className="text-xs text-soft">Sectors</span><span className="text-xl font-bold">{donut.length}</span></>} />
            <div className="w-full grid grid-cols-2 gap-2">
              {sectors.slice(0, 6).map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SECTOR_COLORS[i] }} />
                  <span className="text-soft truncate">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Indices */}
      <div className="mt-6">
        <SectionTitle title="Global Indices" subtitle="Live market snapshot" icon="solar:globe-linear"
          action={<Link href="/global-markets" className="text-xs text-emerald-bright font-semibold hover:underline">View all</Link>} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {indices.slice(0, 5).map((idx) => (
            <Card key={idx.symbol} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-soft">{idx.name}</span>
                <Badge tone="neutral">{idx.region}</Badge>
              </div>
              <div className="text-lg font-bold tabular-nums">{fmt(idx.value, { decimals: 0 })}</div>
              <Change value={idx.changePct} />
              <Sparkline data={getSparkline('idx-' + idx.symbol)} up={idx.changePct >= 0} width={200} height={32} />
            </Card>
          ))}
        </div>
      </div>

      {/* Movers + News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card>
          <SectionTitle title="Top Gainers" icon="solar:arrow-up-linear" />
          <div className="flex flex-col divide-y divide-white/5">
            {gainers.slice(0, 5).map((q) => (
              <div key={q.symbol} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-semibold">{q.symbol}</div>
                  <div className="text-[11px] text-muted truncate max-w-[120px]">{q.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">₹{fmt(q.price)}</div>
                  <Change value={q.changePct} showArrow={false} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Top Losers" icon="solar:arrow-down-linear" />
          <div className="flex flex-col divide-y divide-white/5">
            {losers.slice(0, 5).map((q) => (
              <div key={q.symbol} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-semibold">{q.symbol}</div>
                  <div className="text-[11px] text-muted truncate max-w-[120px]">{q.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">₹{fmt(q.price)}</div>
                  <Change value={q.changePct} showArrow={false} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Market News" icon="solar:notebook-linear"
            action={<Link href="/news-sentiment" className="text-xs text-emerald-bright font-semibold hover:underline">More</Link>} />
          <div className="flex flex-col divide-y divide-white/5">
            {news.map((n, i) => (
              <div key={i} className="py-2.5">
                <div className="text-sm font-medium leading-snug text-pretty">{n.title}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-muted">{n.source}</span>
                  <span className="text-[11px] text-muted">·</span>
                  <span className="text-[11px] text-muted">{n.time}</span>
                  <Badge tone={n.sentiment > 0.25 ? 'emerald' : n.sentiment < -0.25 ? 'coral' : 'neutral'} className="ml-auto">{n.sentimentLabel}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
