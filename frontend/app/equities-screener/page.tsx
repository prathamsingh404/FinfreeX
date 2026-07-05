'use client'

import { useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, StatCard, Change, Badge, fmt } from '@/components/ui/kit'
import { getAllQuotes } from '@/lib/mockData'

type SortKey = 'changePct' | 'price' | 'volume' | 'marketCap'

export default function EquitiesScreenerPage() {
  const all = useMemo(() => getAllQuotes(), [])
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState<string>('All')
  const [sort, setSort] = useState<SortKey>('marketCap')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [minPrice, setMinPrice] = useState(0)

  const sectors = useMemo(() => ['All', ...Array.from(new Set(all.map((q) => q.sector)))], [all])

  const rows = useMemo(() => {
    const r = all.filter((q) => {
      if (sector !== 'All' && q.sector !== sector) return false
      if (q.price < minPrice) return false
      if (query && !`${q.symbol} ${q.name}`.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
    return r.sort((a, b) => (dir === 'desc' ? b[sort] - a[sort] : a[sort] - b[sort]))
  }, [all, sector, minPrice, query, sort, dir])

  const gainers = all.filter((q) => q.changePct > 0).length
  const avgChange = all.reduce((s, q) => s + q.changePct, 0) / all.length

  function toggleSort(k: SortKey) {
    if (sort === k) setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSort(k)
      setDir('desc')
    }
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: 'price', label: 'Price' },
    { key: 'changePct', label: 'Change' },
    { key: 'volume', label: 'Volume' },
    { key: 'marketCap', label: 'Mkt Cap' },
  ]

  return (
    <PageShell
      title="Equities Screener"
      subtitle="Filter and rank the universe by momentum and size"
      category="Markets"
      icon="solar:filter-bold-duotone"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Universe" value={String(all.length)} icon="solar:layers-bold-duotone" />
        <StatCard label="Matches" value={String(rows.length)} icon="solar:check-circle-bold-duotone" />
        <StatCard label="Advancing" value={`${gainers}/${all.length}`} icon="solar:arrow-up-bold-duotone" />
        <StatCard label="Avg Change" value={`${avgChange.toFixed(2)}%`} icon="solar:chart-2-bold-duotone" change={avgChange} />
      </div>

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <label className="flex-1">
            <span className="block text-xs text-soft mb-1.5">Search symbol or name</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. RELIANCE"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-bright"
            />
          </label>
          <label className="md:w-56">
            <span className="block text-xs text-soft mb-1.5">Sector</span>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-bright"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="md:w-56">
            <span className="block text-xs text-soft mb-1.5">Min price ₹{minPrice}</span>
            <input
              type="range"
              min={0}
              max={4000}
              step={50}
              value={minPrice}
              onChange={(e) => setMinPrice(Number(e.target.value))}
              className="w-full accent-emerald-bright"
            />
          </label>
        </div>
      </Card>

      <Card pad={false}>
        <div className="px-5 pt-5">
          <SectionTitle title="Results" subtitle={`${rows.length} instruments`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-soft border-b border-white/10">
                <th className="px-5 py-3 font-medium">Symbol</th>
                <th className="px-3 py-3 font-medium">Sector</th>
                {cols.map((c) => (
                  <th key={c.key} className="px-3 py-3 font-medium text-right">
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${sort === c.key ? 'text-emerald-bright' : ''}`}
                    >
                      {c.label}
                      {sort === c.key && (
                        <iconify-icon icon={dir === 'desc' ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'}></iconify-icon>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.symbol} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-foreground">{q.symbol}</div>
                    <div className="text-xs text-soft truncate max-w-[180px]">{q.name}</div>
                  </td>
                  <td className="px-3 py-3"><Badge>{q.sector}</Badge></td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmt(q.price, { prefix: '₹' })}</td>
                  <td className="px-3 py-3 text-right"><Change value={q.changePct} /></td>
                  <td className="px-3 py-3 text-right tabular-nums text-soft">{fmt(q.volume, { compact: true })}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-soft">{fmt(q.marketCap, { compact: true, prefix: '₹' })}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-soft">No matches. Adjust your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  )
}
