import { supabase } from '@/lib/supabase'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-jet-mu-37.vercel.app'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let token: string | undefined
  try {
    const { data } = await supabase.auth.getSession()
    token = data?.session?.access_token
  } catch (e) {
    console.warn("Auth session fetch bypassed or failed:", e)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: headers as HeadersInit,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${path}: ${res.status} — ${text}`)
  }
  return res.json()
}

/* ---------- Types ---------- */


export interface Quote {
  symbol: string
  exchange: string
  current_price: number
  previous_close: number
  change: number
  change_pct: number
  open: number
  high: number
  low: number
  volume: number
  currency: string
  timestamp: string
}

export interface IndexData {
  price: number
  change: number
  change_pct: number
  category: string
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Fundamental {
  symbol: string
  company_name: string
  sector: string
  industry: string
  market_cap: number | null
  pe_ratio: number | null
  forward_pe: number | null
  pb_ratio: number | null
  eps: number | null
  revenue: number | null
  revenue_growth: number | null
  gross_margins: number | null
  operating_margins: number | null
  profit_margins: number | null
  debt_to_equity: number | null
  current_ratio: number | null
  roe: number | null
  roa: number | null
  free_cashflow: number | null
  dividend_yield: number | null
  '52w_high': number | null
  '52w_low': number | null
  avg_volume: number | null
  beta: number | null
  description: string
}

export interface NewsItem {
  title: string
  description: string
  url: string
  source: string
  published_at: string
  image_url?: string
  sentiment?: number
  sentiment_label?: string
  category?: string
}

export interface ScreenerResult {
  symbol: string
  name: string
  sector: string
  industry: string
  market_cap: number
  current_price: number
  pe_ratio: number | null
  pb_ratio: number | null
  roe: number | null
  revenue_growth: number | null
  profit_margins: number | null
  debt_to_equity: number | null
  dividend_yield: number | null
  beta: number | null
  '52w_high': number | null
  '52w_low': number | null
  return_1y: number | null
  return_1m: number | null
  volume_ratio: number
  avg_volume: number
  volume?: number
}

export interface OptionsChainRow {
  strike: number
  call_ltp: number
  call_oi: number
  call_volume: number
  call_iv: number
  call_change: number
  put_ltp: number
  put_oi: number
  put_volume: number
  put_iv: number
  put_change: number
}

export interface OptionsChain {
  symbol: string
  spot_price: number
  expiry_dates: string[]
  chain: OptionsChainRow[]
}

export interface ForexPair {
  pair: string
  rate: number
  change_pct: number
  high: number
  low: number
}

export interface CryptoAsset {
  symbol: string
  name: string
  price: number
  change_pct: number
  market_cap: number
  volume: number
}

export interface CommodityAsset {
  name: string
  symbol: string
  unit: string
  price: number
  change_pct: number
}

export interface MacroIndicator {
  name: string
  value: number
  change: number
  date: string
  status: string
}

/* ---------- Market Data ---------- */

export async function fetchQuote(symbol: string, exchange = 'NSE'): Promise<Quote> {
  return apiFetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}`)
}

export async function fetchMultipleQuotes(symbols: string[], exchange = 'NSE'): Promise<Quote[]> {
  // Fetch concurrently
  return Promise.all(symbols.map(s => fetchQuote(s, exchange)))
}

export async function fetchIndices(): Promise<Record<string, IndexData>> {
  return apiFetch('/api/market/indices')
}

export async function fetchMovers(exchange = 'NSE'): Promise<{ gainers: Quote[]; losers: Quote[] }> {
  return apiFetch(`/api/market/movers?exchange=${exchange}`)
}

export async function fetchFundamentals(symbol: string, exchange = 'NSE'): Promise<Fundamental> {
  return apiFetch(`/api/market/fundamentals?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}`)
}

export async function fetchTechnicals(symbol: string, exchange = 'NSE') {
  return apiFetch(`/api/market/technicals?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}`)
}

