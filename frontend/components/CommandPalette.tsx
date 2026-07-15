'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ALL_ROUTES, PALETTE_EXTRAS, NAV } from '@/lib/nav'

/* ============================================================
   Global command palette — Ctrl/⌘+K from anywhere.
   Searches navigation, tickers, and AI actions in one box.
   Open programmatically via openCommandPalette().
   ============================================================ */

const OPEN_EVENT = 'finfreex:open-command-palette'

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT))
}

interface Entry {
  id: string
  group: 'Ask AI' | 'Stocks' | 'Navigate' | 'Actions'
  title: string
  hint?: string
  icon: string
  ai?: boolean
  run: (router: ReturnType<typeof useRouter>) => void
}

const POPULAR_TICKERS: { symbol: string; name: string }[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries' },
  { symbol: 'TCS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank' },
  { symbol: 'INFY', name: 'Infosys' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'NVDA', name: 'Nvidia' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'META', name: 'Meta Platforms' },
]

/** Group items so nav categories can prefix titles ("Research · Screener") */
const ROUTE_CATEGORY = new Map<string, string>()
for (const g of NAV) for (const i of g.items) ROUTE_CATEGORY.set(i.route, g.category)

function score(haystack: string, needle: string): number {
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  if (!n) return 1
  if (h === n) return 100
  if (h.startsWith(n)) return 80
  const idx = h.indexOf(n)
  if (idx >= 0) return 60 - Math.min(idx, 40)
  // subsequence match
  let hi = 0
  for (const c of n) {
    hi = h.indexOf(c, hi)
    if (hi === -1) return 0
    hi++
  }
  return 20
}

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      // Wait a frame so the input exists before focusing
      requestAnimationFrame(() => inputRef.current?.focus())
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim()

    const askAI: Entry[] = q
      ? [
          {
            id: 'ask-ai',
            group: 'Ask AI',
            title: `Ask AI Analyst: “${q}”`,
            hint: 'Six agents research it live',
            icon: 'solar:magic-stick-3-linear',
            ai: true,
            run: (r) => r.push(`/ai-analyst?q=${encodeURIComponent(q)}`),
          },
        ]
      : [
          {
            id: 'ask-ai-empty',
            group: 'Ask AI',
            title: 'Ask the AI Analyst anything…',
            hint: 'e.g. “Compare Nvidia vs AMD”',
            icon: 'solar:magic-stick-3-linear',
            ai: true,
            run: (r) => r.push('/ai-analyst'),
          },
        ]

    const stocks: Entry[] = POPULAR_TICKERS.map((t) => ({
      id: `stock-${t.symbol}`,
      group: 'Stocks' as const,
      title: t.symbol,
      hint: t.name,
      icon: 'solar:graph-up-linear',
      run: (r) => r.push(`/ai-analyst?q=${encodeURIComponent(`Analyze ${t.symbol}`)}`),
    }))

    const nav: Entry[] = [...ALL_ROUTES, ...PALETTE_EXTRAS].map((item) => ({
      id: `nav-${item.route}`,
      group: 'Navigate' as const,
      title: item.title,
      hint: ROUTE_CATEGORY.get(item.route) ?? item.desc,
      icon: item.icon,
      run: (r) => r.push(item.route),
    }))

    const actions: Entry[] = [
      {
        id: 'act-alert',
        group: 'Actions',
        title: 'Create alert…',
        hint: '“Notify me if RELIANCE drops 5%”',
        icon: 'solar:bell-linear',
        run: (r) => r.push('/alerts'),
      },
      {
        id: 'act-portfolio',
        group: 'Actions',
        title: 'Analyze my portfolio',
        hint: 'AI health check',
        icon: 'solar:pie-chart-2-linear',
        run: (r) => r.push('/portfolio-analyzer'),
      },
      {
        id: 'act-screen',
        group: 'Actions',
        title: 'Screen the market',
        hint: 'Find stocks by any metric',
        icon: 'solar:filter-linear',
        run: (r) => r.push('/equities-screener'),
      },
    ]

    if (!q) {
      // Default view: AI first, a few stocks, core nav, actions
      return [...askAI, ...stocks.slice(0, 4), ...nav.slice(0, 6), ...actions]
    }

    const rank = (e: Entry) => Math.max(score(e.title, q), e.hint ? score(e.hint, q) * 0.8 : 0)
    const matched = [...stocks, ...nav, ...actions]
      .map((e) => ({ e, s: rank(e) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.e)
    return [...askAI, ...matched]
  }, [query])

  const select = useCallback(
    (entry: Entry) => {
      setOpen(false)
      entry.run(router)
    },
    [router]
  )

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, entries.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (entries[active]) select(entries[active])
    }
  }

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  let lastGroup = ''

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[14vh] px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm fade-in" onClick={() => setOpen(false)}></div>

      <div className="relative w-full max-w-xl ai-beam-border fade-up">
        <div className="rounded-[11px] bg-elevated overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
            <iconify-icon icon="solar:magic-stick-3-linear" width="18" class="text-ai-bright"></iconify-icon>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search stocks, tools — or ask the AI anything…"
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted"
              aria-label="Command palette search"
            />
            <span className="kbd">Esc</span>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[46vh] overflow-y-auto custom-scrollbar py-2">
            {entries.map((entry, i) => {
              const showHeader = entry.group !== lastGroup
              lastGroup = entry.group
              return (
                <React.Fragment key={entry.id}>
                  {showHeader && (
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                      {entry.group}
                    </div>
                  )}
                  <button
                    data-idx={i}
                    onClick={() => select(entry)}
                    onMouseMove={() => setActive(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                      i === active ? (entry.ai ? 'bg-ai/12' : 'bg-white/[0.06]') : ''
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                        entry.ai ? 'bg-ai/15 border-ai/30 text-ai-bright' : 'bg-white/[0.04] border-border text-soft'
                      }`}
                    >
                      <iconify-icon icon={entry.icon} width="15"></iconify-icon>
                    </div>
                    <span className={`text-sm font-medium truncate ${entry.ai ? 'text-ai-bright' : 'text-foreground'}`}>
                      {entry.title}
                    </span>
                    {entry.hint && <span className="text-xs text-muted truncate ml-auto shrink-0 max-w-[45%]">{entry.hint}</span>}
                    {i === active && <span className="kbd shrink-0">↵</span>}
                  </button>
                </React.Fragment>
              )
            })}
            {entries.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted">Nothing matches — try a ticker or a tool name.</div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 h-9 border-t border-border text-[10.5px] text-muted">
            <span className="flex items-center gap-1.5"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
            <span className="flex items-center gap-1.5"><span className="kbd">↵</span> select</span>
            <span className="ml-auto flex items-center gap-1.5 text-ai-bright/70">
              <iconify-icon icon="solar:magic-stick-3-linear" width="12"></iconify-icon> AI-powered
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
