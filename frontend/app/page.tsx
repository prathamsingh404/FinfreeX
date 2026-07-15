'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MarketTicker from '@/components/home/MarketTicker'
import { Card, Change, Badge } from '@/components/ui/kit'
import { AIPromptInput, PromptChips, SignalBadge, ConfidenceMeter, type Signal } from '@/components/ui/ai'
import { useMovers, useIndices } from '@/lib/hooks/useMarketData'

const EXAMPLE_PROMPTS = [
  'Analyze Reliance',
  'Compare Nvidia vs AMD',
  'Build me a portfolio',
  'Find undervalued AI stocks',
  'What should I buy today?',
]

const AGENTS = [
  { name: 'Technical', icon: 'solar:chart-2-linear' },
  { name: 'Fundamental', icon: 'solar:document-text-linear' },
  { name: 'Macro', icon: 'solar:earth-linear' },
  { name: 'News', icon: 'solar:notebook-linear' },
  { name: 'Valuation', icon: 'solar:calculator-linear' },
  { name: 'Risk', icon: 'solar:shield-warning-linear' },
]

const TRENDING_ANALYSES: { ticker: string; question: string; signal: Signal; confidence: number; time: string }[] = [
  { ticker: 'RELIANCE', question: 'Is Reliance a buy after the retail demerger news?', signal: 'BUY', confidence: 78, time: '2m ago' },
  { ticker: 'NVDA', question: 'Nvidia vs AMD — who wins the next 12 months?', signal: 'BULLISH', confidence: 71, time: '11m ago' },
  { ticker: 'HDFCBANK', question: 'HDFC Bank margin pressure — hold or reduce?', signal: 'HOLD', confidence: 64, time: '24m ago' },
  { ticker: 'TATAMOTORS', question: 'Tata Motors after JLR results — overextended?', signal: 'NEUTRAL', confidence: 55, time: '38m ago' },
]

const LAYERS = [
  {
    tag: 'Layer 1 — Intelligence',
    tone: 'ai',
    items: [
      { icon: 'solar:magic-stick-3-linear', title: 'AI Analyst', desc: 'Ask anything. Six specialist agents research it live and return a verdict with confidence.', href: '/ai-analyst' },
      { icon: 'solar:users-group-two-rounded-linear', title: 'Agent Studio', desc: 'Watch the multi-agent hedge fund debate — technical, fundamental, macro, news, valuation, risk.', href: '/hedge-fund' },
      { icon: 'solar:bell-linear', title: 'Alerts & Automations', desc: '“Notify me if Tesla RSI drops below 30.” Natural-language alerts to Telegram, email or push.', href: '/alerts' },
    ],
  },
  {
    tag: 'Layer 2 — Research',
    tone: 'primary',
    items: [
      { icon: 'solar:chart-square-linear', title: 'Live Markets', desc: 'Indices, movers, sectors and full-screen charts in real time.', href: '/market' },
      { icon: 'solar:filter-linear', title: 'Screener', desc: 'Filter thousands of stocks across fundamental and technical metrics.', href: '/equities-screener' },
      { icon: 'solar:pie-chart-2-linear', title: 'Portfolio', desc: 'Health score, risk, exposure and AI rebalancing suggestions.', href: '/portfolios' },
    ],
  },
  {
    tag: 'Layer 3 — Professional',
    tone: 'soft',
    items: [
      { icon: 'solar:diagram-down-linear', title: 'Options & Greeks', desc: 'Chains, OI, IV surfaces and Greeks visualization.', href: '/options-chain' },
      { icon: 'solar:scanner-linear', title: 'Correlation & Rotation', desc: 'Cross-asset correlation matrices and sector rotation maps.', href: '/correlation-matrix' },
      { icon: 'solar:history-linear', title: 'Backtesting', desc: 'Test strategies against decades of historical data.', href: '/backtesting' },
    ],
  },
]

