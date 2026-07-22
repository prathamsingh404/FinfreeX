'use client'
import PageShell from '@/components/PageShell'
import { Card, Change } from '@/components/ui/kit'
import { getMacro } from '@/lib/featureData'

export default function MacroEconomicsPage() {
  const rows = getMacro()
  return (
    <PageShell
      title="Macro Economics"
      category="Global Macro"
      subtitle="Key macroeconomic indicators shaping monetary policy and market direction."
      icon="solar:earth-bold-duotone"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((m) => (
          <Card key={m.name} className="flex flex-col gap-2">
            <div className="text-xs text-soft">{m.name}</div>
            <div className="text-3xl font-extrabold tracking-tight">{m.value}</div>
            {m.change !== 0 && <Change value={m.change} suffix=" pp" />}
            {m.change === 0 && <span className="text-xs text-muted">Unchanged</span>}
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
