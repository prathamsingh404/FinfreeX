'use client'

import React, { useEffect, useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import {
  Panel, Change, fmt, StatTile, KpiRow, DefRow, Note, Badge, EmptyState, SkeletonRows, Btn, cx,
} from '@/components/ui/kit'
import { Segmented, Reveal } from '@/components/ui/controls'
import { fetchInstruments, fetchDividendBoard } from '@/lib/api'

/* Prices are live quotes and the distribution yield is the reported figure
   from the trust's filing. Occupancy and net operating income are not in any
   free feed, so this page does not show them rather than inventing them. */

const BOARDS = {
  India: {
    exchange: 'NSE',
    symbols: 'EMBASSY, MINDSPACE, BIRET, NXST',
  },
  US: {
    exchange: 'US',
    symbols: 'O, SPG, PLD, AMT, EQIX, PSA, AVB, VICI',
  },
} as const

type BoardKey = keyof typeof BOARDS

interface Reit {
  symbol: string
  price: number | null
  change_pct: number | null
  high: number | null
  low: number | null
  volume: number | null
  currency: string | null
  yield?: number | null
  name?: string | null
  sector?: string | null
  stale?: boolean
}

export default function ReitAnalyzerPage() {
  const [board, setBoard] = useState<BoardKey>('India')
  const [input, setInput] = useState<string>(BOARDS.India.symbols)
  const [universe, setUniverse] = useState<string>(BOARDS.India.symbols)

  const [rows, setRows] = useState<Reit[]>([])
  const [unavailable, setUnavailable] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Reit | null>(null)

  const exchange = BOARDS[board].exchange

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const symbols = universe.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)
    ;(async () => {
      try {
        // Quotes and the yield board are independent: a trust can quote
        // without a reported distribution, and vice versa.
        const [quotes, dividends] = await Promise.all([
          fetchInstruments(symbols, exchange),
          fetchDividendBoard(symbols, exchange).catch(() => ({ dividends: [], unavailable: [] })),
        ])
        if (cancelled) return

        const yields = new Map<string, any>((dividends.dividends ?? []).map((d: any) => [d.symbol, d]))
        const merged: Reit[] = (quotes.instruments ?? []).map((q: any) => ({
          ...q,
          yield: yields.get(q.symbol)?.yield ?? null,
          name: yields.get(q.symbol)?.name ?? null,
          sector: yields.get(q.symbol)?.sector ?? null,
        }))

        setRows(merged)
        setSelected(merged[0] ?? null)
        setUnavailable(quotes.unavailable ?? [])
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'The quote feed is unavailable.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [universe, exchange])

  const switchBoard = (next: BoardKey) => {
    setBoard(next)
    setInput(BOARDS[next].symbols)
    setUniverse(BOARDS[next].symbols)
  }

  const withYield = rows.filter((r) => r.yield != null)
  const avgYield = withYield.length ? withYield.reduce((s, r) => s + (r.yield as number), 0) / withYield.length : null
  const bestYield = withYield.length ? [...withYield].sort((a, b) => (b.yield as number) - (a.yield as number))[0] : null
  const advancing = rows.filter((r) => (r.change_pct ?? 0) >= 0).length
  const currency = rows.find((r) => r.currency)?.currency === 'INR' ? '₹' : '$'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setUniverse(input)
  }

  return (
    <PageShell
      category="Assets"
      title="REIT Analyzer"
      subtitle="Listed property trusts: live prices and the distribution yield each one reports."
      icon="solar:buildings-linear"
      backdrop="lattice"
      actions={<Segmented options={['India', 'US'] as const} value={board} onChange={switchBoard} size="sm" />}
    >
      <div className="mb-3">
        <Panel label="Trusts" meta={`${rows.length} resolved`} pad>
          <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[240px]">
              <span className="eyebrow">Symbols</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                className="input mt-1.5"
                placeholder="EMBASSY, MINDSPACE"
              />
            </label>
            <Btn type="submit" icon="solar:refresh-linear">Load</Btn>
          </form>
          {unavailable.length > 0 && (
            <p className="text-xs text-muted mt-2">
              No quote returned for {unavailable.join(', ')}. Those are left off rather than filled in.
            </p>
          )}
        </Panel>
      </div>

      {!loading && rows.length > 0 && (
        <KpiRow cols={4} className="mb-3">
          <StatTile label="Trusts on the board" value={rows.length} hint={`${advancing} advancing`} />
          <StatTile
            label="Average distribution yield"
            value={avgYield == null ? '—' : `${avgYield.toFixed(2)}%`}
            tone={avgYield == null ? undefined : 'up'}
            hint={`${withYield.length} report a distribution`}
          />
          <StatTile
            label="Highest yield"
            value={bestYield ? `${(bestYield.yield as number).toFixed(2)}%` : '—'}
            hint={bestYield?.symbol ?? 'None reported'}
          />
          <StatTile
            label="Session breadth"
            value={`${advancing} / ${rows.length}`}
            tone={advancing * 2 >= rows.length ? 'up' : 'down'}
            hint="Advancing versus total"
          />
        </KpiRow>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 items-start">
        <Reveal>
          {loading ? (
            <Panel label="Trusts"><SkeletonRows rows={6} cols={4} /></Panel>
          ) : rows.length === 0 ? (
            <Panel label="Trusts">
              <EmptyState
                icon="solar:buildings-linear"
                title="No trusts resolved"
                body={error ?? 'None of those symbols returned a quote on this exchange.'}
              />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rows.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => setSelected(r)}
                  className={cx(
                    'panel p-3 text-left cursor-pointer transition-colors',
                    selected?.symbol === r.symbol ? 'border-primary' : 'card-hover',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{r.symbol}</div>
                      <div className="text-xs text-muted truncate">{r.name ?? 'Real estate investment trust'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-md font-semibold tabular-nums">
                        {r.price == null ? '—' : `${currency}${fmt(r.price)}`}
                      </div>
                      <Change value={r.change_pct} showArrow={false} className="text-xs" />
                    </div>
                  </div>

                  <dl className="grid grid-cols-3 gap-2">
                    <div>
                      <dt className="eyebrow mb-0.5">Yield</dt>
                      <dd className={cx('text-sm font-medium tabular-nums', r.yield != null && 'val-up')}>
                        {r.yield == null ? '—' : `${r.yield.toFixed(2)}%`}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow mb-0.5">Day low</dt>
                      <dd className="text-sm tabular-nums">{r.low == null ? '—' : fmt(r.low)}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow mb-0.5">Day high</dt>
                      <dd className="text-sm tabular-nums">{r.high == null ? '—' : fmt(r.high)}</dd>
                    </div>
                  </dl>
                </button>
              ))}
            </div>
          )}
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          {selected && (
            <Panel label="Selected trust" meta={selected.symbol} pad>
              <h3 className="text-sm font-medium text-foreground truncate">
                {selected.name ?? selected.symbol}
              </h3>
              <div className="flex items-baseline gap-3 mt-2 mb-3">
                <span className="text-xl font-semibold tabular-nums">
                  {selected.price == null ? '—' : `${currency}${fmt(selected.price)}`}
                </span>
                <Change value={selected.change_pct} />
              </div>
              <DefRow
                label="Distribution yield"
                value={selected.yield == null ? 'Not reported' : `${selected.yield.toFixed(2)}%`}
                tone={selected.yield == null ? undefined : 'up'}
              />
              <DefRow label="Day range" value={selected.low == null || selected.high == null ? '—' : `${fmt(selected.low)} – ${fmt(selected.high)}`} />
              <DefRow label="Volume" value={selected.volume == null ? '—' : fmt(selected.volume, { compact: true, decimals: 0 })} />
              <DefRow label="Sector" value={selected.sector ?? '—'} />
              {selected.stale && (
                <div className="mt-3"><Badge tone="warn">Quote is stale</Badge></div>
              )}
            </Panel>
          )}

          <Note>
            Occupancy and net operating income are not published in any free market feed. Read them from the trust's own quarterly report before acting on a yield.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
