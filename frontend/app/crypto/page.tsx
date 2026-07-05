'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, fmt } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { getCrypto, getSparkline } from '@/lib/mockData'

export default function CryptoPage() {
  const coins = getCrypto()
  const [sel, setSel] = useState(coins[0].symbol)
  const active = coins.find((c) => c.symbol === sel)!
  const totalCap = coins.reduce((s, c) => s + c.marketCap, 0)

  return (
    <PageShell
      category="Assets & Funds"
      title="Crypto Markets"
      subtitle="Digital asset prices, market cap, and 24h momentum."
      icon="solar:bitcoin-linear"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><div className="text-xs text-soft">Total Market Cap</div><div className="text-2xl font-bold tabular-nums mt-1">${fmt(totalCap, { compact: true })}</div></Card>
        <Card><div className="text-xs text-soft">BTC Dominance</div><div className="text-2xl font-bold tabular-nums mt-1">52.4%</div></Card>
        <Card><div className="text-xs text-soft">24h Volume</div><div className="text-2xl font-bold tabular-nums mt-1">${fmt(coins.reduce((s, c) => s + c.volume, 0), { compact: true })}</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{active.name}</h2>
              <p className="text-sm text-muted">{active.symbol}/USD</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums">${fmt(active.price, { decimals: active.price < 1 ? 4 : 2 })}</div>
              <Change value={active.changePct} />
            </div>
          </div>
          <AreaChart data={getSparkline('crypto-' + active.symbol, 60)} height={260} up={active.changePct >= 0} />
        </Card>
        <Card pad={false}>
          <div className="p-5 pb-2"><SectionTitle title="Assets" icon="solar:bitcoin-linear" /></div>
          <div className="max-h-[440px] overflow-y-auto scrollbar-thin">
            {coins.map((c) => (
              <button key={c.symbol} onClick={() => setSel(c.symbol)}
                className={`w-full flex items-center justify-between px-5 py-3 border-l-2 transition-colors ${sel === c.symbol ? 'bg-emerald/8 border-emerald' : 'border-transparent hover:bg-white/5'}`}>
                <div className="text-left">
                  <div className="text-sm font-semibold">{c.symbol}</div>
                  <div className="text-[11px] text-muted">{c.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">${fmt(c.price, { decimals: c.price < 1 ? 4 : 2 })}</div>
                  <Change value={c.changePct} showArrow={false} />
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
