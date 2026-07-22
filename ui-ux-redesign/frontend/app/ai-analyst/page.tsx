'use client'
import { useState, useRef, useEffect } from 'react'
import PageShell from '@/components/PageShell'
import { Card, Badge, Btn } from '@/components/ui/kit'
import { getAllQuotes, getPortfolio } from '@/lib/mockData'

type Msg = { role: 'user' | 'ai'; text: string }

const SUGGESTIONS = [
  'Analyze my portfolio risk',
  'What are the top momentum stocks?',
  'Summarize today\u2019s market',
  'Suggest a sector rotation strategy',
]

function analyze(query: string): string {
  const q = query.toLowerCase()
  const quotes = getAllQuotes()
  if (q.includes('portfolio') || q.includes('risk')) {
    const p = getPortfolio()
    const top = [...p.holdings].sort((a, b) => b.weight - a.weight)[0]
    return `Your portfolio is valued at \u20B9${(p.totalValue / 1e5).toFixed(2)}L with a total P&L of ${p.totalPnlPct.toFixed(2)}%. Concentration risk is moderate — ${top.symbol} is your largest position at ${top.weight.toFixed(1)}% of holdings. I'd suggest trimming single-name exposure above 15% and adding a defensive allocation to reduce beta.`
  }
  if (q.includes('momentum') || q.includes('top')) {
    const movers = [...quotes].sort((a, b) => b.changePct - a.changePct).slice(0, 3)
    return `Today's strongest momentum names: ${movers.map((m) => `${m.symbol} (+${m.changePct.toFixed(2)}%)`).join(', ')}. These show above-average volume and positive relative strength. Momentum is favorable but watch for mean reversion after such extended moves — consider staggered entries.`
  }
  if (q.includes('market') || q.includes('summar')) {
    const adv = quotes.filter((x) => x.changePct >= 0).length
    return `Market breadth is ${adv > quotes.length / 2 ? 'positive' : 'negative'} with ${adv}/${quotes.length} names advancing. Large-caps are leading while volatility remains contained. The tone is constructive; dips toward key moving averages look buyable for positional trades.`
  }
  if (q.includes('sector') || q.includes('rotation')) {
    return `Sector rotation signals favor rotating from defensives into cyclicals. Financials and Technology show improving relative strength, while FMCG is weakening. A barbell approach — pairing high-growth Tech with stable Financials — offers balanced upside with managed drawdown.`
  }
  return `Based on current market data, I'd recommend maintaining a diversified allocation with a tilt toward quality large-caps. Momentum indicators are neutral-to-positive. Ask me about your portfolio, specific sectors, or momentum ideas for a deeper breakdown.`
}

export default function AiAnalystPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ai', text: 'Hello! I\u2019m your AI financial analyst. Ask me about your portfolio, market conditions, momentum ideas, or sector strategy.' },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  function send(text: string) {
    const q = text.trim()
    if (!q || thinking) return
    setMessages((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'ai', text: analyze(q) }])
      setThinking(false)
    }, 650)
  }

  return (
    <PageShell
      title="AI Financial Analyst"
      category="Intelligence"
      subtitle="Conversational market intelligence grounded in your live data."
      icon="solar:magic-stick-3-bold-duotone"
    >
      <Card className="flex flex-col" pad={false}>
        <div className="flex-1 p-5 space-y-4 max-h-[52vh] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-emerald/12 border border-emerald/25 text-emerald-bright flex items-center justify-center shrink-0">
                  <iconify-icon icon="solar:magic-stick-3-bold-duotone" width="16"></iconify-icon>
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-emerald text-[#04120C] font-medium' : 'bg-white/[0.04] border border-white/10 text-foreground'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald/12 border border-emerald/25 text-emerald-bright flex items-center justify-center shrink-0">
                <iconify-icon icon="solar:magic-stick-3-bold-duotone" width="16"></iconify-icon>
              </div>
              <div className="rounded-2xl px-4 py-3 bg-white/[0.04] border border-white/10 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-soft hover:text-emerald-bright hover:border-emerald/40 transition-colors">
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) send(input) }}
              placeholder="Ask about markets, your portfolio, or strategy..."
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald/40 text-foreground placeholder:text-muted"
            />
            <Btn variant="primary" onClick={() => send(input)}>Send</Btn>
          </div>
        </div>
      </Card>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        <Badge tone="amber">Demo</Badge>
        Responses are generated from in-app mock market data for demonstration.
      </div>
    </PageShell>
  )
}
