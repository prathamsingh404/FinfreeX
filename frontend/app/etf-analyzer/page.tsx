'use client'

import React, { useEffect, useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import {
  Panel, Change, Badge, fmt, StatTile, KpiRow, Note, EmptyState, SkeletonRows, Btn, Sparkline, cx,
} from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Segmented, SearchInput, Reveal } from '@/components/ui/controls'
import { fetchInstruments } from '@/lib/api'

/* Every price, range and volume here is a live quote. The only fixed thing is
   which ETFs are on the board, and that list is editable. */

const BOARDS = {
  India: {
    exchange: 'NSE',
    symbols: 'NIFTYBEES, BANKBEES, GOLDBEES, JUNIORBEES, ITBEES, SILVERBEES, LIQUIDBEES, PSUBNKBEES, CPSEETF, MON100',
  },
  US: {
    exchange: 'US',
    symbols: 'SPY, QQQ, VTI, IWM, DIA, GLD, SLV, TLT, XLK, XLF, XLE, ARKK',
  },
} as const

type BoardKey = keyof typeof BOARDS

interface Instrument {
  symbol: string
  price: number | null
  change: number | null
  change_pct: number | null
  open: number | null
  high: number | null
  low: number | null
  volume: number | null
  currency: string | null
  stale?: boolean
}

/** Where the last trade sits inside the session's own range. */
function RangeCell({ low, high, price }: { low: number | null; high: number | null; price: number | null }) {
  if (low == null || high == null || price == null || high <= low) {
    return <span className="text-muted">—</span>
  }
  const pct = Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100))
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-xs tabular-nums text-muted">{low.toFixed(2)}</span>
      <div className="relative w-20 h-1 bg-sunken rounded-full">
        <span className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 bg-foreground rounded-sm" style={{ left: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted">{high.toFixed(2)}</span>
    </div>
  )
}

export default function EtfAnalyzerPage() {
  const [board, setBoard] = useState<BoardKey>('India')
  const [input, setInput] = useState<string>(BOARDS.India.symbols)
  const [universe, setUniverse] = useState<string>(BOARDS.India.symbols)
  const [query, setQuery] = useState('')

  const [rows, setRows] = useState<Instrument[]>([])
  const [unavailable, setUnavailable] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const exchange = BOARDS[board].exchange

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const symbols = universe.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)
    ;(async () => {
      try {
        const res = await fetchInstruments(symbols, exchange)
        if (cancelled) return
        setRows(res.instruments ?? [])
        setUnavailable(res.unavailable ?? [])
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

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? rows.filter((r) => r.symbol.toLowerCase().includes(q)) : rows
  }, [rows, query])

  const advancing = rows.filter((r) => (r.change_pct ?? 0) >= 0).length
  const best = rows.length ? [...rows].sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0))[0] : null
  const worst = rows.length ? [...rows].sort((a, b) => (a.change_pct ?? 0) - (b.change_pct ?? 0))[0] : null
  const mostTraded = rows.length ? [...rows].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0] : null
  const currency = rows.find((r) => r.currency)?.currency === 'INR' ? '₹' : '$'

  const cols: Column<Instrument>[] = [
    {
      key: 'symbol',
      header: 'ETF',
      width: '150px',
      render: (e) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-foreground">{e.symbol}</span>
          {e.stale && <Badge tone="warn">Stale</Badge>}
        </div>
      ),
    },
    { key: 'price', header: 'Price', align: 'right', render: (e) => (e.price == null ? '—' : `${currency}${fmt(e.price)}`) },
    { key: 'change_pct', header: 'Change', align: 'right', render: (e) => <Change value={e.change_pct} showArrow={false} /> },
    {
      key: 'low',
      header: 'Day range',
      align: 'right',
      sortable: false,
      render: (e) => <RangeCell low={e.low} high={e.high} price={e.price} />,
    },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right',
      render: (e) => (e.volume == null ? '—' : fmt(e.volume, { compact: true, decimals: 0 })),
    },
    {
      key: 'open',
      header: 'Open',
      align: 'right',
      render: (e) => (e.open == null ? '—' : fmt(e.open)),
    },
  ]

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setUniverse(input)
  }

  return (
    <PageShell
      category="Assets"
      title="ETF Analyzer"
      subtitle="Live prices, session ranges and turnover across a board of funds you choose."
      icon="solar:box-linear"
      backdrop="lattice"
      actions={<Segmented options={['India', 'US'] as const} value={board} onChange={switchBoard} size="sm" />}
      status={<><span className="live-dot" /> Live quotes</>}
    >
      <div className="mb-3">
        <Panel label="Board" meta={`${rows.length} resolved`} pad>
          <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[240px]">
              <span className="eyebrow">Symbols</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                className="input mt-1.5"
                placeholder="SPY, QQQ, GLD"
              />
            </label>
            <Btn type="submit" icon="solar:refresh-linear">Load</Btn>
          </form>
          {unavailable.length > 0 && (
            <p className="text-xs text-muted mt-2">
              No quote returned for {unavailable.join(', ')}. Those are left off the board rather than filled in.
            </p>
          )}
        </Panel>
      </div>

      {!loading && rows.length > 0 && (
        <KpiRow cols={4} className="mb-3">
          <StatTile label="Funds on the board" value={rows.length} hint={`${advancing} advancing`} />
          {best && <StatTile label="Leading" value={best.symbol} change={best.change_pct} hint={`${currency}${fmt(best.price)}`} />}
          {worst && <StatTile label="Lagging" value={worst.symbol} change={worst.change_pct} hint={`${currency}${fmt(worst.price)}`} />}
          {mostTraded && (
            <StatTile
              label="Most traded"
              value={mostTraded.symbol}
              hint={mostTraded.volume == null ? 'Volume not reported' : `${fmt(mostTraded.volume, { compact: true, decimals: 0 })} shares`}
            />
          )}
        </KpiRow>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-3 items-start">
        <Reveal>
          <Panel
            label="ETF board"
            meta={loading ? undefined : `${shown.length} of ${rows.length}`}
            actions={<SearchInput value={query} onChange={setQuery} placeholder="Search" className="w-36" />}
          >
            {loading ? (
              <SkeletonRows rows={8} cols={5} />
            ) : rows.length === 0 ? (
              <EmptyState
                icon="solar:box-linear"
                title="No quotes returned"
                body={error ?? 'None of those symbols resolved on this exchange. Check the tickers and try again.'}
              />
            ) : (
              <DataTable columns={cols} rows={shown} dense defaultSort={{ key: 'change_pct', dir: 'desc' }} />
            )}
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel label="Session breadth" pad>
            {rows.length === 0 ? (
              <p className="text-xs text-muted">Nothing on the board yet.</p>
            ) : (
              <>
                <div className="flex h-3 rounded-sm overflow-hidden mb-2">
                  <div className="bg-up" style={{ width: `${(advancing / rows.length) * 100}%` }} />
                  <div className="bg-down flex-1" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="val-up tabular-nums">{advancing} up</span>
                  <span className="val-down tabular-nums">{rows.length - advancing} down</span>
                </div>
              </>
            )}
          </Panel>

          <Note>
            Turnover matters more than headline size for a fund you intend to trade. A thin book widens the spread you pay on the way in and out.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
