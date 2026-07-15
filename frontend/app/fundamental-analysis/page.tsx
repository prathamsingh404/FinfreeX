'use client'
import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, fmt, cx } from '@/components/ui/kit'
import { AIScoreRing, InsightCard, SignalBadge, Signal } from '@/components/ui/ai'
import { useFundamentals, useQuote, useNews } from '@/lib/hooks/useMarketData'

/* ============================================================
   Stock page — company identity up top (price, AI score,
   stance), then tabs. Not another card grid.
   ============================================================ */

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'ICICIBANK']
const TABS = ['Overview', 'Financials', 'News'] as const
type Tab = (typeof TABS)[number]

/** Transparent rule-based grade from live fundamentals (not an LLM). */
function gradeCompany(c: any): { score: number; signal: Signal; notes: { title: string; body: string; tone: 'emerald' | 'amber' | 'coral' | 'ai' }[] } | null {
  if (!c) return null
  let score = 50
  const notes: { title: string; body: string; tone: 'emerald' | 'amber' | 'coral' | 'ai' }[] = []

  const roe = c.roe ?? null
  if (roe != null) {
    const roePct = roe > 1 ? roe : roe * 100
    if (roePct >= 18) { score += 12; notes.push({ title: 'Strong ROE', body: `Return on equity of ${roePct.toFixed(1)}% — capital is compounding efficiently.`, tone: 'emerald' }) }
    else if (roePct < 8) { score -= 10; notes.push({ title: 'Weak ROE', body: `ROE of ${roePct.toFixed(1)}% underperforms cost of capital for most sectors.`, tone: 'coral' }) }
  }
  const growth = c.revenue_growth ?? null
  if (growth != null) {
    const g = growth > 1 ? growth : growth * 100
    if (g >= 12) { score += 10; notes.push({ title: 'Revenue expanding', body: `Top line growing ${g.toFixed(1)}% — demand is real.`, tone: 'emerald' }) }
    else if (g < 0) { score -= 10; notes.push({ title: 'Shrinking revenue', body: `Revenue contracting ${Math.abs(g).toFixed(1)}% — verify whether cyclical or structural.`, tone: 'coral' }) }
  }
  const de = c.debt_to_equity ?? null
  if (de != null) {
    const d = de > 10 ? de / 100 : de
    if (d > 1.5) { score -= 12; notes.push({ title: 'Leveraged balance sheet', body: `Debt/equity ≈ ${d.toFixed(2)} — rate hikes bite here.`, tone: 'amber' }) }
    else if (d < 0.5) { score += 6 }
  }
  const margins = c.profit_margins ?? null
  if (margins != null) {
    const m = margins > 1 ? margins : margins * 100
    if (m >= 15) score += 8
    else if (m < 5) { score -= 6; notes.push({ title: 'Thin margins', body: `Net margin ${m.toFixed(1)}% leaves little cushion in downturns.`, tone: 'amber' }) }
  }
  const pe = c.pe_ratio ?? null
  if (pe != null && pe > 0) {
    if (pe < 15) { score += 8; notes.push({ title: 'Undemanding valuation', body: `P/E of ${pe.toFixed(1)} prices in little optimism.`, tone: 'ai' }) }
    else if (pe > 45) { score -= 8; notes.push({ title: 'Rich valuation', body: `P/E of ${pe.toFixed(1)} — growth must deliver or the multiple compresses.`, tone: 'amber' }) }
  }

  score = Math.round(Math.max(5, Math.min(95, score)))
  const signal: Signal = score >= 65 ? 'BULLISH' : score <= 40 ? 'BEARISH' : 'NEUTRAL'
  return { score, signal, notes: notes.slice(0, 3) }
}

