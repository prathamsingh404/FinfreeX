'use client'

import React, { useEffect, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Badge, StatTile, KpiRow, EmptyState, SkeletonRows, Note, Btn, cx } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Segmented } from '@/components/ui/controls'
import { fetchRatios } from '@/lib/api'

/* Every ratio is read from the company's filings. A metric the filing does
   not carry renders as a dash, never as an estimate. */

const DEFAULT_UNIVERSE = 'RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, SBIN, ITC, LT, AXISBANK, MARUTI'
const EXCHANGES = ['NSE', 'BSE', 'US'] as const

interface Ratio {
  symbol: string
  name: string | null
  sector: string | null
  pe: number | null
  forward_pe: number | null
  pb: number | null
  roe: number | null
  roa: number | null
  debt_to_equity: number | null
  current_ratio: number | null
  net_margin: number | null
  operating_margin: number | null
  revenue_growth: number | null
  market_cap: number | null
  stale?: boolean
}

const num = (v: number | null | undefined, digits = 1, suffix = '') =>
  v == null ? <span className="text-muted">—</span> : <span className="tabular-nums">{v.toFixed(digits)}{suffix}</span>

function median(values: (number | null)[]) {
  const clean = values.filter((v): v is number => v != null).sort((a, b) => a - b)
  if (!clean.length) return null
  const mid = Math.floor(clean.length / 2)
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2
}

export default function FinancialRatiosPage() {
  const [input, setInput] = useState(DEFAULT_UNIVERSE)
  const [universe, setUniverse] = useState(DEFAULT_UNIVERSE)
  const [exchange, setExchange] = useState<string>('NSE')

  const [rows, setRows] = useState<Ratio[]>([])
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
        const res = await fetchRatios(symbols, exchange)
        if (cancelled) return
        setRows(res.ratios ?? [])
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

  const medPe = median(rows.map((r) => r.pe))
  const medRoe = median(rows.map((r) => r.roe))
  const medMargin = median(rows.map((r) => r.net_margin))

  const cols: Column<Ratio>[] = [
    {
      key: 'symbol',
      header: 'Company',
      width: '190px',
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-foreground">{r.symbol}</div>
          <div className="text-xs text-muted truncate">{r.name ?? '—'}</div>
        </div>
      ),
    },
    { key: 'sector', header: 'Sector', render: (r) => (r.sector ? <Badge tone="neutral">{r.sector}</Badge> : <span className="text-muted">—</span>) },
    { key: 'pe', header: 'P/E', align: 'right', render: (r) => num(r.pe) },
    { key: 'forward_pe', header: 'Forward P/E', align: 'right', render: (r) => num(r.forward_pe) },
    { key: 'pb', header: 'P/B', align: 'right', render: (r) => num(r.pb, 2) },
    {
      key: 'roe',
      header: 'Return on equity',
      align: 'right',
      render: (r) => (r.roe == null ? <span className="text-muted">—</span> : <span className={cx('tabular-nums', r.roe >= 15 ? 'val-up' : '')}>{r.roe.toFixed(1)}%</span>),
    },
    { key: 'net_margin', header: 'Net margin', align: 'right', render: (r) => num(r.net_margin, 1, '%') },
    {
      key: 'debt_to_equity',
      header: 'Debt / equity',
      align: 'right',
      render: (r) => (r.debt_to_equity == null ? <span className="text-muted">—</span> : <span className={cx('tabular-nums', r.debt_to_equity > 150 ? 'val-down' : '')}>{r.debt_to_equity.toFixed(0)}</span>),
    },
    { key: 'current_ratio', header: 'Current ratio', align: 'right', render: (r) => num(r.current_ratio, 2) },
    { key: 'revenue_growth', header: 'Revenue growth', align: 'right', render: (r) => num(r.revenue_growth, 1, '%') },
  ]

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setUniverse(input)
  }

  return (
    <PageShell
      category="Research"
      title="Financial Ratios"
      subtitle="Valuation, profitability and leverage as filed, side by side across a universe you choose."
      icon="solar:calculator-linear"
      backdrop="lattice"
      actions={<Segmented options={EXCHANGES} value={exchange} onChange={setExchange} size="sm" />}
    >
      <div className="mb-3">
        <Panel label="Universe" meta={`${rows.length} resolved`} pad>
          <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[240px]">
              <span className="eyebrow">Symbols</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                className="input mt-1.5"
                placeholder="RELIANCE, TCS, INFY"
              />
            </label>
            <Btn type="submit" icon="solar:refresh-linear">Load</Btn>
          </form>
          {unavailable.length > 0 && (
            <p className="text-xs text-muted mt-2">
              No filings returned for {unavailable.join(', ')}. Those rows are omitted rather than estimated.
            </p>
          )}
        </Panel>
      </div>

      {!loading && rows.length > 0 && (
        <KpiRow cols={4} className="mb-3">
          <StatTile label="Companies" value={rows.length} hint={`${unavailable.length} unavailable`} />
          <StatTile label="Median P/E" value={medPe == null ? '—' : medPe.toFixed(1)} hint="Across the universe" />
          <StatTile label="Median return on equity" value={medRoe == null ? '—' : `${medRoe.toFixed(1)}%`} tone="up" hint="Profitability" />
          <StatTile label="Median net margin" value={medMargin == null ? '—' : `${medMargin.toFixed(1)}%`} hint="Bottom-line efficiency" />
        </KpiRow>
      )}

      <Panel label="Ratio board" meta={loading ? undefined : `${rows.length} companies`}>
        {loading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="solar:calculator-linear"
            title="No ratios available"
            body={error ?? 'None of those symbols returned filing data. Check the symbols and the exchange.'}
          />
        ) : (
          <DataTable columns={cols} rows={rows} dense defaultSort={{ key: 'pe', dir: 'asc' }} />
        )}
      </Panel>

      <div className="mt-3">
        <Note>
          Ratios are only comparable inside a sector. A bank's debt-to-equity and a software firm's are measuring different businesses.
        </Note>
      </div>
    </PageShell>
  )
}
