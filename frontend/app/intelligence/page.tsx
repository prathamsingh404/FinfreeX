'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Badge, Btn, Change, ProgressBar, fmt } from '@/components/ui/kit'
import { useScreener, useNews } from '@/lib/hooks/useMarketData'

type Sentiment = 'Bullish' | 'Bearish' | 'Neutral'

interface Analysis {
  summary: string
  sentiment: Sentiment
  score: number
  insights: string[]
  risks: string[]
  recommendations: string[]
  sources: string[]
}

const SUGGESTED = [
  { label: 'Nifty Outlook', query: 'What is the short-term outlook for Nifty 50?' },
  { label: 'Banking Sector', query: 'Analyze the Indian banking sector and top bank stocks.' },
  { label: 'IT Sector', query: 'How is the IT sector performing? Cover TCS, Infosys, Wipro.' },
  { label: 'Energy Stocks', query: 'Outlook for energy and oil stocks like ONGC and Reliance.' },
  { label: 'Pharma Picks', query: 'Which pharma stocks are worth holding long-term?' },
  { label: 'Mid-Cap Gems', query: 'Three high-potential mid-cap Indian stocks to watch.' },
  { label: 'Global Macro', query: 'How do US Fed decisions impact Indian equities?' },
  { label: 'Dividend Focus', query: 'Best dividend-yield Nifty 50 stocks that are stable.' },
]

