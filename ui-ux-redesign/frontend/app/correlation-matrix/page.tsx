'use client'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle } from '@/components/ui/kit'
import { getCorrelation } from '@/lib/featureData'

function cellColor(v: number) {
  // emerald for positive, coral for negative, opacity by magnitude
  const a = Math.min(1, Math.abs(v))
  if (v >= 0) return `rgba(52, 211, 153, ${0.12 + a * 0.6})`
  return `rgba(255, 107, 87, ${0.12 + a * 0.6})`
}

export default function CorrelationMatrixPage() {
  const { assets, matrix } = getCorrelation()
  return (
    <PageShell
      title="Correlation Matrix"
      category="Risk"
      subtitle="Cross-asset correlation heatmap for diversification and hedging decisions."
      icon="solar:widget-6-bold-duotone"
    >
      <Card>
        <SectionTitle title="Cross-Asset Correlations" subtitle="Pearson coefficient · -1 to +1" icon="solar:scanner-bold-duotone" />
        <div className="overflow-x-auto">
          <table className="border-collapse mx-auto">
            <thead>
              <tr>
                <th className="p-2"></th>
                {assets.map((a) => <th key={a} className="p-2 text-[11px] font-bold text-soft">{a}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={assets[i]}>
                  <td className="p-2 text-[11px] font-bold text-soft text-right whitespace-nowrap">{assets[i]}</td>
                  {row.map((v, j) => (
                    <td key={j} className="p-1">
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums"
                        style={{ background: cellColor(v), color: Math.abs(v) > 0.5 ? '#04120C' : '#E8F0EC' }}
                      >
                        {v.toFixed(2)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  )
}
