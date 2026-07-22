'use client'

import React, { useEffect, useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, Badge, cx } from '@/components/ui/kit'
import { getAlerts } from '@/lib/featureData'

/* ============================================================
   Alerts & Automations — Notion-automation-style rules.
   Write a sentence → it becomes a WHEN/THEN automation card.
   ============================================================ */

type Channel = 'telegram' | 'email' | 'push'
type RuleKind = 'price-above' | 'price-below' | 'drop-pct' | 'rise-pct' | 'rsi-below' | 'rsi-above'

interface Automation {
  id: string
  text: string
  symbol: string
  kind: RuleKind
  value: number
  channels: Channel[]
  status: 'active' | 'paused' | 'triggered'
  created: string
}

const STORAGE_KEY = 'finfreex-automations-v1'

const TEMPLATES = [
  'TSLA RSI below 30',
  'RELIANCE above 3200',
  'NIFTY drops 2%',
  'HDFCBANK below 1500',
  'NVDA rises 5%',
  'INFY RSI above 70',
]

const KIND_LABEL: Record<RuleKind, (v: number) => string> = {
  'price-above': (v) => `price crosses above ₹${v.toLocaleString('en-IN')}`,
  'price-below': (v) => `price falls below ₹${v.toLocaleString('en-IN')}`,
  'drop-pct': (v) => `drops ${v}% in a day`,
  'rise-pct': (v) => `rises ${v}% in a day`,
  'rsi-below': (v) => `RSI falls below ${v}`,
  'rsi-above': (v) => `RSI rises above ${v}`,
}

const CHANNELS: { id: Channel; label: string; icon: string }[] = [
  { id: 'telegram', label: 'Telegram', icon: 'solar:plain-linear' },
  { id: 'email', label: 'Email', icon: 'solar:letter-linear' },
  { id: 'push', label: 'Push', icon: 'solar:bell-linear' },
]

/** Parse a natural-language sentence into a structured rule. */
function parseRule(input: string): { symbol: string; kind: RuleKind; value: number } | null {
  const text = input.trim()
  const sym = text.match(/\b[A-Z]{2,15}\b/)?.[0]
  if (!sym) return null

  const num = (re: RegExp) => {
    const m = text.match(re)
    return m ? parseFloat(m[1]) : null
  }

  const rsiBelow = num(/rsi\s+(?:below|under|<)\s*(\d+(?:\.\d+)?)/i)
  if (rsiBelow !== null) return { symbol: sym, kind: 'rsi-below', value: rsiBelow }
  const rsiAbove = num(/rsi\s+(?:above|over|>)\s*(\d+(?:\.\d+)?)/i)
  if (rsiAbove !== null) return { symbol: sym, kind: 'rsi-above', value: rsiAbove }
  const drop = num(/(?:drops?|falls?|loses?)\s*(\d+(?:\.\d+)?)\s*%/i)
  if (drop !== null) return { symbol: sym, kind: 'drop-pct', value: drop }
  const rise = num(/(?:rises?|gains?|jumps?|up)\s*(\d+(?:\.\d+)?)\s*%/i)
  if (rise !== null) return { symbol: sym, kind: 'rise-pct', value: rise }
  const above = num(/(?:above|crosses|over|>)\s*₹?\s*(\d+(?:[\d,]*\.?\d*)?)/i)
  if (above !== null) return { symbol: sym, kind: 'price-above', value: above }
  const below = num(/(?:below|under|<)\s*₹?\s*(\d+(?:[\d,]*\.?\d*)?)/i)
  if (below !== null) return { symbol: sym, kind: 'price-below', value: below }
  return null
}

function seedFromLegacy(): Automation[] {
  try {
    return getAlerts().map((a) => ({
      id: a.id,
      text: `${a.symbol} ${a.condition} ₹${a.target}`,
      symbol: a.symbol,
      kind: a.condition === 'above' ? 'price-above' : 'price-below',
      value: a.target,
      channels: ['push'] as Channel[],
      status: a.status === 'triggered' ? 'triggered' : 'active',
      created: a.created,
    }))
  } catch {
    return []
  }
}

