'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge, fmt, Btn } from '@/components/ui/kit'
import { getOptionChain } from '@/lib/mockData'

const SYMBOLS = ['NIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY']

export default function OptionsChainPage() {
  const [symbol, setSymbol] = useState('NIFTY')
  const chain = getOptionChain(symbol)
  const maxOI = Math.max(...chain.rows.flatMap((r) => [r.call.oi, r.put.oi]))

  return (
    <PageShell
      category="Derivatives & Options"
      title="Options Chain"
      subtitle="Live strikes, open interest, implied volatility, and Greeks."
      icon="solar:diagram-down-linear"
      actions={
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
          {SYMBOLS.map((s) => (
            <button key={s} onClick={() => setSymbol(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${symbol === s ? 'bg-emerald text-[#04120C]' : 'text-soft hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><div className="text-xs text-soft">Spot Price</div><div className="text-2xl font-bold tabular-nums mt-1">{fmt(chain.spot, { decimals: 0 })}</div></Card>
        <Card><div className="text-xs text-soft">ATM Strike</div><div className="text-2xl font-bold tabular-nums mt-1">{fmt(chain.atm, { decimals: 0 })}</div></Card>
        <Card><div className="text-xs text-soft">Expiry</div><div className="text-2xl font-bold mt-1">{chain.expiry}</div></Card>
      </div>

      <Card pad={false}>
        <div className="p-5 pb-3 flex items-center justify-between">
          <SectionTitle title={`${symbol} Option Chain`} subtitle="Calls (left) · Strike · Puts (right)" icon="solar:diagram-down-linear" />
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald/40"></span>Call OI</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-coral/40"></span>Put OI</span>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs min-w-[820px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted border-y border-white/8">
                <th className="px-3 py-2 text-left">OI</th>
                <th className="px-3 py-2 text-right">IV</th>
                <th className="px-3 py-2 text-right">Chg%</th>
                <th className="px-3 py-2 text-right">Call LTP</th>
                <th className="px-3 py-2 text-center bg-white/[0.03]">Strike</th>
                <th className="px-3 py-2 text-left">Put LTP</th>
                <th className="px-3 py-2 text-left">Chg%</th>
                <th className="px-3 py-2 text-left">IV</th>
                <th className="px-3 py-2 text-right">OI</th>
              </tr>
            </thead>
            <tbody>
              {chain.rows.map((r) => (
                <tr key={r.strike} className={`border-b border-white/[0.04] ${r.isATM ? 'bg-amber/8' : 'hover:bg-white/[0.02]'}`}>
                  <td className="px-3 py-2 relative">
                    <div className="absolute inset-y-1 left-0 rounded-sm bg-emerald/15" style={{ width: `${(r.call.oi / maxOI) * 100}%` }} />
                    <span className="relative tabular-nums">{fmt(r.call.oi, { compact: true, decimals: 0 })}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-soft">{r.call.iv}</td>
                  <td className="px-3 py-2 text-right"><Change value={r.call.changePct} showArrow={false} /></td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt(r.call.ltp)}</td>
                  <td className="px-3 py-2 text-center font-bold tabular-nums bg-white/[0.03]">
                    {fmt(r.strike, { decimals: 0 })}
                    {r.isATM && <Badge tone="amber" className="ml-1">ATM</Badge>}
                  </td>
                  <td className="px-3 py-2 font-semibold tabular-nums">{fmt(r.put.ltp)}</td>
                  <td className="px-3 py-2"><Change value={r.put.changePct} showArrow={false} /></td>
                  <td className="px-3 py-2 tabular-nums text-soft">{r.put.iv}</td>
                  <td className="px-3 py-2 text-right relative">
                    <div className="absolute inset-y-1 right-0 rounded-sm bg-coral/15" style={{ width: `${(r.put.oi / maxOI) * 100}%` }} />
                    <span className="relative tabular-nums">{fmt(r.put.oi, { compact: true, decimals: 0 })}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  )
}
