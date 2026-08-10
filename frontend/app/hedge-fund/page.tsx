'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageShell from '@/components/PageShell'
import {
  Panel, Badge, Btn, StatTile, KpiRow, EmptyState, Note, ProgressBar, DefRow, cx,
} from '@/components/ui/kit'
import { SearchInput, Switch, Reveal } from '@/components/ui/controls'

/* The committee is a live process, not a form submission: agents finish at
   different times and the page fills in as each verdict lands. Everything on
   this screen — the agent roster, the persona list, the available models —
   comes from the engine, so what you see is what the deployment can run. */

interface AnalystMeta { key: string; node: string; name: string; focus?: string; style?: string; always_on: boolean }
interface ProviderMeta { key: string; name: string; configured: boolean; models: string[] }
interface ProvidersResponse {
  providers: ProviderMeta[]
  default_provider: string | null
  default_model: string | null
  llm_available: boolean
  data_provider: string
}
interface Signal { agent: string; ticker: string; signal: string; confidence: number; reasoning: string }
interface RiskSignal { ticker: string; signal: string; confidence: number; max_position_size: number; bull_count: number; bear_count: number }
interface Decision { ticker: string; action: string; quantity: number; confidence: number; reasoning: string }

type AgentStatus = 'waiting' | 'running' | 'done'

const SIGNAL_TONE: Record<string, 'up' | 'down' | 'neutral'> = {
  bullish: 'up', bearish: 'down', neutral: 'neutral',
}

const ACTION_TONE: Record<string, 'up' | 'down' | 'warn' | 'neutral'> = {
  buy: 'up', sell: 'down', short: 'down', cover: 'up', hold: 'neutral',
}

