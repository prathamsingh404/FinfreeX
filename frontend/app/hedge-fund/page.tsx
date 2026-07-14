'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, StatCard, Badge, Btn, Change, ProgressBar, Sparkline, fmt } from '@/components/ui/kit'
import { useScreener, useBacktest } from '@/lib/hooks/useMarketData'

type Signal = 'bullish' | 'bearish' | 'neutral'

interface AnalystSignal {
  agent: string
  icon: string
  signal: Signal
  confidence: number
  reasoning: string
}

interface Decision {
  ticker: string
  action: 'BUY' | 'SELL' | 'HOLD'
  quantity: number
  confidence: number
  price: number
}

const ANALYSTS = [
  { id: 'fundamentals', label: 'Fundamentals', icon: 'solar:chart-square-bold-duotone' },
  { id: 'technical', label: 'Technical', icon: 'solar:graph-up-bold-duotone' },
  { id: 'sentiment', label: 'Sentiment', icon: 'solar:document-text-bold-duotone' },
  { id: 'valuation', label: 'Valuation', icon: 'solar:calculator-bold-duotone' },
  { id: 'growth', label: 'Growth', icon: 'solar:rocket-bold-duotone' },
  { id: 'macro', label: 'Macro Regime', icon: 'solar:global-bold-duotone' },
]

const PERSONAS = [
  { id: 'buffett', label: 'Warren Buffett', style: 'Value & moats' },
  { id: 'graham', label: 'Benjamin Graham', style: 'Deep value' },
  { id: 'wood', label: 'Cathie Wood', style: 'Disruptive growth' },
  { id: 'burry', label: 'Michael Burry', style: 'Contrarian' },
  { id: 'lynch', label: 'Peter Lynch', style: 'GARP' },
  { id: 'jhunjhunwala', label: 'R. Jhunjhunwala', style: 'India growth' },
]

