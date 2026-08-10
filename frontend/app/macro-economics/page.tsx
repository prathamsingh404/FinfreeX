'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Badge, Panel, Change, EmptyState, SkeletonRows, BipolarBar, DefRow, Note, cx } from '@/components/ui/kit'
import { Tabs, Segmented, SearchInput } from '@/components/ui/controls'
import { AreaChart } from '@/components/ui/AreaChart'
import { useMacro, useNews } from '@/lib/hooks/useMarketData'
import { getYieldCurve } from '@/lib/featureData'

const TABS = ['Indicators', 'Yield curve', 'Central banks', 'News'] as const
type Tab = (typeof TABS)[number]

const REGIONS = [
  { value: 'ALL', label: 'Global' },
  { value: 'US', label: 'US' },
  { value: 'IN', label: 'India' },
  { value: 'EU', label: 'Eurozone' },
] as const

const FALLBACK = [
  { name: 'US Core Inflation (YoY)', value: 3.2, change: -0.1, date: 'Oct 2023', status: 'In-line' },
  { name: 'US GDP Growth (QoQ)', value: 4.9, change: 2.8, date: 'Q3 2023', status: 'Beat' },
  { name: 'Unemployment Rate', value: 3.9, change: 0.1, date: 'Oct 2023', status: 'Miss' },
  { name: 'India CPI Inflation', value: 5.02, change: -1.81, date: 'Sep 2023', status: 'Beat' },
  { name: 'India GDP Growth (YoY)', value: 7.8, change: 1.7, date: 'Q2 2023', status: 'Beat' },
]

const BANKS = [
  { bank: 'Federal Reserve', code: 'FED', rate: 5.5, change: 0, next: 'Dec 13', stance: 'Hold' },
  { bank: 'European Central Bank', code: 'ECB', rate: 4.5, change: 0, next: 'Dec 14', stance: 'Hold' },
  { bank: 'Bank of England', code: 'BOE', rate: 5.25, change: 0, next: 'Dec 14', stance: 'Hold' },
  { bank: 'Reserve Bank of India', code: 'RBI', rate: 6.5, change: 0, next: 'Dec 8', stance: 'Hold' },
  { bank: 'Bank of Japan', code: 'BOJ', rate: -0.1, change: 0, next: 'Dec 19', stance: 'Easing' },
]