/* ---------- Charts ---------- */

export async function fetchOHLCV(
  symbol: string,
  exchange = 'NSE',
  period = '3mo',
  interval = '1d'
): Promise<Candle[]> {
  return apiFetch(`/api/charts/ohlcv?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}&period=${period}&interval=${interval}`)
}

/* ---------- Screener ---------- */

export async function fetchScreener(params?: Record<string, string>): Promise<ScreenerResult[]> {
  return apiFetch('/api/screener/run', {
    method: 'POST',
    body: JSON.stringify(params || {}),
  })
}

/* ---------- News ---------- */

export async function fetchNews(query?: string, category?: string): Promise<NewsItem[]> {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (category) params.set('category', category)
  const qs = params.toString()
  return apiFetch(`/api/news/feed${qs ? '?' + qs : ''}`)
}

/* ---------- Options ---------- */

export async function fetchOptionsChain(symbol: string, expiry?: string): Promise<OptionsChain> {
  const params = new URLSearchParams({ symbol })
  if (expiry) params.set('expiry', expiry)
  return apiFetch(`/api/options/chain?${params}`)
}

/* ---------- Portfolio ---------- */

export async function fetchPortfolio(): Promise<any> {
  return apiFetch('/api/portfolio')
}

export async function fetchPortfolioHoldings(): Promise<any[]> {
  return apiFetch('/api/portfolio/holdings')
}

export async function executeTrade(symbol: string, exchange: string, tradeType: 'BUY' | 'SELL', quantity: number): Promise<any> {
  return apiFetch('/api/portfolio/trade', {
    method: 'POST',
    body: JSON.stringify({ symbol, exchange, trade_type: tradeType, quantity }),
  })
}

export async function fetchTrades(): Promise<any[]> {
  return apiFetch('/api/portfolio/trades')
}



/* ---------- AI ---------- */

export async function fetchAIAnalysis(symbol: string, exchange = 'NSE') {
  return apiFetch('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ symbol, exchange }),
  })
}

export async function fetchAIChat(messages: { role: string; content: string }[], contextSymbol?: string): Promise<{ answer: string }> {
  return apiFetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, context_symbol: contextSymbol }),
  })
}

/* ---------- Forex, Crypto, Commodities ---------- */

export async function fetchForex(): Promise<ForexPair[]> {
  return apiFetch('/api/market/forex')
}

export async function fetchCrypto(): Promise<CryptoAsset[]> {
  return apiFetch('/api/market/crypto')
}

export async function fetchCommodities(): Promise<CommodityAsset[]> {
  return apiFetch('/api/market/commodities')
}

/* ---------- Macro Economics ---------- */

export async function fetchMacro(): Promise<MacroIndicator[]> {
  return apiFetch('/api/market/macro')
}

/* ---------- Watchlist ---------- */

export async function fetchWatchlists(userId: string) {
  return apiFetch(`/api/watchlist?user_id=${userId}`)
}

/* ---------- Alerts ----------
   The backend scopes every alert to the caller's token, so none of these
   take a user id. `fetchAlerts` keeps its old signature for callers that
   still pass one; the argument is ignored. */

export interface PriceAlert {
  id: string
  symbol: string
  exchange: string
  condition: 'ABOVE' | 'BELOW'
  target_value: number
  status?: string
  triggered_at?: string | null
  created_at?: string
}

export async function fetchAlerts(_userId?: string): Promise<PriceAlert[]> {
  return apiFetch(`/api/alerts`)
}

export async function createAlert(input: {
  symbol: string
  exchange?: string
  condition: 'ABOVE' | 'BELOW'
  target_value: number
}): Promise<PriceAlert> {
  return apiFetch(`/api/alerts`, {
    method: 'POST',
    body: JSON.stringify({ exchange: 'NSE', ...input }),
  })
}

