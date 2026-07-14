'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, StatCard, SectionTitle, Change, Donut, ProgressBar, Btn, fmt } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { usePortfolio, usePortfolioHoldings } from '@/lib/hooks/useMarketData'
import { useAuth } from '@/context/AuthContext'

const SECTOR_COLORS = ['#34D399', '#FF6B57', '#FBBF24', '#38BDF8', '#A78BFA', '#F472B6', '#4ADE80', '#FB923C']

export default function PortfoliosPage() {
  const { user } = useAuth()
  const userId = user?.id || 'demo-user-123'

  const { data: portfolioData, loading: pfLoading } = usePortfolio(userId)
  const { data: holdingsData, loading: holdingsLoading } = usePortfolioHoldings(userId)

  const pf = portfolioData || { totalValue: 0, totalPnl: 0, totalPnlPct: 0, dayChange: 0, investedValue: 0, totalCost: 0, cash: 0 }
  const holdings = holdingsData || []

  const [view, setView] = useState<'holdings' | 'allocation'>('holdings')

  const bySector = holdings.reduce((acc: any, h: any) => {
    acc[h.sector || 'Other'] = (acc[h.sector || 'Other'] ?? 0) + (h.value || 0)
    return acc
  }, {})
  const donut = Object.entries(bySector).map(([label, value], i) => ({ label, value: value as number, color: SECTOR_COLORS[i % SECTOR_COLORS.length] }))

  const columns: Column<any>[] = [
    { key: 'symbol', header: 'Symbol', render: (h) => (
      <div className="text-left">
        <div className="font-semibold">{h.symbol}</div>
        <div className="text-[11px] text-muted truncate max-w-[140px]">{h.name}</div>
      </div>
    ) },
    { key: 'qty', header: 'Qty', align: 'right', render: (h) => h.qty },
    { key: 'avg', header: 'Avg', align: 'right', render: (h) => `₹${fmt(h.avgPrice || 0)}` },
    { key: 'price', header: 'LTP', align: 'right', render: (h) => `₹${fmt(h.price || 0)}` },
    { key: 'value', header: 'Value', align: 'right', render: (h) => `₹${fmt(h.value || 0, { compact: true })}` },
    { key: 'pnl', header: 'P&L', align: 'right', render: (h) => (
      <div>
        <div className={(h.pnl || 0) >= 0 ? 'text-primary' : 'text-coral'}>{(h.pnl || 0) >= 0 ? '+' : ''}₹{fmt(Math.abs(h.pnl || 0), { compact: true })}</div>
        <Change value={h.pnlPct} showArrow={false} className="text-[11px]" />
      </div>
    ) },
    { key: 'weight', header: 'Weight', align: 'right', render: (h) => (
      <div className="flex flex-col items-end gap-1 min-w-[70px]">
        <span className="text-[11px]">{h.weight ? h.weight.toFixed(1) : 0}%</span>
        <ProgressBar value={h.weight || 0} className="w-16" />
      </div>
    ) },
  ]

  return (
    <PageShell
      category="Core Intelligence"
      title="Portfolio Center"
      subtitle="Track holdings, allocation, and performance across your investments."
      icon="solar:wallet-money-linear"
      actions={<Btn variant="primary"><span className="inline-flex items-center gap-2"><iconify-icon icon="solar:add-circle-linear" width="16"></iconify-icon>New Holding</span></Btn>}
    >
      {pfLoading || holdingsLoading ? (
        <div className="flex items-center justify-center h-64 text-soft">Loading live portfolio data...</div>
      ) : holdings.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-soft border border-dashed border-border rounded-xl">
          Connect your broker API or add manual holdings to view portfolio performance.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Net Worth" value={fmt(pf.totalValue, { compact: true, prefix: '₹' })} change={pf.dayChange} icon="solar:wallet-money-linear" sparkUp={pf.dayChange >= 0} />
            <StatCard label="Invested" value={fmt(pf.investedValue, { compact: true, prefix: '₹' })} icon="solar:safe-square-linear" hint={`Cost ₹${fmt(pf.totalCost, { compact: true })}`} />
            <StatCard label="Unrealized P&L" value={fmt(pf.totalPnl, { compact: true, prefix: '₹' })} change={pf.totalPnlPct} icon="solar:chart-2-linear" sparkUp={pf.totalPnl >= 0} />
            <StatCard label="Available Cash" value={fmt(pf.cash, { compact: true, prefix: '₹' })} icon="solar:banknote-2-linear" hint="Ready to deploy" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border" pad={false}>
              <div className="p-5 pb-0 flex items-center justify-between">
                <SectionTitle title="Holdings" subtitle={`${holdings.length} positions`} icon="solar:list-linear" />
                <div className="flex gap-1 p-1 rounded-lg bg-surface border border-border">
                  {(['holdings', 'allocation'] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${view === v ? 'bg-primary text-[#04120C]' : 'text-soft hover:text-foreground'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-5 pt-3">
                {view === 'holdings' ? (
                  <DataTable columns={columns} rows={holdings} />
                ) : (
                  <div className="space-y-3">
                    {holdings.map((h: any, i: number) => (
                      <div key={h.symbol} className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                        <span className="text-sm font-medium w-28 shrink-0">{h.symbol}</span>
                        <ProgressBar value={h.weight || 0} className="flex-1" />
                        <span className="text-sm tabular-nums w-14 text-right">{h.weight ? h.weight.toFixed(1) : 0}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="border-border">
                <SectionTitle title="Sector Allocation" icon="solar:pie-chart-2-linear" />
                <div className="flex flex-col items-center gap-4">
                  <Donut segments={donut} center={<><span className="text-[11px] text-soft">Invested</span><span className="text-lg font-bold">₹{fmt(pf.investedValue, { compact: true })}</span></>} />
                  <div className="w-full grid grid-cols-1 gap-1.5">
                    {donut.map((d) => (
                      <div key={d.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-soft">{d.label}</span>
                        </div>
                        <span className="tabular-nums">{pf.investedValue > 0 ? ((d.value / pf.investedValue) * 100).toFixed(1) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </PageShell>
  )
}
