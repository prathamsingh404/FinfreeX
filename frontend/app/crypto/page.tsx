'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Change, fmt, EmptyState, SkeletonRows, SkeletonBlock, DefRow, cx } from '@/components/ui/kit'
import { Segmented, SearchInput } from '@/components/ui/controls'
import { AreaChart } from '@/components/ui/AreaChart'
import { useCrypto, useOHLCV } from '@/lib/hooks/useMarketData'

const RANGES = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
] as const

export default function CryptoPage() {
  const { data: cryptoData, loading } = useCrypto()
  const coins = cryptoData || []

  const [sel, setSel] = useState('BTC-USD')
  const [range, setRange] = useState<string>('3mo')
  const [query, setQuery] = useState('')

  const activeSymbol = coins.find((c) => c.symbol === sel) ? sel : coins[0]?.symbol || 'BTC-USD'
  const active = coins.find((c) => c.symbol === activeSymbol)
  const { data: chartData, loading: chartLoading } = useOHLCV(activeSymbol, 'CRYPTO', range, '1d')
  const closes = chartData?.map((c) => c.close) || []

  const totalCap = coins.reduce((s, c) => s + (c.market_cap || 0), 0)
  const totalVol = coins.reduce((s, c) => s + (c.volume || 0), 0)
  const btc = coins.find((c) => c.symbol === 'BTC-USD')
  const dominance = btc && totalCap > 0 ? ((btc.market_cap || 0) / totalCap) * 100 : 0
  const advancing = coins.filter((c) => c.change_pct >= 0).length

  const q = query.trim().toLowerCase()
  const list = q ? coins.filter((c) => c.symbol.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q)) : coins

  return (
    <PageShell
      title="Crypto Markets"
      category="Assets"
      subtitle="Digital asset prices, depth and 24-hour momentum"
      icon="solar:bitcoin-linear"
      variant="terminal"
      status={<><span className="live-dot" /> 30s refresh</>}
    >
      <div className="flex h-full min-h-0">
        {/* ── Instrument list ───────────────────────────── */}
        <aside className="w-[268px] shrink-0 border-r border-border flex flex-col bg-surface min-h-0">
          <div className="p-2 border-b border-border shrink-0">
            <SearchInput value={query} onChange={setQuery} placeholder="Search assets" />
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
            {loading && !coins.length ? (
              <SkeletonRows rows={10} cols={2} />
            ) : list.length === 0 ? (
              <EmptyState icon="solar:magnifer-linear" title="No asset found" body="Try a different ticker." compact />
            ) : (
              list.map((c) => (
                <button
                  key={c.symbol}
                  onClick={() => setSel(c.symbol)}
                  className={cx(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 border-b border-border text-left cursor-pointer transition-colors',
                    activeSymbol === c.symbol ? 'bg-primary-wash shadow-[inset_2px_0_0_var(--primary)]' : 'hover-fill',
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{c.symbol.replace('-USD', '')}</div>
                    <div className="text-xs text-muted truncate">{c.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm tabular-nums">${fmt(c.price, { decimals: c.price < 1 ? 4 : 2 })}</div>
                    <Change value={c.change_pct} showArrow={false} className="text-xs" />
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Chart and detail ──────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border bg-surface-2 shrink-0 flex-wrap">
            <div className="flex items-baseline gap-3 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">{active?.name || activeSymbol}</span>
              <span className="text-xs text-muted">{activeSymbol}</span>
            </div>
            <div className="flex items-center gap-3">
              {active && (
                <>
                  <span className="text-md font-semibold tabular-nums">
                    ${fmt(active.price, { decimals: active.price < 1 ? 4 : 2 })}
                  </span>
                  <Change value={active.change_pct} />
                </>
              )}
              <Segmented options={RANGES} value={range} onChange={setRange} size="sm" />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar min-h-0 p-3 space-y-3">
            <Panel label="Price" meta={`${closes.length} sessions · ${range}`} pad>
              {chartLoading ? (
                <SkeletonBlock height={300} />
              ) : closes.length === 0 ? (
                <EmptyState icon="solar:chart-2-linear" title="No history for this range" body="Pick a shorter window or another asset." compact />
              ) : (
                <AreaChart data={closes} height={300} up={(active?.change_pct || 0) >= 0} />
              )}
            </Panel>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Panel label="Asset detail" pad>
                <DefRow label="Symbol" value={activeSymbol} />
                <DefRow label="Price" value={active ? `$${fmt(active.price, { decimals: active.price < 1 ? 4 : 2 })}` : '—'} />
                <DefRow
                  label="24h change"
                  value={active ? `${active.change_pct >= 0 ? '+' : '−'}${Math.abs(active.change_pct).toFixed(2)}%` : '—'}
                  tone={(active?.change_pct ?? 0) >= 0 ? 'up' : 'down'}
                />
                <DefRow label="Market cap" value={active?.market_cap ? `$${fmt(active.market_cap, { compact: true })}` : '—'} />
                <DefRow label="24h volume" value={active?.volume ? `$${fmt(active.volume, { compact: true })}` : '—'} />
              </Panel>

              <Panel label="Market totals" pad>
                <DefRow label="Tracked market cap" value={totalCap > 0 ? `$${fmt(totalCap, { compact: true })}` : '—'} />
                <DefRow label="Tracked 24h volume" value={totalVol > 0 ? `$${fmt(totalVol, { compact: true })}` : '—'} />
                <DefRow label="BTC dominance" value={dominance > 0 ? `${dominance.toFixed(1)}%` : '—'} />
                <DefRow label="Advancing" value={`${advancing} of ${coins.length}`} tone={advancing * 2 >= coins.length ? 'up' : 'down'} />
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