export async function deleteAlert(alertId: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/alerts/${alertId}`, { method: 'DELETE' })
}

/* ---------- Derived analytics ----------
   Computed server-side from live prices and filings. These replace the
   generated figures the feature pages used to read from lib/featureData. */

export async function fetchCorrelation(period = '1y'): Promise<{
  assets: string[]
  matrix: (number | null)[][]
  period: string
  observations: number
}> {
  return apiFetch(`/api/analytics/correlation?period=${period}`)
}

export interface RotationRow {
  sector: string
  price: number
  change_pct: number
  week_change_pct: number
  rs: number
  momentum: number
  phase: 'Leading' | 'Weakening' | 'Improving' | 'Lagging'
  stale?: boolean
}

export async function fetchSectorRotation(): Promise<{
  sectors: RotationRow[]
  benchmark_day: number
  benchmark_week: number
}> {
  return apiFetch(`/api/analytics/sector-rotation`)
}

export async function fetchRiskMetrics(symbol: string, exchange = 'NSE', period = '1y'): Promise<any> {
  return apiFetch(`/api/analytics/risk?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}&period=${period}`)
}

export async function fetchRatios(symbols: string[], exchange = 'NSE'): Promise<{ ratios: any[]; unavailable: string[] }> {
  return apiFetch(`/api/analytics/ratios?symbols=${symbols.join(',')}&exchange=${exchange}`)
}

export async function fetchDividendBoard(symbols: string[], exchange = 'NSE'): Promise<{ dividends: any[]; unavailable: string[] }> {
  return apiFetch(`/api/analytics/dividends?symbols=${symbols.join(',')}&exchange=${exchange}`)
}

export async function fetchInstruments(symbols: string[], exchange = 'US'): Promise<{ instruments: any[]; unavailable: string[] }> {
  return apiFetch(`/api/analytics/instruments?symbols=${symbols.join(',')}&exchange=${exchange}`)
}

/* ---------- Telegram notifications ---------- */

export interface NotificationSettings {
  telegram_bot_token: string
  telegram_chat_id: string
  digest_frequency: 'hourly' | 'daily' | 'weekly' | 'off'
  alert_on_price_trigger: boolean
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  return apiFetch(`/api/notifications/settings`)
}

export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  return apiFetch(`/api/notifications/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}

/** Sends a real message through the saved bot so the user can confirm it works. */
export async function sendTelegramTest(): Promise<{ success: boolean }> {
  return apiFetch(`/api/notifications/test`, { method: 'POST' })
}

/* ---------- Sectors ---------- */

export async function fetchSectors(): Promise<any[]> {
  return apiFetch(`/api/market/sectors`)
}

export interface AIChunk {
  type: 'status' | 'market_data' | 'specialist' | 'persona' | 'final_verdict' | 'error';
  message?: string;
  agent?: string;
  persona?: string;
  data?: any;
  result?: any;
}

// SSE streaming AI analysis
export function streamAnalysis(
  ticker: string,
  exchange: string,
  activePersonas: string[] = ['buffett', 'jhunjhunwala', 'graham', 'burry'],
  onChunk: (chunk: AIChunk) => void,
  onDone: () => void,
  onError: (err: any) => void
) {
  const body = JSON.stringify({ ticker, exchange, active_personas: activePersonas });
  fetch(`${API_BASE}/api/ai/analyze/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(`SSE request failed: ${res.status}`);
    }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data.done) {
              onDone();
              return;
            }
            onChunk(data);
          } catch (e) {
            console.error("JSON parse error in SSE stream:", e);
          }
        }
      }
    }
    onDone();
  }).catch((err) => {
    onError(err);
  });
}

/* ---------- Broker Integration ---------- */

export async function fetchBrokerLoginUrl(): Promise<{ login_url: string }> {
  return apiFetch('/api/broker/login-url')
}

export async function fetchBrokerHoldings(): Promise<any[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('upstox_access_token') : null
  if (!token) return []
  return apiFetch('/api/broker/holdings', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
}

