'use client'

import React, { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Panel, Change, StatTile, KpiRow, DefRow, Note, cx } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { SearchInput, Reveal } from '@/components/ui/controls'
import { getInstitutional } from '@/lib/featureData'

type Row = ReturnType<typeof getInstitutional>[number]

const BANDS = [
  { key: 'promoter', label: 'Promoter', className: 'bg-primary' },
  { key: 'fii', label: 'Foreign institutions', className: 'bg-up' },
  { key: 'dii', label: 'Domestic institutions', className: 'bg-warn' },
  { key: 'public', label: 'Public', className: 'bg-border-accent' },
] as const

/** One shareholding pattern as a single stacked bar. */
function OwnershipBar({ row, height = 8 }: { row: Row; height?: number }) {
  const total = BANDS.reduce((s, b) => s + (row[b.key] as number), 0) || 1
  return (
    <div className="flex rounded-sm overflow-hidden w-full" style={{ height }}>
      {BANDS.map((b) => (
        <div
          key={b.key}
          className={b.className}
          style={{ width: `${((row[b.key] as number) / total) * 100}%` }}
          title={`${b.label}: ${(row[b.key] as number).toFixed(1)}%`}
        />
      ))}
    </div>
  )
}

export default function InstitutionalHoldingsPage() {
  const rows = useMemo(() => getInstitutional(), [])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Row>(rows[0])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? rows.filter((r) => r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)) : rows
  }, [rows, query])

  const avgFii = rows.reduce((s, r) => s + r.fii, 0) / rows.length
  const avgDii = rows.reduce((s, r) => s + r.dii, 0) / rows.length
  const adding = rows.filter((r) => r.fiiChange > 0).length
  const biggestAdd = [...rows].sort((a, b) => b.fiiChange - a.fiiChange)[0]

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
    { key: 'fii', header: 'FII %', align: 'right', render: (r) => <span className="tabular-nums font-medium">{r.fii.toFixed(1)}</span> },
    { key: 'dii', header: 'DII %', align: 'right', render: (r) => <span className="tabular-nums">{r.dii.toFixed(1)}</span> },
    { key: 'promoter', header: 'Promoter %', align: 'right', render: (r) => <span className="tabular-nums">{r.promoter.toFixed(1)}</span> },
    { key: 'public', header: 'Public %', align: 'right', render: (r) => <span className="tabular-nums text-muted">{r.public.toFixed(1)}</span> },
    { key: 'fiiChange', header: 'FII change QoQ', align: 'right', render: (r) => <Change value={r.fiiChange} showArrow={false} /> },
    { key: 'pattern', header: 'Pattern', sortable: false, width: '120px', render: (r) => <OwnershipBar row={r} /> },
  ]

  return (
    <PageShell
      category="Professional"
      title="Institutional Holdings"
      subtitle="Who owns each company, and which way the institutional money moved last quarter."
      icon="solar:banknote-2-linear"
      backdrop="mesh"
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="Average foreign holding" value={`${avgFii.toFixed(1)}%`} hint={`${rows.length} companies tracked`} />
        <StatTile label="Average domestic holding" value={`${avgDii.toFixed(1)}%`} hint="Mutual funds, insurers, banks" />
        <StatTile label="Foreign institutions adding" value={`${adding} of ${rows.length}`} tone={adding * 2 >= rows.length ? 'up' : 'down'} hint="Quarter on quarter" />
        <StatTile label="Largest increase" value={biggestAdd.symbol} change={biggestAdd.fiiChange} hint="Foreign holding change" />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 items-start">
        <Reveal>
          <Panel
            label="Shareholding pattern"
            meta={`${filtered.length} of ${rows.length}`}
            actions={<SearchInput value={query} onChange={setQuery} placeholder="Search companies" className="w-44" />}
          >
            <DataTable
              columns={cols}
              rows={filtered}
              dense
              defaultSort={{ key: 'fii', dir: 'desc' }}
              onRowClick={(r) => setSelected(r)}
              selectedIndex={filtered.findIndex((r) => r.symbol === selected.symbol)}
            />
          </Panel>
        </Reveal>

        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel label="Selected company" meta={selected.symbol} pad>
            <h3 className="text-sm font-medium text-foreground truncate">{selected.name}</h3>
            <div className="mt-3 mb-3">
              <OwnershipBar row={selected} height={12} />
            </div>
            <ul className="space-y-1.5 mb-3">
              {BANDS.map((b) => (
                <li key={b.key} className="flex items-center gap-2 text-xs">
                  <span className={cx('w-2.5 h-2.5 rounded-sm shrink-0', b.className)} />
                  <span className="text-soft flex-1">{b.label}</span>
                  <span className="tabular-nums text-foreground">{(selected[b.key] as number).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-border">
              <DefRow
                label="Foreign holding change"
                value={`${selected.fiiChange >= 0 ? '+' : '−'}${Math.abs(selected.fiiChange).toFixed(2)}%`}
                tone={selected.fiiChange >= 0 ? 'up' : 'down'}
              />
              <DefRow label="Institutional total" value={`${(selected.fii + selected.dii).toFixed(1)}%`} />
              <DefRow label="Free float" value={`${(100 - selected.promoter).toFixed(1)}%`} />
            </div>
          </Panel>

          <Note>
            A high promoter stake means less stock available to trade. It can steady a price, and it can just as easily make one move harder on thin volume.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
