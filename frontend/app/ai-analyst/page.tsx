'use client'
import { useState, useRef, useEffect } from 'react'
import PageShell from '@/components/PageShell'
import { Card, Badge, Btn } from '@/components/ui/kit'
import { useScreener, usePortfolio } from '@/lib/hooks/useMarketData'
import { useAuth } from '@/context/AuthContext'

type Msg = { role: 'user' | 'ai'; text: string }

const SUGGESTIONS = [
  'Analyze my portfolio risk',
  'What are the top momentum stocks?',
  'Summarize today\u2019s market',
  'Suggest a sector rotation strategy',
]

function analyze(query: string, screenerData: any[], portfolioData: any): string {
  const q = query.toLowerCase()
  if (q.includes('portfolio') || q.includes('risk')) {
    if (!portfolioData) return "I cannot access your live portfolio data right now. Please ensure you're logged in and the portfolio service is running."
    return `Your portfolio is valued at \u20B9${(portfolioData.totalValue / 1e5).toFixed(2)}L with a total P&L of ${portfolioData.totalPnlPct || 0}%. I'd suggest reviewing any oversized positions based on live data.`
  }
  if (q.includes('momentum') || q.includes('top')) {
    if (!screenerData || screenerData.length === 0) return "I'm currently unable to fetch live market movers. Please check the market data connection."
    const movers = [...screenerData].sort((a, b) => (b.return_1m || 0) - (a.return_1m || 0)).slice(0, 3)
    return `Today's strongest momentum names from the live screener: ${movers.map((m) => `${m.symbol} (+${(m.return_1m || 0).toFixed(2)}%)`).join(', ')}. These show positive relative strength.`
  }
  if (q.includes('market') || q.includes('summar')) {
    if (!screenerData || screenerData.length === 0) return "Market data is currently unavailable."
    const adv = screenerData.filter((x) => (x.return_1m || 0) >= 0).length
    return `Based on live screener data, market breadth is ${adv > screenerData.length / 2 ? 'positive' : 'negative'} with ${adv}/${screenerData.length} tracked equities advancing.`
  }
  if (q.includes('sector') || q.includes('rotation')) {
    return `Sector rotation signals are derived from live market momentum. You can view the Sectors dashboard for a detailed breakdown.`
  }
  return `I am currently analyzing live API data. I'd recommend maintaining a diversified allocation. Ask me about your portfolio, specific sectors, or momentum ideas.`
}

export default function AiAnalystPage() {
  const { user } = useAuth()
  const userId = user?.id || 'demo-user-123'
  
  const { data: screenerData } = useScreener({ universe: 'ALL' })
  const { data: portfolioData } = usePortfolio(userId)

  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ai', text: 'Hello! I\u2019m your AI financial analyst. Ask me about your portfolio, market conditions, momentum ideas, or sector strategy based on live data.' },
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
      setMessages((m) => [...m, { role: 'ai', text: analyze(q, screenerData || [], portfolioData) }])
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
      <Card className="flex flex-col border-border" pad={false}>
        <div className="flex-1 p-5 space-y-4 max-h-[52vh] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-primary/12 border border-primary/25 text-primary flex items-center justify-center shrink-0">
                  <iconify-icon icon="solar:magic-stick-3-bold-duotone" width="16"></iconify-icon>
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary text-[#04120C] font-medium' : 'bg-surface-2 border border-border text-foreground'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/12 border border-primary/25 text-primary flex items-center justify-center shrink-0">
                <iconify-icon icon="solar:magic-stick-3-bold-duotone" width="16"></iconify-icon>
              </div>
              <div className="rounded-2xl px-4 py-3 bg-surface-2 border border-border flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-soft hover:text-primary hover:border-primary/40 transition-colors">
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
              className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/40 text-foreground placeholder:text-muted"
            />
            <Btn variant="primary" onClick={() => send(input)}>Send</Btn>
          </div>
        </div>
      </Card>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        <Badge tone="amber">Pending API Integration</Badge>
        This AI chat interface currently generates rules-based responses from your live market data. Backend LLM API integration is pending.
      </div>
    </PageShell>
  )
}
