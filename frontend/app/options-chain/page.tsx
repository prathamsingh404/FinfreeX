'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Change, Badge, fmt, StatTile, KpiRow, EmptyState, SkeletonRows, cx } from '@/components/ui/kit'
import { Segmented, Switch } from '@/components/ui/controls'
import { useOptionsChain } from '@/lib/hooks/useMarketData'

const SYMBOLS = ['NIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY'] as const

export default function OptionsChainPage() {
  const [symbol, setSymbol] = useState<string>('NIFTY')
  const [nearAtmOnly, setNearAtmOnly] = useState(false)
  const { data: chainData, loading } = useOptionsChain(symbol)

  const rows = chainData?.chain || []
  const spot = chainData?.spot_price || 0
  const expiry = chainData?.expiry_dates?.[0] || '—'

  const atmStrike = useMemo(() => {
    if (!rows.length || !spot) return 0
    return rows.reduce((prev, curr) => (Math.abs(curr.strike - spot) < Math.abs(prev.strike - spot) ? curr : prev)).strike
  }, [rows, spot])

  const shown = useMemo(() => {
    if (!nearAtmOnly || !atmStrike) return rows
    const idx = rows.findIndex((r) => r.strike === atmStrike)
    return rows.slice(Math.max(0, idx - 6), idx + 7)
  }, [rows, nearAtmOnly, atmStrike])

  const maxOI = rows.length ? Math.max(...rows.flatMap((r) => [r.call_oi || 0, r.put_oi || 0])) : 1
  const totalCallOi = rows.reduce((s, r) => s + (r.call_oi || 0), 0)
  const totalPutOi = rows.reduce((s, r) => s + (r.put_oi || 0), 0)
  const pcr = totalCallOi ? totalPutOi / totalCallOi : 0

  // The strike carrying the most open interest is where the market has
  // built the most defence — the practical read of support and resistance.
  const maxCall = rows.length ? rows.reduce((b, r) => ((r.call_oi || 0) > (b.call_oi || 0) ? r : b)) : null
  const maxPut = rows.length ? rows.reduce((b, r) => ((r.put_oi || 0) > (b.put_oi || 0) ? r : b)) : null

  return (
    <PageShell
      title="Options Chain"
      category="Professional"
      subtitle={`${symbol} · expiry ${expiry}`}
      icon="solar:diagram-down-linear"
      variant="terminal"
      status={<><span className="live-dot" /> Live chain</>}
      actions={<Segmented options={SYMBOLS} value={symbol} onChange={setSymbol} size="sm" />}
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-surface-2 shrink-0 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="eyebrow">Spot</span>
            <span className="text-sm font-semibold tabular-nums">{loading ? '—' : fmt(spot)}</span>
          </div>
          <span className="w-px h-4 bg-border" />
          <div className="flex items-baseline gap-2">
            <span className="eyebrow">At the money</span>
            <span className="text-sm font-semibold tabular-nums">{atmStrike ? fmt(atmStrike, { decimals: 0 }) : '—'}</span>
          </div>
          <span className="w-px h-4 bg-border" />
          <div className="flex items-baseline gap-2">
            <span className="eyebrow">Put/call</span>
            <span className={cx('text-sm font-semibold tabular-nums', pcr > 1 ? 'val-up' : 'val-down')}>
              {pcr ? pcr.toFixed(2) : '—'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Switch checked={nearAtmOnly} onChange={setNearAtmOnly} label="Near the money only" />
            <span className="hidden md:flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary/40" />Call OI</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-down/40" />Put OI</span>
            </span>
          </div>
        </div>

        <div className="px-3 py-2 border-b border-border shrink-0">
          <KpiRow cols={4}>
            <StatTile label="Call open interest" value={fmt(totalCallOi, { compact: true, decimals: 0 })} hint={maxCall ? `Peak at ${fmt(maxCall.strike, { decimals: 0 })}` : undefined} />
            <StatTile label="Put open interest" value={fmt(totalPutOi, { compact: true, decimals: 0 })} hint={maxPut ? `Peak at ${fmt(maxPut.strike, { decimals: 0 })}` : undefined} />
            <StatTile label="Put/call ratio" value={pcr ? pcr.toFixed(2) : '—'} tone={pcr > 1 ? 'up' : 'down'} hint={pcr > 1 ? 'Put-heavy positioning' : 'Call-heavy positioning'} />
            <StatTile label="Strikes listed" value={rows.length} hint={`Expiry ${expiry}`} />
          </KpiRow>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
          {loading ? (
            <SkeletonRows rows={12} cols={6} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="solar:diagram-down-linear"
              title={`No chain available for ${symbol}`}
              body="The exchange feed returned no strikes. Pick another underlying or try again once the market opens."
            />
          ) : (
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th className="num">Call OI</th>
                  <th className="num">IV</th>
                  <th className="num">Change</th>
                  <th className="num">Call price</th>
                  <th className="text-center">Strike</th>
                  <th>Put price</th>
                  <th>Change</th>
                  <th>IV</th>
                  <th className="num">Put OI</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const isAtm = r.strike === atmStrike
                  const itmCall = r.strike < spot
                  return (
                    <tr key={r.strike} data-selected={isAtm ? 'true' : undefined}>
                      <td className="num relative">
                        <span className="absolute inset-y-1 left-0 rounded-sm bg-primary/15" style={{ width: `${((r.call_oi || 0) / maxOI) * 100}%` }} />
                        <span className="relative tabular-nums">{fmt(r.call_oi, { compact: true, decimals: 0 })}</span>
                      </td>
                      <td className="num text-muted">{r.call_iv ? r.call_iv.toFixed(1) : '—'}</td>
                      <td className="num"><Change value={r.call_change} showArrow={false} /></td>
                      <td className={cx('num font-medium', itmCall && 'text-foreground')}>{fmt(r.call_ltp)}</td>
                      <td className="text-center font-semibold tabular-nums bg-surface-2">
                        {fmt(r.strike, { decimals: 0 })}
                        {isAtm && <Badge tone="primary" className="ml-1.5">ATM</Badge>}
                      </td>
                      <td className={cx('font-medium', !itmCall && 'text-foreground')}>{fmt(r.put_ltp)}</td>
                      <td><Change value={r.put_change} showArrow={false} /></td>
                      <td className="text-muted tabular-nums">{r.put_iv ? r.put_iv.toFixed(1) : '—'}</td>
                      <td className="num relative">
                        <span className="absolute inset-y-1 right-0 rounded-sm bg-down/15" style={{ width: `${((r.put_oi || 0) / maxOI) * 100}%` }} />
                        <span className="relative tabular-nums">{fmt(r.put_oi, { compact: true, decimals: 0 })}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageShell>
  )
}
