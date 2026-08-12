'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Badge, Btn, Change, fmt } from '@/components/ui/kit'
import { useScreener, useNews } from '@/lib/hooks/useMarketData'

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

export default function IntelligencePage() {
  const { data: screenerData } = useScreener({ universe: 'ALL' })
  const { data: newsData } = useNews('markets')

  const quotes = screenerData || []
  const trending = [...quotes].sort((a: any, b: any) => Math.abs(b.return_1m || 0) - Math.abs(a.return_1m || 0)).slice(0, 8)
  const news = newsData || []

  const [query, setQuery] = useState('')
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'analyst' | 'news' | 'trending'>('analyst')

  async function run(q?: string) {
    const finalQuery = (q ?? query).trim()
    if (!finalQuery) return
    if (q) setQuery(q)
    setLoading(true)
    setAiResponse(null)
    setError(null)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-jet-mu-37.vercel.app'
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a senior equity research analyst. Provide institutional-grade analysis for the following question. Include: sentiment (Bullish/Bearish/Neutral), key insights, risk factors, and recommended actions. Be specific with data points where possible.\n\nQuery: ${finalQuery}`
          }]
        })
      })
      const data = await res.json()
      if (data.answer) {
        setAiResponse(data.answer)
      } else {
        setError('No response received from the AI engine.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reach the AI analysis engine. Check that the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell
      title="AI Intelligence Hub"
      subtitle="Composite market analysis on any stock or theme — powered by multi-agent AI"
      category="AI"
      icon="solar:magic-stick-3-bold-duotone"
    >
      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border w-fit mb-6">
        {(['analyst', 'news', 'trending'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${tab === t ? 'bg-primary text-[var(--on-primary)]' : 'text-soft hover:text-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'analyst' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border">
              <SectionTitle title="Ask the AI Analyst" subtitle="Institutional-grade framing on any stock or theme" icon="solar:chat-round-dots-bold-duotone" />
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
                {aiResponse && (
                  <Btn variant="ghost" onClick={() => { setAiResponse(null); setError(null); setQuery('') }}>
                    Reset
                  </Btn>
                )}
              </div>
            </Card>

            {!aiResponse && !loading && !error && (
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
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Connecting to AI analysis engine — processing your query…
                </div>
              </Card>
            )}

            {error && (
              <Card className="border-border border-coral/30">
                <div className="flex items-start gap-3">
                  <iconify-icon icon="solar:danger-triangle-bold" class="text-coral shrink-0 mt-0.5" width="16"></iconify-icon>
                  <div>
                    <h4 className="text-sm font-semibold text-coral mb-1">Analysis failed</h4>
                    <p className="text-sm text-soft">{error}</p>
                  </div>
                </div>
              </Card>
            )}

            {aiResponse && (
              <div className="space-y-4 fade-up">
                <Card className="border-border">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-4">
                    <iconify-icon icon="solar:magic-stick-3-bold" class="text-primary shrink-0" width="18"></iconify-icon>
                    AI Analysis Response
                  </div>
                  <div className="prose prose-invert max-w-none text-soft text-sm leading-relaxed whitespace-pre-wrap">
                    {aiResponse}
                  </div>
                </Card>
                <p className="text-[11px] text-muted">AI-generated analysis. Not investment advice. Verify independently.</p>
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
