'use client'

import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, StatCard, Badge, Btn } from '@/components/ui/kit'
import { getAlerts, type Alert } from '@/lib/featureData'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(() => getAlerts())
  const [symbol, setSymbol] = useState('')
  const [target, setTarget] = useState('')
  const [condition, setCondition] = useState<'above' | 'below'>('above')

  const active = alerts.filter((a) => a.status === 'active').length
  const triggered = alerts.filter((a) => a.status === 'triggered').length

  function addAlert(e: React.FormEvent) {
    e.preventDefault()
    if (!symbol || !target) return
    setAlerts((prev) => [
      {
        id: `a-${Date.now()}`,
        symbol: symbol.toUpperCase(),
        condition,
        target: Number(target),
        current: +(Number(target) * (condition === 'above' ? 0.96 : 1.04)).toFixed(2),
        status: 'active',
        created: 'Just now',
      },
      ...prev,
    ])
    setSymbol('')
    setTarget('')
  }

  function remove(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <PageShell
      title="Price Alerts"
      subtitle="Set conditional triggers and monitor your watchlist"
      category="Tools"
      icon="solar:bell-bold-duotone"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Alerts" value={String(active)} icon="solar:bell-bold-duotone" />
        <StatCard label="Triggered Today" value={String(triggered)} icon="solar:bell-bing-bold-duotone" />
        <StatCard label="Total Rules" value={String(alerts.length)} icon="solar:list-bold-duotone" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <SectionTitle title="Create Alert" subtitle="Trigger when price crosses a level" />
          <form onSubmit={addAlert} className="space-y-4">
            <label className="block">
              <span className="block text-xs text-soft mb-1.5">Symbol</span>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="RELIANCE"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-bright"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCondition('above')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${condition === 'above' ? 'border-emerald-bright text-emerald-bright bg-emerald/10' : 'border-white/10 text-soft'}`}
              >
                Above
              </button>
              <button
                type="button"
                onClick={() => setCondition('below')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${condition === 'below' ? 'border-coral text-coral bg-coral/10' : 'border-white/10 text-soft'}`}
              >
                Below
              </button>
            </div>
            <label className="block">
              <span className="block text-xs text-soft mb-1.5">Target price (₹)</span>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                type="number"
                placeholder="2500"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-bright"
              />
            </label>
            <Btn type="submit" className="w-full justify-center">Add Alert</Btn>
          </form>
        </Card>

        <Card className="lg:col-span-2" pad={false}>
          <div className="px-5 pt-5">
            <SectionTitle title="Your Alerts" subtitle={`${alerts.length} rules configured`} />
          </div>
          <div className="divide-y divide-white/5">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${a.condition === 'above' ? 'bg-emerald/10 text-emerald-bright' : 'bg-coral/10 text-coral'}`}>
                    <iconify-icon icon={a.condition === 'above' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} width="18"></iconify-icon>
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{a.symbol}</div>
                    <div className="text-xs text-soft">
                      {a.condition === 'above' ? 'Above' : 'Below'} ₹{a.target.toLocaleString('en-IN')} · now ₹{a.current.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge tone={a.status === 'triggered' ? 'coral' : a.status === 'active' ? 'emerald' : 'neutral'}>
                    {a.status}
                  </Badge>
                  <button onClick={() => remove(a.id)} className="text-soft hover:text-coral transition-colors" aria-label={`Delete ${a.symbol} alert`}>
                    <iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
                  </button>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="px-5 py-10 text-center text-soft">No alerts yet. Create one to get started.</div>
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
