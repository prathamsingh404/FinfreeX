'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import PageShell from '@/components/PageShell'
import { Change, fmt, cx } from '@/components/ui/kit'
import { useScreener } from '@/lib/hooks/useMarketData'

/* ============================================================
   Screener — strategy-first. Pick a preset (or type what you
   want) and the filters apply instantly, client-side, on live
   screener data. Every row hands off to the AI Analyst.
   ============================================================ */

interface Filters {
  peMax?: number
  peMin?: number
  roeMin?: number
  divYieldMin?: number
  revGrowthMin?: number
  betaMax?: number
  ret1mMin?: number
  sector?: string
}

const PRESETS: { id: string; name: string; icon: string; desc: string; filters: Filters }[] = [
  { id: 'value', name: 'Deep Value', icon: 'solar:tag-price-linear', desc: 'Low P/E, real profitability', filters: { peMax: 15, roeMin: 0.12 } },
  { id: 'momentum', name: 'Momentum', icon: 'solar:graph-up-linear', desc: 'Strong 1-month winners', filters: { ret1mMin: 5 } },
  { id: 'dividend', name: 'Dividend Income', icon: 'solar:money-bag-linear', desc: 'Yield above 2%', filters: { divYieldMin: 0.02 } },
  { id: 'quality', name: 'Quality Compounders', icon: 'solar:medal-ribbons-star-linear', desc: 'High ROE, growing revenue', filters: { roeMin: 0.18, revGrowthMin: 0.08 } },
  { id: 'lowvol', name: 'Low Volatility', icon: 'solar:shield-check-linear', desc: 'Beta under 0.9', filters: { betaMax: 0.9 } },
]

type SortKey = 'market_cap' | 'current_price' | 'return_1m' | 'pe_ratio' | 'roe' | 'dividend_yield'

function applyFilters(rows: any[], f: Filters): any[] {
  return rows.filter((q) => {
    if (f.peMax !== undefined && !(q.pe_ratio != null && q.pe_ratio > 0 && q.pe_ratio <= f.peMax)) return false
    if (f.peMin !== undefined && !(q.pe_ratio != null && q.pe_ratio >= f.peMin)) return false
    if (f.roeMin !== undefined && !(q.roe != null && q.roe >= f.roeMin)) return false
    if (f.divYieldMin !== undefined && !(q.dividend_yield != null && q.dividend_yield >= f.divYieldMin)) return false
    if (f.revGrowthMin !== undefined && !(q.revenue_growth != null && q.revenue_growth >= f.revGrowthMin)) return false
    if (f.betaMax !== undefined && !(q.beta != null && q.beta <= f.betaMax)) return false
    if (f.ret1mMin !== undefined && !(q.return_1m != null && q.return_1m >= f.ret1mMin)) return false
    if (f.sector && q.sector !== f.sector) return false
    return true
  })
}

function describeFilters(f: Filters): string[] {
  const chips: string[] = []
  if (f.peMax !== undefined) chips.push(`P/E ≤ ${f.peMax}`)
  if (f.peMin !== undefined) chips.push(`P/E ≥ ${f.peMin}`)
  if (f.roeMin !== undefined) chips.push(`ROE ≥ ${(f.roeMin * 100).toFixed(0)}%`)
  if (f.divYieldMin !== undefined) chips.push(`Div yield ≥ ${(f.divYieldMin * 100).toFixed(1)}%`)
  if (f.revGrowthMin !== undefined) chips.push(`Rev growth ≥ ${(f.revGrowthMin * 100).toFixed(0)}%`)
  if (f.betaMax !== undefined) chips.push(`Beta ≤ ${f.betaMax}`)
  if (f.ret1mMin !== undefined) chips.push(`1M return ≥ ${f.ret1mMin}%`)
  if (f.sector) chips.push(f.sector)
  return chips
}

