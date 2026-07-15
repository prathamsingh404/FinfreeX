'use client'

import React, { useEffect, useState } from 'react'
import { cx } from './kit'

/* ============================================================
   FinfreeX AI component library — the Intelligence layer.
   Everything AI-related on the site is built from these:
   agents, confidence, consensus, verdicts, thinking states.
   ============================================================ */

export type Signal = 'BUY' | 'SELL' | 'HOLD' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'
export type AgentStatus = 'idle' | 'thinking' | 'done' | 'error'

export const SIGNAL_TONE: Record<Signal, string> = {
  BUY: 'text-emerald-bright bg-emerald/12 border-emerald/25',
  BULLISH: 'text-emerald-bright bg-emerald/12 border-emerald/25',
  SELL: 'text-coral bg-coral/12 border-coral/25',
  BEARISH: 'text-coral bg-coral/12 border-coral/25',
  HOLD: 'text-amber bg-amber/12 border-amber/25',
  NEUTRAL: 'text-soft bg-white/5 border-white/10',
}

/* ---------- Signal badge ---------- */
export function SignalBadge({ signal, className }: { signal: Signal; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border tracking-wide', SIGNAL_TONE[signal], className)}>
      {signal}
    </span>
  )
}

/* ---------- Confidence meter (0–100) ---------- */
export function ConfidenceMeter({ value, label = 'Confidence', compact }: { value: number; label?: string; compact?: boolean }) {
  const v = Math.max(0, Math.min(100, value))
  const tone = v >= 70 ? 'bg-emerald' : v >= 40 ? 'bg-amber' : 'bg-coral'
  return (
    <div className="w-full">
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10.5px] font-medium text-muted uppercase tracking-wider">{label}</span>
          <span className="text-[11px] font-bold tabular-nums text-foreground">{v}%</span>
        </div>
      )}
      <div className="h-1 w-full rounded-full bg-white/8 overflow-hidden">
        <div
          className={cx('h-full rounded-full transition-[width] duration-700', tone)}
          style={{ width: `${v}%`, transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
        />
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
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-white/8">
        <div className="bg-emerald transition-[width] duration-700" style={{ width: `${b}%` }} />
        <div className="bg-amber/70 transition-[width] duration-700" style={{ width: `${n}%` }} />
        <div className="bg-coral transition-[width] duration-700" style={{ width: `${s}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10.5px] font-semibold">
        <span className="text-emerald-bright">{bullish} bullish</span>
        {neutral > 0 && <span className="text-amber">{neutral} neutral</span>}
        <span className="text-coral">{bearish} bearish</span>
      </div>
    </div>
  )
}

/* ---------- AI score ring (0–100 with grade) ---------- */
export function AIScoreRing({ score, size = 84, label = 'AI Score' }: { score: number; size?: number; label?: string }) {
  const v = Math.max(0, Math.min(100, score))
  const r = size / 2 - 6
  const c = 2 * Math.PI * r
  const color = v >= 70 ? 'var(--emerald-bright)' : v >= 40 ? 'var(--amber)' : 'var(--coral)'
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold tabular-nums leading-none" style={{ color }}>{v}</span>
        <span className="text-[8.5px] font-bold uppercase tracking-widest text-muted mt-0.5">{label}</span>
      </div>
    </div>
  )
}

/* ---------- Risk gauge (LOW / MEDIUM / HIGH semicircle) ---------- */
export function RiskGauge({ value, size = 120 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value))
  const r = size / 2 - 10
  const half = Math.PI * r
  const level = v >= 66 ? 'HIGH' : v >= 33 ? 'MEDIUM' : 'LOW'
  const color = v >= 66 ? 'var(--coral)' : v >= 33 ? 'var(--amber)' : 'var(--emerald-bright)'
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path
          d={`M 10 ${size / 2 + 6} A ${r} ${r} 0 0 1 ${size - 10} ${size / 2 + 6}`}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round"
        />
        <path
          d={`M 10 ${size / 2 + 6} A ${r} ${r} 0 0 1 ${size - 10} ${size / 2 + 6}`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * half} ${half}`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-sm font-extrabold" style={{ color }}>{level}</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Risk</span>
      </div>
    </div>
  )
}

/* ---------- Agent card (GitHub-Actions-style live worker) ---------- */
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
    <div
      className={cx(
        'rounded-lg border transition-colors',
        working ? 'ai-surface agent-pulse' : 'bg-surface border-border',
        compact ? 'p-3' : 'p-4'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cx(
            'w-8 h-8 rounded-md flex items-center justify-center shrink-0 border',
            working ? 'bg-ai/15 border-ai/30 text-ai-bright' : 'bg-white/[0.04] border-border text-soft'
          )}
        >
          <iconify-icon icon={agent.icon} width="16"></iconify-icon>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-foreground truncate">{agent.name}</div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-medium">
            {agent.status === 'thinking' && <span className="thinking-shimmer">Analyzing…</span>}
            {agent.status === 'idle' && <span className="text-muted">Queued</span>}
            {agent.status === 'error' && <span className="text-coral">Failed</span>}
            {agent.status === 'done' && <span className="text-emerald-bright">Complete</span>}
          </div>
        </div>
        {agent.signal && agent.status === 'done' && <SignalBadge signal={agent.signal} />}
      </div>
      {!compact && agent.thought && (
        <p className={cx('mt-2.5 text-xs leading-relaxed', working ? 'text-soft' : 'text-muted')}>{agent.thought}</p>
      )}
      {!compact && typeof agent.confidence === 'number' && agent.status === 'done' && (
        <div className="mt-3">
          <ConfidenceMeter value={agent.confidence} />
        </div>
      )}
    </div>
  )
}

/* ---------- Thinking steps (progressive status reveal) ---------- */
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
          <li key={i} className={cx('flex items-center gap-2.5 text-[13px] transition-opacity', state === 'pending' && 'opacity-30')}>
            {state === 'done' && (
              <span className="w-4 h-4 rounded-full bg-emerald/15 border border-emerald/30 flex items-center justify-center shrink-0">
                <iconify-icon icon="solar:check-read-linear" width="10" class="text-emerald-bright"></iconify-icon>
              </span>
            )}
            {state === 'active' && (
              <span className="w-4 h-4 rounded-full bg-ai/15 border border-ai/40 flex items-center justify-center shrink-0 agent-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-ai-bright"></span>
              </span>
            )}
            {state === 'pending' && <span className="w-4 h-4 rounded-full border border-border shrink-0"></span>}
            <span className={state === 'active' ? 'thinking-shimmer font-medium' : state === 'done' ? 'text-soft' : 'text-muted'}>
              {step}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/* ---------- Verdict card (final recommendation) ---------- */
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
    <div className={cx('ai-beam-border', className)}>
      <div className="rounded-[11px] bg-elevated p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-ai-bright mb-1.5 flex items-center gap-1.5">
              <iconify-icon icon="solar:magic-stick-3-linear" width="12"></iconify-icon>
              AI Verdict
            </div>
            <h3 className="text-lg font-extrabold text-foreground tracking-tight">{title}</h3>
          </div>
          <SignalBadge signal={signal} className="text-sm px-3 py-1" />
        </div>
        <p className="text-[13px] text-soft leading-relaxed mt-2.5">{summary}</p>
        <div className="mt-4">
          <ConfidenceMeter value={confidence} />
        </div>
      </div>
    </div>
  )
}

