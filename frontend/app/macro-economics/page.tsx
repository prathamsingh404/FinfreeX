'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Change, fmt, Badge } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { useMacro, useNews } from '@/lib/hooks/useMarketData'

const TABS = ['Indicators', 'Central Banks', 'Yield Curve', 'News']

export default function MacroEconomicsPage() {
  const { data: macroData, loading } = useMacro()
  const { data: newsData } = useNews('economy')
  const [activeTab, setActiveTab] = useState('Indicators')
  
  const news = newsData?.slice(0, 10) || []
  
  const indicators = macroData || [
    { name: 'US Core Inflation (YoY)', value: 3.2, change: -0.1, date: 'Oct 2023', status: 'In-line' },
    { name: 'US GDP Growth (QoQ)', value: 4.9, change: 2.8, date: 'Q3 2023', status: 'Beat' },
    { name: 'Unemployment Rate', value: 3.9, change: 0.1, date: 'Oct 2023', status: 'Miss' },
    { name: 'India CPI Inflation', value: 5.02, change: -1.81, date: 'Sep 2023', status: 'Beat' },
    { name: 'India GDP Growth (YoY)', value: 7.8, change: 1.7, date: 'Q2 2023', status: 'Beat' },
  ]

  return (
    <PageShell
      title="Macro Terminal"
      subtitle="Global economic indicators and monetary policy"
      category="Economics"
      icon="solar:earth-bold-duotone"
      variant="terminal"
    >
      <div className="flex h-full w-full overflow-hidden text-sm">
        
        {/* Main Terminal Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-[#131722]">
          
          {/* Top Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 p-2 border-b border-border text-[13px]">
            <select className="bg-surface border border-border rounded px-2 py-1 outline-none focus:border-primary text-foreground">
              <option value="ALL">Global</option>
              <option value="US">United States</option>
              <option value="IN">India</option>
              <option value="EU">Eurozone</option>
            </select>
            {['Indicator Type', 'Impact', 'Date Range', 'Forecast vs Actual'].map(f => (
              <button key={f} className="flex items-center gap-1 px-2 py-1 rounded bg-transparent border border-transparent hover:bg-white/5 text-soft transition-colors">
                {f} <iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon>
              </button>
            ))}
          </div>

          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-4 pt-2 border-b border-border overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 border-b-2 text-[13px] font-medium transition-colors whitespace-nowrap ${activeTab === t ? 'border-primary text-foreground' : 'border-transparent text-soft hover:text-foreground'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* Data Grid */}
          <div className="flex-1 overflow-auto bg-[#131722]">
            {activeTab === 'Indicators' && (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#131722] z-10 shadow-sm border-b border-border text-[11px] text-soft uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 font-medium">Indicator</th>
                    <th className="px-3 py-2 font-medium text-right">Actual</th>
                    <th className="px-3 py-2 font-medium text-right">Forecast</th>
                    <th className="px-3 py-2 font-medium text-right">Previous</th>
                    <th className="px-3 py-2 font-medium text-center">Status</th>
                    <th className="px-4 py-2 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {loading && !macroData ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-soft">Loading macro data...</td>
                    </tr>
                  ) : indicators.map((ind, i) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{ind.name}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{ind.value}%</td>
                      <td className="px-3 py-3 text-right tabular-nums text-soft">{(ind.value - ind.change / 2).toFixed(2)}%</td>
                      <td className="px-3 py-3 text-right tabular-nums text-soft">{(ind.value - ind.change).toFixed(2)}%</td>
                      <td className="px-3 py-3 text-center">
                        <Badge tone={ind.status === 'Beat' ? 'primary' : ind.status === 'Miss' ? 'coral' : 'neutral'}>{ind.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-soft">{ind.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {activeTab === 'News' && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {news.map((n: any, i: number) => (
                  <div key={i} className="p-4 rounded border border-border bg-[#1e222d] hover:border-primary/50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <Badge tone="primary">{n.source}</Badge>
                      <span className="text-xs text-soft">{new Date(n.published_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{n.headline}</h3>
                    <p className="text-sm text-soft line-clamp-3">{n.summary}</p>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab !== 'Indicators' && activeTab !== 'News' && (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <iconify-icon icon="solar:chart-square-linear" class="text-4xl text-soft mb-3"></iconify-icon>
                <div className="text-foreground font-semibold mb-1">Feature in Development</div>
                <div className="text-soft text-xs max-w-sm">The {activeTab} view will be available once the macro economics API provides this data stream.</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[320px] bg-[#1e222d] shrink-0 flex flex-col border-l border-border hidden lg:flex">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Central Bank Rates</h3>
            <div className="flex gap-2 text-soft">
              <button className="hover:text-foreground"><iconify-icon icon="solar:settings-linear"></iconify-icon></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto flex flex-col">
            {[
              { bank: 'Federal Reserve', rate: 5.50, change: 0, next: 'Dec 13' },
              { bank: 'ECB', rate: 4.50, change: 0, next: 'Dec 14' },
              { bank: 'Bank of England', rate: 5.25, change: 0, next: 'Dec 14' },
              { bank: 'RBI (India)', rate: 6.50, change: 0, next: 'Dec 8' },
              { bank: 'Bank of Japan', rate: -0.10, change: 0, next: 'Dec 19' },
            ].map((b, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-white/5 cursor-pointer border-b border-white/[0.02]">
                <div>
                  <div className="font-semibold">{b.bank}</div>
                  <div className="text-xs text-soft">Next: {b.next}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums text-foreground">{b.rate.toFixed(2)}%</div>
                  <div className="text-[11px] text-soft">{b.change === 0 ? 'Unchanged' : `${b.change} bps`}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
