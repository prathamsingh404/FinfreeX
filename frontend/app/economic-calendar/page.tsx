'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Badge, Panel, EmptyState, cx, Note } from '@/components/ui/kit'
import { Segmented, SearchInput, Switch } from '@/components/ui/controls'

/* A trading day is a sequence, so this page is built as one: events run
   down a time rail in the order they will hit the tape, not as a sortable
   table of rows with no relationship to each other. */

const EVENTS = [
  { time: '09:30', country: 'IN', event: 'CPI Inflation YoY', impact: 'High', forecast: '4.9%', prior: '5.1%', note: 'Feeds directly into the RBI December decision.' },
  { time: '11:00', country: 'IN', event: 'Industrial Production', impact: 'Medium', forecast: '4.2%', prior: '3.8%', note: '' },
  { time: '12:15', country: 'EU', event: 'Eurozone Trade Balance', impact: 'Low', forecast: '€21.4B', prior: '€19.8B', note: '' },
  { time: '14:00', country: 'US', event: 'FOMC Rate Decision', impact: 'High', forecast: '5.25%', prior: '5.25%', note: 'The statement matters more than the number: a hold is fully priced.' },
  { time: '15:30', country: 'EU', event: 'ECB Press Conference', impact: 'High', forecast: '—', prior: '—', note: '' },
  { time: '18:00', country: 'US', event: 'Crude Oil Inventories', impact: 'Medium', forecast: '-1.2M', prior: '0.8M', note: '' },
  { time: '19:00', country: 'IN', event: 'Forex Reserves', impact: 'Low', forecast: '$648B', prior: '$641B', note: '' },
  { time: '20:00', country: 'US', event: 'Nonfarm Payrolls', impact: 'High', forecast: '185K', prior: '206K', note: 'The single largest scheduled volatility event of the week.' },
  { time: '21:30', country: 'UK', event: 'BoE Governor Speech', impact: 'Medium', forecast: '—', prior: '—', note: '' },
]

const REGIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'US' },
  { value: 'EU', label: 'Europe' },
] as const

const IMPACT_TONE: Record<string, 'down' | 'warn' | 'neutral'> = { High: 'down', Medium: 'warn', Low: 'neutral' }

export default function EconomicCalendarPage() {
  const [region, setRegion] = useState<string>('ALL')
  const [highOnly, setHighOnly] = useState(false)
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EVENTS.filter((e) => {
      if (region !== 'ALL' && e.country !== region && !(region === 'EU' && e.country === 'UK')) return false
      if (highOnly && e.impact !== 'High') return false
      if (q && !e.event.toLowerCase().includes(q)) return false
      return true
    })
  }, [region, highOnly, query])

  const highCount = EVENTS.filter((e) => e.impact === 'High').length

  return (
    <PageShell
      title="Economic Calendar"
      category="Macro"
      subtitle="Every scheduled release for the session, in the order it will print."
      icon="solar:calendar-date-linear"
      backdrop="contour"
      actions={<Switch checked={highOnly} onChange={setHighOnly} label="High impact only" />}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 items-start">
        <Panel
          label="Today's releases"
          meta={`${rows.length} of ${EVENTS.length}`}
          actions={
            <div className="flex items-center gap-2">
              <SearchInput value={query} onChange={setQuery} placeholder="Filter events" className="w-40 hidden sm:block" />
              <Segmented options={REGIONS} value={region} onChange={setRegion} size="sm" />
            </div>
          }
        >
          {rows.length === 0 ? (
            <EmptyState
              icon="solar:calendar-linear"
              title="Nothing scheduled under those filters"
              body="Widen the region or turn off the high-impact filter to see the rest of the day."
            />
          ) : (
            <ol className="relative">
              {/* The time rail: one continuous line the whole day hangs from */}
              <span className="absolute left-[68px] top-3 bottom-3 w-px bg-border" aria-hidden="true" />
              {rows.map((e, i) => (
                <li key={i} className="relative flex gap-4 px-3 py-3 border-b border-border last:border-none hover-fill">
                  <time className="w-12 shrink-0 text-sm font-medium tabular-nums text-foreground pt-px">{e.time}</time>
                  <span
                    className={cx(
                      'relative z-10 mt-1.5 w-2 h-2 rounded-full shrink-0 ring-4 ring-[var(--surface)]',
                      e.impact === 'High' ? 'bg-down' : e.impact === 'Medium' ? 'bg-warn' : 'bg-border-accent',
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="neutral">{e.country}</Badge>
                      <span className="text-sm font-medium text-foreground">{e.event}</span>
                      <Badge tone={IMPACT_TONE[e.impact]}>{e.impact}</Badge>
                    </div>
                    {e.note && <p className="text-xs text-muted mt-1 leading-relaxed">{e.note}</p>}
                  </div>
                  <div className="hidden sm:flex items-center gap-6 shrink-0 text-right">
                    <div>
                      <div className="eyebrow mb-0.5">Forecast</div>
                      <div className="text-sm font-semibold tabular-nums">{e.forecast}</div>
                    </div>
                    <div>
                      <div className="eyebrow mb-0.5">Prior</div>
                      <div className="text-sm tabular-nums text-muted">{e.prior}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <div className="flex flex-col gap-3">
          <Panel label="Session shape" pad>
            <div className="space-y-2.5">
              {(['High', 'Medium', 'Low'] as const).map((level) => {
                const n = EVENTS.filter((e) => e.impact === level).length
                return (
                  <div key={level} className="flex items-center gap-3">
                    <span className="text-xs text-soft w-16 shrink-0">{level}</span>
                    <div className="flex-1 h-2 bg-sunken rounded-sm overflow-hidden">
                      <div
                        className={cx('h-full', level === 'High' ? 'bg-down' : level === 'Medium' ? 'bg-warn' : 'bg-border-accent')}
                        style={{ width: `${(n / EVENTS.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted w-5 text-right">{n}</span>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Note icon="solar:clock-circle-linear">
            {highCount} high-impact prints land today. Position sizing around 14:00 and 20:00 carries the most event risk.
          </Note>
        </div>
      </div>
    </PageShell>
  )
}
