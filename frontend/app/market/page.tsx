'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge, Sparkline, fmt } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { getAllQuotes, getIndices, getCandles, getSparkline } from '@/lib/mockData'

export default function MarketPage() {
  const quotes = getAllQuotes()
  const indices = getIndices().filter((i) => i.region === 'India')
  const [selected, setSelected] = useState(quotes[0].symbol)
  const active = quotes.find((q) => q.symbol === selected)!
  const candles = getCandles(selected, 90).map((c) => c.close)

  return (
    <PageShell
      category="Market & Economics"
      title="Live Market"
      subtitle="Real-time quotes, depth, and price action across the equity universe."
      icon="solar:chart-square-linear"
    >
      {/* Index strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {indices.map((idx) => (
          <Card key={idx.symbol} className="flex items-center justify-between">
            <div>
              <div className="text-xs text-soft font-semibold">{idx.name}</div>
              <div className="text-xl font-bold tabular-nums mt-0.5">{fmt(idx.value, { decimals: 0 })}</div>
            </div>
            <div className="text-right">
              <Change value={idx.changePct} />
              <div className="mt-1"><Sparkline data={getSparkline('idx-' + idx.symbol)} up={idx.changePct >= 0} width={90} height={30} /></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{active.symbol}</h2>
                <Badge tone="neutral">{active.sector}</Badge>
              </div>
              <p className="text-sm text-muted">{active.name}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums">₹{fmt(active.price)}</div>
              <Change value={active.changePct} />
            </div>
          </div>
          <AreaChart data={candles} height={280} up={active.changePct >= 0} />
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[['Open', active.open], ['High', active.high], ['Low', active.low], ['Prev', active.prevClose]].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-white/5 border border-white/8 p-3">
                <div className="text-[11px] text-muted">{l}</div>
                <div className="text-sm font-semibold tabular-nums mt-0.5">₹{fmt(v as number)}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Watchlist */}
        <Card pad={false}>
          <div className="p-5 pb-3">
            <SectionTitle title="Watchlist" subtitle="Tap to load chart" icon="solar:star-linear" />
          </div>
          <div className="max-h-[520px] overflow-y-auto scrollbar-thin">
            {quotes.map((q) => (
              <button
                key={q.symbol}
                onClick={() => setSelected(q.symbol)}
                className={`w-full flex items-center justify-between px-5 py-3 border-l-2 transition-colors ${selected === q.symbol ? 'bg-emerald/8 border-emerald' : 'border-transparent hover:bg-white/5'}`}
              >
                <div className="text-left">
                  <div className="text-sm font-semibold">{q.symbol}</div>
                  <div className="text-[11px] text-muted truncate max-w-[110px]">{q.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">₹{fmt(q.price)}</div>
                  <Change value={q.changePct} showArrow={false} />
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
