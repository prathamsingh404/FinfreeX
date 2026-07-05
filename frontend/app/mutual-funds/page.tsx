'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Change, Badge, fmt } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getMutualFunds } from '@/lib/featureData'

type Fund = ReturnType<typeof getMutualFunds>[number]

export default function MutualFundsPage() {
  const funds = getMutualFunds()
  const cats = ['All', ...Array.from(new Set(funds.map((f) => f.category)))]
  const [cat, setCat] = useState('All')
  const rows = cat === 'All' ? funds : funds.filter((f) => f.category === cat)

  const cols: Column<Fund>[] = [
    { key: 'name', header: 'Fund', render: (f) => (
      <div className="text-left"><div className="font-semibold">{f.name}</div><div className="text-[11px] text-muted">{f.category}</div></div>
    ) },
    { key: 'nav', header: 'NAV', align: 'right', render: (f) => `₹${fmt(f.nav)}` },
    { key: 'cagr1y', header: '1Y', align: 'right', render: (f) => <Change value={f.cagr1y} showArrow={false} /> },
    { key: 'cagr3y', header: '3Y', align: 'right', render: (f) => <Change value={f.cagr3y} showArrow={false} /> },
    { key: 'cagr5y', header: '5Y', align: 'right', render: (f) => <Change value={f.cagr5y} showArrow={false} /> },
    { key: 'aum', header: 'AUM (Cr)', align: 'right', render: (f) => fmt(f.aum, { decimals: 0 }) },
    { key: 'expense', header: 'Expense', align: 'right', render: (f) => `${f.expense}%` },
    { key: 'rating', header: 'Rating', align: 'right', render: (f) => (
      <span className="text-amber">{'★'.repeat(f.rating)}<span className="text-white/15">{'★'.repeat(5 - f.rating)}</span></span>
    ) },
    { key: 'risk', header: 'Risk', align: 'right', render: (f) => <Badge tone={f.risk === 'Low' ? 'emerald' : f.risk === 'Very High' ? 'coral' : 'amber'}>{f.risk}</Badge> },
  ]

  return (
    <PageShell category="Assets & Funds" title="Mutual Funds" subtitle="Compare returns, expense ratios, and risk across fund categories." icon="solar:wallet-linear"
      actions={
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${cat === c ? 'bg-emerald text-[#04120C]' : 'text-soft hover:text-foreground'}`}>{c}</button>
          ))}
        </div>
      }>
      <Card>
        <SectionTitle title={`${rows.length} Funds`} icon="solar:wallet-linear" />
        <DataTable columns={cols} rows={rows} />
      </Card>
    </PageShell>
  )
}
