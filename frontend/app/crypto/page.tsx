'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, fmt } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { useCrypto, useOHLCV } from '@/lib/hooks/useMarketData'

export default function CryptoPage() {
  const { data: cryptoData, loading: cryptoLoading } = useCrypto()
  const coins = cryptoData || []
  
  const [sel, setSel] = useState('BTC-USD')
  
  const activeSymbol = coins.find(c => c.symbol === sel) ? sel : (coins[0]?.symbol || 'BTC-USD')
  const active = coins.find((c) => c.symbol === activeSymbol)
  
  const { data: chartData, loading: chartLoading } = useOHLCV(activeSymbol, 'CRYPTO', '1mo', '1d')
  const candles = chartData?.map(c => c.close) || []

  // Estimate total market cap and volume from the list we track
  const totalCap = coins.reduce((s, c) => s + (c.market_cap || 0), 0)
  const totalVol = coins.reduce((s, c) => s + (c.volume || 0), 0)
  
  const btc = coins.find(c => c.symbol === 'BTC-USD')
  const btcDominance = btc && totalCap > 0 ? ((btc.market_cap || 0) / totalCap) * 100 : 0

  return (
    <PageShell
      category="Assets & Funds"
      title="Crypto Markets"
      subtitle="Digital asset prices, market cap, and 24h momentum."
      icon="solar:bitcoin-linear"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-border">
          <div className="text-xs text-soft">Total Tracked Market Cap</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{totalCap > 0 ? `$${fmt(totalCap, { compact: true })}` : '...'}</div>
        </Card>
        <Card className="border-border">
          <div className="text-xs text-soft">BTC Dominance</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{btcDominance > 0 ? `${btcDominance.toFixed(1)}%` : '...'}</div>
        </Card>
        <Card className="border-border">
          <div className="text-xs text-soft">24h Tracked Volume</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{totalVol > 0 ? `$${fmt(totalVol, { compact: true })}` : '...'}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{active?.name || 'Loading...'}</h2>
              <p className="text-sm text-muted">{active?.symbol || sel}</p>
            </div>
            {active && (
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums">${fmt(active.price, { decimals: active.price < 1 ? 4 : 2 })}</div>
                <Change value={active.change_pct} />
              </div>
            )}
          </div>
          {chartLoading ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted">Loading chart data...</div>
          ) : candles.length > 0 ? (
            <AreaChart data={candles} height={260} up={(active?.change_pct || 0) >= 0} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted">No chart data available.</div>
          )}
        </Card>
        
        <Card pad={false} className="border-border">
          <div className="p-5 pb-2"><SectionTitle title="Assets" icon="solar:bitcoin-linear" /></div>
          <div className="max-h-[440px] overflow-y-auto scrollbar-thin">
            {cryptoLoading ? (
              <div className="p-5 text-center text-sm text-muted">Fetching crypto rates...</div>
            ) : coins.length === 0 ? (
              <div className="p-5 text-center text-sm text-muted">No assets found.</div>
            ) : coins.map((c) => (
              <button key={c.symbol} onClick={() => setSel(c.symbol)}
                className={`w-full flex items-center justify-between px-5 py-3 border-l-2 transition-colors ${activeSymbol === c.symbol ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-surface-2'}`}>
                <div className="text-left">
                  <div className="text-sm font-semibold">{c.symbol.replace('-USD', '')}</div>
                  <div className="text-[11px] text-muted">{c.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">${fmt(c.price, { decimals: c.price < 1 ? 4 : 2 })}</div>
                  <Change value={c.change_pct} showArrow={false} />
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
