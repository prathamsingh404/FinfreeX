'use client'

import React from 'react'
import Link from 'next/link'
import MarketTicker from '@/components/home/MarketTicker'
import MarketScreener from '@/components/home/MarketScreener'
import HeroQuotes from '@/components/home/HeroQuotes'

const CAPABILITIES = [
  {
    group: 'Data & Markets',
    items: [
      { icon: 'solar:chart-square-linear', title: 'Live Markets', desc: 'Indices, movers, sectors and depth across Indian and global exchanges.', href: '/market' },
      { icon: 'solar:chart-2-linear', title: 'Charting', desc: 'Full technical charting with indicators, drawing tools and multi-timeframe views.', href: '/technical-charts' },
      { icon: 'solar:globe-linear', title: 'Global & Macro', desc: 'World indices, currencies, commodities, yields and economic calendars.', href: '/global-markets' },
    ],
  },
  {
    group: 'Research',
    items: [
      { icon: 'solar:filter-linear', title: 'Screener', desc: 'Filter thousands of stocks on fundamental, technical and valuation criteria.', href: '/equities-screener' },
      { icon: 'solar:document-text-linear', title: 'Fundamentals', desc: 'Financial statements, ratios, peer comparison and earnings history.', href: '/fundamental-analysis' },
      { icon: 'solar:notebook-linear', title: 'News & Filings', desc: 'Company news, corporate actions and transcripts, scored for sentiment.', href: '/news-sentiment' },
    ],
  },
  {
    group: 'Portfolio & Tools',
    items: [
      { icon: 'solar:wallet-money-linear', title: 'Portfolio Analytics', desc: 'Exposure, attribution, risk and rebalancing across your holdings.', href: '/portfolios' },
      { icon: 'solar:diagram-down-linear', title: 'Derivatives', desc: 'Option chains, Greeks, open interest and volatility surfaces.', href: '/options-chain' },
      { icon: 'solar:history-linear', title: 'Backtesting', desc: 'Test strategies against decades of historical data before risking capital.', href: '/backtesting' },
    ],
  },
]

export default function HomePage() {
  return (
    <main className="relative">
      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 border-b border-border overflow-hidden min-h-[78vh] flex items-center">
        {/* Background market visual, low opacity, anchored right */}
        <img
          src="/hero-bg.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none opacity-[0.28]"
        />
        {/* Flat scrim for legibility — solid tint, no gradient */}
        <div className="absolute inset-0 bg-background/70 pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-full lg:w-[58%] bg-background/80 pointer-events-none" />

        <div className="mx-auto max-w-6xl w-full relative">
          <div className="max-w-2xl">
            <div className="fade-up text-[11px] uppercase tracking-[0.14em] text-muted mb-5">
              Markets · Research · Portfolio · Analysis
            </div>

            <h1 className="fade-up stagger-1 text-4xl sm:text-5xl lg:text-[52px] font-semibold tracking-[-0.03em] leading-[1.06] text-balance">
              The market research
              <br />
              platform for serious
              <br />
              investors.
            </h1>

            <p className="fade-up stagger-2 mt-5 text-base sm:text-[17px] text-soft max-w-lg text-pretty leading-relaxed">
              Real-time data, deep fundamentals, screening, derivatives and portfolio
              analytics — with AI-assisted research when you want a second opinion.
              One workspace, no tab juggling.
            </p>

            <div className="fade-up stagger-3 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/market"
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition-colors"
              >
                Explore the platform
              </Link>
              <Link
                href="/equities-screener"
                className="text-soft hover:text-foreground border border-border hover:border-border-strong px-5 py-2.5 rounded-md text-sm font-medium transition-colors"
              >
                Open the screener
              </Link>
            </div>

            <div className="fade-up stagger-4 mt-12">
              <HeroQuotes />
            </div>
          </div>
        </div>
      </section>

      <MarketTicker />

      {/* ─── Interactive market data ─── */}
      <section className="px-4 sm:px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Today’s market</h2>
              <p className="text-sm text-soft mt-1.5">
                Sort, filter and click through to full research on any name.
              </p>
            </div>
            <Link href="/market" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              Full market view
              <iconify-icon icon="solar:arrow-right-linear" width="13"></iconify-icon>
            </Link>
          </div>

          <MarketScreener />
        </div>
      </section>

      {/* ─── Capabilities ─── */}
      <section className="px-4 sm:px-6 py-14 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">Everything in one place</h2>
            <p className="text-soft mt-2.5 text-pretty">
              The tools a professional desk expects, built for individual investors.
            </p>
          </div>

          <div className="space-y-9">
            {CAPABILITIES.map((section) => (
              <div key={section.group}>
                <div className="text-[11px] uppercase tracking-wider text-muted mb-3">{section.group}</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.items.map((f) => (
                    <Link key={f.title} href={f.href}>
                      <div className="h-full p-5 rounded-md bg-surface border border-border card-lift">
                        <iconify-icon icon={f.icon} width="18" class="text-soft"></iconify-icon>
                        <h3 className="text-[15px] font-semibold text-foreground mt-3 mb-1.5">{f.title}</h3>
                        <p className="text-[13px] text-soft leading-relaxed">{f.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI as one capability, stated plainly ─── */}
      <section className="px-4 sm:px-6 py-14 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <div className="panel-accent p-8 sm:p-10">
            <div className="max-w-2xl">
              <div className="text-[11px] uppercase tracking-wider text-muted mb-2.5">Research assistant</div>
              <h2 className="text-2xl font-semibold tracking-tight text-balance">
                A second opinion, backed by the same data
              </h2>
              <p className="text-soft mt-3 text-[15px] leading-relaxed text-pretty">
                Ask a question about any company and FinfreeX runs it through six specialist
                models — technical, fundamental, macro, news, valuation and risk — then shows
                you what each concluded and why. You keep the final call.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/ai-analyst"
                  className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition-colors"
                >
                  Try the assistant
                </Link>
                <Link
                  href="/docs"
                  className="text-soft hover:text-foreground border border-border hover:border-border-strong px-5 py-2.5 rounded-md text-sm font-medium transition-colors"
                >
                  How it works
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-4 sm:px-6 py-16 border-t border-border">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Start researching</h2>
            <p className="text-soft mt-1.5 text-sm">Free to use. No card required.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/auth"
              className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition-colors"
            >
              Create account
            </Link>
            <Link
              href="/pricing"
              className="text-soft hover:text-foreground border border-border hover:border-border-strong px-5 py-2.5 rounded-md text-sm font-medium transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
