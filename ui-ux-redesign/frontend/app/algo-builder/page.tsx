'use client'
import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Btn, Badge } from '@/components/ui/kit'

const BLOCKS = [
  { icon: 'solar:login-3-bold-duotone', label: 'Entry Signal', desc: 'RSI < 30 crossover', tone: 'emerald' as const },
  { icon: 'solar:logout-3-bold-duotone', label: 'Exit Signal', desc: 'RSI > 70 or +8% target', tone: 'coral' as const },
  { icon: 'solar:shield-check-bold-duotone', label: 'Risk Rule', desc: 'Stop loss 3% · trailing', tone: 'amber' as const },
  { icon: 'solar:tuning-3-bold-duotone', label: 'Position Sizing', desc: '2% capital per trade', tone: 'emerald' as const },
]

const PALETTE = [
  'RSI Indicator', 'Moving Average', 'MACD', 'Bollinger Bands', 'Volume Filter',
  'Price Action', 'Stop Loss', 'Take Profit', 'Trailing Stop', 'Time Filter',
]

export default function AlgoBuilderPage() {
  const [blocks] = useState(BLOCKS)
  return (
    <PageShell
      title="Algo Bot Builder"
      category="Automation"
      subtitle="Compose trading strategies from modular blocks — no code required."
      icon="solar:programming-bold-duotone"
      actions={<Btn variant="primary">Deploy Bot</Btn>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <SectionTitle title="Building Blocks" subtitle="Drag into your strategy" icon="solar:widget-add-bold-duotone" />
          <div className="flex flex-wrap gap-2 mt-2">
            {PALETTE.map((p) => (
              <span key={p} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-soft hover:border-emerald/40 hover:text-emerald-bright transition-colors cursor-grab">
                {p}
              </span>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle title="Strategy Flow" subtitle="Momentum Reversal v1" icon="solar:route-bold-duotone" action={<Badge tone="emerald">Valid</Badge>} />
          <div className="space-y-3 mt-2">
            {blocks.map((b, i) => (
              <div key={b.label} className="flex items-center gap-4 rounded-xl bg-white/[0.03] border border-white/10 p-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${b.tone === 'emerald' ? 'bg-emerald/12 text-emerald-bright' : b.tone === 'coral' ? 'bg-coral/12 text-coral' : 'bg-amber/12 text-amber'}`}>
                  <iconify-icon icon={b.icon} width="20"></iconify-icon>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{b.label}</div>
                  <div className="text-xs text-soft">{b.desc}</div>
                </div>
                <span className="text-xs text-muted font-mono">#{i + 1}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
