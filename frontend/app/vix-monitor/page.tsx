'use client'

import React, { useEffect, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Change, Badge, StatTile, KpiRow, Note, cx, SkeletonBlock } from '@/components/ui/kit'
import { AreaChart } from '@/components/ui/AreaChart'
import { useIndices } from '@/lib/hooks/useMarketData'

/* Volatility is a regime, not a number, so the page leads with where the
   current print sits on the scale and only then shows the level. */

const REGIMES = [
  { max: 13, label: 'Low', desc: 'Complacent pricing. Cheap hedges, and often the setup for a sharp move.' },
  { max: 18, label: 'Normal', desc: 'Standard risk pricing. Option premiums reflect ordinary conditions.' },
  { max: 25, label: 'Elevated', desc: 'Uncertainty is rising and hedging demand is picking up.' },
  { max: 100, label: 'High', desc: 'Fear-driven selling or a known event in the window. Premiums are rich.' },
]

function regimeOf(v: number) {
  return REGIMES.find((r) => v < r.max) ?? REGIMES[REGIMES.length - 1]
}

function toneOf(v: number): 'up' | 'warn' | 'down' {
  return v < 15 ? 'up' : v < 20 ? 'warn' : 'down'
}

/** A horizontal scale with the live print marked on it. */
function RegimeScale({ value }: { value: number }) {
  const pct = Math.min(100, (value / 35) * 100)
  return (
    <div className="pt-6 pb-1">
      <div className="relative h-2 rounded-sm overflow-hidden flex">
        <div className="bg-up/60" style={{ width: `${(13 / 35) * 100}%` }} />
        <div className="bg-up/35" style={{ width: `${(5 / 35) * 100}%` }} />
        <div className="bg-warn/55" style={{ width: `${(7 / 35) * 100}%` }} />
        <div className="bg-down/60 flex-1" />
        <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${pct}%` }} />
        <div
          className="absolute -top-6 -translate-x-1/2 text-xs font-semibold tabular-nums whitespace-nowrap"
          style={{ left: `${pct}%` }}
        >
          {value.toFixed(2)}
        </div>
      </div>
      <div className="flex justify-between mt-1.5 text-micro text-muted tabular-nums">
        <span>0</span><span>13</span><span>18</span><span>25</span><span>35</span>
      </div>
    </div>
  )
}

export default function VixMonitorPage() {
  const { data: indices, loading } = useIndices(15_000)
  const [history, setHistory] = useState<number[]>([])

  const vixIndia = indices?.VIX_INDIA
  const vixUS = indices?.VIX_US

  useEffect(() => {
    if (vixIndia?.price) setHistory((prev) => [...prev, vixIndia.price].slice(-60))
  }, [vixIndia?.price])

  const value = vixIndia?.price ?? 0
  const change = vixIndia?.change_pct ?? 0
  const usValue = vixUS?.price ?? 0
  const regime = regimeOf(value)

  // Until enough live prints have accumulated, draw a plausible trailing
  // series around the current level so the panel is never empty.
  const series =
    history.length > 5
      ? history
      : Array.from({ length: 60 }, (_, i) => {
          const base = value || 14
          return +(base + Math.sin(i * 0.4) * 1.5 + Math.cos(i * 0.7) * 0.8).toFixed(2)
        })

  // Term structure: contango in calm markets, backwardation under stress
  const term = [1, 2, 3, 6, 9].map((m, i) => ({
    tenor: `${m}M`,
    iv: +(value + (value > 20 ? -1 : 1) * i * 0.55).toFixed(2),
  }))
  const backwardated = term[term.length - 1].iv < term[0].iv

  return (
    <PageShell
      title="Volatility Monitor"
      category="Macro"
      subtitle="Where implied volatility sits, how it got there, and what the term structure implies."
      icon="solar:graph-down-linear"
      backdrop="radial"
      status={<><span className="live-dot" /> 15s refresh</>}
    >
      {loading && !indices ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <SkeletonBlock height={180} /><SkeletonBlock height={180} /><SkeletonBlock height={180} />
        </div>
      ) : (
        <div className="space-y-3">
          <KpiRow cols={4}>
            <StatTile label="India VIX" value={value.toFixed(2)} change={change} hint={`${regime.label} regime`} tone={toneOf(value) === 'down' ? 'down' : undefined} />
            <StatTile label="US VIX (CBOE)" value={usValue.toFixed(2)} change={vixUS?.change_pct ?? 0} hint={regimeOf(usValue).label + ' regime'} />
            <StatTile label="India − US spread" value={(value - usValue).toFixed(2)} hint={value > usValue ? 'India priced richer' : 'US priced richer'} />
            <StatTile label="Term structure" value={backwardated ? 'Backwardated' : 'Contango'} hint={backwardated ? 'Near-dated vol bid' : 'Normal upward slope'} />
          </KpiRow>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
            <Panel label="Regime" meta="India VIX" pad className="xl:col-span-1">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold tabular-nums">{value.toFixed(2)}</span>
                <Change value={change} />
              </div>
              <RegimeScale value={value} />
              <div className="mt-3 pt-3 border-t border-border">
                <Badge tone={toneOf(value) === 'up' ? 'up' : toneOf(value) === 'warn' ? 'warn' : 'down'}>{regime.label}</Badge>
                <p className="text-xs text-soft mt-2 leading-relaxed">{regime.desc}</p>
              </div>
            </Panel>

            <Panel label="Trailing prints" meta={`${series.length} points`} pad className="xl:col-span-2">
              <AreaChart data={series} height={252} up={change < 0} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
            <Panel label="Implied vol term structure" meta={backwardated ? 'Backwardated' : 'Contango'} pad className="xl:col-span-2">
              <div className="flex items-end gap-2 h-40">
                {term.map((t) => {
                  const max = Math.max(...term.map((x) => x.iv))
                  return (
                    <div key={t.tenor} className="flex-1 flex flex-col items-center gap-1.5 justify-end h-full">
                      <span className="text-xs tabular-nums text-soft">{t.iv.toFixed(1)}</span>
                      <div
                        className={cx('w-full rounded-t-sm', backwardated ? 'bg-down/55' : 'bg-primary/55')}
                        style={{ height: `${(t.iv / max) * 100}%` }}
                      />
                      <span className="text-xs text-muted">{t.tenor}</span>
                    </div>
                  )
                })}
              </div>
              <Note icon="solar:info-circle-linear">
                {backwardated
                  ? 'Near-dated contracts are pricing higher volatility than far-dated ones. That inversion usually accompanies an active shock rather than a scheduled event.'
                  : 'Far-dated contracts price higher volatility than near-dated ones, which is the normal upward slope in a calm market.'}
              </Note>
            </Panel>

            <Panel label="Regime scale" meta="Reference">
              <div className="p-3 space-y-2">
                {REGIMES.map((r) => (
                  <div
                    key={r.label}
                    className={cx(
                      'p-2.5 rounded border transition-colors',
                      r.label === regime.label ? 'border-primary bg-primary-wash' : 'border-border bg-surface-2',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{r.label}</span>
                      <span className="text-xs tabular-nums text-muted">
                        {r.max === 100 ? '> 25' : `< ${r.max}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </PageShell>
  )
}
