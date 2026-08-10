'use client'

import React, { useEffect, useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Badge, StatTile, KpiRow, ProgressBar, Note, EmptyState, SkeletonRows, Btn, cx } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { SearchInput, Segmented, Reveal } from '@/components/ui/controls'
import { fetchDividendBoard } from '@/lib/api'

/* Yields and payout coverage come from filings. A company that reports no
   dividend is omitted rather than shown with an invented one. */

interface Div {
  symbol: string
  name: string | null
  sector: string | null
  yield: number
  eps: number | null
  payout: number | null
  market_cap: number | null
  stale?: boolean
}

const DEFAULT_UNIVERSE = 'RELIANCE, TCS, HDFCBANK, INFY, ITC, SBIN, ONGC, COALINDIA, NTPC, POWERGRID'
const EXCHANGES = ['NSE', 'BSE', 'US'] as const

export default function DividendTrackerPage() {
  const [input, setInput] = useState(DEFAULT_UNIVERSE)
  const [universe, setUniverse] = useState(DEFAULT_UNIVERSE)
  const [exchange, setExchange] = useState<string>('NSE')
  const [query, setQuery] = useState('')

  const [divs, setDivs] = useState<Div[]>([])
  const [unavailable, setUnavailable] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const symbols = universe.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)
    ;(async () => {
      try {
        const res = await fetchDividendBoard(symbols, exchange)
        if (cancelled) return
        setDivs((res.dividends ?? []).sort((a: Div, b: Div) => b.yield - a.yield))
        setUnavailable(res.unavailable ?? [])
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'The fundamentals feed is unavailable.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [universe, exchange])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return divs
    return divs.filter(
      (d) => d.symbol.toLowerCase().includes(q) || (d.name ?? '').toLowerCase().includes(q),
    )
  }, [divs, query])

  const avgYield = divs.length ? divs.reduce((s, d) => s + d.yield, 0) / divs.length : 0
  const maxYield = divs.length ? Math.max(...divs.map((d) => d.yield)) : 1
  const withPayout = divs.filter((d) => d.payout != null)
  const sustainable = withPayout.filter((d) => (d.payout as number) < 60).length

  const cols: Column<Div>[] = [
    {
      key: 'symbol',
      header: 'Company',
      width: '200px',
      render: (d) => (
        <div className="min-w-0">
          <div className="font-medium text-foreground">{d.symbol}</div>
          <div className="text-xs text-muted truncate">{d.name ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'yield',
      header: 'Yield',
      align: 'right',
      render: (d) => (
        <div className="flex items-center justify-end gap-2">
          <span className="val-up font-medium tabular-nums">{d.yield.toFixed(2)}%</span>
          <div className="w-14 h-1 bg-sunken rounded-full overflow-hidden shrink-0">
            <div className="h-full bg-up" style={{ width: `${(d.yield / maxYield) * 100}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: 'eps',
      header: 'Earnings per share',
      align: 'right',
      render: (d) => (d.eps == null ? <span className="text-muted">—</span> : <span className="tabular-nums">{d.eps.toFixed(2)}</span>),
    },
    {
      key: 'payout',
      header: 'Payout ratio',
      align: 'right',
      render: (d) =>
        d.payout == null ? (
          <span className="text-muted">—</span>
        ) : (
          <span className={cx('tabular-nums', d.payout > 70 ? 'val-down' : d.payout > 50 ? 'text-warn' : 'text-foreground')}>
            {d.payout.toFixed(0)}%
          </span>
        ),
    },
    {
      key: 'sector',
      header: 'Sector',
      render: (d) => (d.sector ? <Badge tone="neutral">{d.sector}</Badge> : <span className="text-muted">—</span>),
    },
  ]

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setUniverse(input)
  }

  return (
    <PageShell
      category="Assets"
      title="Dividend Tracker"
      subtitle="Reported yields ranked, with the payout ratio that says whether the dividend can last."
      icon="solar:money-bag-linear"
      backdrop="lattice"
      actions={<Segmented options={EXCHANGES} value={exchange} onChange={setExchange} size="sm" />}
    >
      <div className="mb-3">
        <Panel label="Universe" meta={`${divs.length} paying`} pad>
          <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[240px]">
              <span className="eyebrow">Symbols</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                className="input mt-1.5"
                placeholder="RELIANCE, ITC, ONGC"
              />
            </label>
            <Btn type="submit" icon="solar:refresh-linear">Load</Btn>
          </form>
          {unavailable.length > 0 && (
            <p className="text-xs text-muted mt-2">
              No dividend reported for {unavailable.join(', ')}. Those names are left out rather than shown at zero.
            </p>
          )}
        </Panel>
      </div>

      {!loading && divs.length > 0 && (
        <KpiRow cols={4} className="mb-3">
          <StatTile label="Average yield" value={`${avgYield.toFixed(2)}%`} tone="up" hint="Across paying names" />
          <StatTile label="Highest yield" value={`${maxYield.toFixed(2)}%`} hint={divs[0].symbol} />
          <StatTile label="Paying dividends" value={divs.length} hint={`${unavailable.length} pay none`} />
          <StatTile
            label="Payout under 60%"
            value={withPayout.length ? `${sustainable} of ${withPayout.length}` : '—'}
            hint="Comfortable coverage"
          />
        </KpiRow>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-3 items-start">
        <Reveal>
          <Panel
            label="Dividend board"
            meta={loading ? undefined : `${rows.length} of ${divs.length}`}
            actions={<SearchInput value={query} onChange={setQuery} placeholder="Search" className="w-36 hidden sm:block" />}
          >
            {loading ? (
              <SkeletonRows rows={8} cols={5} />
            ) : divs.length === 0 ? (
              <EmptyState
                icon="solar:money-bag-linear"
                title="No dividends reported"
                body={error ?? 'None of those companies reported a dividend yield. Try a different universe or exchange.'}
              />
            ) : (
              <DataTable columns={cols} rows={rows} dense defaultSort={{ key: 'yield', dir: 'desc' }} />
            )}
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel label="Payout health" meta={`${withPayout.length} with coverage`} pad>
            {withPayout.length === 0 ? (
              <p className="text-xs text-muted">
                None of these filings carry both a dividend and an earnings figure, so coverage cannot be computed.
              </p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Comfortable', range: 'under 50%', n: withPayout.filter((d) => (d.payout as number) < 50).length, tone: 'up' as const },
                  { label: 'Stretched', range: '50 – 70%', n: withPayout.filter((d) => (d.payout as number) >= 50 && (d.payout as number) <= 70).length, tone: 'warn' as const },
                  { label: 'At risk', range: 'over 70%', n: withPayout.filter((d) => (d.payout as number) > 70).length, tone: 'down' as const },
                ].map((b) => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-soft">{b.label}</span>
                      <span className="tabular-nums text-muted">{b.n} · {b.range}</span>
                    </div>
                    <ProgressBar value={(b.n / withPayout.length) * 100} tone={b.tone} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Note>
            A payout ratio above 70% means most of the earnings are already committed. That leaves little room to hold the dividend if profits dip.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
