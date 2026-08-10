'use client'

import React, { useMemo } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Badge, fmt, StatTile, KpiRow, ProgressBar, EmptyState, cx } from '@/components/ui/kit'
import { Reveal } from '@/components/ui/controls'
import { getIPOs } from '@/lib/featureData'

/* An offering moves through a pipeline — upcoming, open, listed — so the
   page is laid out as that pipeline. The stage a deal is in is the first
   thing a reader needs, and column position carries it without a legend. */

const STAGES = [
  { key: 'Upcoming', label: 'Upcoming', hint: 'Announced, not yet open' },
  { key: 'Open', label: 'Open now', hint: 'Accepting applications' },
  { key: 'Listed', label: 'Listed', hint: 'Trading on exchange' },
] as const

const TONE: Record<string, 'warn' | 'up' | 'neutral'> = { Upcoming: 'warn', Open: 'up', Listed: 'neutral' }

export default function IpoWatchPage() {
  const ipos = useMemo(() => getIPOs(), [])

  const open = ipos.filter((i) => i.status === 'Open')
  const avgGmp = ipos.reduce((s, i) => s + i.gmp, 0) / ipos.length
  const totalSize = ipos.reduce((s, i) => s + i.size, 0)
  const hottest = [...ipos].sort((a, b) => b.subscription - a.subscription)[0]

  return (
    <PageShell
      category="Assets"
      title="IPO Watch"
      subtitle="Every offering in the pipeline, from announcement through listing."
      icon="solar:rocket-linear"
      backdrop="tape"
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="Open now" value={open.length} hint={`${ipos.length} deals tracked`} />
        <StatTile label="Combined issue size" value={`₹${fmt(totalSize, { decimals: 0 })} Cr`} hint="Across all stages" />
        <StatTile label="Average grey market premium" value={`₹${avgGmp.toFixed(0)}`} tone={avgGmp >= 0 ? 'up' : 'down'} hint="Unofficial, indicative only" />
        <StatTile label="Most subscribed" value={`${hottest.subscription}x`} hint={hottest.name} />
      </KpiRow>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {STAGES.map((stage, si) => {
          const deals = ipos.filter((i) => i.status === stage.key)
          return (
            <Reveal key={stage.key} delay={si * 70}>
              <Panel label={stage.label} meta={`${deals.length}`}>
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs text-muted">{stage.hint}</p>
                </div>
                {deals.length === 0 ? (
                  <EmptyState icon="solar:rocket-linear" title="Nothing at this stage" body="Deals appear here as they move through the pipeline." compact />
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {deals.map((ipo) => (
                      <article key={ipo.name} className="p-3 hover-fill">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-sm font-medium text-foreground leading-snug">{ipo.name}</h3>
                          <Badge tone={TONE[ipo.status]}>{ipo.status}</Badge>
                        </div>

                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                          <div>
                            <dt className="eyebrow mb-0.5">Price band</dt>
                            <dd className="text-sm tabular-nums">{ipo.priceBand}</dd>
                          </div>
                          <div>
                            <dt className="eyebrow mb-0.5">Issue size</dt>
                            <dd className="text-sm tabular-nums">₹{fmt(ipo.size, { decimals: 0 })} Cr</dd>
                          </div>
                          <div>
                            <dt className="eyebrow mb-0.5">Grey market</dt>
                            <dd className={cx('text-sm tabular-nums font-medium', ipo.gmp >= 0 ? 'val-up' : 'val-down')}>
                              {ipo.gmp >= 0 ? '+' : '−'}₹{Math.abs(ipo.gmp)}
                            </dd>
                          </div>
                          <div>
                            <dt className="eyebrow mb-0.5">Opens</dt>
                            <dd className="text-sm tabular-nums text-muted">{ipo.date}</dd>
                          </div>
                        </dl>

                        {ipo.subscription > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted">Subscription</span>
                              <span className="tabular-nums font-medium">{ipo.subscription}x</span>
                            </div>
                            <ProgressBar
                              value={Math.min(100, (ipo.subscription / 50) * 100)}
                              tone={ipo.subscription > 10 ? 'up' : ipo.subscription > 2 ? 'primary' : 'neutral'}
                            />
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </Panel>
            </Reveal>
          )
        })}
      </div>
    </PageShell>
  )
}