export default function FundamentalAnalysisPage() {
  const [symbol, setSymbol] = useState('RELIANCE')
  const [input, setInput] = useState('RELIANCE')
  const [tab, setTab] = useState<Tab>('Overview')

  const { data: company, loading } = useFundamentals(symbol, 'NSE')
  const { data: quote } = useQuote(symbol, 'NSE')
  const { data: news } = useNews(symbol)

  const grade = useMemo(() => gradeCompany(company), [company])

  const range = useMemo(() => {
    const hi = company?.['52w_high']
    const lo = company?.['52w_low']
    const px = quote?.current_price
    if (!hi || !lo || !px || hi <= lo) return null
    return Math.max(0, Math.min(100, ((px - lo) / (hi - lo)) * 100))
  }, [company, quote])

  const go = (s: string) => {
    const v = s.trim().toUpperCase()
    if (v) {
      setSymbol(v)
      setInput(v)
      setTab('Overview')
    }
  }

  return (
    <PageShell
      title="Stock Research"
      category="Research"
      subtitle="One company at a time, graded on live fundamentals."
      icon="solar:document-text-bold-duotone"
    >
      {/* Symbol picker */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 w-full max-w-xs rounded-lg bg-surface border border-border px-3 h-10 focus-within:border-primary">
          <iconify-icon icon="solar:magnifer-linear" width="15" class="text-muted"></iconify-icon>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && go(input)}
            placeholder="Symbol, e.g. RELIANCE"
            className="flex-1 bg-transparent text-sm text-foreground outline-none uppercase placeholder:normal-case min-w-0"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR.map((s) => (
            <button
              key={s}
              onClick={() => go(s)}
              className={cx(
                'px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer',
                symbol === s ? 'bg-primary/12 border-primary/30 text-primary' : 'bg-transparent border-border text-muted hover:text-soft'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-32 w-full" />
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="skeleton h-64 lg:col-span-2" />
            <div className="skeleton h-64" />
          </div>
        </div>
      ) : !company ? (
        <Card hover={false} className="text-center py-14 max-w-xl mx-auto">
          <iconify-icon icon="solar:document-text-linear" width="28" class="text-muted"></iconify-icon>
          <p className="text-sm text-soft mt-3">No fundamentals found for “{symbol}”.</p>
          <p className="text-xs text-muted mt-1.5">Try an NSE symbol — {POPULAR.slice(0, 3).join(', ')} — or search with Ctrl+K.</p>
        </Card>
      ) : (
        <>
          {/* ─── Identity header ─── */}
          <div className="surface p-5 mb-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="min-w-0">
                <div className="text-[11px] text-muted font-medium">{company.sector} · {company.industry}</div>
                <h2 className="text-xl font-extrabold tracking-tight text-foreground truncate">{company.company_name}</h2>
                <div className="text-xs text-soft">{company.symbol} · NSE</div>
              </div>
              {quote && (
                <div>
                  <div className="text-2xl font-extrabold tabular-nums">₹{fmt(quote.current_price)}</div>
                  <Change value={quote.change_pct} className="text-sm" />
                </div>
              )}
              {range !== null && (
                <div className="w-44">
                  <div className="flex justify-between text-[10px] text-muted mb-1">
                    <span>₹{fmt(company['52w_low']!, { decimals: 0 })}</span>
                    <span>52W</span>
                    <span>₹{fmt(company['52w_high']!, { decimals: 0 })}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 relative">
                    <span
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background"
                      style={{ left: `calc(${range}% - 5px)` }}
                    ></span>
                  </div>
                </div>
              )}
              {grade && (
                <div className="ml-auto flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <SignalBadge signal={grade.signal} />
                    <div className="mt-1.5">
                      <Link
                        href={`/ai-analyst?q=${encodeURIComponent(`Analyze ${symbol}`)}`}
                        className="text-[11px] font-bold text-ai-bright hover:underline inline-flex items-center gap-1"
                      >
                        <iconify-icon icon="solar:magic-stick-3-linear" width="11"></iconify-icon>
                        Run 6-agent analysis
                      </Link>
                    </div>
                  </div>
                  <AIScoreRing score={grade.score} size={76} />
                </div>
              )}
            </div>
          </div>

          {/* ─── Tabs ─── */}
          <div className="flex items-center gap-1 border-b border-border mb-5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cx(
                  'px-4 py-2.5 border-b-2 text-[13px] font-semibold transition-colors cursor-pointer -mb-px',
                  tab === t ? 'border-primary text-foreground' : 'border-transparent text-soft hover:text-foreground'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card hover={false} className="lg:col-span-2">
                <SectionTitle title="Business" subtitle={`${company.sector} / ${company.industry}`} icon="solar:info-circle-bold-duotone" />
                <p className="text-sm text-soft leading-relaxed max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                  {company.description || 'No description available.'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 border-t border-border pt-4">
                  {[
                    ['Market Cap', company.market_cap ? fmt(company.market_cap, { compact: true, prefix: '₹' }) : '—'],
                    ['P/E', company.pe_ratio ? company.pe_ratio.toFixed(1) : '—'],
                    ['P/B', company.pb_ratio ? company.pb_ratio.toFixed(2) : '—'],
                    ['Beta', company.beta ? company.beta.toFixed(2) : '—'],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div className="text-[11px] text-muted">{l}</div>
                      <div className="text-sm font-semibold mt-1 tabular-nums">{v}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ai-bright">
                  <iconify-icon icon="solar:magic-stick-3-linear" width="13"></iconify-icon> What the numbers say
                </div>
                {grade?.notes.length ? (
                  grade.notes.map((n) => <InsightCard key={n.title} title={n.title} body={n.body} tone={n.tone} />)
                ) : (
                  <InsightCard title="Middle of the pack" body="No standout strengths or red flags in the reported fundamentals. Run the full 6-agent analysis for technicals, news and macro context." />
                )}
              </div>
            </div>
          )}

          {tab === 'Financials' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                ['Revenue', company.revenue ? fmt(company.revenue, { compact: true, prefix: '₹' }) : '—'],
                ['Revenue Growth', company.revenue_growth != null ? `${(company.revenue_growth > 1 ? company.revenue_growth : company.revenue_growth * 100).toFixed(1)}%` : '—'],
                ['Gross Margin', company.gross_margins != null ? `${(company.gross_margins > 1 ? company.gross_margins : company.gross_margins * 100).toFixed(1)}%` : '—'],
                ['Operating Margin', company.operating_margins != null ? `${(company.operating_margins > 1 ? company.operating_margins : company.operating_margins * 100).toFixed(1)}%` : '—'],
                ['Net Margin', company.profit_margins != null ? `${(company.profit_margins > 1 ? company.profit_margins : company.profit_margins * 100).toFixed(1)}%` : '—'],
                ['ROE', company.roe != null ? `${(company.roe > 1 ? company.roe : company.roe * 100).toFixed(1)}%` : '—'],
                ['ROA', company.roa != null ? `${(company.roa > 1 ? company.roa : company.roa * 100).toFixed(1)}%` : '—'],
                ['EPS', company.eps != null ? `₹${company.eps.toFixed(2)}` : '—'],
                ['Debt / Equity', company.debt_to_equity != null ? (company.debt_to_equity > 10 ? (company.debt_to_equity / 100).toFixed(2) : company.debt_to_equity.toFixed(2)) : '—'],
                ['Current Ratio', company.current_ratio != null ? company.current_ratio.toFixed(2) : '—'],
                ['Free Cash Flow', company.free_cashflow ? fmt(company.free_cashflow, { compact: true, prefix: '₹' }) : '—'],
                ['Dividend Yield', company.dividend_yield != null ? `${(company.dividend_yield > 1 ? company.dividend_yield : company.dividend_yield * 100).toFixed(2)}%` : '—'],
              ].map(([l, v]) => (
                <div key={l} className="surface p-4">
                  <div className="text-[11px] text-muted">{l}</div>
                  <div className="text-lg font-bold tabular-nums mt-1">{v}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'News' && (
            <div className="grid sm:grid-cols-2 gap-3 max-w-4xl">
              {Array.isArray(news) && news.length > 0 ? (
                news.slice(0, 8).map((n: any, i: number) => (
                  <a key={i} href={n.url} target="_blank" rel="noreferrer" className="surface p-4 hover:border-border-strong transition-colors block">
                    <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{n.title}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                      <span className="truncate">{n.source}</span>
                      {n.sentiment_label && (
                        <span className={n.sentiment_label === 'positive' ? 'text-emerald-bright' : n.sentiment_label === 'negative' ? 'text-coral' : ''}>
                          · {n.sentiment_label}
                        </span>
                      )}
                    </div>
                  </a>
                ))
              ) : (
                <Card hover={false} className="sm:col-span-2 text-center py-10">
                  <p className="text-sm text-soft">No recent news indexed for {symbol}.</p>
                  <p className="text-xs text-muted mt-1.5">The News & Sentiment page covers the broader market.</p>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}