/* ---------- Insight card (small AI observation) ---------- */
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
  const tones: Record<string, { chip: string; ring: string }> = {
    ai: { chip: 'bg-ai/15 border-ai/30 text-ai-bright', ring: 'border-ai/20' },
    emerald: { chip: 'bg-emerald/15 border-emerald/30 text-emerald-bright', ring: 'border-emerald/20' },
    coral: { chip: 'bg-coral/15 border-coral/30 text-coral', ring: 'border-coral/20' },
    amber: { chip: 'bg-amber/15 border-amber/30 text-amber', ring: 'border-amber/20' },
  }
  const t = tones[tone]
  return (
    <div className={cx('rounded-lg bg-surface border p-4 card-hover', t.ring)}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className={cx('w-7 h-7 rounded-md flex items-center justify-center border shrink-0', t.chip)}>
          <iconify-icon icon={icon} width="14"></iconify-icon>
        </div>
        <h4 className="text-[13px] font-bold text-foreground">{title}</h4>
      </div>
      <p className="text-xs text-soft leading-relaxed">{body}</p>
    </div>
  )
}

/* ---------- AI prompt input (hero / analyst / palette share this) ---------- */
export function AIPromptInput({
  placeholder = 'Ask anything about the market…',
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
    <div className="ai-beam-border ai-glow">
      <div className={cx('flex items-center gap-3 rounded-[11px] bg-elevated ai-ring', size === 'lg' ? 'pl-5 pr-2.5 h-16' : 'pl-4 pr-2 h-12')}>
        <iconify-icon icon="solar:magic-stick-3-linear" width={size === 'lg' ? '20' : '16'} class="text-ai-bright shrink-0"></iconify-icon>
        <input
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={placeholder}
          className={cx('flex-1 bg-transparent outline-none text-foreground placeholder:text-muted min-w-0', size === 'lg' ? 'text-base' : 'text-sm')}
          aria-label="Ask the AI Analyst"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className={cx(
            'flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0',
            'bg-ai hover:bg-ai-bright text-white disabled:opacity-30 disabled:cursor-not-allowed',
            size === 'lg' ? 'px-4 h-11 text-sm' : 'px-3 h-8 text-xs'
          )}
        >
          Analyze
          <iconify-icon icon="solar:arrow-right-linear" width="15"></iconify-icon>
        </button>
      </div>
    </div>
  )
}

/* ---------- Example prompt chips ---------- */
export function PromptChips({ prompts, onPick }: { prompts: string[]; onPick: (p: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {prompts.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className="px-3 py-1.5 rounded-full text-xs font-medium text-soft bg-white/[0.04] border border-border hover:border-ai/40 hover:text-ai-bright hover:bg-ai/8 transition-colors cursor-pointer"
        >
          {p}
        </button>
      ))}
    </div>
  )
}