function prettyAgent(node: string) {
  return node.replace(/_analyst$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function ModelCommitteePage() {
  // ── Registry, loaded from the engine ──────────────────────────────
  const [analysts, setAnalysts] = useState<AnalystMeta[]>([])
  const [personas, setPersonas] = useState<AnalystMeta[]>([])
  const [providers, setProviders] = useState<ProvidersResponse | null>(null)
  const [registryError, setRegistryError] = useState<string | null>(null)
  const [registryLoading, setRegistryLoading] = useState(true)

  // ── Run configuration ─────────────────────────────────────────────
  const [tickers, setTickers] = useState('AAPL, MSFT')
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])
  const [useLlm, setUseLlm] = useState(false)
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [personaQuery, setPersonaQuery] = useState('')

  // ── Live run state ────────────────────────────────────────────────
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState<string | null>(null)
  const [plannedAgents, setPlannedAgents] = useState<string[]>([])
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({})
  const [signals, setSignals] = useState<Signal[]>([])
  const [riskSignals, setRiskSignals] = useState<RiskSignal[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [runError, setRunError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [a, p, pr] = await Promise.all([
          fetch('/api/hedge-fund/analysts').then((r) => r.json()),
          fetch('/api/hedge-fund/personas').then((r) => r.json()),
          fetch('/api/hedge-fund/providers').then((r) => r.json()),
        ])
        if (cancelled) return
        setAnalysts(a.analysts ?? [])
        setPersonas(p.personas ?? [])
        setProviders(pr)
        if (pr?.default_provider) {
          setProvider(pr.default_provider)
          setModel(pr.default_model ?? '')
          setUseLlm(Boolean(pr.llm_available))
        }
      } catch (err: any) {
        if (!cancelled) setRegistryError(err.message || 'Could not reach the analysis engine.')
      } finally {
        if (!cancelled) setRegistryLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  const providerModels = useMemo(
    () => providers?.providers.find((p) => p.key === provider)?.models ?? [],
    [providers, provider],
  )

  const shownPersonas = useMemo(() => {
    const q = personaQuery.trim().toLowerCase()
    return q ? personas.filter((p) => p.name.toLowerCase().includes(q) || (p.style ?? '').toLowerCase().includes(q)) : personas
  }, [personas, personaQuery])

  const tickerList = useMemo(
    () => tickers.split(/[\s,]+/).map((t) => t.trim().toUpperCase()).filter(Boolean),
    [tickers],
  )

  const togglePersona = (key: string) =>
    setSelectedPersonas((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const run = useCallback(async () => {
    if (!tickerList.length) {
      setRunError('Enter at least one ticker.')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setRunning(true)
    setRunError(null)
    setSignals([])
    setRiskSignals([])
    setDecisions([])
    setAgentStatus({})
    setPlannedAgents([])
    setStage('Starting the committee')

    try {
      const res = await fetch('/api/hedge-fund/analyze/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          tickers: tickerList,
          use_llm: useLlm,
          personas: selectedPersonas.length ? selectedPersonas : null,
          model_provider: provider || undefined,
          model_name: model || undefined,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`The engine returned ${res.status}.`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          let event: any
          try {
            event = JSON.parse(line.slice(5))
          } catch {
            continue
          }

          if (event.type === 'start') {
            setPlannedAgents(event.agents ?? [])
            setAgentStatus(Object.fromEntries((event.agents ?? []).map((a: string) => [a, 'waiting'])))
          } else if (event.type === 'status') {
            setStage(event.message)
          } else if (event.type === 'agent') {
            setAgentStatus((prev) => ({ ...prev, [event.agent]: 'done' }))
            setStage(`${prettyAgent(event.agent)} reported`)
            if (event.signals) {
              const incoming: Signal[] = []
              for (const [agent, list] of Object.entries<any>(event.signals)) {
                for (const s of list ?? []) {
                  incoming.push({
                    agent,
                    ticker: s.ticker,
                    signal: s.signal,
                    confidence: s.confidence,
                    reasoning: s.reasoning,
                  })
                }
              }
              if (incoming.length) setSignals((prev) => [...prev, ...incoming])
            }
            if (event.risk_adjusted_signals) setRiskSignals(event.risk_adjusted_signals)
            if (event.portfolio_output?.positions) setDecisions(event.portfolio_output.positions)
          } else if (event.type === 'result') {
            if (event.signals?.length) setSignals(event.signals)
            if (event.risk_adjusted_signals) setRiskSignals(event.risk_adjusted_signals)
            if (event.portfolio_output?.positions) setDecisions(event.portfolio_output.positions)
            setStage(null)
          } else if (event.type === 'error') {
            setRunError(event.message)
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setRunError(err.message || 'The run failed.')
    } finally {
      setRunning(false)
      setStage(null)
    }
  }, [tickerList, useLlm, selectedPersonas, provider, model])

  const stop = () => {
    abortRef.current?.abort()
    setRunning(false)
    setStage(null)
  }

  const doneCount = Object.values(agentStatus).filter((s) => s === 'done').length
  const bullish = signals.filter((s) => s.signal === 'bullish').length
  const bearish = signals.filter((s) => s.signal === 'bearish').length
  const totalAgents = analysts.length + selectedPersonas.length

  return (
    <PageShell
      category="Analysis"
      title="Model Committee"
      subtitle="Every analyst and persona reviews the same names, then risk and portfolio management resolve them into positions."
      icon="solar:users-group-two-rounded-linear"
      backdrop="mesh"
      actions={
        running ? (
          <Btn variant="subtle" onClick={stop} icon="solar:stop-linear">Stop run</Btn>
        ) : (
          <Btn onClick={run} icon="solar:play-linear" disabled={registryLoading || !!registryError}>
            Run committee
          </Btn>
        )
      }
    >
      {registryError && (
        <div className="mb-3">
          <Note icon="solar:danger-triangle-linear">
            Cannot reach the analysis engine. Start the backend with <span className="font-mono">uvicorn app.main:app --port 8000</span>, then reload. Detail: {registryError}
          </Note>
        </div>
      )}

      {providers && !providers.llm_available && (
        <div className="mb-3">
          <Note>
            No language model key is configured, so personas fall back to rule-based scoring. Set an OpenAI, Anthropic or Groq key on the backend to enable their written reasoning.
          </Note>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[330px_1fr] gap-3 items-start">
        {/* ── Configuration ────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <Panel label="Run setup" meta={`${totalAgents} agents`} pad>
            <label className="block mb-3">
              <span className="eyebrow">Tickers</span>
              <input
                value={tickers}
                onChange={(e) => setTickers(e.target.value)}
                placeholder="AAPL, MSFT"
                className="input mt-1.5"
              />
              <span className="text-xs text-muted mt-1 block">
                {tickerList.length ? `${tickerList.length} name${tickerList.length > 1 ? 's' : ''}: ${tickerList.join(', ')}` : 'Comma separated'}
              </span>
            </label>

            <div className="pt-3 border-t border-border">
              <Switch checked={useLlm} onChange={setUseLlm} label="Use language model reasoning" />
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                Off, agents score from the numbers alone. On, each persona writes its own argument — slower, and one model call per name.
              </p>
            </div>

            {useLlm && providers && (
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className="eyebrow">Provider</span>
                  <select
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value)
                      const next = providers.providers.find((p) => p.key === e.target.value)
                      setModel(next?.models[0] ?? '')
                    }}
                    className="select mt-1.5"
                  >
                    {providers.providers.map((p) => (
                      <option key={p.key} value={p.key} disabled={!p.configured}>
                        {p.name}{p.configured ? '' : ' — no key'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="eyebrow">Model</span>
                  <select value={model} onChange={(e) => setModel(e.target.value)} className="select mt-1.5">
                    {providerModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </Panel>

          <Panel label="Core analysts" meta={`${analysts.length} always run`}>
            <div className="p-2 space-y-1">
              {registryLoading && <div className="skeleton h-16 w-full" />}
              {analysts.map((a) => (
                <div key={a.key} className="p-2 rounded border border-border bg-surface-2">
                  <div className="text-sm font-medium text-foreground">{a.name}</div>
                  <div className="text-xs text-muted mt-0.5">{a.focus}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            label="Investor personas"
            meta={`${selectedPersonas.length} of ${personas.length}`}
            actions={
              <button
                onClick={() => setSelectedPersonas(selectedPersonas.length === personas.length ? [] : personas.map((p) => p.key))}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                {selectedPersonas.length === personas.length ? 'Clear' : 'Select all'}
              </button>
            }
          >
            <div className="p-2 border-b border-border">
              <SearchInput value={personaQuery} onChange={setPersonaQuery} placeholder="Search personas" />
            </div>
            <div className="p-2 space-y-1 max-h-80 overflow-auto custom-scrollbar">
              {shownPersonas.map((p) => {
                const active = selectedPersonas.includes(p.key)
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePersona(p.key)}
                    aria-pressed={active}
                    className={cx(
                      'w-full text-left p-2 rounded border transition-colors cursor-pointer',
                      active ? 'border-primary bg-primary-wash' : 'border-border bg-surface-2 hover:border-border-strong',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                      {active && <iconify-icon icon="solar:check-circle-bold" width="14" class="text-primary shrink-0"></iconify-icon>}
                    </div>
                    <div className="text-xs text-muted mt-0.5">{p.style}</div>
                  </button>
                )
              })}
              {!registryLoading && shownPersonas.length === 0 && (
                <EmptyState icon="solar:magnifer-linear" title="No persona matches" compact />
              )}
            </div>
          </Panel>
        </div>

        {/* ── Results ──────────────────────────────────────── */}
        <div className="flex flex-col gap-3 min-w-0">
          {(running || plannedAgents.length > 0) && (
            <Panel label="Committee progress" meta={`${doneCount} of ${plannedAgents.length} reported`} pad>
              {running && <div className="working-bar h-0.5 rounded-full mb-3" role="progressbar" aria-label="Run in progress" />}
              {stage && <div className="text-xs text-muted mb-3">{stage}</div>}
              <div className="flex flex-wrap gap-1.5">
                {plannedAgents.map((a) => (
                  <span
                    key={a}
                    className={cx(
                      'chip transition-colors',
                      agentStatus[a] === 'done' && 'border-up text-[var(--up)]',
                    )}
                  >
                    {agentStatus[a] === 'done' ? (
                      <iconify-icon icon="solar:check-circle-bold" width="11"></iconify-icon>
                    ) : (
                      <iconify-icon icon="solar:clock-circle-linear" width="11"></iconify-icon>
                    )}
                    {prettyAgent(a)}
                  </span>
                ))}
              </div>
            </Panel>
          )}

          {runError && <Note icon="solar:danger-triangle-linear">{runError}</Note>}

          {signals.length > 0 && (
            <KpiRow cols={4}>
              <StatTile label="Signals in" value={signals.length} hint={`${doneCount} agents reported`} />
              <StatTile label="Bullish" value={bullish} tone="up" hint="Agents leaning long" />
              <StatTile label="Bearish" value={bearish} tone="down" hint="Agents leaning short" />
              <StatTile label="Names reviewed" value={tickerList.length} hint={tickerList.join(', ')} />
            </KpiRow>
          )}

          {decisions.length > 0 && (
            <Reveal>
              <Panel label="Portfolio decisions" meta="After risk adjustment">
                <div className="divide-y divide-[var(--border)]">
                  {decisions.map((d) => (
                    <div key={d.ticker} className="p-3 flex items-start gap-3">
                      <Badge tone={ACTION_TONE[String(d.action).toLowerCase()] ?? 'neutral'}>{d.action}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-foreground">{d.ticker}</span>
                          {d.quantity > 0 && <span className="text-xs tabular-nums text-muted">{d.quantity} shares</span>}
                        </div>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">{d.reasoning}</p>
                      </div>
                      <div className="w-24 shrink-0">
                        <div className="text-xs tabular-nums text-right mb-1">{d.confidence}%</div>
                        <ProgressBar value={d.confidence} tone="primary" />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </Reveal>
          )}

          {riskSignals.length > 0 && (
            <Panel label="Risk-adjusted consensus" meta={`${riskSignals.length} name${riskSignals.length > 1 ? 's' : ''}`}>
              <div className="divide-y divide-[var(--border)]">
                {riskSignals.map((r) => (
                  <div key={r.ticker} className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="eyebrow mb-1">Ticker</div>
                      <div className="text-sm font-medium text-foreground">{r.ticker}</div>
                    </div>
                    <div>
                      <div className="eyebrow mb-1">Consensus</div>
                      <Badge tone={SIGNAL_TONE[r.signal] ?? 'neutral'}>{r.signal}</Badge>
                    </div>
                    <div>
                      <div className="eyebrow mb-1">Confidence</div>
                      <div className="text-sm tabular-nums">{r.confidence}%</div>
                    </div>
                    <div>
                      <div className="eyebrow mb-1">Split</div>
                      <div className="text-sm tabular-nums">
                        <span className="val-up">{r.bull_count} bull</span>
                        <span className="text-faint"> · </span>
                        <span className="val-down">{r.bear_count} bear</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel label="Analyst signals" meta={signals.length ? `${signals.length}` : undefined}>
            {signals.length === 0 ? (
              <EmptyState
                icon="solar:users-group-two-rounded-linear"
                title={running ? 'Agents are working' : 'No run yet'}
                body={
                  running
                    ? 'Verdicts appear here as each agent finishes.'
                    : 'Enter tickers, pick any personas you want on the committee, then run it.'
                }
                action={!running && <Btn onClick={run} icon="solar:play-linear">Run committee</Btn>}
              />
            ) : (
              <div className="overflow-auto custom-scrollbar">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Ticker</th>
                      <th>Signal</th>
                      <th className="num">Confidence</th>
                      <th>Reasoning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map((s, i) => (
                      <tr key={`${s.agent}-${s.ticker}-${i}`}>
                        <td className="font-medium text-foreground">{prettyAgent(s.agent)}</td>
                        <td className="tabular-nums">{s.ticker}</td>
                        <td><Badge tone={SIGNAL_TONE[s.signal] ?? 'neutral'}>{s.signal}</Badge></td>
                        <td className="num">{Number(s.confidence).toFixed(0)}%</td>
                        <td className="text-muted whitespace-normal min-w-[280px] max-w-[520px]">{s.reasoning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </PageShell>
  )
}
