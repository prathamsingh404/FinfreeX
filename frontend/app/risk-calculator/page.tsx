'use client'

import React, { useEffect, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, StatTile, KpiRow, DefRow, Note, EmptyState, SkeletonBlock, Btn, cx } from '@/components/ui/kit'
import { Segmented, Reveal } from '@/components/ui/controls'
import { fetchRiskMetrics } from '@/lib/api'

/* Every figure here is computed from the instrument's own daily closes over
   the selected window — volatility from the standard deviation of returns,
   drawdown from the peak-to-trough path, beta against the benchmark. */

const PERIODS = [
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
  { value: '5y', label: '5Y' },
] as const

const EXCHANGES = ['NSE', 'BSE', 'US'] as const

interface Risk {
  symbol: string
  observations: number
  volatility: number | null
  downside_volatility: number | null
  max_drawdown: number | null
  var95: number | null
  var99: number | null
  annual_return: number | null
  sharpe: number | null
  sortino: number | null
  beta: number | null
  alpha: number | null
  benchmark: string
}

const fmt = (v: number | null | undefined, suffix = '', digits = 2) =>
  v == null ? '—' : `${v.toFixed(digits)}${suffix}`

export default function RiskCalculatorPage() {
  const [input, setInput] = useState('RELIANCE')
  const [symbol, setSymbol] = useState('RELIANCE')
  const [exchange, setExchange] = useState<string>('NSE')
  const [period, setPeriod] = useState<string>('1y')

  const [risk, setRisk] = useState<Risk | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetchRiskMetrics(symbol, exchange, period)
        if (!cancelled) setRisk(res)
      } catch (err: any) {
        if (!cancelled) {
          setRisk(null)
          setError(err.message || `No price history for ${symbol}.`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [symbol, exchange, period])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = input.trim().toUpperCase()
    if (next) setSymbol(next)
  }

  return (
    <PageShell
      category="Portfolio"
      title="Risk"
      subtitle="Volatility, drawdown and risk-adjusted return, computed from the instrument's own price history."
      icon="solar:shield-warning-linear"
      backdrop="radial"
      actions={<Segmented options={PERIODS} value={period} onChange={setPeriod} size="sm" />}
    >
      <div className="mb-3">
        <Panel label="Instrument" pad>
          <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
            <label className="min-w-0">
              <span className="eyebrow">Symbol</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder="RELIANCE"
                className="input mt-1.5 w-40"
              />
            </label>
            <label>
              <span className="eyebrow">Exchange</span>
              <select value={exchange} onChange={(e) => setExchange(e.target.value)} className="select mt-1.5 w-auto">
                {EXCHANGES.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </label>
            <Btn type="submit" icon="solar:calculator-linear">Compute</Btn>
            {risk && (
              <span className="text-xs text-muted ml-auto tabular-nums">
                {risk.observations} sessions · benchmark {risk.benchmark}
              </span>
            )}
          </form>
        </Panel>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkeletonBlock height={180} />
          <SkeletonBlock height={180} />
        </div>
      ) : !risk ? (
        <Panel label="Risk metrics">
          <EmptyState
            icon="solar:shield-warning-linear"
            title={`No risk metrics for ${symbol}`}
            body={error ?? 'There is not enough price history on this instrument to compute the statistics.'}
          />
        </Panel>
      ) : (
        <>
          <KpiRow cols={4} className="mb-3">
            <StatTile
              label="Annualised volatility"
              value={fmt(risk.volatility, '%')}
              hint="Standard deviation of daily returns"
            />
            <StatTile
              label="Maximum drawdown"
              value={fmt(risk.max_drawdown, '%')}
              tone="down"
              hint="Deepest fall from a peak"
            />
            <StatTile
              label="Value at risk (95%)"
              value={fmt(risk.var95, '%')}
              tone="down"
              hint="Worst day in 19 out of 20"
            />
            <StatTile
              label="Value at risk (99%)"
              value={fmt(risk.var99, '%')}
              tone="down"
              hint="Worst day in 99 out of 100"
            />
          </KpiRow>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            <Reveal>
              <Panel label="Risk-adjusted return" meta={period.toUpperCase()} pad>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Sharpe', value: risk.sharpe },
                    { label: 'Sortino', value: risk.sortino },
                    { label: 'Alpha', value: risk.alpha, suffix: '%' },
                  ].map((m) => (
                    <div key={m.label} className="p-3 rounded border border-border bg-surface-2 text-center">
                      <div
                        className={cx(
                          'text-lg font-semibold tabular-nums',
                          m.value == null ? 'text-muted' : m.value >= 0 ? 'val-up' : 'val-down',
                        )}
                      >
                        {fmt(m.value, m.suffix ?? '')}
                      </div>
                      <div className="text-xs text-muted mt-1">{m.label}</div>
                    </div>
                  ))}
                </div>
                <DefRow label="Annualised return" value={fmt(risk.annual_return, '%')} tone={(risk.annual_return ?? 0) >= 0 ? 'up' : 'down'} />
                <DefRow label="Downside volatility" value={fmt(risk.downside_volatility, '%')} />
              </Panel>
            </Reveal>

            <Reveal delay={80} variant="right" className="flex flex-col gap-3">
              <Panel label="Market sensitivity" meta={`vs ${risk.benchmark}`} pad>
                <DefRow label="Beta" value={fmt(risk.beta)} />
                <DefRow label="Alpha" value={fmt(risk.alpha, '%')} tone={(risk.alpha ?? 0) >= 0 ? 'up' : 'down'} />
                <p className="text-xs text-muted mt-3 leading-relaxed">
                  {risk.beta == null
                    ? 'Beta could not be computed: the benchmark history did not overlap enough sessions.'
                    : risk.beta > 1
                      ? `This moves about ${risk.beta.toFixed(2)} times as much as the benchmark. It amplifies both directions.`
                      : `This moves about ${risk.beta.toFixed(2)} times as much as the benchmark, so it dampens the index move.`}
                </p>
              </Panel>

              <Note>
                Value at risk is a threshold, not a floor. A 95% figure says one session in twenty was worse than this — it does not say how much worse.
              </Note>
            </Reveal>
          </div>
        </>
      )}
    </PageShell>
  )
}
