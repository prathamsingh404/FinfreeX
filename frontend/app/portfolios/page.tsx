'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import PageShell from '@/components/PageShell'
import { Card, StatCard, SectionTitle, Change, Donut, ProgressBar, Btn, fmt } from '@/components/ui/kit'
import { AIScoreRing, RiskGauge, InsightCard } from '@/components/ui/ai'
import { DataTable, Column } from '@/components/ui/DataTable'
import { usePortfolio, usePortfolioHoldings } from '@/lib/hooks/useMarketData'
import { useAuth } from '@/context/AuthContext'

const SECTOR_COLORS = ['#34D399', '#FF6B57', '#FBBF24', '#38BDF8', '#A78BFA', '#F472B6', '#4ADE80', '#FB923C']

/** Derive hedge-fund-style diagnostics from raw holdings. */
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

    // Health: diversification + concentration + drawdown, 0–100
    let health = 100
    if (maxWeight > 20) health -= Math.min(25, (maxWeight - 20) * 1.5)
    if (topSector && topSector[1] > 40) health -= Math.min(20, (topSector[1] - 40) * 0.8)
    if (sectorCount < 4) health -= (4 - sectorCount) * 6
    health -= Math.min(20, losers.length * 5)
    if ((pf.totalPnlPct || 0) > 0) health += 5
    health = Math.round(Math.max(5, Math.min(98, health)))

    // Risk: concentration-driven 0–100
    const risk = Math.round(Math.max(5, Math.min(95, maxWeight * 1.6 + (topSector?.[1] ?? 0) * 0.7 - sectorCount * 3)))

    const suggestions: { title: string; body: string; tone: 'ai' | 'amber' | 'coral' | 'emerald' }[] = []
    if (maxWeight > 20 && topHolding)
      suggestions.push({
        title: `Trim ${topHolding.symbol}`,
        body: `${topHolding.symbol} is ${maxWeight.toFixed(1)}% of the book. Above 20% a single earnings miss moves your whole portfolio.`,
        tone: 'amber',
      })
    if (topSector && topSector[1] > 40)
      suggestions.push({
        title: `${topSector[0]} concentration`,
        body: `${topSector[1].toFixed(0)}% sits in ${topSector[0]}. A sector-wide correction hits ${topSector[1].toFixed(0)}% of your capital at once.`,
        tone: 'coral',
      })
    if (losers.length)
      suggestions.push({
        title: `${losers.length} position${losers.length > 1 ? 's' : ''} down >10%`,
        body: `${losers.map((l) => l.symbol).join(', ')} — decide: thesis intact (add) or broken (exit). Ask the AI Analyst for a verdict.`,
        tone: 'ai',
      })
    if (sectorCount < 4)
      suggestions.push({
        title: 'Thin diversification',
        body: `Only ${sectorCount} sector${sectorCount > 1 ? 's' : ''} represented. Adding uncorrelated sectors cuts drawdowns without capping upside.`,
        tone: 'ai',
      })
    if (!suggestions.length)
      suggestions.push({
        title: 'Book looks balanced',
        body: 'No concentration flags, no deep losers. Run the full analyzer for factor-level attribution.',
        tone: 'emerald',
      })

    return { health, risk, suggestions, sectorEntries, maxWeight, topHolding }
  }, [holdings, pf])
}

export default function PortfoliosPage() {
  const { user } = useAuth()
  const userId = user?.id || 'demo-user-123'

  const { data: portfolioData, loading: pfLoading } = usePortfolio(userId)
  const { data: holdingsData, loading: holdingsLoading } = usePortfolioHoldings(userId)

  const pf = portfolioData || { totalValue: 0, totalPnl: 0, totalPnlPct: 0, dayChange: 0, investedValue: 0, totalCost: 0, cash: 0 }
  const holdings = holdingsData || []
  const diag = useDiagnostics(holdings, pf)

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
        <div className={(h.pnl || 0) >= 0 ? 'text-emerald-bright' : 'text-coral'}>{(h.pnl || 0) >= 0 ? '+' : ''}₹{fmt(Math.abs(h.pnl || 0), { compact: true })}</div>
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
      category="Portfolio"
      title="Portfolio"
      subtitle="Your book, graded like a hedge fund would grade it."
      icon="solar:wallet-money-linear"
      actions={
        <Link href={`/ai-analyst?q=${encodeURIComponent('Analyze my portfolio risk')}`}>
          <Btn variant="primary" className="bg-ai hover:bg-ai-bright">
            <span className="inline-flex items-center gap-2">
              <iconify-icon icon="solar:magic-stick-3-linear" width="16"></iconify-icon>Ask AI
            </span>
          </Btn>
        </Link>
      }
    >
      {pfLoading || holdingsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28" />)}
        </div>
      ) : holdings.length === 0 ? (
        /* Empty state that teaches */
        <Card hover={false} className="text-center py-14 max-w-2xl mx-auto">
          <iconify-icon icon="solar:wallet-money-linear" width="30" class="text-muted"></iconify-icon>
          <h2 className="text-lg font-bold text-foreground mt-4">No holdings yet</h2>
          <p className="text-sm text-soft mt-2 max-w-sm mx-auto">
            Once you add positions, this page grades your book: health score, risk, exposure and AI rebalancing calls.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Btn variant="primary">Add holdings</Btn>
            <Link href="/paper-trading"><Btn variant="ghost">Try paper trading</Btn></Link>
            <Link href="/callback/upstox"><Btn variant="outline">Connect broker</Btn></Link>
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
              <StatCard label="Net Worth" value={fmt(pf.totalValue, { compact: true, prefix: '₹' })} change={pf.dayChange} icon="solar:wallet-money-linear" sparkUp={pf.dayChange >= 0} />
              <StatCard label="Unrealized P&L" value={fmt(pf.totalPnl, { compact: true, prefix: '₹' })} change={pf.totalPnlPct} icon="solar:chart-2-linear" sparkUp={pf.totalPnl >= 0} />
              <StatCard label="Available Cash" value={fmt(pf.cash, { compact: true, prefix: '₹' })} icon="solar:banknote-2-linear" hint="Ready to deploy" />
            </div>
          </div>

          {/* ─── AI suggestions ─── */}
          {diag && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ai-bright">
                  <iconify-icon icon="solar:magic-stick-3-linear" width="13"></iconify-icon> AI suggestions
                </div>
                <Link href="/portfolio-analyzer" className="text-xs font-semibold text-ai-bright inline-flex items-center gap-1">
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
                <SectionTitle title="Holdings" subtitle={`${holdings.length} positions`} icon="solar:list-linear" />
                <div className="flex gap-1 p-1 rounded-lg bg-surface border border-border">
                  {(['holdings', 'allocation'] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer ${view === v ? 'bg-primary text-white' : 'text-soft hover:text-foreground'}`}>
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

              {diag?.topHolding && (
                <Card className="border-border">
                  <SectionTitle title="Largest Position" icon="solar:star-linear" />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-extrabold text-foreground">{diag.topHolding.symbol}</div>
                      <div className="text-xs text-muted">{diag.maxWeight.toFixed(1)}% of portfolio</div>
                    </div>
                    <Link
                      href={`/ai-analyst?q=${encodeURIComponent(`Analyze ${diag.topHolding.symbol}`)}`}
                      className="chip text-ai-bright border-ai/30 hover:bg-ai/10 transition-colors"
                    >
                      <iconify-icon icon="solar:magic-stick-3-linear" width="12"></iconify-icon> Ask AI
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
