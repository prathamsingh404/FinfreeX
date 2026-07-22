'use client'

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/app/sidebar'
import { Card, Change, fmt } from '@/components/ui/kit'
import {
  AgentCard,
  AgentInfo,
  AIPromptInput,
  AIScoreRing,
  ConsensusBar,
  InsightCard,
  PromptChips,
  Signal,
  SignalBadge,
  VerdictCard,
} from '@/components/ui/ai'
import { streamAnalysis, AIChunk, fetchAIChat } from '@/lib/api'
import { useQuote, useNews } from '@/lib/hooks/useMarketData'

/* ============================================================
   AI Analyst — the flagship. Perplexity × Bloomberg:
   left: run history · center: live research canvas · right: context
   ============================================================ */

const EXAMPLES = [
  'Analyze RELIANCE',
  'Is TCS overvalued?',
  'Analyze NVDA',
  'HDFCBANK risk check',
]

const SPECIALISTS: { key: string; name: string; icon: string; match: string[] }[] = [
  { key: 'technical', name: 'Technical', icon: 'solar:chart-2-linear', match: ['technical', 'chart', 'momentum'] },
  { key: 'fundamental', name: 'Fundamental', icon: 'solar:document-text-linear', match: ['fundamental', 'financial'] },
  { key: 'macro', name: 'Macro', icon: 'solar:earth-linear', match: ['macro', 'econom'] },
  { key: 'news', name: 'News & Sentiment', icon: 'solar:notebook-linear', match: ['news', 'sentiment'] },
  { key: 'valuation', name: 'Valuation', icon: 'solar:calculator-linear', match: ['valuation', 'value'] },
  { key: 'risk', name: 'Risk', icon: 'solar:shield-warning-linear', match: ['risk'] },
]

const PIPELINE = ['Data Collection', 'Specialists', 'Investor Personas', 'Risk Engine', 'Portfolio Manager', 'Final Verdict']

/* Well-known company names → tickers so natural questions still resolve */
const NAME_TO_TICKER: Record<string, { symbol: string; exchange: string }> = {
  reliance: { symbol: 'RELIANCE', exchange: 'NSE' },
  tcs: { symbol: 'TCS', exchange: 'NSE' },
  infosys: { symbol: 'INFY', exchange: 'NSE' },
  'hdfc bank': { symbol: 'HDFCBANK', exchange: 'NSE' },
  hdfcbank: { symbol: 'HDFCBANK', exchange: 'NSE' },
  'icici bank': { symbol: 'ICICIBANK', exchange: 'NSE' },
  'tata motors': { symbol: 'TATAMOTORS', exchange: 'NSE' },
  tatamotors: { symbol: 'TATAMOTORS', exchange: 'NSE' },
  adani: { symbol: 'ADANIENT', exchange: 'NSE' },
  'bajaj finance': { symbol: 'BAJFINANCE', exchange: 'NSE' },
  nifty: { symbol: 'NIFTY50', exchange: 'NSE' },
  nvidia: { symbol: 'NVDA', exchange: 'NASDAQ' },
  apple: { symbol: 'AAPL', exchange: 'NASDAQ' },
  microsoft: { symbol: 'MSFT', exchange: 'NASDAQ' },
  tesla: { symbol: 'TSLA', exchange: 'NASDAQ' },
  amd: { symbol: 'AMD', exchange: 'NASDAQ' },
  google: { symbol: 'GOOGL', exchange: 'NASDAQ' },
  alphabet: { symbol: 'GOOGL', exchange: 'NASDAQ' },
  amazon: { symbol: 'AMZN', exchange: 'NASDAQ' },
  meta: { symbol: 'META', exchange: 'NASDAQ' },
}
const US_TICKERS = new Set(['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMD', 'GOOGL', 'AMZN', 'META', 'NFLX', 'INTC'])

