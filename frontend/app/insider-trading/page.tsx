'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Badge, fmt, StatTile, KpiRow, Note, cx } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Segmented, SearchInput, Reveal } from '@/components/ui/controls'
import { getInsiderTrades } from '@/lib/featureData'

type Row = ReturnType<typeof getInsiderTrades>[number]

const SIDES = ['All', 'BUY', 'SELL'] as const

export default function InsiderTradingPage() {
  const rows = useMemo(() => getInsiderTrades(), [])
  const [side, setSide] = useState<string>('All')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (side === 'All' || r.type === side) &&
        (!q || r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)),
    )
  }, [rows, side, query])

  const buys = rows.filter((r) => r.type === 'BUY')
  const sells = rows.filter((r) => r.type === 'SELL')
  const buyValue = buys.reduce((s, r) => s + r.value, 0)
  const sellValue = sells.reduce((s, r) => s + r.value, 0)
  const net = buyValue - sellValue
  const maxValue = Math.max(...rows.map((r) => r.value))

  const byRole = Array.from(new Set(rows.map((r) => r.insider))).map((role) => ({
    role,
    buy: rows.filter((r) => r.insider === role && r.type === 'BUY').length,
    sell: rows.filter((r) => r.insider === role && r.type === 'SELL').length,
  }))

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
    { key: 'insider', header: 'Filed by', render: (r) => <Badge tone="neutral">{r.insider}</Badge> },
    { key: 'type', header: 'Side', render: (r) => <Badge tone={r.type === 'BUY' ? 'up' : 'down'}>{r.type}</Badge> },
    { key: 'shares', header: 'Shares', align: 'right', render: (r) => fmt(r.shares, { compact: true, decimals: 0 }) },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <span className="tabular-nums font-medium">{fmt(r.value, { compact: true, prefix: '₹' })}</span>
          <div className="w-12 h-1 bg-sunken rounded-full overflow-hidden shrink-0">
            <div className={cx('h-full', r.type === 'BUY' ? 'bg-up' : 'bg-down')} style={{ width: `${(r.value / maxValue) * 100}%` }} />
          </div>
        </div>
      ),
    },
    { key: 'date', header: 'Filed', align: 'right', render: (r) => <span className="text-muted">{r.date}</span> },
  ]

  return (
    <PageShell
      category="Professional"
      title="Insider Trading"
      subtitle="Promoter, executive and bulk-deal filings, weighted by the money behind them."
      icon="solar:incognito-linear"
      backdrop="tape"
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="Filings" value={rows.length} hint="Reported in this window" />
        <StatTile label="Bought" value={fmt(buyValue, { compact: true, prefix: '₹' })} tone="up" hint={`${buys.length} filings`} />
        <StatTile label="Sold" value={fmt(sellValue, { compact: true, prefix: '₹' })} tone="down" hint={`${sells.length} filings`} />
        <StatTile
          label="Net flow"
          value={`${net >= 0 ? '+' : '−'}${fmt(Math.abs(net), { compact: true, prefix: '₹' })}`}
          tone={net >= 0 ? 'up' : 'down'}
          hint={net >= 0 ? 'Insiders net buyers' : 'Insiders net sellers'}
        />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-3 items-start">
        <Reveal>
          <Panel
            label="Filing ledger"
            meta={`${filtered.length} of ${rows.length}`}
            actions={
              <div className="flex items-center gap-2">
                <SearchInput value={query} onChange={setQuery} placeholder="Search" className="w-36 hidden sm:block" />
                <Segmented options={SIDES} value={side} onChange={setSide} size="sm" />
              </div>
            }
          >
            <DataTable columns={cols} rows={filtered} dense defaultSort={{ key: 'value', dir: 'desc' }} />
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel label="Buy versus sell" pad>
            <div className="flex h-3 rounded-sm overflow-hidden mb-2">
              <div className="bg-up" style={{ width: `${(buyValue / (buyValue + sellValue)) * 100}%` }} />
              <div className="bg-down flex-1" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="val-up tabular-nums">{((buyValue / (buyValue + sellValue)) * 100).toFixed(0)}% bought</span>
              <span className="val-down tabular-nums">{((sellValue / (buyValue + sellValue)) * 100).toFixed(0)}% sold</span>
            </div>
          </Panel>

          <Panel label="Who is filing" pad>
            {byRole.map((r) => (
              <div key={r.role} className="py-2 border-b border-border last:border-none">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-soft">{r.role}</span>
                  <span className="tabular-nums text-muted">{r.buy + r.sell}</span>
                </div>
                <div className="flex h-1.5 rounded-sm overflow-hidden bg-sunken">
                  <div className="bg-up" style={{ width: `${(r.buy / Math.max(1, r.buy + r.sell)) * 100}%` }} />
                  <div className="bg-down" style={{ width: `${(r.sell / Math.max(1, r.buy + r.sell)) * 100}%` }} />
                </div>
              </div>
            ))}
          </Panel>

          <Note>
            Insider selling has many innocent explanations — tax, diversification, a scheduled plan. Insider buying has only one.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
