'use client'

import React, { useEffect, useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import {
  Panel, Change, Badge, fmt, StatTile, KpiRow, DefRow, Note, EmptyState, SkeletonRows, Btn, cx,
} from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Segmented, SearchInput, Reveal } from '@/components/ui/controls'
import { fetchInstruments } from '@/lib/api'

/* Net asset values and daily moves are live quotes. Expense ratios and star
   ratings are not carried by any free feed, so they are absent rather than
   generated — the previous version of this page made both up. */

const BOARDS = {
  'US funds': {
    exchange: 'US',
    symbols: 'VFIAX, FXAIX, VTSAX, SWPPX, VBTLX, VTIAX, FCNTX, AGTHX, DODGX, PRGFX',
  },
  'India ETFs': {
    exchange: 'NSE',
    symbols: 'NIFTYBEES, JUNIORBEES, BANKBEES, ITBEES, GOLDBEES, LIQUIDBEES, MON100, CPSEETF',
  },
} as const

type BoardKey = keyof typeof BOARDS

interface Fund {
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

export default function MutualFundsPage() {
  const [board, setBoard] = useState<BoardKey>('US funds')
  const [input, setInput] = useState<string>(BOARDS['US funds'].symbols)
  const [universe, setUniverse] = useState<string>(BOARDS['US funds'].symbols)
  const [query, setQuery] = useState('')

  const [rows, setRows] = useState<Fund[]>([])
  const [unavailable, setUnavailable] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Fund | null>(null)

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
        setSelected(res.instruments?.[0] ?? null)
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
  const currency = rows.find((r) => r.currency)?.currency === 'INR' ? '₹' : '$'

  const cols: Column<Fund>[] = [
    {
      key: 'symbol',
      header: 'Fund',
      width: '150px',
      render: (f) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{f.symbol}</span>
          {f.stale && <Badge tone="warn">Stale</Badge>}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Net asset value',
      align: 'right',
      render: (f) => (f.price == null ? '—' : `${currency}${fmt(f.price)}`),
    },
    { key: 'change_pct', header: 'Change', align: 'right', render: (f) => <Change value={f.change_pct} showArrow={false} /> },
    { key: 'open', header: 'Open', align: 'right', render: (f) => (f.open == null ? '—' : fmt(f.open)) },
    { key: 'high', header: 'Day high', align: 'right', render: (f) => (f.high == null ? '—' : fmt(f.high)) },
    { key: 'low', header: 'Day low', align: 'right', render: (f) => (f.low == null ? '—' : fmt(f.low)) },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right',
      render: (f) => (f.volume == null || f.volume === 0 ? '—' : fmt(f.volume, { compact: true, decimals: 0 })),
    },
  ]

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setUniverse(input)
  }

  return (
    <PageShell
      category="Assets"
      title="Funds"
      subtitle="Live net asset values across a fund board you control."
      icon="solar:wallet-linear"
      backdrop="lattice"
      actions={<Segmented options={['US funds', 'India ETFs'] as const} value={board} onChange={switchBoard} size="sm" />}
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
                placeholder="VFIAX, FXAIX"
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
          <StatTile
            label="Session breadth"
            value={`${advancing} / ${rows.length}`}
            tone={advancing * 2 >= rows.length ? 'up' : 'down'}
            hint="Advancing versus total"
          />
        </KpiRow>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 items-start">
        <Reveal>
          <Panel
            label="Fund board"
            meta={loading ? undefined : `${shown.length} of ${rows.length}`}
            actions={<SearchInput value={query} onChange={setQuery} placeholder="Search" className="w-36" />}
          >
            {loading ? (
              <SkeletonRows rows={8} cols={5} />
            ) : rows.length === 0 ? (
              <EmptyState
                icon="solar:wallet-linear"
                title="No quotes returned"
                body={error ?? 'None of those symbols resolved on this exchange. Check the tickers and try again.'}
              />
            ) : (
              <DataTable
                columns={cols}
                rows={shown}
                dense
                defaultSort={{ key: 'change_pct', dir: 'desc' }}
                onRowClick={(f) => setSelected(f)}
                selectedIndex={shown.findIndex((f) => f.symbol === selected?.symbol)}
              />
            )}
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          {selected && (
            <Panel label="Selected fund" meta={selected.symbol} pad>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-xl font-semibold tabular-nums">
                  {selected.price == null ? '—' : `${currency}${fmt(selected.price)}`}
                </span>
                <Change value={selected.change_pct} />
              </div>
              <DefRow label="Open" value={selected.open == null ? '—' : fmt(selected.open)} />
              <DefRow label="Day high" value={selected.high == null ? '—' : fmt(selected.high)} />
              <DefRow label="Day low" value={selected.low == null ? '—' : fmt(selected.low)} />
              <DefRow
                label="Volume"
                value={selected.volume == null || selected.volume === 0 ? '—' : fmt(selected.volume, { compact: true, decimals: 0 })}
              />
            </Panel>
          )}

          <Note>
            Expense ratios and star ratings are not published in any free market feed, so they are not shown here. Check the fund's own factsheet before comparing cost.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
