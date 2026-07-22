const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('supabase_access_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `API error ${res.status}`);
  }
  return res.json();
}

export interface Quote {
  symbol: string;
  exchange: string;
  yf_symbol: string;
  current_price: number;
  previous_close: number;
  change: number;
  change_pct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  currency: string;
  timestamp: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndexItem {
  price: number;
  change: number;
  change_pct: number;
  category: string;
}

export type IndicesData = Record<string, IndexItem>;

export interface TopMovers {
  gainers: Quote[];
  losers: Quote[];
}

export interface Fundamentals {
  symbol: string;
  company_name: string;
  sector: string;
  industry: string;
  market_cap: number;
  pe_ratio: number | null;
  forward_pe: number | null;
  pb_ratio: number | null;
  eps: number | null;
  revenue: number | null;
  revenue_growth: number | null;
  gross_margins: number | null;
  operating_margins: number | null;
  profit_margins: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  roe: number | null;
  roa: number | null;
  free_cashflow: number | null;
  dividend_yield: number | null;
  "52w_high": number | null;
  "52w_low": number | null;
  avg_volume: number | null;
  beta: number | null;
  description: string;
}

export interface Technicals {
  candles_with_indicators: any[];
  latest: Record<string, number | null>;
  signals: {
    rsi_signal: string;
    macd_signal: string;
    bb_signal: string;
    trend: string;
  };
}

export interface ScreenerFilters {
  pe_min?: number | null;
  pe_max?: number | null;
  pb_max?: number | null;
  market_cap_min?: number | null;
  roe_min?: number | null;
  revenue_growth_min?: number | null;
  return_1y_min?: number | null;
  return_1m_min?: number | null;
  volume_ratio_min?: number | null;
  debt_to_equity_max?: number | null;
  sector?: string | null;
  universe?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
  current_price: number;
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe: number | null;
  revenue_growth: number | null;
  profit_margins: number | null;
  debt_to_equity: number | null;
  dividend_yield: number | null;
  beta: number | null;
  "52w_high": number | null;
  "52w_low": number | null;
  return_1y: number | null;
  return_1m: number | null;
  volume_ratio: number | null;
  avg_volume: number | null;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  exchange: string;
  added_at: string;
}

export interface CreateAlertRequest {
  symbol: string;
  exchange: string;
  condition: 'ABOVE' | 'BELOW';
  target_value: number;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  exchange: string;
  condition: 'ABOVE' | 'BELOW';
  target_value: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description: string;
}

export interface TradeRequest {
  symbol: string;
  exchange: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
}

export interface PositionItem {
  id: string;
  symbol: string;
  exchange: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  cost_basis: number;
  current_value: number;
  pnl: number;
  pnl_pct: number;
}

export interface PortfolioSummary {
  portfolio_id: string;
  name: string;
  initial_cash: number;
  cash_balance: number;
  total_position_value: number;
  total_value: number;
  total_pnl: number;
  total_pnl_pct: number;
  currency: string;
  positions: PositionItem[];
}

export interface TradeHistoryItem {
  id: string;
  portfolio_id: string;
  symbol: string;
  exchange: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_value: number;
  executed_at: string;
}

export interface OptionContract {
  strike: number;
  ltp: number;
  change: number;
  change_pct: number;
  volume: number;
  oi: number;
  implied_volatility: number;
  delta: number;
  gamma: number;
  theta: number;
}

export interface OptionChainRow {
  strike: number;
  call: OptionContract;
  put: OptionContract;
}

export interface OptionChainResponse {
  symbol: string;
  underlying_price: number;
  expiry: string;
  days_to_expiry: number;
  chain: OptionChainRow[];
}

export interface AIChunk {
  type: 'status' | 'market_data' | 'specialist' | 'persona' | 'final_verdict' | 'error';
  message?: string;
  agent?: string;
  persona?: string;
  data?: any;
  result?: any;
}

// Typed client export
export const api = {
  market: {
    quote: (symbol: string, exchange = 'NSE') =>
      fetchAPI<Quote>(`/api/market/quote?symbol=${symbol}&exchange=${exchange}`),
    ohlcv: (symbol: string, exchange = 'NSE', period = '3mo', interval = '1d') =>
      fetchAPI<Candle[]>(`/api/charts/ohlcv?symbol=${symbol}&exchange=${exchange}&period=${period}&interval=${interval}`),
    indices: () => fetchAPI<IndicesData>('/api/market/indices'),
    topMovers: (exchange = 'NSE') => fetchAPI<TopMovers>(`/api/market/movers?exchange=${exchange}`),
    fundamentals: (symbol: string, exchange = 'NSE') =>
      fetchAPI<Fundamentals>(`/api/market/fundamentals?symbol=${symbol}&exchange=${exchange}`),
    technicals: (symbol: string, exchange = 'NSE') =>
      fetchAPI<Technicals>(`/api/market/technicals?symbol=${symbol}&exchange=${exchange}`),
  },
  screener: {
    run: (filters: ScreenerFilters) =>
      fetchAPI<ScreenerResult[]>('/api/screener/run', { method: 'POST', body: JSON.stringify(filters) }),
    savedList: () => fetchAPI<any[]>('/api/screener/saved'),
    save: (name: string, filters: ScreenerFilters) =>
      fetchAPI<any>('/api/screener/saved', { method: 'POST', body: JSON.stringify({ name, filters }) }),
  },
  portfolio: {
    summary: () => fetchAPI<PortfolioSummary>('/api/portfolio'),
    trade: (trade: TradeRequest) =>
      fetchAPI<any>('/api/portfolio/trade', { method: 'POST', body: JSON.stringify(trade) }),
    history: () => fetchAPI<TradeHistoryItem[]>('/api/portfolio/trades'),
  },
  watchlist: {
    list: () => fetchAPI<WatchlistItem[]>('/api/watchlist'),
    add: (symbol: string, exchange = 'NSE') =>
      fetchAPI<WatchlistItem>('/api/watchlist/items', {
        method: 'POST', body: JSON.stringify({ symbol, exchange })
      }),
    remove: (itemId: string) =>
      fetchAPI<{ success: boolean; removed: string }>(`/api/watchlist/items/${itemId}`, { method: 'DELETE' }),
  },
  alerts: {
    list: () => fetchAPI<PriceAlert[]>('/api/alerts'),
    create: (alert: CreateAlertRequest) =>
      fetchAPI<PriceAlert>('/api/alerts', { method: 'POST', body: JSON.stringify(alert) }),
    delete: (alertId: string) => fetchAPI<{ success: boolean }>(`/api/alerts/${alertId}`, { method: 'DELETE' }),
  },
  news: {
    feed: (symbol?: string, limit = 20) =>
      fetchAPI<NewsItem[]>(`/api/news/feed?${symbol ? `symbol=${symbol}&` : ''}limit=${limit}`),
  },
  options: {
    chain: (symbol: string, expiry?: string) =>
      fetchAPI<OptionChainResponse>(`/api/options/chain?symbol=${symbol}${expiry ? `&expiry=${expiry}` : ''}`),
  },
  ai: {
    chat: (messages: { role: string; content: string }[], contextSymbol?: string) =>
      fetchAPI<{ answer: string }>('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, context_symbol: contextSymbol })
      }),
  },
};

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
  fetch(`${BASE_URL}/api/ai/analyze/stream`, {
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