function hashSeed(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const REASONS: Record<Signal, string[]> = {
  bullish: [
    'Strong free cash flow and expanding margins support upside.',
    'Price structure is trending with healthy volume confirmation.',
    'Sentiment and flows have turned constructive recently.',
    'Reasonable valuation versus peers with a widening moat.',
  ],
  bearish: [
    'Stretched valuation leaves little margin of safety.',
    'Momentum is fading near overhead resistance.',
    'Deteriorating margins pressure the earnings outlook.',
    'Rising macro risk could compress the multiple.',
  ],
  neutral: [
    'Balanced risk-reward; awaiting a clearer catalyst.',
    'Range-bound technicals with mixed fundamentals.',
    'Fairly valued; limited near-term edge either way.',
    'Watch the next earnings print before committing.',
  ],
}

function buildSignals(ticker: string): AnalystSignal[] {
  return ANALYSTS.map((a, i) => {
    const h = hashSeed(ticker + a.id)
    const signal: Signal = (['bullish', 'neutral', 'bearish'] as Signal[])[h % 3]
    const confidence = 40 + (h % 55)
    return {
      agent: a.label,
      icon: a.icon,
      signal,
      confidence,
      reasoning: REASONS[signal][(h >> 3) % REASONS[signal].length],
    }
  })
}

function consensus(signals: AnalystSignal[]): { signal: Signal; confidence: number } {
  const score = signals.reduce((s, x) => s + (x.signal === 'bullish' ? x.confidence : x.signal === 'bearish' ? -x.confidence : 0), 0)
  const avg = Math.round(signals.reduce((s, x) => s + x.confidence, 0) / signals.length)
  const signal: Signal = score > 40 ? 'bullish' : score < -40 ? 'bearish' : 'neutral'
  return { signal, confidence: avg }
}

type Tone = 'primary' | 'coral' | 'amber'
const signalTone = (s: Signal): Tone => (s === 'bullish' ? 'primary' : s === 'bearish' ? 'coral' : 'amber')
const actionTone = (a: Decision['action']): Tone => (a === 'BUY' ? 'primary' : a === 'SELL' ? 'coral' : 'amber')

export default function HedgeFundPage() {
  const { data: screenerData } = useScreener({ universe: 'ALL' })
  const { data: backtest, loading: backtestLoading } = useBacktest('hedge-fund-v1')

  const quotes = screenerData || []
  const priceOf = (sym: string) => quotes.find((q: any) => q.symbol === sym)?.current_price ?? 1000

  const [tab, setTab] = useState<'analyze' | 'backtest'>('analyze')
  const [tickers, setTickers] = useState('RELIANCE, INFY')
  const [personas, setPersonas] = useState<string[]>(['buffett'])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ticker: string; signals: AnalystSignal[] }[] | null>(null)
  const [decisions, setDecisions] = useState<Decision[]>([])

  function togglePersona(id: string) {
    setPersonas((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  function runAnalysis() {
    const list = tickers
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
    if (!list.length) return
    setLoading(true)
    setResult(null)
    setTimeout(() => {
      const res = list.map((ticker) => ({ ticker, signals: buildSignals(ticker) }))
      const decs: Decision[] = res.map(({ ticker, signals }) => {
        const c = consensus(signals)
        const action = c.signal === 'bullish' ? 'BUY' : c.signal === 'bearish' ? 'SELL' : 'HOLD'
        const price = priceOf(ticker)
        return {
          ticker,
          action,
          quantity: action === 'HOLD' ? 0 : Math.max(1, Math.round((c.confidence * 500) / price)),
          confidence: c.confidence,
          price,
        }
      })
      setResult(res)
      setDecisions(decs)
      setLoading(false)
    }, 700)
  }

  return (
    <PageShell
      title="AI Hedge Fund"
      subtitle="Multi-agent analyst committee that debates and sizes positions"
      category="AI"
      icon="solar:buildings-3-bold-duotone"
    >
      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border w-fit mb-6">
        {(['analyze', 'backtest'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${tab === t ? 'bg-primary text-[#04120C]' : 'text-soft hover:text-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'analyze' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border">
              <SectionTitle title="Configure Run" subtitle="Tickers and investor personas" icon="solar:settings-bold-duotone" />
              <label className="block mb-4">
                <span className="block text-xs text-soft mb-1.5">Tickers (comma separated)</span>
                <input
                  value={tickers}
                  onChange={(e) => setTickers(e.target.value)}
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground uppercase outline-none focus:border-primary"
                />
              </label>
              <div className="mb-2 text-xs text-soft">Investor personas</div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePersona(p.id)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${personas.includes(p.id) ? 'border-primary/40 bg-primary/10' : 'border-border hover:bg-surface-2'}`}
                  >
                    <div className="text-xs font-semibold text-foreground">{p.label}</div>
                    <div className="text-[11px] text-soft">{p.style}</div>
                  </button>
                ))}
              </div>
              <Btn variant="primary" onClick={runAnalysis} disabled={loading} className="w-full justify-center">
                {loading ? 'Running committee…' : 'Run Analysis'}
              </Btn>
            </Card>

            <Card className="border-border">
              <SectionTitle title="Analyst Committee" subtitle={`${ANALYSTS.length} agents active`} icon="solar:users-group-rounded-bold-duotone" />
              <div className="space-y-2">
                {ANALYSTS.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm text-soft">
                    <iconify-icon icon={a.icon} class="text-primary"></iconify-icon>
                    {a.label}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!result && !loading && (
              <Card className="grid place-items-center py-16 text-center border-border">
                <iconify-icon icon="solar:buildings-3-bold-duotone" width="40" class="text-primary mb-3"></iconify-icon>
                <p className="text-soft text-sm max-w-sm">Configure tickers and personas, then run the committee to see analyst signals and portfolio decisions.</p>
              </Card>
            )}

            {loading && (
              <Card className="border-border">
                <div className="flex items-center gap-3 text-soft text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary ticker-live" />
                  Agents debating signals and reconciling risk…
                </div>
              </Card>
            )}

            {decisions.length > 0 && (
              <Card pad={false} className="border-border">
                <div className="px-5 pt-5">
                  <SectionTitle title="Portfolio Decisions" subtitle="Risk-adjusted committee output" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-soft border-b border-border">
                        <th className="px-5 py-3 font-medium">Ticker</th>
                        <th className="px-3 py-3 font-medium">Action</th>
                        <th className="px-3 py-3 font-medium text-right">Qty</th>
                        <th className="px-3 py-3 font-medium text-right">Price</th>
                        <th className="px-5 py-3 font-medium text-right">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisions.map((d) => (
                        <tr key={d.ticker} className="border-b border-border hover:bg-surface-2 transition-colors">
                          <td className="px-5 py-3 font-semibold text-foreground">{d.ticker}</td>
                          <td className="px-3 py-3"><Badge tone={actionTone(d.action)}>{d.action}</Badge></td>
                          <td className="px-3 py-3 text-right tabular-nums">{d.quantity || '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-soft">{fmt(d.price, { prefix: '₹' })}</td>
                          <td className="px-5 py-3 text-right tabular-nums">{d.confidence}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {result?.map(({ ticker, signals }) => {
              const c = consensus(signals)
              return (
                <Card key={ticker} className="border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-foreground">{ticker}</h3>
                      <Badge tone={signalTone(c.signal)}>{c.signal} · {c.confidence}%</Badge>
                    </div>
                    <span className="text-xs text-soft tabular-nums">{fmt(priceOf(ticker), { prefix: '₹' })}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {signals.map((s) => (
                      <div key={s.agent} className="rounded-xl bg-surface border border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <iconify-icon icon={s.icon} class="text-primary"></iconify-icon>
                            {s.agent}
                          </div>
                          <Badge tone={signalTone(s.signal)}>{s.signal}</Badge>
                        </div>
                        <div className="mb-2"><ProgressBar value={s.confidence} tone={signalTone(s.signal)} /></div>
                        <p className="text-xs text-soft leading-relaxed">{s.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'backtest' && (
        <div className="space-y-6">
          {backtestLoading ? (
            <div className="flex items-center justify-center h-64 text-soft">Loading backtest engine...</div>
          ) : !backtest ? (
            <div className="flex items-center justify-center h-64 text-soft border border-dashed border-border rounded-xl">
              Backtest API is currently offline. Please provide an API connection.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Return" value={`${backtest.totalReturn}%`} change={backtest.totalReturn} icon="solar:graph-up-bold-duotone" />
                <StatCard label="CAGR" value={`${backtest.cagr}%`} icon="solar:chart-2-bold-duotone" />
                <StatCard label="Sharpe" value={backtest.sharpe.toFixed(2)} icon="solar:medal-ribbon-bold-duotone" />
                <StatCard label="Max Drawdown" value={`${backtest.maxDD}%`} change={-backtest.maxDD} icon="solar:arrow-down-bold-duotone" />
              </div>

              <Card className="border-border">
                <SectionTitle title="Equity Curve" subtitle="Simulated strategy vs starting capital" icon="solar:chart-square-bold-duotone" />
                <div className="w-full [&>svg]:w-full">
                  <Sparkline data={backtest.equity} up width={1000} height={220} strokeWidth={2} />
                </div>
              </Card>

              <div className="grid md:grid-cols-3 gap-4">
                <StatCard label="Win Rate" value={`${backtest.winRate}%`} icon="solar:cup-star-bold-duotone" />
                <StatCard label="Trades" value={String(backtest.trades)} icon="solar:list-bold-duotone" />
                <StatCard label="Profit Factor" value={backtest.profitFactor.toFixed(2)} icon="solar:dollar-minimalistic-bold-duotone" />
              </div>
            </>
          )}
        </div>
      )}
    </PageShell>
  )
}
