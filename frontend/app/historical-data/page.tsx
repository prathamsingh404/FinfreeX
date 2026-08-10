'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Change, fmt, StatTile, KpiRow, Btn, EmptyState, SkeletonRows, SkeletonBlock, cx } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Segmented, Select } from '@/components/ui/controls'
import { AreaChart, CandleChart } from '@/components/ui/AreaChart'
import { useOHLCV } from '@/lib/hooks/useMarketData'

const SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'ITC']
const PERIODS = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
] as const

function toCsv(rows: any[]) {
  const head = 'date,open,high,low,close,volume'
  const body = rows
    .map((r) => [new Date(r.time).toISOString().slice(0, 10), r.open, r.high, r.low, r.close, r.volume].join(','))
    .join('\n')
  return `${head}\n${body}`
}

export default function HistoricalDataPage() {
  const [symbol, setSymbol] = useState(SYMBOLS[0])
  const [period, setPeriod] = useState<string>('3mo')
  const [view, setView] = useState<'Line' | 'Candles'>('Line')

  const { data: candlesData, loading } = useOHLCV(symbol, 'NSE', period, '1d')
  const candles = candlesData || []

  const stats = useMemo(() => {
    if (!candles.length) return null
    const closes = candles.map((c) => c.close)
    const first = closes[0]
    const last = closes[closes.length - 1]
    const high = Math.max(...candles.map((c) => c.high))
    const low = Math.min(...candles.map((c) => c.low))
    const avgVol = candles.reduce((s, c) => s + c.volume, 0) / candles.length
    // Daily standard deviation, annualised over 252 sessions
    const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i])
    const mean = returns.reduce((s, r) => s + r, 0) / (returns.length || 1)
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length || 1)
    const vol = Math.sqrt(variance * 252) * 100
    return { change: ((last - first) / first) * 100, high, low, avgVol, vol, last }
  }, [candles])

  const download = () => {
    const blob = new Blob([toCsv(candles)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${symbol}-${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cols: Column<(typeof candles)[number]>[] = [
    {
      key: 'time',
      header: 'Date',
      width: '110px',
      render: (r) => (
        <span className="tabular-nums text-muted">
          {new Date(r.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
        </span>
      ),
    },
    { key: 'open', header: 'Open', align: 'right', render: (r) => fmt(r.open) },
    { key: 'high', header: 'High', align: 'right', render: (r) => <span className="val-up">{fmt(r.high)}</span> },
    { key: 'low', header: 'Low', align: 'right', render: (r) => <span className="val-down">{fmt(r.low)}</span> },
    { key: 'close', header: 'Close', align: 'right', render: (r) => <span className="font-medium">{fmt(r.close)}</span> },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right',
      render: (r) => fmt(r.volume, { compact: true, decimals: 0 }),
    },
  ]

  return (
    <PageShell
      title="Historical Data"
      category="Professional"
      subtitle="Daily open, high, low, close and volume — on screen, and out as a file."
      icon="solar:server-square-linear"
      backdrop="tape"
      actions={
        <div className="flex items-center gap-2">
          <Segmented options={PERIODS} value={period} onChange={setPeriod} size="sm" />
          <Btn variant="subtle" icon="solar:download-minimalistic-linear" onClick={download} disabled={!candles.length}>
            Download CSV
          </Btn>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select label="Instrument" value={symbol} onChange={setSymbol} options={SYMBOLS} />
        <Segmented options={['Line', 'Candles'] as const} value={view} onChange={setView} size="sm" />
        {stats && <span className="text-xs text-muted ml-auto tabular-nums">{candles.length} sessions</span>}
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonBlock height={280} />
          <Panel label="Price history"><SkeletonRows rows={8} cols={6} /></Panel>
        </div>
      ) : candles.length === 0 ? (
        <Panel label="Price history">
          <EmptyState
            icon="solar:server-square-linear"
            title={`No history for ${symbol}`}
            body="Pick another instrument or a shorter window. Data appears as soon as the feed responds."
          />
        </Panel>
      ) : (
        <>
          {stats && (
            <KpiRow cols={5} className="mb-3">
              <StatTile label="Last close" value={fmt(stats.last)} change={stats.change} hint={`Over ${period}`} />
              <StatTile label="Period high" value={fmt(stats.high)} tone="up" hint="Intraday peak" />
              <StatTile label="Period low" value={fmt(stats.low)} tone="down" hint="Intraday trough" />
              <StatTile label="Average volume" value={fmt(stats.avgVol, { compact: true, decimals: 0 })} hint="Shares per session" />
              <StatTile label="Annualised volatility" value={`${stats.vol.toFixed(1)}%`} hint="From daily returns" />
            </KpiRow>
          )}

          <div className="space-y-3">
            <Panel label={`${symbol} price`} meta={`${period.toUpperCase()} · daily`} pad>
              {view === 'Line' ? (
                <AreaChart data={candles.map((c) => c.close)} height={280} up={(stats?.change ?? 0) >= 0} />
              ) : (
                <CandleChart candles={candles} height={280} />
              )}
            </Panel>

            <Panel label="Session table" meta={`${candles.length} rows · newest first`}>
              <DataTable columns={cols} rows={[...candles].reverse()} dense maxHeight={460} />
            </Panel>
          </div>
        </>
      )}
    </PageShell>
  )
}