const KNOWN_TICKERS = new Set([
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR',
  'ICICIBANK', 'KOTAKBANK', 'BHARTIARTL', 'ITC', 'AXISBANK',
  'SBIN', 'SBI', 'LT', 'WIPRO', 'HCLTECH', 'BAJFINANCE',
  'ASIANPAINT', 'MARUTI', 'NESTLEIND', 'TITAN', 'ULTRACEMCO',
  'ONGC', 'NTPC', 'POWERGRID', 'COALINDIA', 'BPCL',
  'TECHM', 'DIVISLAB', 'DRREDDY', 'CIPLA', 'SUNPHARMA',
  'APOLLOHOSP', 'BAJAJFINSV', 'BRITANNIA', 'ADANIENT', 'ADANIPORTS',
  'TATACONSUM', 'TATAMOTORS', 'TATASTEEL', 'HINDALCO', 'JSWSTEEL',
  'M&M', 'HEROMOTOCO', 'EICHERMOT', 'INDUSINDBK', 'HDFCLIFE',
  'SBILIFE', 'UPL', 'GRASIM', 'SHREECEM', 'LTIM', 'ZOMATO',
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'NFLX', 'INTC'
])

function resolveTicker(query: string): { symbol: string; exchange: string } | null {
  const q = query.toLowerCase().trim()
  if (!q) return null

  // 0. Detect comparative query intent
  const comparativeKeywords = ['vs', 'versus', 'compare', 'comparison', 'difference', 'better']
  const isComparative = comparativeKeywords.some(kw => q.includes(kw))
  if (isComparative) {
    return null
  }
  
  // 1. Check exact key matches in NAME_TO_TICKER (e.g. "tata motors")
  let exactMatch: { symbol: string; exchange: string } | null = null
  for (const [name, t] of Object.entries(NAME_TO_TICKER)) {
    if (q.includes(name)) {
      exactMatch = t
      break
    }
  }
  
  // 2. Split query by non-alphanumeric characters to get individual words
  const words = q.split(/[^a-zA-Z0-9]/).map(w => w.toUpperCase()).filter(Boolean)
  
  // 3. Find unique tickers in query
  const foundSymbols = new Set<string>()
  for (const word of words) {
    if (KNOWN_TICKERS.has(word)) {
      foundSymbols.add(word)
    } else if (word === 'SBI') {
      foundSymbols.add('SBIN')
    } else if (word === 'GOOGLE') {
      foundSymbols.add('GOOGL')
    }
  }

  // If query mentions multiple unique tickers, treat it as comparative Q&A
  if (foundSymbols.size > 1) {
    return null
  }

  // If we had an exact match, return it
  if (exactMatch) return exactMatch
  
  // 4. Return single found ticker
  if (foundSymbols.size === 1) {
    const symbol = Array.from(foundSymbols)[0]
    const exchange = US_TICKERS.has(symbol) ? 'NASDAQ' : 'NSE'
    return { symbol, exchange }
  }
  
  // 5. Fallback: If there is any capitalized word of 2-12 letters in the original query
  const caps = query.match(/\b[A-Z]{2,12}\b/g)?.filter((w) => !['AI', 'PE', 'PB', 'ROE', 'RSI', 'ATH', 'VS'].includes(w))
  if (caps?.length) {
    const symbol = caps[0]
    return { symbol, exchange: US_TICKERS.has(symbol) ? 'NASDAQ' : 'NSE' }
  }
  
  // 6. Hard fallback: If query is just a single word (even lowercase), treat it as a ticker!
  // e.g. user typed "zomato" or "tsla"
  const cleanWord = query.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (/^[A-Z0-9]{2,12}$/.test(cleanWord)) {
    return { symbol: cleanWord, exchange: US_TICKERS.has(cleanWord) ? 'NASDAQ' : 'NSE' }
  }
  
  return null
}

function normSignal(raw: unknown): Signal | undefined {
  if (typeof raw !== 'string') return undefined
  const s = raw.toUpperCase()
  if (['BUY', 'STRONG BUY', 'ACCUMULATE', 'INCREASE'].some((x) => s.includes(x))) return 'BUY'
  if (['SELL', 'REDUCE', 'EXIT'].some((x) => s.includes(x))) return 'SELL'
  if (s.includes('BULL')) return 'BULLISH'
  if (s.includes('BEAR')) return 'BEARISH'
  if (s.includes('HOLD')) return 'HOLD'
  if (s.includes('NEUTRAL')) return 'NEUTRAL'
  return undefined
}

