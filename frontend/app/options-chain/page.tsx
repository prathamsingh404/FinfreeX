'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge, fmt } from '@/components/ui/kit'
import { useOptionsChain } from '@/lib/hooks/useMarketData'

const SYMBOLS = ['NIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY']

export default function OptionsChainPage() {
  const [symbol, setSymbol] = useState('NIFTY')
  const { data: chainData, loading } = useOptionsChain(symbol)

  const rows = chainData?.chain || []
  const maxOI = rows.length > 0 ? Math.max(...rows.flatMap((r) => [r.call_oi || 0, r.put_oi || 0])) : 1
  
  // Calculate ATM strike
  const spotPrice = chainData?.spot_price || 0
  let atmStrike = 0
  if (rows.length > 0 && spotPrice > 0) {
    atmStrike = rows.reduce((prev, curr) => 
      Math.abs(curr.strike - spotPrice) < Math.abs(prev.strike - spotPrice) ? curr : prev
    ).strike
  }

  const currentExpiry = chainData?.expiry_dates?.[0] || 'Loading...'

  return (
    <PageShell
      category="Derivatives & Options"
      title="Options Chain"
      subtitle="Live strikes, open interest, implied volatility, and Greeks."
      icon="solar:diagram-down-linear"
      actions={
        <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border">
          {SYMBOLS.map((s) => (
            <button key={s} onClick={() => setSymbol(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${symbol === s ? 'bg-primary text-[#04120C]' : 'text-soft hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-border">
          <div className="text-xs text-soft">Spot Price</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{loading ? '...' : fmt(spotPrice, { decimals: 2 })}</div>
        </Card>
        <Card className="border-border">
          <div className="text-xs text-soft">ATM Strike</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{loading ? '...' : fmt(atmStrike, { decimals: 0 })}</div>
        </Card>
        <Card className="border-border">
          <div className="text-xs text-soft">Expiry</div>
          <div className="text-2xl font-bold mt-1">{loading ? '...' : currentExpiry}</div>
        </Card>
      </div>

      <Card pad={false} className="border-border">
        <div className="p-5 pb-3 flex items-center justify-between">
          <SectionTitle title={`${symbol} Option Chain`} subtitle="Calls (left) · Strike · Puts (right)" icon="solar:diagram-down-linear" />
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary/40"></span>Call OI</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-coral/40"></span>Put OI</span>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin min-h-[400px]">
          {loading ? (
             <div className="flex items-center justify-center h-full text-soft py-20">Loading NSE live options chain...</div>
          ) : rows.length === 0 ? (
             <div className="flex items-center justify-center h-full text-soft py-20">No options data available for {symbol}.</div>
          ) : (
            <table className="w-full text-xs min-w-[820px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted border-y border-border">
                  <th className="px-3 py-2 text-left">OI</th>
                  <th className="px-3 py-2 text-right">IV</th>
                  <th className="px-3 py-2 text-right">Chg%</th>
                  <th className="px-3 py-2 text-right">Call LTP</th>
                  <th className="px-3 py-2 text-center bg-surface-2">Strike</th>
                  <th className="px-3 py-2 text-left">Put LTP</th>
                  <th className="px-3 py-2 text-left">Chg%</th>
                  <th className="px-3 py-2 text-left">IV</th>
                  <th className="px-3 py-2 text-right">OI</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isATM = r.strike === atmStrike;
                  return (
                    <tr key={r.strike} className={`border-b border-white/[0.02] ${isATM ? 'bg-primary/5' : 'hover:bg-white/[0.02]'}`}>
                      <td className="px-3 py-2 relative">
                        <div className="absolute inset-y-1 left-0 rounded-sm bg-primary/15" style={{ width: `${(r.call_oi / maxOI) * 100}%` }} />
                        <span className="relative tabular-nums">{fmt(r.call_oi, { compact: true, decimals: 0 })}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-soft">{r.call_iv ? r.call_iv.toFixed(1) : '-'}</td>
                      <td className="px-3 py-2 text-right"><Change value={r.call_change} showArrow={false} /></td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt(r.call_ltp)}</td>
                      <td className="px-3 py-2 text-center font-bold tabular-nums bg-surface-2">
                        {fmt(r.strike, { decimals: 0 })}
                        {isATM && <Badge tone="primary" className="ml-1">ATM</Badge>}
                      </td>
                      <td className="px-3 py-2 font-semibold tabular-nums">{fmt(r.put_ltp)}</td>
                      <td className="px-3 py-2"><Change value={r.put_change} showArrow={false} /></td>
                      <td className="px-3 py-2 tabular-nums text-soft">{r.put_iv ? r.put_iv.toFixed(1) : '-'}</td>
                      <td className="px-3 py-2 text-right relative">
                        <div className="absolute inset-y-1 right-0 rounded-sm bg-coral/15" style={{ width: `${(r.put_oi / maxOI) * 100}%` }} />
                        <span className="relative tabular-nums">{fmt(r.put_oi, { compact: true, decimals: 0 })}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </PageShell>
  )
}
