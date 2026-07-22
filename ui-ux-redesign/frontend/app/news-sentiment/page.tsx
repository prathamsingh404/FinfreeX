'use client'

import React from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, Badge } from '@/components/ui/kit'
import { getNews } from '@/lib/mockData'

export default function NewsSentimentPage() {
  const news = getNews(10)
  const bullish = news.filter((n) => n.sentiment > 0.25).length
  const bearish = news.filter((n) => n.sentiment < -0.25).length
  const neutral = news.length - bullish - bearish
  const avg = (news.reduce((s, n) => s + n.sentiment, 0) / news.length)

  return (
    <PageShell category="Alternative Data" title="News & Sentiment" subtitle="AI-scored market news with real-time sentiment analysis." icon="solar:chat-square-like-linear">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><div className="text-xs text-soft">Net Sentiment</div><div className={`text-2xl font-bold mt-1 ${avg >= 0 ? 'text-emerald-bright' : 'text-coral'}`}>{avg >= 0 ? '+' : ''}{avg.toFixed(2)}</div></Card>
        <Card><div className="text-xs text-soft">Bullish</div><div className="text-2xl font-bold text-emerald-bright mt-1">{bullish}</div></Card>
        <Card><div className="text-xs text-soft">Bearish</div><div className="text-2xl font-bold text-coral mt-1">{bearish}</div></Card>
        <Card><div className="text-xs text-soft">Neutral</div><div className="text-2xl font-bold text-soft mt-1">{neutral}</div></Card>
      </div>
      <Card pad={false}>
        <div className="p-5 pb-2"><SectionTitle title="Latest Headlines" icon="solar:chat-square-like-linear" /></div>
        <div>
          {news.map((n, i) => {
            const tone = n.sentiment > 0.25 ? 'emerald' : n.sentiment < -0.25 ? 'coral' : 'neutral'
            return (
              <div key={i} className="flex items-start gap-4 px-5 py-4 border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                <div className={`mt-1 w-1 self-stretch rounded-full ${tone === 'emerald' ? 'bg-emerald' : tone === 'coral' ? 'bg-coral' : 'bg-white/20'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-pretty">{n.title}</div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted">
                    <span>{n.source}</span><span>·</span><span>{n.category}</span><span>·</span><span>{n.time}</span>
                  </div>
                </div>
                <Badge tone={tone as 'emerald' | 'coral' | 'neutral'}>{n.sentimentLabel}</Badge>
              </div>
            )
          })}
        </div>
      </Card>
    </PageShell>
  )
}
