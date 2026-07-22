'use client'
import PageShell from '@/components/PageShell'
import { Card, Badge, Change } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'
import { getRotation } from '@/lib/featureData'

type Row = ReturnType<typeof getRotation>[number]

export default function SectorRotationPage() {
  const rows = getRotation()
  const toneFor: Record<string, 'emerald' | 'coral' | 'amber' | 'neutral'> = {
    Leading: 'emerald', Improving: 'amber', Weakening: 'coral', Lagging: 'neutral',
  }
  const cols: Column<Row>[] = [
    { key: 'sector', header: 'Sector', render: (r) => <span className="font-bold text-foreground">{r.sector}</span> },
    { key: 'rs', header: 'Rel. Strength', align: 'right', render: (r) => <span className="font-semibold tabular-nums">{r.rs.toFixed(1)}</span> },
    { key: 'momentum', header: 'Momentum', align: 'right', render: (r) => <Change value={r.momentum} suffix="" /> },
    { key: 'phase', header: 'Phase', align: 'right', render: (r) => <Badge tone={toneFor[r.phase] ?? 'neutral'}>{r.phase}</Badge> },
  ]
  return (
    <PageShell
      title="Sector Rotation"
      category="Market Intelligence"
      subtitle="Relative strength and momentum mapped to the rotation cycle across sectors."
      icon="solar:refresh-circle-bold-duotone"
    >
      <Card pad={false} className="p-2">
        <DataTable columns={cols} rows={rows} />
      </Card>
    </PageShell>
  )
}
