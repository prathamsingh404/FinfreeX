'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useScreener, useMovers, useIndices } from '@/lib/hooks/useMarketData'
import { fmt, cx } from '@/components/ui/kit'

/* ============================================================
   Landing-page market table.
   A working screener, not a screenshot: real tabs, real sorting,
   real filtering, click through to research.
   ============================================================ */

type Tab = 'gainers' | 'losers' | 'active' | 'indices'
type SortKey = 'symbol' | 'price' | 'change' | 'volume' | 'mcap'

const TABS: { id: Tab; label: string }[] = [
  { id: 'gainers', label: 'Gainers' },
  { id: 'losers', label: 'Losers' },
  { id: 'active', label: 'Most Active' },
  { id: 'indices', label: 'Indices' },
]

interface Row {
  symbol: string
  name?: string
  price: number
  change: number
  volume?: number
  mcap?: number
  sector?: string
}

function Sparkline({ up }: { up: boolean }) {
  // Deterministic shape per direction — a visual cue, not a data claim.
  const pts = up ? '0,14 12,10 24,12 36,6 48,7 60,2' : '0,3 12,6 24,4 36,10 48,9 60,14'
  return (
    <svg width="60" height="16" viewBox="0 0 60 16" className="overflow-visible">
      <polyline points={pts} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function MarketScreener() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('gainers')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('change')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const { data: movers, loading: moversLoading } = useMovers('NSE')
  const { data: screener, loading: screenerLoading } = useScreener({ universe: 'ALL' })
  const { data: indicesObj, loading: indicesLoading } = useIndices()

  const loading =
    tab === 'indices' ? indicesLoading : tab === 'active' ? screenerLoading : moversLoading

  const rows = useMemo<Row[]>(() => {
    if (tab === 'indices') {
      return indicesObj
        ? Object.entries(indicesObj).map(([name, d]: [string, any]) => ({
            symbol: name,
            price: d.price,
            change: d.change_pct,
            sector: d.category,
          }))
        : []
    }
    if (tab === 'active') {
      return (screener || [])
        .filter((q: any) => q.avg_volume)
        .map((q: any) => ({
          symbol: q.symbol,
          name: q.name,
          price: q.current_price,
          change: q.return_1m ?? 0,
          volume: q.avg_volume,
          mcap: q.market_cap,
          sector: q.sector,
        }))
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
        .slice(0, 25)
    }
    const list = tab === 'gainers' ? movers?.gainers : movers?.losers
    return (list || []).map((q: any) => ({
      symbol: q.symbol,
      name: q.exchange,
      price: q.current_price,
      change: q.change_pct,
      volume: q.volume,
    }))
  }, [tab, movers, screener, indicesObj])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? rows.filter((r) => r.symbol.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q))
      : rows
    const key = (r: Row) =>
      sort === 'symbol' ? r.symbol : sort === 'price' ? r.price : sort === 'change' ? r.change : sort === 'volume' ? (r.volume ?? 0) : (r.mcap ?? 0)
    return [...filtered].sort((a, b) => {
      const av = key(a)
      const bv = key(b)
      if (typeof av === 'string' || typeof bv === 'string') {
        return dir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv))
      }
      return dir === 'desc' ? bv - av : av - bv
    })
  }, [rows, query, sort, dir])

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSort(k)
      setDir('desc')
    }
  }

  const Th = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className={cx('px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap', className)}
    >
      <span className={cx('inline-flex items-center gap-1', sort === k && 'text-foreground')}>
        {label}
        {sort === k && (
          <iconify-icon icon={dir === 'desc' ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'} width="11"></iconify-icon>
        )}
      </span>
    </th>
  )

  return (
    <div className="surface overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id)
                setSort(t.id === 'indices' ? 'change' : 'change')
                setDir('desc')
              }}
              className={cx(
                'px-3 py-1.5 rounded text-[13px] font-medium transition-colors cursor-pointer',
                tab === t.id ? 'bg-white/[0.06] text-foreground' : 'text-muted hover:text-soft'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 px-2.5 h-8 rounded bg-white/[0.03] border border-border focus-ring transition-colors w-full sm:w-48">
          <iconify-icon icon="solar:magnifer-linear" width="13" class="text-muted shrink-0"></iconify-icon>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter"
            className="bg-transparent outline-none text-xs text-foreground placeholder:text-muted w-full min-w-0"
            aria-label="Filter symbols"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[620px]">
          <thead className="text-[11px] text-muted uppercase tracking-wide border-b border-border">
            <tr>
              <Th k="symbol" label="Symbol" className="pl-4" />
              <Th k="price" label="Price" className="text-right" />
              <Th k="change" label="Change" className="text-right" />
              <th className="px-3 py-2 font-medium text-right w-[72px]">Trend</th>
              {tab !== 'indices' && <Th k="volume" label="Volume" className="text-right" />}
              {tab === 'active' && <Th k="mcap" label="Mkt cap" className="text-right" />}
              <th className="px-3 py-2 font-medium">{tab === 'indices' ? 'Category' : 'Sector'}</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td colSpan={7} className="px-4 py-2.5">
                    <div className="skeleton h-7 w-full" />
                  </td>
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                  {query ? `Nothing matches “${query}”.` : 'No data available right now.'}
                </td>
              </tr>
            ) : (
              visible.slice(0, 12).map((r) => {
                const up = r.change >= 0
                return (
                  <tr
                    key={r.symbol}
                    onClick={() => tab !== 'indices' && router.push(`/fundamental-analysis?symbol=${encodeURIComponent(r.symbol)}`)}
                    className={cx(
                      'border-b border-border/60 transition-colors',
                      tab !== 'indices' && 'cursor-pointer hover:bg-white/[0.02]'
                    )}
                  >
                    <td className="pl-4 pr-3 py-2.5">
                      <div className="font-medium text-foreground tracking-tight">{r.symbol}</div>
                      {r.name && <div className="text-[11px] text-muted truncate max-w-[180px]">{r.name}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{fmt(r.price)}</td>
                    <td className={cx('px-3 py-2.5 text-right tabular-nums', up ? 'text-emerald-bright' : 'text-coral')}>
                      {up ? '+' : '−'}{Math.abs(r.change).toFixed(2)}%
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end"><Sparkline up={up} /></div>
                    </td>
                    {tab !== 'indices' && (
                      <td className="px-3 py-2.5 text-right tabular-nums text-soft">
                        {r.volume ? fmt(r.volume, { compact: true, decimals: 0 }) : '—'}
                      </td>
                    )}
                    {tab === 'active' && (
                      <td className="px-3 py-2.5 text-right tabular-nums text-soft">
                        {r.mcap ? fmt(r.mcap, { compact: true }) : '—'}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-muted truncate max-w-[150px]">{r.sector || '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
