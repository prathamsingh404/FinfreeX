'use client'
import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Btn, Change, fmt } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getAllQuotes, getCandles } from '@/lib/mockData'

export default function HistoricalDataPage() {
  const quotes = getAllQuotes()
  const [symbol, setSymbol] = useState(quotes[0].symbol)
  const candles = getCandles(symbol, 30)

  type C = typeof candles[number]
  const cols: Column<C>[] = [
    { key: 'date', header: 'Date', render: (r) => <span className="text-soft">{r.date}</span> },
    { key: 'open', header: 'Open', align: 'right', render: (r) => fmt(r.open) },
    { key: 'high', header: 'High', align: 'right', render: (r) => <span className="text-emerald-bright">{fmt(r.high)}</span> },
    { key: 'low', header: 'Low', align: 'right', render: (r) => <span className="text-coral">{fmt(r.low)}</span> },
    { key: 'close', header: 'Close', align: 'right', render: (r) => <span className="font-semibold">{fmt(r.close)}</span> },
    { key: 'volume', header: 'Volume', align: 'right', render: (r) => fmt(r.volume, { compact: true, decimals: 0 }) },
  ]
  const change = ((candles[candles.length - 1].close - candles[0].close) / candles[0].close) * 100

  return (
    <PageShell
      title="Historical Data"
      category="Data"
      subtitle="OHLCV price history and downloadable time series across instruments."
      icon="solar:server-square-bold-duotone"
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {quotes.slice(0, 10).map((q) => (
          <Btn key={q.symbol} variant={q.symbol === symbol ? 'primary' : 'ghost'} onClick={() => setSymbol(q.symbol)} className="text-xs px-3 py-1.5">{q.symbol}</Btn>
        ))}
      </div>
      <Card className="mb-6">
        <SectionTitle title={`${symbol} — 30 Session History`} subtitle="Daily close" icon="solar:chart-2-bold-duotone" action={<Change value={change} suffix="%" />} />
        <AreaChart data={candles.map((c) => c.close)} height={260} up={change >= 0} />
      </Card>
      <Card pad={false} className="p-2">
        <DataTable columns={cols} rows={[...candles].reverse()} dense />
      </Card>
    </PageShell>
  )
}
