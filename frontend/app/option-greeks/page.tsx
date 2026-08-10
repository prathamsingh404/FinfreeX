'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, StatTile, KpiRow, Note, cx } from '@/components/ui/kit'
import { Segmented, Reveal } from '@/components/ui/controls'
import { getGreeksTable } from '@/lib/featureData'

type Row = ReturnType<typeof getGreeksTable>[number]
type GreekKey = 'delta' | 'gamma' | 'theta' | 'vega' | 'rho' | 'iv'

const SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'] as const

const GREEKS: { key: GreekKey; label: string; blurb: string; decimals: number }[] = [
  { key: 'delta', label: 'Delta', blurb: 'Price move per one point of the underlying', decimals: 2 },
  { key: 'gamma', label: 'Gamma', blurb: 'How fast delta itself changes', decimals: 4 },
  { key: 'theta', label: 'Theta', blurb: 'Value lost per day to time decay', decimals: 2 },
  { key: 'vega', label: 'Vega', blurb: 'Price move per one point of implied volatility', decimals: 2 },
  { key: 'rho', label: 'Rho', blurb: 'Price move per one point of interest rates', decimals: 2 },
  { key: 'iv', label: 'Implied vol', blurb: 'Volatility the market is pricing in', decimals: 1 },
]

/** Profile of one greek across the strike ladder. */
function GreekProfile({ rows, greek }: { rows: Row[]; greek: (typeof GREEKS)[number] }) {
  const values = rows.map((r) => r[greek.key] as number)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = max - min || 1
  const zero = ((max - 0) / span) * 100

  return (
    <div>
      <div className="relative flex items-end gap-1 h-32">
        <span className="absolute left-0 right-0 border-t border-dashed border-border" style={{ top: `${zero}%` }} aria-hidden="true" />
        {rows.map((r) => {
          const v = r[greek.key] as number
          const h = (Math.abs(v) / span) * 100
          const positive = v >= 0
          return (
            <div key={r.strike} className="flex-1 relative h-full flex flex-col justify-start" title={`${r.strike}: ${v.toFixed(greek.decimals)}`}>
              <div
                className={cx('absolute w-full rounded-sm', positive ? 'bg-up/65' : 'bg-down/65')}
                style={positive ? { bottom: `${100 - zero}%`, height: `${h}%` } : { top: `${zero}%`, height: `${h}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-1.5">
        {rows.map((r) => (
          <span key={r.strike} className="flex-1 text-center text-micro text-muted tabular-nums">
            {String(r.strike).slice(-3)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function OptionGreeksPage() {
  const [symbol, setSymbol] = useState<string>('NIFTY')
  const [greekKey, setGreekKey] = useState<GreekKey>('delta')
  const rows = useMemo(() => getGreeksTable(symbol), [symbol])

  const greek = GREEKS.find((g) => g.key === greekKey)!
  // The strike nearest zero delta stands in for at-the-money
  const atm = rows.reduce((best, r) => (Math.abs(r.delta) < Math.abs(best.delta) ? r : best), rows[0])
  const netTheta = rows.reduce((s, r) => s + r.theta, 0)
  const peakGamma = rows.reduce((best, r) => (r.gamma > best.gamma ? r : best), rows[0])
  const avgIv = rows.reduce((s, r) => s + r.iv, 0) / rows.length

  return (
    <PageShell
      title="Option Greeks"
      category="Professional"
      subtitle="Risk sensitivities across the strike ladder, with each greek plotted so the shape is visible."
      icon="solar:math-linear"
      backdrop="mesh"
      actions={<Segmented options={SYMBOLS} value={symbol} onChange={setSymbol} size="sm" />}
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="At the money" value={atm.strike} hint={`Delta ${atm.delta.toFixed(2)}`} />
        <StatTile label="Peak gamma strike" value={peakGamma.strike} hint={`Gamma ${peakGamma.gamma.toFixed(4)}`} />
        <StatTile label="Ladder theta" value={netTheta.toFixed(2)} tone="down" hint="Total daily decay across strikes" />
        <StatTile label="Average implied vol" value={`${avgIv.toFixed(1)}%`} hint={`${rows.length} strikes`} />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-3 items-start">
        <Reveal>
          <Panel label={`${symbol} strike ladder`} meta={`${rows.length} strikes`}>
            <div className="overflow-auto custom-scrollbar">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Strike</th>
                    {GREEKS.map((g) => (
                      <th key={g.key} className="num">{g.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.strike} data-selected={r.strike === atm.strike ? 'true' : undefined}>
                      <td className="font-medium text-foreground tabular-nums">
                        {r.strike}
                        {r.strike === atm.strike && <span className="chip ml-2">ATM</span>}
                      </td>
                      <td className={cx('num', r.delta >= 0 ? 'val-up' : 'val-down')}>{r.delta.toFixed(2)}</td>
                      <td className="num">{r.gamma.toFixed(4)}</td>
                      <td className="num val-down">{r.theta.toFixed(2)}</td>
                      <td className="num">{r.vega.toFixed(2)}</td>
                      <td className={cx('num', r.rho >= 0 ? 'text-foreground' : 'text-muted')}>{r.rho.toFixed(2)}</td>
                      <td className="num text-warn font-medium">{r.iv.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel
            label={`${greek.label} profile`}
            meta="By strike"
            actions={
              <select value={greekKey} onChange={(e) => setGreekKey(e.target.value as GreekKey)} className="select w-auto h-6 text-xs">
                {GREEKS.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            }
            pad
          >
            <GreekProfile rows={rows} greek={greek} />
            <p className="text-xs text-muted mt-3 leading-relaxed">{greek.blurb}</p>
          </Panel>

          <Panel label="What each greek measures" pad>
            <dl>
              {GREEKS.map((g) => (
                <div key={g.key} className="py-2 border-b border-border last:border-none">
                  <dt className="text-sm font-medium text-foreground">{g.label}</dt>
                  <dd className="text-xs text-muted mt-0.5 leading-relaxed">{g.blurb}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Note icon="solar:danger-triangle-linear">
            Theta is negative for every long option on this ladder. Holding through a flat session costs {Math.abs(netTheta).toFixed(0)} points of premium.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
