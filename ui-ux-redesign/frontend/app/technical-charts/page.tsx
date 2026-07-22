'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import PageShell from '@/components/PageShell'
import { Btn } from '@/components/ui/kit'

const TradingViewChart = dynamic(() => import('@/components/TradingViewChart'), { ssr: false })

export default function TechnicalChartsPage() {
  const [symbol, setSymbol] = useState('RELIANCE')
  const [exchange, setExchange] = useState('NSE')
  const [chartKey, setChartKey] = useState(0)
  const [pending, setPending] = useState('RELIANCE')

  const handleUpdateChart = (e: React.FormEvent) => {
    e.preventDefault()
    setSymbol(pending)
    setChartKey((prev) => prev + 1)
  }

  return (
    <PageShell
      title="Technical Charts"
      subtitle="Interactive candlestick and area charts with SMA, EMA and Bollinger overlays"
      category="Analysis"
      icon="solar:chart-square-bold-duotone"
      actions={
        <form onSubmit={handleUpdateChart} className="flex items-center gap-2">
          <input
            type="text"
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground uppercase outline-none focus:border-emerald-bright w-32"
            placeholder="Ticker"
          />
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-bright"
          >
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
            <option value="US">US</option>
          </select>
          <Btn type="submit">Update</Btn>
        </form>
      }
    >
      <TradingViewChart key={chartKey} symbol={symbol.toUpperCase().trim()} exchange={exchange} />
    </PageShell>
  )
}
