'use client'
import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Btn, Change, fmt } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { DataTable, Column } from '@/components/ui/DataTable'
import { useOHLCV } from '@/lib/hooks/useMarketData'

const SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'ITC']

export default function HistoricalDataPage() {
  const [symbol, setSymbol] = useState(SYMBOLS[0])
  const [period, setPeriod] = useState('3mo')
  
  const { data: candlesData, loading } = useOHLCV(symbol, 'NSE', period, '1d')
  const candles = candlesData || []

  type C = typeof candles[number]
  const cols: Column<C>[] = [
    { key: 'time', header: 'Date', render: (r) => <span className="text-soft">{new Date(r.time).toLocaleDateString()}</span> },
    { key: 'open', header: 'Open', align: 'right', render: (r) => fmt(r.open) },
    { key: 'high', header: 'High', align: 'right', render: (r) => <span className="text-primary">{fmt(r.high)}</span> },
    { key: 'low', header: 'Low', align: 'right', render: (r) => <span className="text-coral">{fmt(r.low)}</span> },
    { key: 'close', header: 'Close', align: 'right', render: (r) => <span className="font-semibold">{fmt(r.close)}</span> },
    { key: 'volume', header: 'Volume', align: 'right', render: (r) => fmt(r.volume, { compact: true, decimals: 0 }) },
  ]
  
  const change = candles.length > 0 ? ((candles[candles.length - 1].close - candles[0].close) / candles[0].close) * 100 : 0

  return (
    <PageShell
      title="Historical Data"
      category="Data"
      subtitle="OHLCV price history and downloadable time series across instruments."
      icon="solar:server-square-bold-duotone"
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {SYMBOLS.map((s) => (
          <Btn key={s} variant={s === symbol ? 'primary' : 'ghost'} onClick={() => setSymbol(s)} className={`text-xs px-3 py-1.5 ${s === symbol ? 'bg-primary text-black' : ''}`}>{s}</Btn>
        ))}
        <div className="ml-auto flex gap-1 bg-surface-2 p-1 rounded-xl border border-border">
          {['1mo', '3mo', '1y'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-2 py-1 text-xs rounded-lg ${period === p ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64 text-soft">Loading historical data for {symbol}...</div>
      ) : candles.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-soft">No historical data available.</div>
      ) : (
        <>
          <Card className="mb-6 border-border">
            <SectionTitle title={`${symbol} — ${period.toUpperCase()} History`} subtitle="Daily close" icon="solar:chart-2-bold-duotone" action={<Change value={change} suffix="%" />} />
            <AreaChart data={candles.map((c) => c.close)} height={260} up={change >= 0} />
          </Card>
          <Card pad={false} className="p-2 border-border">
            <DataTable columns={cols} rows={[...candles].reverse()} dense />
          </Card>
        </>
      )}
    </PageShell>
  )
}
