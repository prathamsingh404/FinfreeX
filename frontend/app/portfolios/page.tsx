'use client'

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import PageShell from '@/components/PageShell'
import { Card, StatCard, SectionTitle, Change, Donut, ProgressBar, Btn, fmt, Badge } from '@/components/ui/kit'
import { AIScoreRing, RiskGauge, InsightCard } from '@/components/ui/ai'
import { DataTable, Column } from '@/components/ui/DataTable'
import { usePortfolio, usePortfolioHoldings, useBrokerHoldings } from '@/lib/hooks/useMarketData'
import { executeTrade } from '@/lib/api'

const SECTOR_COLORS = ['#34D399', '#FF6B57', '#FBBF24', '#38BDF8', '#A78BFA', '#F472B6', '#4ADE80', '#FB923C']

function useDiagnostics(holdings: any[], pf: any) {
  return useMemo(() => {
    if (!holdings.length) return null
    const weights = holdings.map((h) => h.weight || 0)
    const maxWeight = Math.max(...weights)
    const topHolding = holdings.find((h) => (h.weight || 0) === maxWeight)
    const bySector: Record<string, number> = {}
    for (const h of holdings) bySector[h.sector || 'Other'] = (bySector[h.sector || 'Other'] ?? 0) + (h.weight || 0)
    const sectorEntries = Object.entries(bySector).sort((a, b) => b[1] - a[1])
    const topSector = sectorEntries[0]
    const sectorCount = sectorEntries.length
    const losers = holdings.filter((h) => (h.pnlPct || 0) < -10)
    
    let health = 100
    if (maxWeight > 20) health -= Math.min(25, (maxWeight - 20) * 1.5)
    if (topSector && topSector[1] > 40) health -= Math.min(20, (topSector[1] - 40) * 0.8)
    if (sectorCount < 4) health -= (4 - sectorCount) * 6
    if (losers.length) health -= Math.min(20, losers.length * 5)
    if ((pf.totalPnlPct || 0) > 0) health += 5
    health = Math.round(Math.max(5, Math.min(98, health)))
    
    const risk = Math.round(Math.max(5, Math.min(95, maxWeight * 1.6 + (topSector?.[1] ?? 0) * 0.7 - sectorCount * 3)))
    const suggestions: { title: string; body: string; tone: 'ai' | 'amber' | 'coral' | 'emerald' }[] = []
    
    if (maxWeight > 20 && topHolding)
      suggestions.push({
        title: `Trim ${topHolding.symbol}`,
        body: `${topHolding.symbol} is ${maxWeight.toFixed(1)}% of the book. Above 20% concentration moves your whole portfolio on single misses.`,
        tone: 'amber',
      })
    if (topSector && topSector[1] > 40)
      suggestions.push({
        title: `${topSector[0]} concentration`,
        body: `${topSector[1].toFixed(0)}% sits in ${topSector[0]}. A sector correction hits ${topSector[1].toFixed(0)}% of your capital at once.`,
        tone: 'coral',
      })
    if (losers.length)
      suggestions.push({
        title: `${losers.length} position${losers.length > 1 ? 's' : ''} down over 10%`,
        body: `${losers.map((l) => l.symbol).join(', ')} — worth check whether the original thesis holds.`,
        tone: 'ai',
      })
    if (sectorCount < 4)
      suggestions.push({
        title: 'Thin diversification',
        body: `Only ${sectorCount} sector${sectorCount > 1 ? 's' : ''} represented. Adding uncorrelated sectors cuts drawdowns.`,
        tone: 'ai',
      })
    if (!suggestions.length)
      suggestions.push({
        title: 'Balanced allocation',
        body: 'No concentration flags. Run the analyzer for factor-level attribution.',
        tone: 'emerald',
      })
    return { health, risk, suggestions, sectorEntries, maxWeight, topHolding }
  }, [holdings, pf])
}

