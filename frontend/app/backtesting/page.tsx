'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import {
  Panel, StatTile, KpiRow, Btn, fmt, DefRow, Note, ProgressBar, EmptyState, Badge, cx,
} from '@/components/ui/kit'
import { Segmented, Switch, Reveal } from '@/components/ui/controls'
import { AreaChart } from '@/components/ui/AreaChart'

/* Runs the real committee over a historical window and applies its decisions
   to a tracked portfolio, so commission and slippage are in the result. There
   are no canned numbers on this page: with no run, it says so. */

const PERIODS = [
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
  { value: '5y', label: '5Y' },
] as const

const PERIOD_DAYS: Record<string, number> = { '6mo': 182, '1y': 365, '2y': 730, '5y': 1825 }

interface BacktestResult {
  tickers: string[]
  start_date: string
  end_date: string
  initial_cash: number
  final_value: number
  equity: number[]
  metrics: Record<string, any>
  trades: any[]
  decisions: Record<string, any>
}

function drawdownSeries(equity: number[]) {
  let peak = equity[0] ?? 0
  return equity.map((v) => {
    peak = Math.max(peak, v)
    return peak ? ((v - peak) / peak) * 100 : 0
  })
}

const metric = (m: Record<string, any>, ...keys: string[]) => {
  for (const k of keys) {
    const v = m?.[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

const show = (v: number | null, suffix = '', digits = 2) => (v == null ? '—' : `${v.toFixed(digits)}${suffix}`)

export default function BacktestingPage() {
  const [tickers, setTickers] = useState('AAPL, MSFT')
  const [period, setPeriod] = useState<string>('1y')
  const [cash, setCash] = useState('100000')
  const [useLlm, setUseLlm] = useState(false)

  const [result, setResult] = useState<BacktestResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tickerList = tickers.split(/[\s,]+/).map((t) => t.trim().toUpperCase()).filter(Boolean)

  const run = async () => {
    if (!tickerList.length) {
      setError('Enter at least one ticker.')
      return
    }
    setRunning(true)
    setError(null)

    const end = new Date()
    const start = new Date(end.getTime() - (PERIOD_DAYS[period] ?? 365) * 86400000)

    try {
      const res = await fetch('/api/hedge-fund/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: tickerList,
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
          initial_cash: Number(cash) || 100000,
          use_llm: useLlm,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || `The engine returned ${res.status}.`)
      setResult(json)
    } catch (err: any) {
      setError(err.message || 'The backtest failed.')
      setResult(null)
    } finally {
      setRunning(false)
    }
  }

  const equity = result?.equity ?? []
  const drawdown = equity.length ? drawdownSeries(equity) : []
  const worstDd = drawdown.length ? Math.min(...drawdown) : 0
  const m = result?.metrics ?? {}

  const totalReturn =
    result && result.initial_cash
      ? ((result.final_value - result.initial_cash) / result.initial_cash) * 100
      : null
  const sharpe = metric(m, 'sharpe_ratio', 'sharpe')
  const maxDd = metric(m, 'max_drawdown', 'maxDD')
  const winRate = metric(m, 'win_rate', 'winRate')
  const profitFactor = metric(m, 'profit_factor', 'profitFactor')
  const cagr = metric(m, 'cagr', 'annualized_return')

  return (
    <PageShell
      category="Professional"
      title="Backtesting"
      subtitle="Run the committee over history and read what its decisions actually cost to hold."
      icon="solar:history-linear"
      backdrop="tape"
      actions={
        <div className="flex items-center gap-2">
          <Segmented options={PERIODS} value={period} onChange={setPeriod} size="sm" />
          <Btn onClick={run} disabled={running} icon={running ? undefined : 'solar:play-linear'}>
            {running ? 'Running…' : 'Run backtest'}
          </Btn>
        </div>
      }
    >
      <div className="mb-3">
        <Panel label="Run setup" meta={period.toUpperCase()} pad>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[220px]">
              <span className="eyebrow">Tickers</span>
              <input
                value={tickers}
                onChange={(e) => setTickers(e.target.value.toUpperCase())}
                className="input mt-1.5"
                placeholder="AAPL, MSFT"
              />
            </label>
            <label>
              <span className="eyebrow">Starting capital</span>
              <input
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                inputMode="numeric"
                className="input mt-1.5 w-32 tabular-nums"
              />
            </label>
            <Switch checked={useLlm} onChange={setUseLlm} label="Language model reasoning" />
          </div>
          {running && <div className="working-bar h-0.5 rounded-full mt-3" role="progressbar" aria-label="Backtest running" />}
          {error && <p className="text-xs val-down mt-2">{error}</p>}
        </Panel>
      </div>

      {!result ? (
        <Panel label="Results">
          <EmptyState
            icon="solar:history-linear"
            title={running ? 'Running the committee over history' : 'No backtest yet'}
            body={
              running
                ? 'Prices are fetched first, then every agent votes on the window. This takes a couple of minutes.'
                : 'Set the tickers and window above, then run it. Results appear here once the engine finishes.'
            }
            action={!running && <Btn onClick={run} icon="solar:play-linear">Run backtest</Btn>}
          />
        </Panel>
      ) : (
        <>
          <KpiRow cols={4} className="mb-3">
            <StatTile
              label="Total return"
              value={show(totalReturn, '%', 1)}
              tone={(totalReturn ?? 0) >= 0 ? 'up' : 'down'}
              hint={`${result.start_date} to ${result.end_date}`}
            />
            <StatTile label="Compound annual growth" value={show(cagr, '%', 1)} hint="Annualised" />
            <StatTile
              label="Sharpe ratio"
              value={show(sharpe)}
              hint={sharpe == null ? 'Not reported' : sharpe > 1.5 ? 'Strong risk-adjusted return' : 'Modest risk-adjusted return'}
            />
            <StatTile
              label="Maximum drawdown"
              value={maxDd == null ? show(worstDd, '%', 1) : show(maxDd, '%', 1)}
              tone="down"
              hint="Worst peak-to-trough decline"
            />
          </KpiRow>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 items-start">
            <Reveal className="flex flex-col gap-3">
              <Panel
                label="Equity curve"
                meta={`₹${fmt(result.initial_cash, { decimals: 0 })} → ₹${fmt(result.final_value, { decimals: 0 })}`}
                pad
              >
                {equity.length > 1 ? (
                  <AreaChart data={equity} height={260} up={result.final_value >= result.initial_cash} />
                ) : (
                  <EmptyState
                    icon="solar:chart-2-linear"
                    title="Only one snapshot"
                    body="The engine recorded a single portfolio snapshot for this window, so there is no curve to draw."
                    compact
                  />
                )}
              </Panel>

              {drawdown.length > 1 && (
                <Panel label="Drawdown" meta={`Worst ${worstDd.toFixed(1)}%`} pad>
                  <div className="flex items-start gap-px h-28">
                    {drawdown.map((d, i) => (
                      <div key={i} className="flex-1 h-full flex flex-col justify-start">
                        <div
                          className="w-full bg-down/60 rounded-b-sm"
                          style={{ height: `${(Math.abs(d) / Math.abs(worstDd || 1)) * 100}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    Each bar is the distance below the previous high-water mark. The depth of the worst bar is what a holder had to sit through.
                  </p>
                </Panel>
              )}

              <Panel label="Executed trades" meta={`${result.trades.length}`}>
                {result.trades.length === 0 ? (
                  <EmptyState
                    icon="solar:checklist-linear"
                    title="No trades executed"
                    body="The committee held through the whole window, so nothing was bought or sold."
                    compact
                  />
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {result.trades.map((t, i) => (
                      <div key={i} className="p-3 flex items-center gap-3">
                        <Badge tone={String(t.action).toLowerCase() === 'buy' ? 'up' : 'down'}>{t.action}</Badge>
                        <span className="text-sm font-medium text-foreground">{t.ticker}</span>
                        <span className="text-xs text-muted tabular-nums">{t.quantity} @ {fmt(t.price)}</span>
                        <span className="ml-auto text-xs text-muted tabular-nums">{t.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </Reveal>

            <Reveal delay={80} variant="right" className="flex flex-col gap-3">
              <Panel label="Trade statistics" pad>
                <DefRow label="Trades" value={String(result.trades.length)} />
                <DefRow label="Win rate" value={show(winRate, '%', 1)} tone={(winRate ?? 0) >= 50 ? 'up' : 'down'} />
                <DefRow label="Profit factor" value={show(profitFactor)} tone={(profitFactor ?? 0) > 1 ? 'up' : 'down'} />
                <DefRow label="Final equity" value={fmt(result.final_value, { compact: true, prefix: '₹' })} />
                {winRate != null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted">Winners</span>
                      <span className="tabular-nums">{winRate.toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={winRate} tone={winRate >= 50 ? 'up' : 'warn'} />
                  </div>
                )}
              </Panel>

              <Panel label="Final decisions" meta={`${Object.keys(result.decisions).length}`} pad>
                {Object.keys(result.decisions).length === 0 ? (
                  <p className="text-xs text-muted">The committee returned no position decisions for this window.</p>
                ) : (
                  Object.entries<any>(result.decisions).map(([ticker, d]) => (
                    <div key={ticker} className="py-2 border-b border-border last:border-none">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{ticker}</span>
                        <Badge tone={String(d.action).toLowerCase() === 'buy' ? 'up' : String(d.action).toLowerCase() === 'sell' ? 'down' : 'neutral'}>
                          {d.action}
                        </Badge>
                      </div>
                      {d.reasoning && <p className="text-xs text-muted mt-1 leading-relaxed">{d.reasoning}</p>}
                    </div>
                  ))
                )}
              </Panel>

              <Note icon="solar:danger-triangle-linear">
                A backtest runs on one fixed history with perfect fills. Treat the result as an upper bound, not an expectation.
              </Note>
            </Reveal>
          </div>
        </>
      )}
    </PageShell>
  )
}
