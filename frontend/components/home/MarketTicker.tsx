import React from 'react'
import { getIndices } from '@/lib/mockData'

export default function MarketTicker() {
  const indices = getIndices()
  const row = [...indices, ...indices]
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-surface/60 py-3">
      <div className="marquee-track gap-8">
        {row.map((idx, i) => {
          const up = idx.changePct >= 0
          return (
            <div key={i} className="flex items-center gap-3 px-2 shrink-0">
              <span className="text-xs font-bold text-foreground">{idx.name}</span>
              <span className="text-xs tabular-nums text-soft">
                {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-semibold tabular-nums ${up ? 'text-emerald-bright' : 'text-coral'}`}>
                {up ? '+' : ''}{idx.changePct.toFixed(2)}%
              </span>
              <span className="w-1 h-1 rounded-full bg-white/15"></span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
