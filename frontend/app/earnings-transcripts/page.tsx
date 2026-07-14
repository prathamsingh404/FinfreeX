'use client'
import PageShell from '@/components/PageShell'
import { Card, Badge, Change } from '@/components/ui/kit'
import { getEarnings } from '@/lib/featureData'

export default function EarningsTranscriptsPage() {
  const rows = getEarnings()
  return (
    <PageShell
      title="Earnings Transcripts"
      category="Fundamentals"
      subtitle="Quarterly results, EPS surprises and management-tone sentiment scoring."
      icon="solar:microphone-bold-duotone"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((r) => (
          <Card key={r.symbol} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{r.symbol} <span className="text-soft font-normal text-xs">· {r.quarter}</span></div>
                <div className="text-xs text-muted">{r.name} · {r.date}</div>
              </div>
              <Badge tone={r.result === 'Beat' ? 'emerald' : 'coral'}>{r.result}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><div className="text-[11px] text-soft">EPS Est</div><div className="font-semibold tabular-nums">{r.epsEst.toFixed(2)}</div></div>
              <div><div className="text-[11px] text-soft">EPS Actual</div><div className="font-semibold tabular-nums">{r.epsActual.toFixed(2)}</div></div>
              <div><div className="text-[11px] text-soft">Rev YoY</div><Change value={r.revYoY} suffix="%" /></div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-soft">Mgmt tone</span>
              <Badge tone={r.sentiment >= 0.15 ? 'emerald' : r.sentiment <= -0.15 ? 'coral' : 'amber'}>
                {r.sentiment >= 0.15 ? 'Optimistic' : r.sentiment <= -0.15 ? 'Cautious' : 'Neutral'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
