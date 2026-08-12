'use client'

import React, { useEffect, useState } from 'react'
import { cx } from './kit'

/* ============================================================
   Analysis primitives.
   Restrained by design: flat surfaces, one accent, green/red
   reserved for market direction. No gradients, glows or pulses.
   ============================================================ */

export type Signal = 'BUY' | 'SELL' | 'HOLD' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'
export type AgentStatus = 'idle' | 'thinking' | 'done' | 'error'

export const SIGNAL_TONE: Record<Signal, string> = {
  BUY: 'text-emerald-bright bg-emerald/10 border-emerald/25',
  BULLISH: 'text-emerald-bright bg-emerald/10 border-emerald/25',
  SELL: 'text-coral bg-coral/10 border-coral/25',
  BEARISH: 'text-coral bg-coral/10 border-coral/25',
  HOLD: 'text-amber bg-amber/10 border-amber/25',
  NEUTRAL: 'text-soft bg-hover border-border',
}

/* ---------- Signal badge ---------- */
export function SignalBadge({ signal, className }: { signal: Signal; className?: string }) {
  return (
    <span className={cx('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border', SIGNAL_TONE[signal], className)}>
      {signal}
    </span>
  )
}

/* ---------- Confidence meter (0–100) ---------- */
export function ConfidenceMeter({ value, label = 'Confidence', compact }: { value: number; label?: string; compact?: boolean }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="w-full">
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10.5px] text-muted">{label}</span>
          <span className="text-[11px] font-semibold tabular-nums text-soft">{v}%</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-hover-strong overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

