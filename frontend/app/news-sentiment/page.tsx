'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Badge } from '@/components/ui/kit'
import { useNews } from '@/lib/hooks/useMarketData'

export default function NewsSentimentPage() {
  const { data, loading } = useNews('markets', 'business')
  
  const news = data || []
  
  // The backend currently doesn't provide sentiment scores, so we'll derive a basic one for the UI based on keywords
  // until the AI sentiment pipeline is fully implemented on the backend.
  const processedNews = news.map(n => {
    const text = (n.title + ' ' + (n.description || '')).toLowerCase()
    let sentiment = 0
    if (text.match(/surge|jump|record|high|growth|profit|up|gain/)) sentiment += 0.5
    if (text.match(/plunge|fall|drop|low|loss|down|bear|crash/)) sentiment -= 0.5
    
    return {
      ...n,
      sentiment,
      sentimentLabel: sentiment > 0.25 ? 'Bullish' : sentiment < -0.25 ? 'Bearish' : 'Neutral'
    }
  })

  const bullish = processedNews.filter((n) => n.sentiment > 0.25).length
  const bearish = processedNews.filter((n) => n.sentiment < -0.25).length
  const neutral = processedNews.length - bullish - bearish
  const avg = processedNews.length > 0 ? (processedNews.reduce((s, n) => s + n.sentiment, 0) / processedNews.length) : 0

  return (
    <PageShell category="Alternative Data" title="News & Sentiment" subtitle="AI-scored market news with real-time sentiment analysis." icon="solar:chat-square-like-linear">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-border"><div className="text-xs text-soft">Net Sentiment</div><div className={`text-2xl font-bold mt-1 ${avg > 0 ? 'text-primary' : avg < 0 ? 'text-coral' : 'text-foreground'}`}>{avg > 0 ? '+' : ''}{avg.toFixed(2)}</div></Card>
        <Card className="border-border"><div className="text-xs text-soft">Bullish</div><div className="text-2xl font-bold text-primary mt-1">{bullish}</div></Card>
        <Card className="border-border"><div className="text-xs text-soft">Bearish</div><div className="text-2xl font-bold text-coral mt-1">{bearish}</div></Card>
        <Card className="border-border"><div className="text-xs text-soft">Neutral</div><div className="text-2xl font-bold text-soft mt-1">{neutral}</div></Card>
      </div>
      <Card pad={false} className="border-border">
        <div className="p-5 pb-2"><SectionTitle title="Latest Headlines" icon="solar:chat-square-like-linear" /></div>
        <div className="min-h-[400px]">
          {loading ? (
             <div className="flex items-center justify-center h-48 text-soft">Fetching live news...</div>
          ) : processedNews.length === 0 ? (
             <div className="flex items-center justify-center h-48 text-soft">No news found.</div>
          ) : processedNews.map((n, i) => {
            const tone = n.sentiment > 0.25 ? 'emerald' : n.sentiment < -0.25 ? 'coral' : 'neutral'
            return (
              <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 px-5 py-4 border-t border-border hover:bg-surface-2 transition-colors block">
                <div className={`mt-1 w-1 self-stretch rounded-full ${tone === 'emerald' ? 'bg-primary' : tone === 'coral' ? 'bg-coral' : 'bg-white/20'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-pretty hover:text-primary transition-colors">{n.title}</div>
                  {n.description && <div className="text-[11px] text-soft mt-1 line-clamp-2">{n.description}</div>}
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted">
                    <span>{n.source}</span><span>·</span><span>{n.category || 'Markets'}</span><span>·</span><span>{n.published_at ? new Date(n.published_at).toLocaleString() : ''}</span>
                  </div>
                </div>
                <Badge tone={tone as 'emerald' | 'coral' | 'neutral'}>{n.sentimentLabel}</Badge>
              </a>
            )
          })}
        </div>
      </Card>
    </PageShell>
  )
}