export default function HomePage() {
  const router = useRouter()
  const { data: moversData, loading: moversLoading } = useMovers('NSE')
  const { data: indicesData } = useIndices()

  const gainers = moversData?.gainers || []
  const losers = moversData?.losers || []
  const sectors = indicesData ? Object.entries(indicesData).map(([name, data]: [string, any]) => ({ name, ...data })).slice(0, 6) : []

  const ask = (q: string) => router.push(`/ai-analyst?q=${encodeURIComponent(q)}`)

  return (
    <main className="relative">
      {/* ─── Hero: the AI is the product ─── */}
      <section className="relative z-0 pt-36 pb-20 px-4 sm:px-6 border-b border-border overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 grid-texture opacity-20"></div>
          {/* Iris halo behind the prompt */}
          <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[720px] h-[380px] rounded-full bg-ai/10 blur-[120px]"></div>
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="neutral" className="mb-7 border-ai/25 bg-ai/10 text-ai-bright fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-ai agent-pulse"></span>
            6 agents · live market data · one verdict
          </Badge>

          <h1 className="fade-up stagger-1 text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight leading-[1.08] text-balance">
            Meet your AI<br />
            <span className="text-ai-bright">Hedge Fund Analyst.</span>
          </h1>
          <p className="fade-up stagger-2 mt-5 text-base sm:text-lg text-soft max-w-xl mx-auto text-pretty leading-relaxed">
            Ask anything about any stock, sector or your portfolio. Six specialist agents
            research it live — and hand you a verdict, not a wall of text.
          </p>

          <div className="fade-up stagger-3 mt-9">
            <AIPromptInput size="lg" placeholder="Analyze any stock, compare rivals, build a portfolio…" onSubmit={ask} />
          </div>
          <div className="fade-up stagger-4 mt-4">
            <PromptChips prompts={EXAMPLE_PROMPTS} onPick={ask} />
          </div>

          {/* Agent strip */}
          <div className="fade-up stagger-5 mt-12 flex flex-wrap items-center justify-center gap-2.5">
            {AGENTS.map((a, i) => (
              <div key={a.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-xs font-medium text-soft">
                <span className={`w-1.5 h-1.5 rounded-full ${i % 2 ? 'bg-ai' : 'bg-emerald'} ticker-live`} style={{ animationDelay: `${i * 0.3}s` }}></span>
                <iconify-icon icon={a.icon} width="13" class="text-muted"></iconify-icon>
                {a.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketTicker />

      {/* ─── Trending AI analyses ─── */}
      <section className="px-4 sm:px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ai-bright mb-1.5 flex items-center gap-1.5">
                <iconify-icon icon="solar:magic-stick-3-linear" width="13"></iconify-icon> Live intelligence
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">Trending analyses</h2>
            </div>
            <Link href="/ai-analyst" className="text-xs font-semibold text-ai-bright inline-flex items-center gap-1">
              Open AI Analyst <iconify-icon icon="solar:arrow-right-linear" width="14"></iconify-icon>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TRENDING_ANALYSES.map((t) => (
              <button
                key={t.ticker}
                onClick={() => ask(t.question)}
                className="text-left rounded-lg bg-surface border border-border hover:border-ai/40 transition-colors p-4 cursor-pointer card-lift"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[13px] font-extrabold text-foreground">{t.ticker}</span>
                  <SignalBadge signal={t.signal} />
                </div>
                <p className="text-xs text-soft leading-relaxed line-clamp-2 min-h-[32px]">{t.question}</p>
                <div className="mt-3">
                  <ConfidenceMeter value={t.confidence} compact />
                </div>
                <div className="mt-2 text-[10.5px] text-muted">{t.time} · 6 agents</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Market summary ─── */}
      <section className="px-4 sm:px-6 pb-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between mb-5">
            <h2 className="text-2xl font-extrabold tracking-tight">Market now</h2>
            <Link href="/market" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
              Live market <iconify-icon icon="solar:arrow-right-linear" width="14"></iconify-icon>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {sectors.map((s) => {
              const up = s.change_pct >= 0
              return (
                <div key={s.name} className={`glass-card card-hover p-4 border-l-2 ${up ? 'border-l-emerald' : 'border-l-coral'}`}>
                  <div className="text-xs text-soft mb-2 truncate">{s.name}</div>
                  <Change value={s.change_pct} className="text-lg" />
                </div>
              )
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {[
              { title: 'Top Gainers', tone: 'emerald' as const, rows: gainers },
              { title: 'Top Losers', tone: 'coral' as const, rows: losers },
            ].map((col) => (
              <Card key={col.title} hover={false} className="border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-foreground">{col.title}</h3>
                  <Badge tone={col.tone}>NSE</Badge>
                </div>
                <div className="space-y-1">
                  {moversLoading ? (
                    <div className="space-y-2 py-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton h-10 w-full" />
                      ))}
                    </div>
                  ) : col.rows.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted">No data available</div>
                  ) : col.rows.slice(0, 6).map((r: any) => (
                    <button
                      key={r.symbol}
                      onClick={() => ask(`Analyze ${r.symbol}`)}
                      className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.03] cursor-pointer group"
                    >
                      <div className="min-w-0 text-left">
                        <div className="text-sm font-semibold text-foreground truncate group-hover:text-ai-bright transition-colors">{r.symbol}</div>
                        <div className="text-[11px] text-muted truncate max-w-[140px]">{r.exchange}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular-nums">{r.current_price.toLocaleString('en-IN')}</div>
                        <Change value={r.change_pct} className="text-xs" />
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Three layers ─── */}
      <section className="px-4 sm:px-6 pb-16 border-t border-border pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-balance">One intelligent operating system</h2>
            <p className="text-soft mt-3 max-w-xl mx-auto text-pretty">
              Intelligence on top. Research when you dig. Professional tools when you need them.
            </p>
          </div>

          <div className="space-y-8">
            {LAYERS.map((layer) => (
              <div key={layer.tag}>
                <div className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${
                  layer.tone === 'ai' ? 'text-ai-bright' : layer.tone === 'primary' ? 'text-primary' : 'text-muted'
                }`}>
                  {layer.tag}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {layer.items.map((f) => (
                    <Link key={f.title} href={f.href}>
                      <div className={`h-full p-5 rounded-lg border transition-colors card-lift ${
                        layer.tone === 'ai' ? 'ai-surface hover:border-ai/40' : 'bg-surface border-border hover:border-border-strong'
                      }`}>
                        <div className={`w-10 h-10 rounded-md border flex items-center justify-center mb-4 ${
                          layer.tone === 'ai' ? 'bg-ai/15 border-ai/30 text-ai-bright' : 'bg-primary/12 border-primary/25 text-primary'
                        }`}>
                          <iconify-icon icon={f.icon} width="20"></iconify-icon>
                        </div>
                        <h3 className="text-base font-bold text-foreground mb-1.5">{f.title}</h3>
                        <p className="text-sm text-soft leading-relaxed">{f.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-4 sm:px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="ai-beam-border">
            <div className="rounded-[11px] bg-elevated text-center py-14 px-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-balance">Your analyst is ready.</h2>
              <p className="text-soft mt-3 max-w-md mx-auto text-pretty">Ask one question and watch six agents go to work — free to start.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/ai-analyst" className="bg-ai hover:bg-ai-bright text-white px-7 py-3 rounded-md text-sm font-bold transition-colors inline-flex items-center gap-2">
                  <iconify-icon icon="solar:magic-stick-3-linear" width="17"></iconify-icon>
                  Ask the AI Analyst
                </Link>
                <Link href="/pricing" className="bg-transparent text-soft border border-border hover:border-border-strong px-7 py-3 rounded-md text-sm font-semibold transition-colors">
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
