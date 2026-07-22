'use client'

import React from 'react'
import { useIndices } from '@/lib/hooks/useMarketData'

export default function MarketTicker() {
  const { data: indicesObj, loading } = useIndices()
  
  const indices = indicesObj ? Object.entries(indicesObj).map(([name, data]) => ({ name, ...data })) : []
  
  if (loading || indices.length === 0) {
    return <div className="border-y border-border bg-surface h-[42px]" />
  }

  const row = [...indices, ...indices]
  return (
    <div className="relative overflow-hidden border-y border-border bg-surface py-3">
      <div className="marquee-track gap-8">
        {row.map((idx, i) => {
          const up = idx.change_pct >= 0
          return (
            <div key={i} className="flex items-center gap-3 px-2 shrink-0">
              <span className="text-[11px] uppercase tracking-wide text-soft">{idx.name}</span>
              <span className="text-xs tabular-nums text-foreground">
                {idx.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs tabular-nums ${up ? 'text-emerald-bright' : 'text-coral'}`}>
                {up ? '+' : '−'}{Math.abs(idx.change_pct).toFixed(2)}%
              </span>
              <span className="w-px h-3 bg-border"></span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
