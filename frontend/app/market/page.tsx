'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import PageShell from '@/components/PageShell'
import { Change, fmt, Badge } from '@/components/ui/kit'
import { useScreener, useIndices, useNews } from '@/lib/hooks/useMarketData'

type SortKey = 'market_cap' | 'current_price' | 'return_1m' | 'pe_ratio' | 'volume'

const TABS = ['Overview', 'Performance', 'Technicals', 'Extended hours', 'Forecasts', 'Valuation', 'Dividends', 'More']

export default function MarketPage() {
  const [universe, setUniverse] = useState('ALL')
  const [sort, setSort] = useState<SortKey>('market_cap')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState('Overview')
  
  // Fetch live data
  const { data: rows, loading } = useScreener({ universe, sort_by: sort, sort_order: dir })
  const { data: indicesData } = useIndices()
  const { data: newsData } = useNews('markets')

  const results = rows || []
  const indices = indicesData ? Object.entries(indicesData).map(([name, data]) => ({ name, ...data })).slice(0, 5) : []
  const news = newsData?.slice(0, 5) || []

  const [selectedSymbol, setSelectedSymbol] = useState<any>(null)
  const activeQuote = selectedSymbol || results[0] || null

  function toggleSort(k: SortKey) {
    if (sort === k) setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSort(k)
      setDir('desc')
    }
  }

  const Th = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'right' }) => (
    <th className={`px-3 py-2 font-medium text-${align} whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors`} onClick={() => toggleSort(k)}>
      <div className={`inline-flex items-center gap-1 ${sort === k ? 'text-primary' : ''}`}>
        {label}
        {sort === k && (
          <iconify-icon icon={dir === 'desc' ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'}></iconify-icon>
        )}
      </div>
    </th>
  )

  return (
    <PageShell
      title="Live Market Terminal"
      subtitle="Real-time quotes, depth, and price action"
      category="Markets"
      icon="solar:chart-square-bold-duotone"
      variant="terminal"
    >
      <div className="flex h-full w-full overflow-hidden text-sm">
        
        {/* Main Terminal Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-[#131722]">
          
          {/* AI market brief */}
          {!loading && results.length > 0 && (() => {
            const adv = results.filter((x: any) => (x.return_1m || 0) >= 0).length
            const pct = Math.round((adv / results.length) * 100)
            return (
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-ai/[0.05] text-xs">
                <iconify-icon icon="solar:magic-stick-3-linear" width="13" class="text-ai-bright shrink-0"></iconify-icon>
                <span className="text-soft truncate">
                  Breadth {pct >= 50 ? 'positive' : 'negative'}: {adv}/{results.length} advancing ({pct}%).
                </span>
                <Link
                  href={`/ai-analyst?q=${encodeURIComponent("Summarize today's market")}`}
                  className="ml-auto shrink-0 text-ai-bright font-semibold hover:underline"
                >
                  Full AI brief →
                </Link>
              </div>
            )
          })()}

          {/* Top Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 p-2 border-b border-border text-[13px]">
            <select value={universe} onChange={(e) => setUniverse(e.target.value)} className="bg-surface border border-border rounded px-2 py-1 outline-none focus:border-primary text-foreground">
              <option value="ALL">All Stocks</option>
              <option value="LARGE_CAP">Large Cap</option>
              <option value="MID_CAP">Mid Cap</option>
              <option value="SMALL_CAP">Small Cap</option>
            </select>
            {['Watchlist', 'Index', 'Price', 'Chg %', 'Mkt cap', 'P/E', 'EPS dil growth', 'Div yield %', 'Sector'].map(f => (
              <button key={f} className="flex items-center gap-1 px-2 py-1 rounded bg-transparent border border-transparent hover:bg-white/5 text-soft transition-colors">
                {f} <iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon>
              </button>
            ))}
          </div>

          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-2 pt-2 border-b border-border overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 border-b-2 text-[13px] font-medium transition-colors whitespace-nowrap ${activeTab === t ? 'border-primary text-foreground' : 'border-transparent text-soft hover:text-foreground'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* Data Table */}
          <div className="flex-1 overflow-auto bg-[#131722]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#131722] z-10 shadow-sm border-b border-border text-[11px] text-soft uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 font-medium w-64">Symbol</th>
                  <Th k="current_price" label="Price" align="right" />
                  <Th k="return_1m" label="Chg %" align="right" />
                  <Th k="volume" label="Vol" align="right" />
                  <th className="px-3 py-2 font-medium text-right">Rel vol</th>
                  <Th k="market_cap" label="Mkt cap" align="right" />
                  <Th k="pe_ratio" label="P/E" align="right" />
                  <th className="px-3 py-2 font-medium text-right">EPS dil TTM</th>
                  <th className="px-3 py-2 font-medium text-right">EPS growth</th>
                  <th className="px-3 py-2 font-medium text-right">Div yield</th>
                  <th className="px-4 py-2 font-medium">Sector</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-soft">Loading market data...</td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-soft">No stocks match your criteria.</td>
                  </tr>
                ) : results.map((q: any) => (
                  <tr 
                    key={q.symbol} 
                    onClick={() => setSelectedSymbol(q)}
                    className={`border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors ${activeQuote?.symbol === q.symbol ? 'bg-white/[0.04]' : ''}`}
                  >
                    <td className="px-4 py-2 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold overflow-hidden shrink-0">
                        {q.symbol.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate">{q.symbol}</span>
                        <span className="text-[11px] text-soft truncate">{q.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(q.current_price, { decimals: 2 })}</td>
                    <td className="px-3 py-2 text-right"><Change value={q.return_1m} /></td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(q.avg_volume || 0, { compact: true })}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-soft">{q.volume_ratio ? q.volume_ratio.toFixed(2) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(q.market_cap, { compact: true })}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{q.pe_ratio ? fmt(q.pe_ratio, { decimals: 2 }) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{q.pe_ratio ? fmt(q.current_price / q.pe_ratio, { decimals: 2 }) : '—'}</td>
                    <td className="px-3 py-2 text-right">{typeof q.revenue_growth === 'number' ? <Change value={q.revenue_growth * 100} showArrow={false} /> : <span className="text-soft">—</span>}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-soft">{typeof q.dividend_yield === 'number' ? `${(q.dividend_yield * 100).toFixed(2)}%` : '—'}</td>
                    <td className="px-4 py-2 text-soft truncate">{q.sector || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[320px] bg-[#1e222d] shrink-0 flex flex-col border-l border-border hidden lg:flex">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Watchlist</h3>
            <div className="flex gap-2 text-soft">
              <button className="hover:text-foreground"><iconify-icon icon="solar:add-circle-linear"></iconify-icon></button>
              <button className="hover:text-foreground"><iconify-icon icon="solar:settings-linear"></iconify-icon></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto flex flex-col">
            <div className="p-3 bg-white/[0.02] text-xs font-bold text-soft uppercase tracking-wider flex items-center justify-between">
              <span>Indices</span>
              <iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon>
            </div>
            {indices.map(idx => (
              <div key={idx.name} className="px-3 py-2 flex items-center justify-between hover:bg-white/5 cursor-pointer border-b border-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${idx.change_pct >= 0 ? 'bg-primary' : 'bg-coral'}`}></span>
                  <span className="font-semibold">{idx.name}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="tabular-nums text-foreground">{fmt(idx.price, { decimals: 2 })}</span>
                  <div className="w-16"><Change value={idx.change_pct} showArrow={false} /></div>
                </div>
              </div>
            ))}
            
            <div className="p-3 bg-white/[0.02] text-xs font-bold text-soft uppercase tracking-wider flex items-center justify-between mt-2">
              <span>Stocks</span>
              <iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon>
            </div>
            {results.slice(0, 10).map((q: any) => (
              <div key={q.symbol} onClick={() => setSelectedSymbol(q)} className={`px-3 py-2 flex items-center justify-between hover:bg-white/5 cursor-pointer border-b border-white/[0.02] ${activeQuote?.symbol === q.symbol ? 'bg-white/5' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[8px] font-bold overflow-hidden shrink-0">{q.symbol.charAt(0)}</div>
                  <span className="font-semibold truncate max-w-[80px]">{q.symbol}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="tabular-nums text-foreground">{fmt(q.current_price, { decimals: 2 })}</span>
                  <div className="w-16"><Change value={q.return_1m} showArrow={false} /></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Active Symbol Details */}
          {activeQuote && (
            <div className="p-4 border-t border-border bg-[#131722]">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center font-bold">{activeQuote.symbol.charAt(0)}</div>
                    <span className="text-lg font-bold">{activeQuote.symbol}</span>
                  </div>
                  <div className="text-xs text-soft">{activeQuote.name} • NSE</div>
                </div>
                <div className="flex gap-1 text-soft">
                  <iconify-icon icon="solar:star-linear" class="cursor-pointer hover:text-foreground text-lg"></iconify-icon>
                  <iconify-icon icon="solar:menu-dots-bold" class="cursor-pointer hover:text-foreground text-lg"></iconify-icon>
                </div>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-bold tabular-nums text-foreground">{fmt(activeQuote.current_price, { decimals: 2 })}</span>
                <span className="text-xs text-soft mb-1">INR</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Change value={activeQuote.return_1m} />
              </div>
              <div className="mt-2 text-[11px] text-soft flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright ticker-live"></span> Market open
              </div>
              <Link
                href={`/ai-analyst?q=${encodeURIComponent(`Analyze ${activeQuote.symbol}`)}`}
                className="mt-3 flex items-center justify-center gap-1.5 w-full h-8 rounded-md bg-ai/12 border border-ai/30 text-ai-bright text-xs font-bold hover:bg-ai/20 transition-colors"
              >
                <iconify-icon icon="solar:magic-stick-3-linear" width="13"></iconify-icon>
                Ask AI about {activeQuote.symbol}
              </Link>
            </div>
          )}

          {/* Related News */}
          {news.length > 0 && (
            <div className="p-4 border-t border-border bg-[#1e222d] flex-1 overflow-y-auto min-h-[200px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">News</h3>
                <span className="text-xs text-soft hover:text-foreground cursor-pointer">More</span>
              </div>
              <div className="space-y-4">
                {news.map((n: any, i: number) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="text-xs text-soft mb-1">{n.source} • {new Date(n.published_at).toLocaleTimeString()}</div>
                    <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-3">{n.title}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
