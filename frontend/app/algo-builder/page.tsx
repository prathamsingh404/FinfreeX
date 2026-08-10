'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Badge, Btn, Note, EmptyState, cx } from '@/components/ui/kit'
import { Reveal } from '@/components/ui/controls'

/* A strategy is an ordered rule set: entry, then exit, then risk, then
   sizing. The order carries meaning, so the flow is numbered and the
   numbers are real — remove a step and the rest renumber. */

type Slot = 'Entry' | 'Exit' | 'Risk' | 'Sizing'

interface Rule {
  id: string
  slot: Slot
  title: string
  detail: string
}

const SLOT_ORDER: Slot[] = ['Entry', 'Exit', 'Risk', 'Sizing']

const SLOT_HELP: Record<Slot, string> = {
  Entry: 'What has to be true before the strategy opens a position.',
  Exit: 'What closes a winning position.',
  Risk: 'What closes a losing position before it gets worse.',
  Sizing: 'How much capital each position is allowed.',
}

const INITIAL: Rule[] = [
  { id: 'r1', slot: 'Entry', title: 'RSI crosses up through 30', detail: '14-period, daily close' },
  { id: 'r2', slot: 'Exit', title: 'RSI reaches 70 or profit hits 8%', detail: 'Whichever comes first' },
  { id: 'r3', slot: 'Risk', title: 'Stop loss at 3%, trailing', detail: 'Moves up with the position, never down' },
  { id: 'r4', slot: 'Sizing', title: '2% of capital per position', detail: 'Maximum 5 positions open' },
]

const LIBRARY: { slot: Slot; title: string; detail: string }[] = [
  { slot: 'Entry', title: 'Price crosses above 50-day average', detail: 'Trend confirmation' },
  { slot: 'Entry', title: 'MACD histogram turns positive', detail: '12/26/9 settings' },
  { slot: 'Entry', title: 'Close breaks the upper Bollinger band', detail: '20-period, 2 standard deviations' },
  { slot: 'Entry', title: 'Volume exceeds 20-day average by 50%', detail: 'Participation filter' },
  { slot: 'Exit', title: 'Price crosses below 20-day average', detail: 'Trend exit' },
  { slot: 'Exit', title: 'Fixed target at 12%', detail: 'Take profit' },
  { slot: 'Risk', title: 'Hard stop at 5%', detail: 'No trailing' },
  { slot: 'Risk', title: 'Exit all positions before 15:15', detail: 'Time-based flatten' },
  { slot: 'Sizing', title: 'Fixed lot size', detail: 'One lot per signal' },
  { slot: 'Sizing', title: 'Volatility-scaled position', detail: 'Smaller size when ATR is high' },
]

const SLOT_TONE: Record<Slot, 'up' | 'down' | 'warn' | 'neutral'> = {
  Entry: 'up',
  Exit: 'down',
  Risk: 'warn',
  Sizing: 'neutral',
}

export default function AlgoBuilderPage() {
  const [rules, setRules] = useState<Rule[]>(INITIAL)
  const [filter, setFilter] = useState<Slot | 'All'>('All')

  const add = (r: (typeof LIBRARY)[number]) =>
    setRules((prev) => [...prev, { ...r, id: `r${Date.now()}` }])

  const remove = (id: string) => setRules((prev) => prev.filter((r) => r.id !== id))

  const ordered = SLOT_ORDER.flatMap((slot) => rules.filter((r) => r.slot === slot))
  const missing = SLOT_ORDER.filter((slot) => !rules.some((r) => r.slot === slot))
  const valid = missing.length === 0
  const shownLibrary = filter === 'All' ? LIBRARY : LIBRARY.filter((l) => l.slot === filter)

  return (
    <PageShell
      category="Professional"
      title="Algo Builder"
      subtitle="Assemble a strategy from rules, in the order the engine will evaluate them."
      icon="solar:code-linear"
      backdrop="mesh"
      actions={
        <div className="flex items-center gap-2">
          <Badge tone={valid ? 'up' : 'warn'}>{valid ? 'Ready to deploy' : `${missing.length} step${missing.length > 1 ? 's' : ''} missing`}</Badge>
          <Btn disabled={!valid} icon="solar:rocket-linear">Deploy bot</Btn>
        </div>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 items-start">
        <Reveal>
          <Panel label="Strategy flow" meta={`${rules.length} rules`}>
            {ordered.length === 0 ? (
              <EmptyState
                icon="solar:routing-2-linear"
                title="No rules yet"
                body="Add an entry rule from the library to start building."
              />
            ) : (
              <ol className="relative py-1">
                <span className="absolute left-[30px] top-4 bottom-4 w-px bg-border" aria-hidden="true" />
                {ordered.map((r, i) => (
                  <li key={r.id} className="relative flex items-start gap-3 px-3 py-2.5 hover-fill group">
                    <span className="relative z-10 w-6 h-6 shrink-0 rounded-full border border-border bg-surface-2 flex items-center justify-center text-micro font-semibold tabular-nums text-muted">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={SLOT_TONE[r.slot]}>{r.slot}</Badge>
                        <span className="text-sm font-medium text-foreground">{r.title}</span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{r.detail}</p>
                    </div>
                    <button
                      onClick={() => remove(r.id)}
                      aria-label={`Remove ${r.title}`}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted hover:text-down transition-opacity cursor-pointer shrink-0"
                    >
                      <iconify-icon icon="solar:trash-bin-minimalistic-linear" width="15"></iconify-icon>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          {missing.length > 0 && (
            <div className="mt-3">
              <Note icon="solar:danger-triangle-linear">
                This strategy has no {missing.map((m) => m.toLowerCase()).join(' or ')} rule. The engine will not deploy until every step is defined.
              </Note>
            </div>
          )}
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel
            label="Rule library"
            meta={`${shownLibrary.length}`}
            actions={
              <select value={filter} onChange={(e) => setFilter(e.target.value as Slot | 'All')} className="select w-auto h-6 text-xs">
                <option value="All">All steps</option>
                {SLOT_ORDER.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            }
          >
            <div className="p-2 space-y-1.5">
              {shownLibrary.map((l) => (
                <button
                  key={l.title}
                  onClick={() => add(l)}
                  className="w-full text-left p-2.5 rounded border border-border bg-surface-2 hover:border-border-strong transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="eyebrow">{l.slot}</span>
                    <iconify-icon icon="solar:add-circle-linear" width="13" class="text-muted group-hover:text-primary"></iconify-icon>
                  </div>
                  <div className="text-sm text-foreground leading-snug">{l.title}</div>
                  <div className="text-xs text-muted mt-0.5">{l.detail}</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel label="What each step does" pad>
            <dl className="space-y-2.5">
              {SLOT_ORDER.map((s) => (
                <div key={s}>
                  <dt className="text-sm font-medium text-foreground">{s}</dt>
                  <dd className="text-xs text-muted mt-0.5 leading-relaxed">{SLOT_HELP[s]}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </Reveal>
      </div>
    </PageShell>
  )
}