export default function EquitiesScreenerPage() {
  const [universe, setUniverse] = useState('ALL')
  const [preset, setPreset] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({})
  const [sort, setSort] = useState<SortKey>('market_cap')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const { data: rows, loading } = useScreener({ universe })
  const all = rows || []

  const sectors = useMemo(
    () => Array.from(new Set(all.map((q: any) => q.sector).filter(Boolean))).sort() as string[],
    [all]
  )

  const results = useMemo(() => {
    const filtered = applyFilters(all, filters)
    return [...filtered].sort((a, b) => {
      const av = a[sort] ?? -Infinity
      const bv = b[sort] ?? -Infinity
      return dir === 'desc' ? bv - av : av - bv
    })
  }, [all, filters, sort, dir])

  const pickPreset = (id: string) => {
    if (preset === id) {
      setPreset(null)
      setFilters((f) => ({ sector: f.sector }))
    } else {
      setPreset(id)
      setFilters((f) => ({ ...PRESETS.find((p) => p.id === id)!.filters, sector: f.sector }))
    }
  }

  function toggleSort(k: SortKey) {
    if (sort === k) setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSort(k)
      setDir('desc')
    }
  }

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors"
      onClick={() => toggleSort(k)}
    >
      <div className={`inline-flex items-center gap-1 ${sort === k ? 'text-primary' : ''}`}>
        {label}
        {sort === k && (
          <iconify-icon icon={dir === 'desc' ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'}></iconify-icon>
        )}
      </div>
    </th>
  )

  const activeChips = describeFilters(filters)

  return (
    <PageShell
      title="Screener"
      subtitle="Pick a strategy — filters apply instantly on live data."
      category="Research"
      icon="solar:filter-bold-duotone"
    >
      {/* ─── Strategy presets ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => pickPreset(p.id)}
            className={cx(
              'text-left rounded-lg border p-3.5 transition-colors cursor-pointer card-lift',
              preset === p.id ? 'ai-surface' : 'bg-surface border-border hover:border-border-strong'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <iconify-icon icon={p.icon} width="18" class={preset === p.id ? 'text-ai-bright' : 'text-muted'}></iconify-icon>
              {preset === p.id && <iconify-icon icon="solar:check-circle-bold" width="16" class="text-ai-bright"></iconify-icon>}
            </div>
            <div className="text-[13px] font-bold text-foreground">{p.name}</div>
            <div className="text-[11px] text-muted mt-0.5">{p.desc}</div>
          </button>
        ))}
      </div>

      {/* ─── Controls ─── */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-[13px]">
        <select
          value={universe}
          onChange={(e) => setUniverse(e.target.value)}
          className="bg-surface border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary text-foreground text-xs"
        >
          <option value="ALL">All NSE</option>
          <option value="LARGE_CAP">Large Cap</option>
          <option value="MID_CAP">Mid Cap</option>
          <option value="SMALL_CAP">Small Cap</option>
        </select>
        <select
          value={filters.sector ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value || undefined }))}
          className="bg-surface border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary text-foreground text-xs"
        >
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {activeChips.map((c) => (
          <span key={c} className="chip text-ai-bright border-ai/30 bg-ai/10">{c}</span>
        ))}
        {(preset || activeChips.length > 0) && (
          <button
            onClick={() => {
              setPreset(null)
              setFilters({})
            }}
            className="text-xs text-muted hover:text-coral transition-colors cursor-pointer"
          >
            Clear all
          </button>
        )}

        <span className="ml-auto text-xs text-muted tabular-nums">
          {loading ? '…' : `${results.length} of ${all.length} stocks`}
        </span>
      </div>

      {/* ─── Results ─── */}
      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-border text-[11px] text-soft uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 font-medium">Symbol</th>
                <Th k="current_price" label="Price" />
                <Th k="return_1m" label="1M %" />
                <Th k="market_cap" label="Mkt cap" />
                <Th k="pe_ratio" label="P/E" />
                <Th k="roe" label="ROE" />
                <Th k="dividend_yield" label="Div yield" />
                <th className="px-3 py-2 font-medium">Sector</th>
                <th className="px-3 py-2 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td colSpan={9} className="px-4 py-2"><div className="skeleton h-8 w-full" /></td>
                  </tr>
                ))
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <p className="text-sm text-soft">No stocks pass this screen right now.</p>
                    <p className="text-xs text-muted mt-1.5">Loosen a filter — or try the Momentum preset, it almost always has names.</p>
                  </td>
                </tr>
              ) : (
                results.map((q: any) => (
                  <tr key={q.symbol} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate">{q.symbol}</span>
                        <span className="text-[11px] text-soft truncate max-w-[180px]">{q.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(q.current_price, { decimals: 2 })}</td>
                    <td className="px-3 py-2.5 text-right"><Change value={q.return_1m ?? 0} showArrow={false} /></td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(q.market_cap, { compact: true })}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{q.pe_ratio ? fmt(q.pe_ratio, { decimals: 1 }) : '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{q.roe != null ? `${(q.roe * 100).toFixed(1)}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-soft">{q.dividend_yield != null ? `${(q.dividend_yield * 100).toFixed(2)}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-soft truncate max-w-[140px]">{q.sector || '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/ai-analyst?q=${encodeURIComponent(`Analyze ${q.symbol}`)}`}
                        className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-ai/12 border border-ai/30 text-ai-bright text-[10.5px] font-bold transition-opacity"
                      >
                        <iconify-icon icon="solar:magic-stick-3-linear" width="11"></iconify-icon> Ask AI
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