export default function MacroEconomicsPage() {
  const { data: macroData, loading } = useMacro()
  const { data: newsData } = useNews('economy')
  const [tab, setTab] = useState<Tab>('Indicators')
  const [region, setRegion] = useState<string>('ALL')
  const [query, setQuery] = useState('')

  const news = newsData?.slice(0, 12) || []
  const curve = useMemo(() => getYieldCurve(), [])
  const indicators = (macroData as typeof FALLBACK) || FALLBACK

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return indicators.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q)) return false
      if (region === 'ALL') return true
      const prefix = { US: 'us', IN: 'india', EU: 'euro' }[region as 'US' | 'IN' | 'EU']
      return i.name.toLowerCase().includes(prefix)
    })
  }, [indicators, query, region])

  const spread = curve[curve.length - 1].yield - curve[0].yield
  const maxSurprise = Math.max(...indicators.map((i) => Math.abs(i.change)), 1)

  return (
    <PageShell
      title="Macro Terminal"
      subtitle="Growth, prices and policy across the major economies"
      category="Economics"
      icon="solar:earth-linear"
      variant="terminal"
      status={
        <>
          <span className="live-dot" /> Updated {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </>
      }
    >
      <div className="flex h-full min-h-0">
        {/* ── Main column ───────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-surface-2 shrink-0 flex-wrap">
            <Segmented options={REGIONS} value={region} onChange={setRegion} />
            <SearchInput value={query} onChange={setQuery} placeholder="Filter indicators" className="w-52" />
            <span className="ml-auto text-xs text-muted tabular-nums">
              {rows.length} of {indicators.length} series
            </span>
          </div>

          <Tabs tabs={TABS} value={tab} onChange={setTab} />

          <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
            {tab === 'Indicators' && (
              loading && !macroData ? (
                <SkeletonRows rows={8} cols={6} />
              ) : rows.length === 0 ? (
                <EmptyState
                  icon="solar:magnifer-linear"
                  title="No indicator matches that filter"
                  body="Clear the search or switch region to see the full series list."
                />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Indicator</th>
                      <th className="num">Actual</th>
                      <th className="num">Forecast</th>
                      <th className="num">Previous</th>
                      <th style={{ width: 150 }}>Surprise</th>
                      <th>Result</th>
                      <th className="num">Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((ind, i) => (
                      <tr key={i}>
                        <td className="font-medium text-foreground">{ind.name}</td>
                        <td className="num font-semibold">{ind.value.toFixed(2)}%</td>
                        <td className="num text-muted">{(ind.value - ind.change / 2).toFixed(2)}%</td>
                        <td className="num text-muted">{(ind.value - ind.change).toFixed(2)}%</td>
                        <td><BipolarBar value={ind.change} max={maxSurprise} /></td>
                        <td>
                          <Badge tone={ind.status === 'Beat' ? 'up' : ind.status === 'Miss' ? 'down' : 'neutral'}>
                            {ind.status}
                          </Badge>
                        </td>
                        <td className="num text-muted">{ind.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {tab === 'Yield curve' && (
              <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
                <Panel label="G-Sec term structure" meta={`3M → 30Y · spread ${spread.toFixed(2)}%`} className="xl:col-span-2" pad>
                  <AreaChart data={curve.map((c) => c.yield)} labels={curve.map((c) => c.tenor)} height={280} up />
                </Panel>
                <Panel label="Tenors" meta={`${curve.length}`} scroll>
                  <div className="px-3 py-2">
                    {curve.map((c) => (
                      <DefRow key={c.tenor} label={c.tenor} value={`${c.yield.toFixed(2)}%`} />
                    ))}
                  </div>
                </Panel>
                <div className="xl:col-span-3">
                  <Note>
                    {spread > 0
                      ? `The curve is upward sloping: 30Y sits ${spread.toFixed(2)} points above 3M, which is the normal shape when growth is expected to hold.`
                      : `The curve is inverted: short tenors yield more than long ones, historically a signal that the market expects rate cuts.`}
                  </Note>
                </div>
              </div>
            )}

            {tab === 'Central banks' && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {BANKS.map((b) => (
                  <Panel key={b.code} label={b.code} meta={`Next ${b.next}`} pad>
                    <div className="text-sm font-medium text-foreground mb-3">{b.bank}</div>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-semibold tabular-nums">{b.rate.toFixed(2)}%</div>
                      <Badge tone={b.stance === 'Easing' ? 'up' : 'neutral'}>{b.stance}</Badge>
                    </div>
                    <div className="text-xs text-muted mt-2">
                      {b.change === 0 ? 'Unchanged at the last meeting' : `${b.change} bps at the last meeting`}
                    </div>
                  </Panel>
                ))}
              </div>
            )}

            {tab === 'News' && (
              news.length === 0 ? (
                <EmptyState icon="solar:notebook-linear" title="No economy headlines right now" body="Stories appear here as the news feed returns them." />
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {news.map((n: any, i: number) => (
                    <article key={i} className="panel p-3 card-hover cursor-pointer group">
                      <div className="flex items-center justify-between mb-2">
                        <Badge tone="neutral">{n.source}</Badge>
                        <span className="text-xs text-muted tabular-nums">
                          {new Date(n.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                        {n.headline}
                      </h3>
                      <p className="text-xs text-muted mt-1.5 line-clamp-3 leading-relaxed">{n.summary}</p>
                    </article>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* ── Policy rail ───────────────────────────────── */}
        <aside className="w-[300px] shrink-0 hidden xl:flex flex-col bg-surface min-h-0">
          <header className="panel-rail panel-rail-flat shrink-0">
            <span className="eyebrow">Policy rates</span>
            <span className="text-xs text-muted">{BANKS.length}</span>
          </header>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {BANKS.map((b) => (
              <button
                key={b.code}
                onClick={() => setTab('Central banks')}
                className="w-full text-left px-3 py-2.5 border-b border-border hover-fill flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{b.code}</div>
                  <div className="text-xs text-muted truncate">Next {b.next}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cx('text-sm font-semibold tabular-nums', b.rate < 0 && 'val-down')}>
                    {b.rate.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted">{b.stance}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-border p-3 shrink-0">
            <div className="eyebrow mb-2">Curve spread</div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums">{spread.toFixed(2)}%</span>
              <Change value={spread} showArrow={false} className="text-xs" />
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed">30Y minus 3M on the sovereign curve.</p>
          </div>
        </aside>
      </div>
    </PageShell>
  )
}