function hashSeed(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function buildAnalysis(query: string): Analysis {
  const h = hashSeed(query.toLowerCase())
  const sentiments: Sentiment[] = ['Bullish', 'Neutral', 'Bearish']
  const sentiment = sentiments[h % 3]
  const score = 45 + (h % 45)
  const topic = query.replace(/[?.]/g, '').split(' ').slice(0, 6).join(' ')

  const bull = [
    'Momentum indicators remain constructive with price holding above key moving averages.',
    'Earnings revisions have trended positive over the last two quarters.',
    'Institutional flows are supportive, with FIIs turning net buyers recently.',
    'Valuations are reasonable relative to the sector median and historical averages.',
  ]
  const bear = [
    'Elevated valuations leave limited margin of safety at current levels.',
    'Global macro headwinds and rate uncertainty could compress multiples.',
    'Near-term earnings visibility is clouded by margin pressure.',
    'Technical structure shows waning momentum near resistance.',
  ]
  const neutral = [
    'Risk-reward appears balanced; wait for a clearer breakout or pullback.',
    'Fundamentals are stable but catalysts are limited in the near term.',
    'Range-bound action likely until the next earnings print.',
    'Position sizing and staggered entries are prudent here.',
  ]
  const pick = sentiment === 'Bullish' ? bull : sentiment === 'Bearish' ? bear : neutral

  return {
    sentiment,
    score,
    summary: `Based on aggregated market data and sentiment signals, the outlook for ${topic} is ${sentiment.toLowerCase()}. Our composite model weighs price trend, breadth, valuation and flows to arrive at a conviction score of ${score}/100. Treat this as a starting framework rather than direct advice.`,
    insights: [pick[0], pick[1], pick[2]],
    risks: [
      'Unexpected policy shifts or global risk-off moves can override the base case.',
      'Liquidity thins around events; slippage risk rises for larger orders.',
      'Single-stock concentration amplifies idiosyncratic downside.',
    ],
    recommendations: [
      sentiment === 'Bearish' ? 'Trim exposure into strength and keep dry powder.' : 'Accumulate in tranches rather than a single lump-sum entry.',
      'Define a stop-loss and position size before entering.',
      'Revisit the thesis after the next earnings or macro print.',
    ],
    sources: ['Market Data', 'Sentiment Model', 'Fundamentals', 'Flow Tracker'],
  }
}

export default function IntelligencePage() {
  const { data: screenerData } = useScreener({ universe: 'ALL' })
  const { data: newsData } = useNews('markets')

  const quotes = screenerData || []
  const trending = [...quotes].sort((a: any, b: any) => Math.abs(b.return_1m || 0) - Math.abs(a.return_1m || 0)).slice(0, 8)
  const news = newsData || []

  const [query, setQuery] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'analyst' | 'news' | 'trending'>('analyst')

  function run(q?: string) {
    const finalQuery = (q ?? query).trim()
    if (!finalQuery) return
    if (q) setQuery(q)
    setLoading(true)
    setAnalysis(null)
    setTimeout(() => {
      setAnalysis(buildAnalysis(finalQuery))
      setLoading(false)
    }, 650)
  }

  const sentimentTone = (s: Sentiment): 'primary' | 'coral' | 'amber' => (s === 'Bullish' ? 'primary' : s === 'Bearish' ? 'coral' : 'amber')

  return (
    <PageShell
      title="AI Intelligence Hub"
      subtitle="Composite market analysis on any stock or theme — powered by simulated signals"
      category="AI"
      icon="solar:magic-stick-3-bold-duotone"
    >
      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border w-fit mb-6">
        {(['analyst', 'news', 'trending'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${tab === t ? 'bg-primary text-[#04120C]' : 'text-soft hover:text-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'analyst' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border">
              <SectionTitle title="Ask the AI Analyst" subtitle="Institutional-grade framing on any Indian stock or theme" icon="solar:chat-round-dots-bold-duotone" />
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) run()
                }}
                rows={3}
                placeholder="e.g. Should I buy HDFC Bank at current levels? Analyze risk-reward…"
                className="w-full rounded-xl bg-surface-2 border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-none mb-4"
              />
              <div className="flex gap-3">
                <Btn variant="primary" onClick={() => run()} disabled={loading || !query.trim()} className="flex-1 justify-center">
                  {loading ? 'Analyzing…' : 'Get AI Analysis'}
                </Btn>
                {analysis && (
                  <Btn variant="ghost" onClick={() => { setAnalysis(null); setQuery('') }}>
                    Reset
                  </Btn>
                )}
              </div>
            </Card>

            {!analysis && !loading && (
              <div>
                <p className="text-xs text-soft font-semibold mb-3">Suggested analyses</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => run(s.query)}
                      className="p-3 rounded-xl bg-surface-2 border border-border text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="text-xs text-foreground font-semibold">{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <Card className="border-border">
                <div className="flex items-center gap-3 text-soft text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Aggregating market data and sentiment signals…
                </div>
              </Card>
            )}

            {analysis && (
              <div className="space-y-4 fade-up">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-[11px] text-soft font-semibold">Aggregated via</span>
                  {analysis.sources.map((s) => (
                    <Badge key={s} tone="amber">{s}</Badge>
                  ))}
                </div>

                <Card className="border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-foreground">Analysis Summary</h3>
                    <Badge tone={sentimentTone(analysis.sentiment)}>{analysis.sentiment} Signal</Badge>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs text-soft">Conviction</span>
                    <div className="flex-1"><ProgressBar value={analysis.score} tone={sentimentTone(analysis.sentiment)} /></div>
                    <span className="text-xs font-bold text-foreground tabular-nums">{analysis.score}/100</span>
                  </div>
                  <p className="text-sm text-soft leading-relaxed">{analysis.summary}</p>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-border">
                    <SectionTitle title="Key Insights" icon="solar:lightbulb-bold-duotone" />
                    <ul className="space-y-2">
                      {analysis.insights.map((ins, i) => (
                        <li key={i} className="flex gap-2 text-sm text-soft leading-relaxed">
                          <iconify-icon icon="solar:check-circle-bold" class="text-primary shrink-0 mt-0.5"></iconify-icon>
                          {ins}
                        </li>
                      ))}
                    </ul>
                  </Card>
                  <Card className="border-border">
                    <SectionTitle title="Risk Factors" icon="solar:danger-triangle-bold-duotone" />
                    <ul className="space-y-2">
                      {analysis.risks.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-soft leading-relaxed">
                          <iconify-icon icon="solar:close-circle-bold" class="text-coral shrink-0 mt-0.5"></iconify-icon>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>

                <Card className="border-border">
                  <SectionTitle title="Recommended Actions" icon="solar:target-bold-duotone" />
                  <div className="space-y-2">
                    {analysis.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border">
                        <div className="w-5 h-5 rounded bg-primary text-[#04120C] flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                        <div className="text-sm text-foreground">{rec}</div>
                      </div>
                    ))}
                  </div>
                </Card>
                <p className="text-[11px] text-muted">This is a simulated model for demonstration and is not investment advice.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card className="border-border">
              <SectionTitle title="Market Movers" subtitle="Largest absolute moves today" icon="solar:fire-bold-duotone" />
              <div className="space-y-1">
                {trending.length === 0 ? <div className="text-sm text-soft py-2">Loading live market movers...</div> : trending.slice(0, 6).map((q: any) => (
                  <button
                    key={q.symbol}
                    onClick={() => { setTab('analyst'); run(`Analyze ${q.symbol} — is it a buy at current levels?`) }}
                    className="w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{q.symbol}</div>
                      <div className="text-xs text-soft tabular-nums">{fmt(q.current_price, { prefix: '₹' })}</div>
                    </div>
                    <Change value={q.return_1m} />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'news' && (
        <div className="grid md:grid-cols-2 gap-4">
          {news.length === 0 ? (
            <div className="text-soft col-span-2 text-center py-10 border border-dashed border-border rounded-xl">Loading live intelligence news...</div>
          ) : news.map((n: any, i: number) => (
            <Card key={i} className="flex flex-col gap-3 border-border">
              <div className="flex items-center justify-between">
                <Badge tone="primary">{n.source}</Badge>
                <span className="text-xs text-muted">{new Date(n.published_at).toLocaleTimeString()}</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground leading-relaxed text-pretty">
                <a href={n.url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">{n.headline}</a>
              </h3>
              <div className="text-xs text-soft line-clamp-2">{n.summary}</div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'trending' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trending.length === 0 ? <div className="text-soft col-span-4">Loading trending stocks...</div> : trending.map((q: any) => (
            <Card key={q.symbol} className="flex flex-col gap-2 border-border">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-foreground">{q.symbol}</div>
                <Change value={q.return_1m} />
              </div>
              <div className="text-lg font-bold tabular-nums">{fmt(q.current_price, { prefix: '₹' })}</div>
              <div className="text-xs text-soft">{q.sector}</div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}
