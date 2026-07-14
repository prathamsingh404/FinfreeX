'use client'
import { useState, useMemo } from 'react'
import PageShell from '@/components/PageShell'
import { Card, fmt, Change, Btn } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { useScreener } from '@/lib/hooks/useMarketData'

const SECTORS = ['Technology', 'Financial Services', 'Energy', 'Healthcare', 'Consumer Cyclical', 'Consumer Defensive', 'Industrials', 'Basic Materials', 'Utilities', 'Communication Services']

export default function PeerComparisonPage() {
  const [sector, setSector] = useState('Technology')
  
  // Use the live screener data (fetch all then filter client-side for snappy sector switching)
  const { data: screenerData, loading } = useScreener({ universe: 'ALL' })
  
  const rows = useMemo(() => {
    if (!screenerData) return []
    return screenerData.filter((r: any) => r.sector === sector).sort((a: any, b: any) => (b.market_cap || 0) - (a.market_cap || 0))
  }, [screenerData, sector])

  const cols: Column<any>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-bold text-foreground">{r.symbol}</span> },
    { key: 'name', header: 'Company', className: 'text-soft truncate max-w-[150px]' },
    { key: 'market_cap', header: 'Market Cap', align: 'right', render: (r) => fmt(r.market_cap, { compact: true, prefix: '₹' }) },
    { key: 'pe_ratio', header: 'P/E', align: 'right', render: (r) => r.pe_ratio ? r.pe_ratio.toFixed(1) : '-' },
    { key: 'roe', header: 'ROE %', align: 'right', render: (r) => r.roe ? <span className="text-primary font-semibold">{r.roe.toFixed(1)}</span> : '-' },
    { key: 'revenue_growth', header: 'Rev Growth', align: 'right', render: (r) => r.revenue_growth ? <Change value={r.revenue_growth} suffix="%" /> : '-' },
    { key: 'return_1m', header: '1M Return', align: 'right', render: (r) => r.return_1m ? <Change value={r.return_1m} suffix="%" /> : '-' },
  ]

  return (
    <PageShell
      title="Peer Comparison"
      category="Fundamentals"
      subtitle="Benchmark companies within a sector on scale, valuation and growth."
      icon="solar:users-group-two-rounded-bold-duotone"
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {SECTORS.map((s) => (
          <Btn key={s} variant={s === sector ? 'primary' : 'ghost'} onClick={() => setSector(s)} className={`text-xs px-3 py-1.5 ${s === sector ? 'bg-primary text-black' : ''}`}>{s}</Btn>
        ))}
      </div>
      <Card pad={false} className="p-2 border-border">
        {loading ? (
           <div className="flex items-center justify-center h-48 text-soft">Loading peer universe from live data...</div>
        ) : rows.length === 0 ? (
           <div className="flex items-center justify-center h-48 text-soft">No peers found in {sector} sector.</div>
        ) : (
           <DataTable columns={cols} rows={rows} />
        )}
      </Card>
    </PageShell>
  )
}