export default function PortfoliosPage() {
  const [bookType, setBookType] = useState<'paper' | 'broker'>('paper')
  const [view, setView] = useState<'holdings' | 'allocation'>('holdings')
  
  // Paper Portfolio Hooks
  const { data: pfData, loading: pfLoading, refetch: refetchPf } = usePortfolio()
  const { data: holdingsData, loading: holdingsLoading, refetch: refetchHoldings } = usePortfolioHoldings()
  
  // Broker Holdings Hooks
  const { data: brokerHoldingsData, loading: brokerLoading, refetch: refetchBroker } = useBrokerHoldings()
  
  const [isBrokerConnected, setIsBrokerConnected] = useState(false)
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customSym, setCustomSym] = useState('')
  const [customQty, setCustomQty] = useState(10)
  const [addMsg, setAddMsg] = useState('')

  useEffect(() => {
    setIsBrokerConnected(typeof window !== 'undefined' && !!localStorage.getItem('upstox_access_token'))
  }, [])

  // Resolve active book data
  const pf = useMemo(() => {
    if (bookType === 'paper') {
      return pfData || { totalValue: 0, totalPnl: 0, totalPnlPct: 0, dayChange: 0, investedValue: 0, totalCost: 0, cash: 0 }
    } else {
      // Calculate stats from broker holdings
      const holdings = brokerHoldingsData || []
      const investedValue = holdings.reduce((s, h) => s + (h.value || 0), 0)
      const totalCost = holdings.reduce((s, h) => s + (h.avgPrice || h.avg_price || 0) * (h.qty || h.quantity || 0), 0)
      const totalPnl = holdings.reduce((s, h) => s + (h.pnl || 0), 0)
      const totalValue = investedValue
      const totalPnlPct = totalCost ? (totalPnl / totalCost * 100) : 0.0
      return {
        totalValue,
        totalPnl,
        totalPnlPct,
        dayChange: 1.25, // Mock day change
        investedValue,
        totalCost,
        cash: 0.0,
        currency: 'INR',
        name: 'Upstox Connected Account'
      }
    }
  }, [bookType, pfData, brokerHoldingsData])

  const holdings = useMemo(() => {
    return bookType === 'paper' ? (holdingsData || []) : (brokerHoldingsData || [])
  }, [bookType, holdingsData, brokerHoldingsData])

  const diag = useDiagnostics(holdings, pf)

  const bySector = useMemo(() => {
    return holdings.reduce((acc: any, h: any) => {
      acc[h.sector || 'Other'] = (acc[h.sector || 'Other'] ?? 0) + (h.value || 0)
      return acc
    }, {})
  }, [holdings])

  const donut = useMemo(() => {
    return Object.entries(bySector).map(([label, value], i) => ({
      label,
      value: value as number,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length]
    }))
  }, [bySector])

  const disconnectBroker = () => {
    localStorage.removeItem('upstox_access_token')
    setIsBrokerConnected(false)
    setBookType('paper')
  }

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault()
    setAddMsg('')
    if (!customSym) return
    try {
      const res = await executeTrade(customSym.toUpperCase().trim(), 'NSE', 'BUY', customQty)
      if (res.error) {
        setAddMsg(`Error: ${res.error}`)
      } else {
        setAddMsg(`Successfully added ${customQty} shares of ${customSym.toUpperCase()}!`)
        refetchPf()
        refetchHoldings()
        setCustomSym('')
        setTimeout(() => {
          setShowAddCustom(false)
          setAddMsg('')
        }, 1500)
      }
    } catch (err: any) {
      setAddMsg(`Failed: ${err.message || 'Error'}`)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      render: (h) => (
        <div className="text-left">
          <div className="font-semibold">{h.symbol}</div>
          <div className="text-[11px] text-muted truncate max-w-[140px]">{h.name || 'Stock'}</div>
        </div>
      )
    },
    { key: 'qty', header: 'Qty', align: 'right', render: (h) => h.qty || h.quantity },
    { key: 'avg', header: 'Avg', align: 'right', render: (h) => `₹${fmt(h.avgPrice || h.avg_price || 0)}` },
    { key: 'price', header: 'LTP', align: 'right', render: (h) => `₹${fmt(h.price || h.ltp || 0)}` },
    { key: 'value', header: 'Value', align: 'right', render: (h) => `₹${fmt(h.value || (h.qty * h.price) || 0, { compact: true })}` },
    {
      key: 'pnl',
      header: 'P&L',
      align: 'right',
      render: (h) => (
        <div>
          <div className={(h.pnl || 0) >= 0 ? 'text-emerald-bright' : 'text-coral'}>
            {(h.pnl || 0) >= 0 ? '+' : ''}₹{fmt(Math.abs(h.pnl || 0), { compact: true })}
          </div>
          <Change value={h.pnlPct || h.pnl_pct} showArrow={false} className="text-[11px]" />
        </div>
      )
    },
    {
      key: 'weight',
      header: 'Weight',
      align: 'right',
      render: (h) => (
        <div className="flex flex-col items-end gap-1 min-w-[70px]">
          <span className="text-[11px]">{h.weight ? h.weight.toFixed(1) : 0}%</span>
          <ProgressBar value={h.weight || 0} className="w-16" />
        </div>
      )
    },
  ]

  const loading = pfLoading || holdingsLoading || brokerLoading

  return (
    <PageShell
      category="Portfolio"
      title="Portfolio Workspace"
      subtitle="Analyze exposure, risks, and health across your live and simulated holdings."
      icon="solar:wallet-money-linear"
      actions={
        <div className="flex gap-2">
          <button onClick={() => setShowAddCustom(!showAddCustom)} className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold text-soft hover:text-foreground cursor-pointer transition-colors">
            {showAddCustom ? 'Close Drawer' : '+ Add Custom Asset'}
          </button>
          <Link href="/portfolio-analyzer">
            <Btn variant="ghost">Run full analysis</Btn>
          </Link>
        </div>
      }
    >
      {/* ─── Add Custom Asset Drawer ─── */}
      {showAddCustom && (
        <Card className="mb-6 border-primary/25 bg-primary/5 fade-up">
          <SectionTitle title="Add Custom Holding" subtitle="Quickly add holdings to your paper portfolio" icon="solar:add-circle-linear" />
          <form onSubmit={handleAddCustom} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <label className="block">
              <span className="block text-xs text-soft mb-1">Symbol (NSE)</span>
              <input value={customSym} onChange={e => setCustomSym(e.target.value)} placeholder="e.g. RELIANCE" className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground uppercase outline-none focus:border-primary" required />
            </label>
            <label className="block">
              <span className="block text-xs text-soft mb-1">Quantity</span>
              <input type="number" min={1} value={customQty} onChange={e => setCustomQty(Number(e.target.value))} className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary" required />
            </label>
            <div className="col-span-1">
              <Btn type="submit" variant="primary" className="w-full justify-center">Add Position</Btn>
            </div>
            {addMsg && (
              <div className="col-span-1 sm:col-span-4 text-xs font-semibold text-primary mt-2">{addMsg}</div>
            )}
          </form>
        </Card>
      )}

      {/* ─── Portfolio Book Switcher Tab Bar ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-1 rounded-xl bg-surface border border-border mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => setBookType('paper')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${bookType === 'paper' ? 'bg-primary text-[#04120C]' : 'text-soft hover:text-foreground'}`}
          >
            Simulated Paper Book
          </button>
          <button
            onClick={() => {
              if (isBrokerConnected) setBookType('broker')
            }}
            disabled={!isBrokerConnected}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${!isBrokerConnected ? 'text-muted cursor-not-allowed opacity-50' : bookType === 'broker' ? 'bg-primary text-[#04120C]' : 'text-soft hover:text-foreground'}`}
          >
            Broker holdings
            {isBrokerConnected && <Badge tone="primary" className="ml-1">Upstox</Badge>}
          </button>
        </div>

        <div className="flex items-center gap-2 pr-2">
          {isBrokerConnected ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] text-emerald-bright"><span className="w-2 h-2 rounded-full bg-emerald-bright animate-ping"></span>Upstox Connected</span>
              <button onClick={disconnectBroker} className="text-xs font-medium text-coral hover:underline cursor-pointer">Disconnect</button>
            </div>
          ) : (
            <Link href="/callback/upstox" className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border hover:border-primary text-xs font-semibold text-soft hover:text-foreground transition-colors">
              <iconify-icon icon="solar:link-linear" width="13"></iconify-icon>
              Link Upstox Broker
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28" />)}
        </div>
      ) : holdings.length === 0 ? (
        <Card hover={false} className="text-center py-14 max-w-2xl mx-auto">
          <iconify-icon icon="solar:wallet-money-linear" width="30" class="text-muted"></iconify-icon>
          <h2 className="text-lg font-bold text-foreground mt-4">No holdings yet</h2>
          <p className="text-sm text-soft mt-2 max-w-sm mx-auto">
            Once you add positions or link your Upstox broker account, this workspace will calculate your health, risk, and rebalancing suggestions.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => setShowAddCustom(true)} className="btn btn-primary cursor-pointer px-4 py-2 rounded-md bg-primary text-white font-bold text-xs">Add Custom Position</button>
            <Link href="/paper-trading"><Btn variant="ghost">Try paper trading ticket</Btn></Link>
            <Link href="/callback/upstox"><Btn variant="outline">Connect Upstox Broker</Btn></Link>
          </div>
        </Card>
      ) : (
        <>
          {/* ─── Fund overview strip ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            {/* Health + Risk */}
            {diag && (
              <Card hover={false} className="flex items-center justify-around gap-2">
                <AIScoreRing score={diag.health} label="Health" size={92} />
                <RiskGauge value={diag.risk} size={110} />
              </Card>
            )}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Book Value" value={fmt(pf.totalValue, { compact: true, prefix: '₹' })} change={pf.dayChange} icon="solar:wallet-money-linear" sparkUp={pf.dayChange >= 0} />
              <StatCard label="Unrealized P&L" value={fmt(pf.totalPnl, { compact: true, prefix: '₹' })} change={pf.totalPnlPct} icon="solar:chart-2-linear" sparkUp={pf.totalPnl >= 0} />
              <StatCard label="Available Cash" value={fmt(pf.cash, { compact: true, prefix: '₹' })} icon="solar:banknote-2-linear" hint={bookType === 'broker' ? 'Non-custodial account' : 'Ready to deploy'} />
            </div>
          </div>

          {/* ─── AI suggestions ─── */}
          {diag && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] uppercase tracking-wider text-muted">Committee Observations</div>
                <Link href="/portfolio-analyzer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Full analysis <iconify-icon icon="solar:arrow-right-linear" width="13"></iconify-icon>
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {diag.suggestions.slice(0, 3).map((s) => (
                  <InsightCard key={s.title} title={s.title} body={s.body} tone={s.tone} />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border" pad={false}>
              <div className="p-5 pb-0 flex items-center justify-between">
                <SectionTitle title={bookType === 'paper' ? 'Paper Positions' : 'Broker Holdings'} subtitle={`${holdings.length} active positions`} icon="solar:list-linear" />
                <div className="flex gap-1 p-1 rounded-lg bg-surface border border-border">
                  {(['holdings', 'allocation'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer ${view === v ? 'bg-primary text-[#04120C]' : 'text-soft hover:text-foreground'}`}
                    >
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
                <SectionTitle title="Sector Exposure" icon="solar:pie-chart-2-linear" />
                <div className="flex flex-col items-center gap-4">
                  <Donut
                    segments={donut}
                    center={
                      <>
                        <span className="text-[11px] text-soft">Invested</span>
                        <span className="text-lg font-bold">₹{fmt(pf.investedValue, { compact: true })}</span>
                      </>
                    }
                  />
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
              
              {diag?.topHolding && (
                <Card className="border-border">
                  <SectionTitle title="Largest Position" icon="solar:star-linear" />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-semibold text-foreground">{diag.topHolding.symbol}</div>
                      <div className="text-xs text-soft">{diag.maxWeight.toFixed(1)}% of portfolio</div>
                    </div>
                    <Link
                      href={`/ai-analyst?q=${encodeURIComponent(`Analyze ${diag.topHolding.symbol}`)}`}
                      className="chip text-soft hover:text-foreground hover:border-border-strong transition-colors"
                    >
                      Analyze
                    </Link>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </PageShell>
  )
}