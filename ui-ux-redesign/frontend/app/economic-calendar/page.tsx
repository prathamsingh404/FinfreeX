'use client'
import PageShell from '@/components/PageShell'
import { Card, Badge } from '@/components/ui/kit'
import { DataTable, Column } from '@/components/ui/DataTable'

const EVENTS = [
  { time: '09:30', country: 'IN', event: 'CPI Inflation YoY', impact: 'High', forecast: '4.9%', prior: '5.1%' },
  { time: '11:00', country: 'IN', event: 'Industrial Production', impact: 'Medium', forecast: '4.2%', prior: '3.8%' },
  { time: '14:00', country: 'US', event: 'FOMC Rate Decision', impact: 'High', forecast: '5.25%', prior: '5.25%' },
  { time: '15:30', country: 'EU', event: 'ECB Press Conference', impact: 'High', forecast: '—', prior: '—' },
  { time: '18:00', country: 'US', event: 'Crude Oil Inventories', impact: 'Medium', forecast: '-1.2M', prior: '0.8M' },
  { time: '19:00', country: 'IN', event: 'Forex Reserves', impact: 'Low', forecast: '$648B', prior: '$641B' },
  { time: '20:00', country: 'US', event: 'Nonfarm Payrolls', impact: 'High', forecast: '185K', prior: '206K' },
  { time: '21:30', country: 'UK', event: 'BoE Governor Speech', impact: 'Medium', forecast: '—', prior: '—' },
]

type Row = typeof EVENTS[number]

export default function EconomicCalendarPage() {
  const tone: Record<string, 'coral' | 'amber' | 'neutral'> = { High: 'coral', Medium: 'amber', Low: 'neutral' }
  const cols: Column<Row>[] = [
    { key: 'time', header: 'Time', render: (r) => <span className="font-bold text-foreground">{r.time}</span> },
    { key: 'country', header: 'Region', render: (r) => <Badge tone="neutral">{r.country}</Badge> },
    { key: 'event', header: 'Event', className: 'text-foreground' },
    { key: 'impact', header: 'Impact', render: (r) => <Badge tone={tone[r.impact]}>{r.impact}</Badge> },
    { key: 'forecast', header: 'Forecast', align: 'right', render: (r) => <span className="font-semibold">{r.forecast}</span> },
    { key: 'prior', header: 'Prior', align: 'right', className: 'text-soft' },
  ]
  return (
    <PageShell
      title="Economic Calendar"
      category="Global Macro"
      subtitle="Scheduled economic releases and central-bank events with market-impact ratings."
      icon="solar:calendar-date-bold-duotone"
    >
      <Card pad={false} className="p-2">
        <DataTable columns={cols} rows={EVENTS} />
      </Card>
    </PageShell>
  )
}
