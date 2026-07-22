'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, StatCard, SectionTitle, Change, Badge, Donut, Btn, fmt } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import {
  usePortfolio, useIndices, useMovers, useNews, useOHLCV
} from '@/lib/hooks/useMarketData'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

const SECTOR_COLORS = ['#34D399', '#FF6B57', '#FBBF24', '#38BDF8', '#A78BFA', '#F472B6', '#4ADE80', '#FB923C', '#22D3EE', '#E879F9']

export default function DashboardPage() {
  const { user } = useAuth()
  
  // Use a dummy user ID if not logged in to let the API fail gracefully instead of breaking hooks
  const userId = user?.id || 'demo-user-123'
  
  const { data: pf, loading: pfLoading } = usePortfolio()
  const { data: indicesData } = useIndices()
  const { data: moversData } = useMovers('NSE')
  const { data: newsData } = useNews('markets', 'business')
  const { data: chartData } = useOHLCV('RELIANCE', 'NSE', '3mo', '1d')

  const indices = indicesData ? Object.values(indicesData) : []
  const sectors = indicesData ? Object.entries(indicesData).map(([name, data]) => ({ name, ...data })) : []
  const gainers = moversData?.gainers || []
  const losers = moversData?.losers || []
  const news = newsData || []
  const equity = chartData?.map(c => c.close) || []

  const donut = sectors.slice(0, 6).map((s, i) => ({ value: Math.abs(s.price), color: SECTOR_COLORS[i], label: s.name }))

  // Default empty state for portfolio while API is missing/loading
  const pfData = pf || {
    totalValue: 0,
    dayChange: 0,
    totalPnl: 0,
    totalPnlPct: 0,
    investedValue: 0,
    cash: 0
  }

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
        <StatCard label="Total Portfolio" value={fmt(pfData.totalValue, { compact: true, prefix: '₹' })} change={pfData.dayChange} icon="solar:wallet-money-linear" sparkUp={pfData.dayChange >= 0} />
        <StatCard label="Total P&L" value={fmt(pfData.totalPnl, { compact: true, prefix: '₹' })} change={pfData.totalPnlPct} icon="solar:chart-2-linear" sparkUp={pfData.totalPnl >= 0} />
        <StatCard label="Invested" value={fmt(pfData.investedValue, { compact: true, prefix: '₹' })} icon="solar:safe-square-linear" hint={`Cash ₹${fmt(pfData.cash, { compact: true })}`} />
        <StatCard label="Day Change" value={`${pfData.dayChange >= 0 ? '+' : ''}${pfData.dayChange}%`} change={pfData.dayChange} icon="solar:pulse-linear" sparkUp={pfData.dayChange >= 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity curve */}
        <Card className="lg:col-span-2">
          <SectionTitle title="Portfolio Equity Curve" subtitle="Trailing 3 months" icon="solar:graph-up-linear"
            action={<Badge tone="emerald">+18.4% YTD</Badge>} />
          {equity.length > 0 ? (
            <AreaChart data={equity} height={260} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted">Loading chart data...</div>
          )}
        </Card>

        {/* Allocation donut */}
        <Card>
          <SectionTitle title="Allocation" subtitle="By sector" icon="solar:pie-chart-2-linear" />
          {sectors.length > 0 ? (
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
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted">Loading allocation...</div>
          )}
        </Card>
      </div>

      {/* Indices */}
      <div className="mt-6">
        <SectionTitle title="Global Indices" subtitle="Live market snapshot" icon="solar:globe-linear"
          action={<Link href="/market" className="text-xs text-primary font-semibold hover:underline">View all</Link>} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {indices.slice(0, 5).map((idx) => (
            <Card key={idx.category} className="flex flex-col gap-2 border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-soft">{idx.category}</span>
                <Badge tone="neutral">NSE</Badge>
              </div>
              <div className="text-lg font-bold tabular-nums">{fmt(idx.price, { decimals: 0 })}</div>
              <Change value={idx.change_pct} />
            </Card>
          ))}
        </div>
      </div>

      {/* Movers + News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card>
          <SectionTitle title="Top Gainers" icon="solar:arrow-up-linear" />
          <div className="flex flex-col divide-y divide-border">
            {gainers.slice(0, 5).map((q) => (
              <div key={q.symbol} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-semibold">{q.symbol}</div>
                  <div className="text-[11px] text-muted truncate max-w-[120px]">{q.exchange}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">₹{fmt(q.current_price)}</div>
                  <Change value={q.change_pct} showArrow={false} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Top Losers" icon="solar:arrow-down-linear" />
          <div className="flex flex-col divide-y divide-border">
            {losers.slice(0, 5).map((q) => (
              <div key={q.symbol} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-semibold">{q.symbol}</div>
                  <div className="text-[11px] text-muted truncate max-w-[120px]">{q.exchange}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">₹{fmt(q.current_price)}</div>
                  <Change value={q.change_pct} showArrow={false} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Market News" icon="solar:notebook-linear"
            action={<Link href="/news-sentiment" className="text-xs text-primary font-semibold hover:underline">More</Link>} />
          <div className="flex flex-col divide-y divide-border">
            {news.slice(0, 5).map((n, i) => (
              <div key={i} className="py-2.5">
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium leading-snug text-pretty hover:text-primary transition-colors">
                  {n.title}
                </a>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-muted">{n.source}</span>
                  <span className="text-[11px] text-muted">·</span>
                  <span className="text-[11px] text-muted">{new Date(n.published_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
