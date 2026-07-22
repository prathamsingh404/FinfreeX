'use client'

import React from 'react'
import { useIndices } from '@/lib/hooks/useMarketData'

/* ============================================================
   Hero proof strip.
   The first screen shows the actual tape rather than claims
   about it. Real quotes from the indices endpoint, set as a
   quotation page would set them: mono, tabular, right-aligned.
   ============================================================ */

const PREFERRED = ['NIFTY 50', 'SENSEX', 'NIFTY BANK', 'BANK NIFTY', 'NIFTY IT']

export default function HeroQuotes() {
  const { data, loading } = useIndices()

  const rows = React.useMemo(() => {
    if (!data) return []
    const all = Object.entries(data).map(([name, d]: [string, any]) => ({
      name,
      price: d.price,
      change: d.change_pct,
    }))
    // Prefer the headline indices, then fill from whatever else is live
    const picked = PREFERRED.map((p) => all.find((a) => a.name.toUpperCase() === p)).filter(Boolean) as typeof all
    const rest = all.filter((a) => !picked.includes(a))
    return [...picked, ...rest].slice(0, 3)
  }, [data])

  if (loading) {
    return (
      <div className="space-y-px">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-9 w-full max-w-md" />
        ))}
      </div>
    )
  }

  // If the feed is down, say nothing rather than showing placeholder numbers.
  if (rows.length === 0) return null

  return (
    <div className="max-w-md">
      <div className="text-[10.5px] uppercase tracking-wider text-muted mb-2">Live now</div>
      <div className="border-t border-border">
        {rows.map((r) => {
          const up = r.change >= 0
          return (
            <div
              key={r.name}
              className="flex items-baseline justify-between gap-4 py-2 border-b border-border"
            >
              <span className="text-[13px] text-soft truncate">{r.name}</span>
              <div className="flex items-baseline gap-4 shrink-0">
                <span className="text-[13px] tabular-nums text-foreground">
                  {r.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-[13px] tabular-nums w-[68px] text-right ${up ? 'text-emerald-bright' : 'text-coral'}`}>
                  {up ? '+' : '−'}
                  {Math.abs(r.change).toFixed(2)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