export default function AlertsPage() {
  const [rules, setRules] = useState<Automation[]>([])
  const [input, setInput] = useState('')
  const [parseError, setParseError] = useState(false)
  const [digestDaily, setDigestDaily] = useState(true)
  const [digestWeekly, setDigestWeekly] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      setRules(raw ? JSON.parse(raw) : seedFromLegacy())
    } catch {
      setRules(seedFromLegacy())
    }
  }, [])

  const persist = (next: Automation[]) => {
    setRules(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }

  const preview = useMemo(() => parseRule(input), [input])

  const create = (text: string) => {
    const parsed = parseRule(text)
    if (!parsed) {
      setParseError(true)
      return
    }
    setParseError(false)
    persist([
      {
        id: `auto-${Date.now()}`,
        text,
        ...parsed,
        channels: ['push'],
        status: 'active',
        created: 'Just now',
      },
      ...rules,
    ])
    setInput('')
  }

  const toggleChannel = (id: string, ch: Channel) =>
    persist(
      rules.map((r) =>
        r.id === id
          ? { ...r, channels: r.channels.includes(ch) ? r.channels.filter((c) => c !== ch) : [...r.channels, ch] }
          : r
      )
    )

  const togglePause = (id: string) =>
    persist(rules.map((r) => (r.id === id ? { ...r, status: r.status === 'paused' ? 'active' : 'paused' } : r)))

  const remove = (id: string) => persist(rules.filter((r) => r.id !== id))

  const active = rules.filter((r) => r.status === 'active').length

  return (
    <PageShell
      title="Alerts"
      subtitle="Describe a condition in plain English. We watch the market and notify you."
      category="Analysis"
      icon="solar:bell-bold-duotone"
    >
      {/* ─── Natural-language builder ─── */}
      <div className="mb-3 max-w-3xl">
        <div className="rounded-md bg-surface border border-border focus-ring transition-colors flex items-center gap-3 pl-4 pr-2 h-12">
          <span className="text-sm text-muted shrink-0 hidden sm:inline">Notify me if</span>
          <iconify-icon icon="solar:bell-linear" width="15" class="text-muted sm:hidden"></iconify-icon>
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setParseError(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && create(input)}
            placeholder="TSLA RSI below 30 · RELIANCE above 3200 · NIFTY drops 2%"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted min-w-0"
            aria-label="Describe your alert"
          />
          <button
            onClick={() => create(input)}
            disabled={!input.trim()}
            className="px-4 h-8 rounded bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed shrink-0"
          >
            Create
          </button>
        </div>
      </div>

      {/* Live parse preview / error */}
      <div className="mb-6 max-w-3xl min-h-[20px]">
        {input.trim() && preview && (
          <p className="text-xs text-soft fade-in">
            <span className="text-emerald-bright font-semibold">✓ Understood:</span> when{' '}
            <span className="font-bold text-foreground">{preview.symbol}</span> {KIND_LABEL[preview.kind](preview.value)}
          </p>
        )}
        {parseError && (
          <p className="text-xs text-coral fade-in">
            Couldn’t parse that — use a ticker in CAPS plus a condition, e.g. “INFY RSI above 70”.
          </p>
        )}
        {!input.trim() && (
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => create(t)}
                className="px-2.5 py-1 rounded text-[11px] text-soft bg-transparent border border-border hover:border-border-strong hover:text-foreground transition-colors cursor-pointer"
              >
                + {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ─── Automation cards ─── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Your automations</h2>
            <span className="text-xs text-muted">{active} active · {rules.length} total</span>
          </div>

          {rules.length === 0 && (
            <Card hover={false} className="text-center py-12">
              <iconify-icon icon="solar:bell-off-linear" width="28" class="text-muted"></iconify-icon>
              <p className="text-sm text-soft mt-3">No automations yet.</p>
              <p className="text-xs text-muted mt-1">Try one of the templates above — “TSLA RSI below 30” takes 2 seconds.</p>
            </Card>
          )}

          {rules.map((r) => (
            <div
              key={r.id}
              className={cx(
                'rounded-lg border p-4 transition-colors',
                r.status === 'triggered'
                  ? 'bg-coral/[0.06] border-coral/25'
                  : r.status === 'paused'
                  ? 'bg-surface border-border opacity-60'
                  : 'bg-surface border-border hover:border-border-strong'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap text-[13px]">
                  <span className="chip bg-white/[0.04] text-muted uppercase text-[10px]">When</span>
                  <span className="font-bold text-foreground">{r.symbol}</span>
                  <span className="text-soft">{KIND_LABEL[r.kind](r.value)}</span>
                  <span className="chip bg-white/[0.04] text-muted uppercase text-[10px]">Then notify via</span>
                  <div className="flex items-center gap-1">
                    {CHANNELS.map((c) => {
                      const on = r.channels.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleChannel(r.id, c.id)}
                          title={c.label}
                          className={cx(
                            'flex items-center gap-1 px-2 py-1 rounded-md border text-[10.5px] font-semibold transition-colors cursor-pointer',
                            on ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-transparent border-border text-muted hover:text-soft'
                          )}
                        >
                          <iconify-icon icon={c.icon} width="11"></iconify-icon>
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge tone={r.status === 'triggered' ? 'coral' : r.status === 'active' ? 'emerald' : 'neutral'}>
                    {r.status}
                  </Badge>
                  <button
                    onClick={() => togglePause(r.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-white/[0.05] transition-colors cursor-pointer"
                    aria-label={r.status === 'paused' ? 'Resume' : 'Pause'}
                  >
                    <iconify-icon icon={r.status === 'paused' ? 'solar:play-linear' : 'solar:pause-linear'} width="14"></iconify-icon>
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-coral hover:bg-coral/10 transition-colors cursor-pointer"
                    aria-label="Delete automation"
                  >
                    <iconify-icon icon="solar:trash-bin-trash-linear" width="14"></iconify-icon>
                  </button>
                </div>
              </div>
              <div className="mt-2 text-[10.5px] text-muted">Created {r.created}</div>
            </div>
          ))}
        </div>

        {/* ─── Digests ─── */}
        <div className="space-y-3 h-fit">
          <h2 className="text-sm font-semibold text-foreground">Digests</h2>
          {[
            {
              title: 'Daily Digest',
              desc: 'Every market close: your watchlist, triggered alerts and tomorrow’s events.',
              icon: 'solar:sun-linear',
              on: digestDaily,
              toggle: () => setDigestDaily((v) => !v),
            },
            {
              title: 'Weekly Report',
              desc: 'Sunday deep-dive: portfolio review, sector rotation and the week ahead.',
              icon: 'solar:document-text-linear',
              on: digestWeekly,
              toggle: () => setDigestWeekly((v) => !v),
            },
          ].map((d) => (
            <button
              key={d.title}
              onClick={d.toggle}
              className={cx(
                'w-full text-left rounded-lg border p-4 transition-colors cursor-pointer',
                d.on ? 'bg-surface border-border-strong' : 'bg-surface border-border hover:border-border-strong'
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <iconify-icon icon={d.icon} width="15" class={d.on ? 'text-soft' : 'text-muted'}></iconify-icon>
                  <span className="text-[13px] font-semibold text-foreground">{d.title}</span>
                </div>
                <span
                  className={cx(
                    'w-8 h-[18px] rounded-full relative transition-colors shrink-0',
                    d.on ? 'bg-primary' : 'bg-white/10'
                  )}
                >
                  <span
                    className={cx(
                      'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all',
                      d.on ? 'left-[18px]' : 'left-[2px]'
                    )}
                  ></span>
                </span>
              </div>
              <p className="text-xs text-soft leading-relaxed">{d.desc}</p>
            </button>
          ))}

          <div className="rounded-lg bg-surface border border-border p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <iconify-icon icon="solar:plain-linear" width="15" class="text-muted"></iconify-icon>
              <span className="text-[13px] font-bold text-foreground">Connect Telegram</span>
            </div>
            <p className="text-xs text-soft leading-relaxed mb-3">Get alerts in Telegram the second they trigger.</p>
            <span className="chip text-muted">Setup in Settings → Telegram</span>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
