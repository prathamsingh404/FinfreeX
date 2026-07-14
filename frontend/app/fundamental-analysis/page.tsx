'use client'
import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, StatCard, ProgressBar, Badge, fmt } from '@/components/ui/kit'
import { useFundamentals } from '@/lib/hooks/useMarketData'

export default function FundamentalAnalysisPage() {
  const [symbol, setSymbol] = useState('RELIANCE')
  const { data: company, loading } = useFundamentals(symbol, 'NSE')

  return (
    <PageShell
      title="Fundamental Analysis"
      category="Fundamentals"
      subtitle={company ? `Deep-dive financial health snapshot — ${company.company_name} (${company.symbol}).` : 'Deep-dive financial health snapshot.'}
      icon="solar:document-text-bold-duotone"
    >
      <div className="mb-6 flex items-center gap-4">
        <label className="w-full max-w-sm">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Enter symbol (e.g. RELIANCE)"
            className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary uppercase"
          />
        </label>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-soft">Loading fundamentals for {symbol}...</div>
      ) : !company ? (
        <div className="h-64 flex items-center justify-center text-soft">No fundamental data found for {symbol}.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="P/E Ratio" value={company.pe_ratio ? company.pe_ratio.toFixed(2) : 'N/A'} icon="solar:tag-price-bold-duotone" />
            <StatCard label="P/B Ratio" value={company.pb_ratio ? company.pb_ratio.toFixed(2) : 'N/A'} icon="solar:chart-square-bold-duotone" />
            <StatCard label="ROE" value={company.roe ? `${company.roe.toFixed(2)}%` : 'N/A'} icon="solar:chart-bold-duotone" />
            <StatCard label="Dividend Yield" value={company.dividend_yield ? `${company.dividend_yield.toFixed(2)}%` : '0%'} icon="solar:wallet-money-bold-duotone" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border">
              <SectionTitle title="Company Overview" subtitle={`${company.sector} / ${company.industry}`} icon="solar:info-circle-bold-duotone" />
              <p className="text-sm text-soft leading-relaxed mt-4 max-h-[240px] overflow-y-auto scrollbar-thin pr-2">
                {company.description || 'No description available.'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 border-t border-border pt-4">
                <div>
                  <div className="text-[11px] text-muted">Market Cap</div>
                  <div className="text-sm font-semibold mt-1">{company.market_cap ? fmt(company.market_cap, { compact: true, prefix: '₹' }) : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">Revenue Growth</div>
                  <div className="text-sm font-semibold mt-1">{company.revenue_growth ? `${company.revenue_growth.toFixed(1)}%` : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">52W High</div>
                  <div className="text-sm font-semibold mt-1 tabular-nums">{company['52w_high'] ? fmt(company['52w_high'], { prefix: '₹' }) : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">52W Low</div>
                  <div className="text-sm font-semibold mt-1 tabular-nums">{company['52w_low'] ? fmt(company['52w_low'], { prefix: '₹' }) : 'N/A'}</div>
                </div>
              </div>
            </Card>

            <Card className="border-border">
              <SectionTitle title="Financial Health" icon="solar:health-bold-duotone" />
              <div className="space-y-4 mt-4 text-sm">
                {[
                  ['Profit Margin', company.profit_margins ? company.profit_margins : 0], 
                  ['Operating Margin', company.operating_margins ? company.operating_margins : 0], 
                  ['Return on Assets', company.roa ? company.roa * 100 : 0], 
                  ['Debt to Equity', company.debt_to_equity ? 100 - (company.debt_to_equity * 30) : 50]
                ].map(([l, v]) => (
                  <div key={l as string}>
                    <div className="flex justify-between mb-1">
                      <span className="text-soft">{l}</span>
                      <span className="font-semibold">{Math.max(0, Math.min(100, v as number)).toFixed(1)}</span>
                    </div>
                    <ProgressBar value={Math.max(0, Math.min(100, v as number))} tone="primary" />
                  </div>
                ))}
                <Badge tone="emerald" className="mt-4 block w-max">Analyzed via Live Data</Badge>
              </div>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  )
}