function normConfidence(raw: unknown): number | undefined {
  const n = typeof raw === 'string' ? parseFloat(raw) : typeof raw === 'number' ? raw : NaN
  if (Number.isNaN(n)) return undefined
  return Math.round(n <= 1 ? n * 100 : n)
}

function pick(obj: any, keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  return undefined
}

interface PersonaResult {
  name: string
  signal?: Signal
  confidence?: number
  reason?: string
}

interface Run {
  id: string
  query: string
  symbol: string
  exchange: string
  verdict?: { signal: Signal; confidence: number; summary: string }
  at: number
}

const HISTORY_KEY = 'finfreex-analyst-history'

function AnalystWorkspace() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState('')
  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState('NSE')
  const [running, setRunning] = useState(false)
  const [statuses, setStatuses] = useState<string[]>([])
  const [stage, setStage] = useState(0)
  const [marketData, setMarketData] = useState<any>(null)
  const [agents, setAgents] = useState<Record<string, AgentInfo>>({})
  const [personas, setPersonas] = useState<PersonaResult[]>([])
  const [verdict, setVerdict] = useState<{ signal: Signal; confidence: number; summary: string } | null>(null)
  const [generalAIChatAnswer, setGeneralAIChatAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Run[]>([])
  const startedRef = useRef(false)
  const canvasEndRef = useRef<HTMLDivElement>(null)

  const { data: quote } = useQuote(symbol || 'RELIANCE', exchange)
  const { data: news } = useNews(symbol || undefined)

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'))
    } catch {}
  }, [])

  const seedAgents = () =>
    Object.fromEntries(
      SPECIALISTS.map((s) => [s.key, { name: s.name, icon: s.icon, status: 'idle' as const }])
    )

  const run = useCallback((q: string) => {
    setQuery(q)
    setError(null)
    setGeneralAIChatAnswer(null)

    const target = resolveTicker(q)
    if (!target) {
      setRunning(true)
      setSymbol('')
      setStatuses(['Connecting to general PortAI intelligence engine...'])
      setStage(0)
      setMarketData(null)
      setAgents({})
      setPersonas([])
      setVerdict(null)
      fetchAIChat([{ role: 'user', content: q }])
        .then((res) => {
          setGeneralAIChatAnswer(res.answer)
          setRunning(false)
        })
        .catch((err) => {
          setError(err.message || 'Failed to complete Q&A chat request.')
          setRunning(false)
        })
      return
    }
    setSymbol(target.symbol)
    setExchange(target.exchange)
    setRunning(true)
    setStatuses([`Resolving ${target.symbol} on ${target.exchange}…`])
    setStage(0)
    setMarketData(null)
    setAgents(seedAgents())
    setPersonas([])
    setVerdict(null)

    let finalVerdict: { signal: Signal; confidence: number; summary: string } | undefined

    streamAnalysis(
      target.symbol,
      target.exchange,
      ['buffett', 'jhunjhunwala', 'graham', 'burry'],
      (chunk: AIChunk) => {
        if (chunk.type === 'status' && chunk.message) {
          setStatuses((s) => [...s.slice(-7), chunk.message!])
          const m = chunk.message.toLowerCase()
          if (m.includes('risk')) setStage(3)
          else if (m.includes('portfolio')) setStage(4)
        }
        if (chunk.type === 'market_data') {
          setStage(1)
          setMarketData(chunk.data ?? chunk.result ?? null)
          // Data collected → specialists start thinking
          setAgents((a) => {
            const next = { ...a }
            for (const k of Object.keys(next)) next[k] = { ...next[k], status: 'thinking' }
            return next
          })
        }
        if (chunk.type === 'specialist') {
          setStage((s) => Math.max(s, 1))
          const name = String(chunk.agent ?? '').toLowerCase()
          const spec = SPECIALISTS.find((s) => s.match.some((m) => name.includes(m)))
          if (spec) {
            const r = chunk.result ?? chunk.data ?? {}
            setAgents((a) => ({
              ...a,
              [spec.key]: {
                ...a[spec.key],
                status: 'done',
                signal: normSignal(pick(r, ['signal', 'action', 'recommendation', 'rating'])),
                confidence: normConfidence(pick(r, ['confidence', 'score'])),
                thought: String(pick(r, ['reasoning', 'summary', 'analysis', 'message']) ?? '').slice(0, 220) || undefined,
              },
            }))
          }
        }
        if (chunk.type === 'persona') {
          setStage((s) => Math.max(s, 2))
          const r = chunk.result ?? chunk.data ?? {}
          setPersonas((p) => [
            ...p.filter((x) => x.name !== chunk.persona),
            {
              name: String(chunk.persona ?? 'Persona'),
              signal: normSignal(pick(r, ['signal', 'action', 'recommendation'])),
              confidence: normConfidence(pick(r, ['confidence', 'score'])),
              reason: String(pick(r, ['reasoning', 'summary', 'message']) ?? '').slice(0, 200) || undefined,
            },
          ])
        }
        if (chunk.type === 'final_verdict') {
          setStage(5)
          const r = chunk.result ?? chunk.data ?? {}
          finalVerdict = {
            signal: normSignal(pick(r, ['signal', 'action', 'recommendation'])) ?? 'NEUTRAL',
            confidence: normConfidence(pick(r, ['confidence', 'score'])) ?? 50,
            summary:
              String(pick(r, ['reasoning', 'summary', 'thesis', 'message']) ?? '') ||
              'Committee verdict computed from specialist and persona signals.',
          }
          setVerdict(finalVerdict)
        }
        if (chunk.type === 'error') {
          setError(chunk.message || 'The analysis engine returned an error.')
        }
        canvasEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      },
      () => {
        setRunning(false)
        setStage(5)
        // Any agent still marked thinking closes as done
        setAgents((a) => {
          const next = { ...a }
          for (const k of Object.keys(next))
            if (next[k].status === 'thinking') next[k] = { ...next[k], status: 'done' }
          return next
        })
        const entry: Run = {
          id: `${Date.now()}`,
          query: q,
          symbol: target.symbol,
          exchange: target.exchange,
          verdict: finalVerdict,
          at: Date.now(),
        }
        setHistory((h) => {
          const next = [entry, ...h].slice(0, 20)
          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
          } catch {}
          return next
        })
      },
      (err) => {
        setRunning(false)
        setError(
          `Could not reach the analysis engine (${err?.message ?? 'network error'}). ` +
            'Check that the backend is running, then retry.'
        )
      }
    )
  }, [])

  // Auto-run when arriving with ?q= from homepage / command palette
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && !startedRef.current) {
      startedRef.current = true
      run(q)
    }
  }, [searchParams, run])

  const agentList = SPECIALISTS.map((s) => agents[s.key]).filter(Boolean)
  const doneAgents = agentList.filter((a) => a.status === 'done' && a.signal)
  const bullish = doneAgents.filter((a) => ['BUY', 'BULLISH'].includes(a.signal!)).length
  const bearish = doneAgents.filter((a) => ['SELL', 'BEARISH'].includes(a.signal!)).length
  const neutral = doneAgents.length - bullish - bearish

  const hasSession = running || verdict || agentList.length > 0 || !!generalAIChatAnswer

  return (
    <>
      <Sidebar />
      <div className="lg:pl-64 min-h-[100dvh] pt-20 flex">
        {/* ─── Center: research canvas ─── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 pb-6">
            <div className="mx-auto max-w-3xl">
              {!hasSession ? (
                <div className="pt-[12vh]">
                  <h1 className="text-2xl font-semibold tracking-tight text-balance">Research assistant</h1>
                  <p className="text-soft mt-2.5 max-w-lg text-pretty text-[15px] leading-relaxed">
                    Name a company and six models review it independently — technical, fundamental,
                    macro, news, valuation and risk. You see each conclusion and the reasoning behind it.
                  </p>
                  <div className="mt-7 max-w-xl">
                    <AIPromptInput autoFocus placeholder="Try “Analyze RELIANCE”" onSubmit={run} />
                  </div>
                  <div className="mt-3">
                    <PromptChips prompts={EXAMPLES} onPick={run} />
                  </div>

                  <div className="mt-12 pt-6 border-t border-border">
                    <div className="text-[11px] uppercase tracking-wider text-muted mb-3">How it runs</div>
                    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
                      {PIPELINE.map((p, i) => (
                        <li key={p} className="flex items-center gap-2">
                          <span className="text-[13px] text-soft">
                            <span className="text-muted tabular-nums mr-1.5">{i + 1}</span>
                            {p}
                          </span>
                          {i < PIPELINE.length - 1 && <span className="text-muted">·</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="pt-4 space-y-5">
                  {/* Query + progress */}
                  <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted mb-2">
                      {running ? 'Running' : 'Complete'}
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <h1 className="text-xl font-semibold tracking-tight text-balance">{query}</h1>
                      {verdict && <SignalBadge signal={verdict.signal} />}
                    </div>

                    {/* Stage rail */}
                    <div className="mt-4 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                      {PIPELINE.map((p, i) => {
                        const state = i < stage ? 'done' : i === stage && running ? 'active' : i === stage ? 'done' : 'pending'
                        return (
                          <React.Fragment key={p}>
                            <div
                              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10.5px] whitespace-nowrap border transition-colors ${
                                state === 'done'
                                  ? 'bg-white/[0.04] border-border text-soft'
                                  : state === 'active'
                                  ? 'bg-primary/10 border-primary/30 text-primary'
                                  : 'bg-transparent border-border text-muted'
                              }`}
                            >
                              {state === 'done' && <iconify-icon icon="solar:check-read-linear" width="10"></iconify-icon>}
                              {p}
                            </div>
                            {i < PIPELINE.length - 1 && <span className="w-2 h-px bg-border shrink-0"></span>}
                          </React.Fragment>
                        )
                      })}
                    </div>

                    {running && statuses.length > 0 && (
                      <div className="mt-3 text-xs text-muted truncate">{statuses[statuses.length - 1]}</div>
                    )}
                  </div>

                  {error && (
                    <InsightCard tone="coral" icon="solar:danger-triangle-linear" title="Analysis interrupted" body={error} />
                  )}

                  {/* Market snapshot */}
                  {(marketData || quote) && symbol && (
                    <Card hover={false} className="flex flex-wrap items-center gap-x-8 gap-y-3">
                      <div>
                        <div className="text-[11px] text-muted">{exchange}</div>
                        <div className="text-base font-semibold text-foreground">{symbol}</div>
                      </div>
                      {quote && (
                        <>
                          <div>
                            <div className="text-[11px] text-muted">Price</div>
                            <div className="text-base font-semibold tabular-nums">{fmt(quote.current_price)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted">Today</div>
                            <Change value={quote.change_pct} className="text-sm" />
                          </div>
                          <div className="hidden sm:block">
                            <div className="text-[11px] text-muted">Day range</div>
                            <div className="text-sm tabular-nums text-soft">
                              {fmt(quote.low)} – {fmt(quote.high)}
                            </div>
                          </div>
                        </>
                      )}
                    </Card>
                  )}

                  {/* Model results */}
                  {agentList.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-foreground">Models</h2>
                        {doneAgents.length > 0 && (
                          <span className="text-[11px] text-muted">
                            {doneAgents.length}/{agentList.length} reported
                          </span>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {SPECIALISTS.map((s) => agents[s.key] && <AgentCard key={s.key} agent={agents[s.key]} />)}
                      </div>
                      {doneAgents.length >= 2 && (
                        <div className="mt-4 max-w-sm">
                          <div className="text-[10.5px] uppercase tracking-wider text-muted mb-2">Consensus</div>
                          <ConsensusBar bullish={bullish} bearish={bearish} neutral={neutral} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Investor personas */}
                  {personas.length > 0 && (
                    <div>
                      <h2 className="text-sm font-semibold text-foreground mb-3">Investor styles</h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {personas.map((p) => (
                          <div key={p.name} className="rounded-md bg-surface border border-border p-4">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[13px] font-semibold text-foreground capitalize">{p.name}</span>
                              {p.signal && <SignalBadge signal={p.signal} />}
                            </div>
                            {p.reason && <p className="text-xs text-soft leading-relaxed">{p.reason}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verdict */}
                  {verdict && (
                    <VerdictCard
                      signal={verdict.signal}
                      confidence={verdict.confidence}
                      title={`${symbol} — combined view`}
                      summary={verdict.summary}
                    />
                  )}

                  {generalAIChatAnswer && (
                    <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg shadow-black/10">
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-4">
                        <iconify-icon icon="solar:magic-stick-3-bold" class="text-primary shrink-0" width="18"></iconify-icon>
                        PortAI Financial Response
                      </div>
                      <div className="prose prose-invert max-w-none text-soft text-sm leading-relaxed whitespace-pre-wrap">
                        {generalAIChatAnswer}
                      </div>
                    </div>
                  )}

                  <div ref={canvasEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Follow-up input pinned to bottom once a session exists */}
          {hasSession && (
            <div className="shrink-0 border-t border-border bg-background px-4 sm:px-6 py-3">
              <div className="mx-auto max-w-3xl">
                <AIPromptInput size="md" placeholder="Analyze another company" onSubmit={run} />
              </div>
            </div>
          )}
        </div>

        {/* ─── Right rail: context ─── */}
        <aside className="hidden xl:flex w-80 shrink-0 border-l border-border flex-col overflow-y-auto custom-scrollbar px-4 py-5 gap-5">
          {symbol ? (
            <>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted mb-2.5">Quick actions</div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/technical-charts" className="chip justify-center py-2 text-soft hover:text-foreground hover:border-border-strong transition-colors">
                    <iconify-icon icon="solar:chart-2-linear" width="13"></iconify-icon> Chart
                  </Link>
                  <Link href="/fundamental-analysis" className="chip justify-center py-2 text-soft hover:text-foreground hover:border-border-strong transition-colors">
                    <iconify-icon icon="solar:document-text-linear" width="13"></iconify-icon> Financials
                  </Link>
                  <Link href="/alerts" className="chip justify-center py-2 text-soft hover:text-foreground hover:border-border-strong transition-colors">
                    <iconify-icon icon="solar:bell-linear" width="13"></iconify-icon> Alert
                  </Link>
                  <Link href="/peer-comparison" className="chip justify-center py-2 text-soft hover:text-foreground hover:border-border-strong transition-colors">
                    <iconify-icon icon="solar:users-group-two-rounded-linear" width="13"></iconify-icon> Peers
                  </Link>
                </div>
              </div>

              {Array.isArray(news) && news.length > 0 && (
                <div>
                  <div className="text-[10.5px] uppercase tracking-wider text-muted mb-2.5">Latest on {symbol}</div>
                  <div className="space-y-2.5">
                    {news.slice(0, 5).map((n: any, i: number) => (
                      <a key={i} href={n.url} target="_blank" rel="noreferrer" className="block rounded-md bg-surface border border-border p-3 hover:border-border-strong transition-colors">
                        <p className="text-xs text-foreground leading-snug line-clamp-2">{n.title}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-muted">
                          <span className="truncate">{n.source}</span>
                          {n.sentiment_label && (
                            <span className={n.sentiment_label === 'positive' ? 'text-emerald-bright' : n.sentiment_label === 'negative' ? 'text-coral' : ''}>
                              · {n.sentiment_label}
                            </span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted mb-2.5">Recent</div>
              {history.length === 0 && <p className="text-xs text-muted">Your past analyses will appear here.</p>}
            </div>
          )}

          {history.length > 0 && (
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted mb-2.5">History</div>
              <div className="space-y-2">
                {history.slice(0, 8).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => run(h.query)}
                    className="w-full text-left rounded-md bg-surface border border-border p-3 hover:border-border-strong transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">{h.symbol}</span>
                      {h.verdict && <SignalBadge signal={h.verdict.signal} />}
                    </div>
                    <p className="text-[11px] text-muted truncate mt-1">{h.query}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}

export default function AiAnalystPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AnalystWorkspace />
    </Suspense>
  )
}