/* ---------- Consensus bar (bull vs bear split) ---------- */
export function ConsensusBar({ bullish, bearish, neutral = 0 }: { bullish: number; bearish: number; neutral?: number }) {
  const total = bullish + bearish + neutral || 1
  const b = (bullish / total) * 100
  const n = (neutral / total) * 100
  const s = (bearish / total) * 100
  return (
    <div>
      <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-hover-strong">
        <div className="bg-emerald transition-[width] duration-500" style={{ width: `${b}%` }} />
        <div className="bg-hover-strong transition-[width] duration-500" style={{ width: `${n}%` }} />
        <div className="bg-coral transition-[width] duration-500" style={{ width: `${s}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10.5px]">
        <span className="text-emerald-bright">{bullish} bullish</span>
        {neutral > 0 && <span className="text-muted">{neutral} neutral</span>}
        <span className="text-coral">{bearish} bearish</span>
      </div>
    </div>
  )
}

/* ---------- Score ring (0–100) ---------- */
export function AIScoreRing({ score, size = 84, label = 'Score' }: { score: number; size?: number; label?: string }) {
  const v = Math.max(0, Math.min(100, score))
  const r = size / 2 - 5
  const c = 2 * Math.PI * r
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          style={{ transition: 'stroke-dasharray 0.6s var(--ease-out)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums leading-none text-foreground">{v}</span>
        <span className="text-[9px] uppercase tracking-wider text-muted mt-1">{label}</span>
      </div>
    </div>
  )
}

/* ---------- Risk gauge ---------- */
export function RiskGauge({ value, size = 120 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value))
  const r = size / 2 - 10
  const half = Math.PI * r
  const level = v >= 66 ? 'High' : v >= 33 ? 'Moderate' : 'Low'
  const color = v >= 66 ? 'var(--down)' : v >= 33 ? 'var(--warn)' : 'var(--up)'
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path
          d={`M 10 ${size / 2 + 6} A ${r} ${r} 0 0 1 ${size - 10} ${size / 2 + 6}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round"
        />
        <path
          d={`M 10 ${size / 2 + 6} A ${r} ${r} 0 0 1 ${size - 10} ${size / 2 + 6}`}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * half} ${half}`}
          style={{ transition: 'stroke-dasharray 0.6s var(--ease-out)' }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-sm font-semibold" style={{ color }}>{level}</span>
        <span className="text-[9px] uppercase tracking-wider text-muted">Risk</span>
      </div>
    </div>
  )
}

/* ---------- Agent card ---------- */
export interface AgentInfo {
  name: string
  icon: string
  status: AgentStatus
  signal?: Signal
  confidence?: number
  thought?: string
}

export function AgentCard({ agent, compact }: { agent: AgentInfo; compact?: boolean }) {
  const working = agent.status === 'thinking'
  return (
    <div className={cx('rounded-xl border bg-surface transition-colors', working ? 'border-border-strong' : 'border-border', compact ? 'p-3.5' : 'p-5')}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-hover border border-border flex items-center justify-center shrink-0 text-soft">
          <iconify-icon icon={agent.icon} width="17"></iconify-icon>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">{agent.name}</div>
          <div className="text-[11px] mt-0.5">
            {agent.status === 'thinking' && <span className="text-muted">Running…</span>}
            {agent.status === 'idle' && <span className="text-muted">Queued</span>}
            {agent.status === 'error' && <span className="text-coral">Failed</span>}
            {agent.status === 'done' && <span className="text-muted">Complete</span>}
          </div>
        </div>
        {agent.signal && agent.status === 'done' && <SignalBadge signal={agent.signal} />}
      </div>
      {working && <div className="mt-3.5 h-0.5 rounded-full working-bar" />}
      {!compact && agent.thought && agent.status === 'done' && (
        <p className="mt-3 text-[13px] leading-relaxed text-soft">{agent.thought}</p>
      )}
      {!compact && typeof agent.confidence === 'number' && agent.status === 'done' && (
        <div className="mt-3.5">
          <ConfidenceMeter value={agent.confidence} />
        </div>
      )}
    </div>
  )
}

/* ---------- Thinking steps ---------- */
export function ThinkingSteps({
  steps,
  intervalMs = 900,
  onComplete,
}: {
  steps: string[]
  intervalMs?: number
  onComplete?: () => void
}) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (current >= steps.length) {
      onComplete?.()
      return
    }
    const t = setTimeout(() => setCurrent((c) => c + 1), intervalMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, steps.length, intervalMs])

  return (
    <ul className="space-y-2">
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'pending'
        return (
          <li key={i} className={cx('flex items-center gap-2.5 text-[13px]', state === 'pending' && 'opacity-40')}>
            {state === 'done' && (
              <iconify-icon icon="solar:check-read-linear" width="13" class="text-muted shrink-0"></iconify-icon>
            )}
            {state === 'active' && <span className="w-3 h-3 rounded-full border-2 border-primary shrink-0"></span>}
            {state === 'pending' && <span className="w-3 h-3 rounded-full border border-border shrink-0"></span>}
            <span className={state === 'pending' ? 'text-muted' : 'text-soft'}>{step}</span>
          </li>
        )
      })}
    </ul>
  )
}

/* ---------- Verdict card ---------- */
export function VerdictCard({
  signal,
  confidence,
  title,
  summary,
  className,
}: {
  signal: Signal
  confidence: number
  title: string
  summary: string
  className?: string
}) {
  return (
    <div className={cx('panel-accent p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Summary</div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <SignalBadge signal={signal} className="text-sm px-3 py-1.5" />
      </div>
      <p className="text-sm text-soft leading-relaxed mt-3">{summary}</p>
      <div className="mt-5 max-w-sm">
        <ConfidenceMeter value={confidence} />
      </div>
    </div>
  )
}

/* ---------- Insight card ---------- */
export function InsightCard({
  icon = 'solar:lightbulb-bolt-linear',
  title,
  body,
  tone = 'ai',
}: {
  icon?: string
  title: string
  body: string
  tone?: 'ai' | 'emerald' | 'coral' | 'amber'
}) {
  const accent: Record<string, string> = {
    ai: 'text-soft',
    emerald: 'text-emerald-bright',
    coral: 'text-coral',
    amber: 'text-amber',
  }
  return (
    <div className="rounded-md bg-surface border border-border p-4 card-hover">
      <div className="flex items-center gap-2 mb-2">
        <iconify-icon icon={icon} width="14" class={accent[tone]}></iconify-icon>
        <h4 className="text-[13px] font-semibold text-foreground">{title}</h4>
      </div>
      <p className="text-xs text-soft leading-relaxed">{body}</p>
    </div>
  )
}

/* ---------- Ask input ---------- */
export function AIPromptInput({
  placeholder = 'Ask about a company, sector or your portfolio',
  size = 'lg',
  autoFocus,
  onSubmit,
}: {
  placeholder?: string
  size?: 'lg' | 'md'
  autoFocus?: boolean
  onSubmit: (query: string) => void
}) {
  const [value, setValue] = useState('')
  const submit = () => {
    const q = value.trim()
    if (q) onSubmit(q)
  }
  return (
    <div className={cx('flex items-center gap-3 rounded-xl bg-surface border border-border focus-ring transition-colors', size === 'lg' ? 'pl-5 pr-2.5' : 'pl-3.5 pr-2 h-11')} style={size === 'lg' ? { height: 56 } : undefined}>
      <iconify-icon icon="solar:magnifer-linear" width={size === 'lg' ? '18' : '15'} class="text-muted shrink-0"></iconify-icon>
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        className={cx('flex-1 bg-transparent outline-none text-foreground placeholder:text-muted min-w-0', size === 'lg' ? 'text-base' : 'text-sm')}
        aria-label="Ask a research question"
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className={cx(
          'rounded-lg font-semibold transition-colors cursor-pointer shrink-0',
          'bg-primary hover:bg-primary/90 text-white disabled:opacity-25 disabled:cursor-not-allowed',
          size === 'lg' ? 'px-5 h-10 text-sm' : 'px-3.5 h-8 text-xs'
        )}
      >
        Analyze
      </button>
    </div>
  )
}

/* ---------- Example prompt chips ---------- */
export function PromptChips({ prompts, onPick }: { prompts: string[]; onPick: (p: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {prompts.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className="px-2.5 py-1 rounded text-xs text-soft bg-transparent border border-border hover:border-border-strong hover:text-foreground transition-colors cursor-pointer"
        >
          {p}
        </button>
      ))}
    </div>
  )
}
