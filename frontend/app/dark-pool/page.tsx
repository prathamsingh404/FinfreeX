'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Badge, fmt, StatTile, KpiRow, Note, DefRow, cx } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Segmented, Reveal } from '@/components/ui/controls'
import { getDarkPool } from '@/lib/featureData'

type Row = ReturnType<typeof getDarkPool>[number]

const READS = ['All', 'Accumulation', 'Distribution', 'Neutral'] as const

function readOf(sentiment: number) {
  return sentiment >= 0.15 ? 'Accumulation' : sentiment <= -0.15 ? 'Distribution' : 'Neutral'
}

export default function DarkPoolPage() {
  const rows = useMemo(() => getDarkPool(), [])
  const [read, setRead] = useState<string>('All')
  const [selected, setSelected] = useState<Row>(rows[0])

  const filtered = read === 'All' ? rows : rows.filter((r) => readOf(r.sentiment) === read)

  const totalVolume = rows.reduce((s, r) => s + r.darkVolume, 0)
  const totalBlocks = rows.reduce((s, r) => s + r.blockTrades, 0)
  const avgDark = rows.reduce((s, r) => s + r.darkPct, 0) / rows.length
  const accumulating = rows.filter((r) => readOf(r.sentiment) === 'Accumulation').length
  const maxDark = Math.max(...rows.map((r) => r.darkPct))

  const cols: Column<Row>[] = [
    {
      key: 'symbol',
      header: 'Company',
      width: '190px',
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-foreground">{r.symbol}</div>
          <div className="text-xs text-muted truncate">{r.name}</div>
        </div>
      ),
    },
    { key: 'darkVolume', header: 'Off-exchange volume', align: 'right', render: (r) => fmt(r.darkVolume, { compact: true, decimals: 1 }) },
    {
      key: 'darkPct',
      header: 'Share of volume',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <span className="tabular-nums font-medium">{r.darkPct.toFixed(1)}%</span>
          <div className="w-14 h-1 bg-sunken rounded-full overflow-hidden shrink-0">
            <div className="h-full bg-primary/70" style={{ width: `${(r.darkPct / maxDark) * 100}%` }} />
          </div>
        </div>
      ),
    },
    { key: 'blockTrades', header: 'Block prints', align: 'right', render: (r) => <span className="tabular-nums">{r.blockTrades}</span> },
    {
      key: 'sentiment',
      header: 'Read',
      render: (r) => {
        const label = readOf(r.sentiment)
        return <Badge tone={label === 'Accumulation' ? 'up' : label === 'Distribution' ? 'down' : 'neutral'}>{label}</Badge>
      },
    },
  ]

  return (
    <PageShell
      category="Professional"
      title="Dark Pool Activity"
      subtitle="Off-exchange block prints by symbol, and whether the flow leans toward buying or selling."
      icon="solar:eye-linear"
      backdrop="mesh"
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="Off-exchange volume" value={fmt(totalVolume, { compact: true, decimals: 1 })} hint={`Across ${rows.length} names`} />
        <StatTile label="Block prints" value={totalBlocks} hint="Trades above block size" />
        <StatTile label="Average share of volume" value={`${avgDark.toFixed(1)}%`} hint="Traded away from the exchange" />
        <StatTile label="Reading as accumulation" value={`${accumulating} of ${rows.length}`} tone={accumulating * 2 >= rows.length ? 'up' : 'down'} hint="Net buy-side flow" />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_290px] gap-3 items-start">
        <Reveal>
          <Panel
            label="Symbol activity"
            meta={`${filtered.length} of ${rows.length}`}
            actions={<Segmented options={READS} value={read} onChange={setRead} size="sm" />}
          >
            <DataTable
              columns={cols}
              rows={filtered}
              dense
              defaultSort={{ key: 'darkVolume', dir: 'desc' }}
              onRowClick={(r) => setSelected(r)}
              selectedIndex={filtered.findIndex((r) => r.symbol === selected.symbol)}
              emptyTitle="No symbol with that reading"
              emptyBody="Switch back to all to see the full list."
            />
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel label="Selected symbol" meta={selected.symbol} pad>
            <h3 className="text-sm font-medium text-foreground truncate">{selected.name}</h3>
            <div className="mt-3">
              <DefRow label="Off-exchange volume" value={fmt(selected.darkVolume, { compact: true, decimals: 1 })} />
              <DefRow label="Share of total volume" value={`${selected.darkPct.toFixed(1)}%`} />
              <DefRow label="Block prints" value={String(selected.blockTrades)} />
              <DefRow
                label="Flow reading"
                value={readOf(selected.sentiment)}
                tone={selected.sentiment >= 0.15 ? 'up' : selected.sentiment <= -0.15 ? 'down' : undefined}
              />
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="eyebrow mb-1.5">Sentiment scale</div>
              <div className="relative h-2 bg-sunken rounded-sm">
                <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
                <span
                  className={cx('absolute top-1/2 -translate-y-1/2 w-1 h-3.5 rounded-sm', selected.sentiment >= 0 ? 'bg-up' : 'bg-down')}
                  style={{ left: `${50 + selected.sentiment * 48}%` }}
                />
              </div>
              <div className="flex justify-between text-micro text-muted mt-1">
                <span>Distribution</span>
                <span>Accumulation</span>
              </div>
            </div>
          </Panel>

          <Note>
            A high off-exchange share means large orders are being worked away from the public book. It says size is moving; it does not say which direction the price will follow.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
