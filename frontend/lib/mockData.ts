/* ============================================================
   FinfreeX — Mock Data Layer
   Deterministic, realistic financial data generators.
   Seeded so values are stable across renders (SSR-safe) but
   look live. No hardcoded one-off values scattered in pages.
   ============================================================ */

/* ---------- Seeded RNG ---------- */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function rng(seed: string) {
  return mulberry32(hashStr(seed))
}

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)]
}
function range(r: () => number, min: number, max: number, decimals = 2) {
  const v = min + r() * (max - min)
  const p = Math.pow(10, decimals)
  return Math.round(v * p) / p
}

/* ---------- Types ---------- */
export interface MockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  volume: number
  marketCap: number
  sector: string
  high: number
  low: number
  open: number
  prevClose: number
}

export interface MockIndex {
  name: string
  symbol: string
  value: number
  change: number
  changePct: number
  region: string
}

export interface Candle {
  time: number
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/* ---------- Universe ---------- */
const COMPANIES: { symbol: string; name: string; sector: string; base: number }[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', base: 2870 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Technology', base: 3920 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Financials', base: 1685 },
  { symbol: 'INFY', name: 'Infosys', sector: 'Technology', base: 1560 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Financials', base: 1140 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'Consumer Staples', base: 2450 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Communication', base: 1490 },
  { symbol: 'ITC', name: 'ITC Ltd', sector: 'Consumer Staples', base: 445 },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Financials', base: 820 },
  { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Industrials', base: 3560 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Financials', base: 1760 },
  { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Financials', base: 1180 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Materials', base: 2890 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Consumer Disc.', base: 12800 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Healthcare', base: 1720 },
  { symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer Disc.', base: 3380 },
  { symbol: 'WIPRO', name: 'Wipro', sector: 'Technology', base: 545 },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', sector: 'Materials', base: 11200 },
  { symbol: 'NESTLEIND', name: 'Nestlé India', sector: 'Consumer Staples', base: 2510 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Financials', base: 7150 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Consumer Disc.', base: 985 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Industrials', base: 3120 },
  { symbol: 'POWERGRID', name: 'Power Grid Corp', sector: 'Utilities', base: 328 },
  { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Utilities', base: 415 },
  { symbol: 'JSWSTEEL', name: 'JSW Steel', sector: 'Materials', base: 920 },
  { symbol: 'TATASTEEL', name: 'Tata Steel', sector: 'Materials', base: 168 },
  { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'Technology', base: 1810 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', sector: 'Consumer Disc.', base: 2940 },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Labs", sector: 'Healthcare', base: 1290 },
  { symbol: 'CIPLA', name: 'Cipla', sector: 'Healthcare', base: 1560 },
]

export const SECTORS = [
  'Technology', 'Financials', 'Energy', 'Healthcare', 'Consumer Disc.',
  'Consumer Staples', 'Industrials', 'Materials', 'Utilities', 'Communication',
]

/* ---------- Quotes ---------- */
export function getQuote(symbol: string): MockQuote {
  const c = COMPANIES.find((x) => x.symbol === symbol) ?? COMPANIES[0]
  const r = rng('quote-' + symbol)
  const changePct = range(r, -3.4, 3.6, 2)
  const price = Math.round(c.base * (1 + changePct / 100) * 100) / 100
  const change = Math.round((price - c.base) * 100) / 100
  return {
    symbol: c.symbol,
    name: c.name,
    sector: c.sector,
    price,
    change,
    changePct,
    prevClose: c.base,
    open: Math.round(c.base * (1 + range(r, -0.6, 0.6) / 100) * 100) / 100,
    high: Math.round(price * (1 + range(r, 0.1, 1.2) / 100) * 100) / 100,
    low: Math.round(price * (1 - range(r, 0.1, 1.2) / 100) * 100) / 100,
    volume: Math.round(range(r, 0.4, 9.5, 2) * 1_000_000),
    marketCap: Math.round(c.base * range(r, 1.2, 8.5) * 1_000_000_00),
  }
}

export function getAllQuotes(): MockQuote[] {
  return COMPANIES.map((c) => getQuote(c.symbol))
}

export function getTopMovers(): { gainers: MockQuote[]; losers: MockQuote[] } {
  const all = getAllQuotes().sort((a, b) => b.changePct - a.changePct)
  return { gainers: all.slice(0, 6), losers: all.slice(-6).reverse() }
}

/* ---------- Indices ---------- */
const INDEX_DEFS: { name: string; symbol: string; base: number; region: string }[] = [
  { name: 'NIFTY 50', symbol: 'NIFTY', base: 24680, region: 'India' },
  { name: 'SENSEX', symbol: 'BSE', base: 81340, region: 'India' },
  { name: 'NIFTY BANK', symbol: 'BANKNIFTY', base: 52180, region: 'India' },
  { name: 'S&P 500', symbol: 'SPX', base: 5860, region: 'US' },
  { name: 'NASDAQ', symbol: 'IXIC', base: 18620, region: 'US' },
  { name: 'DOW JONES', symbol: 'DJI', base: 42450, region: 'US' },
  { name: 'FTSE 100', symbol: 'FTSE', base: 8280, region: 'Europe' },
  { name: 'NIKKEI 225', symbol: 'N225', base: 39120, region: 'Asia' },
  { name: 'HANG SENG', symbol: 'HSI', base: 19840, region: 'Asia' },
  { name: 'DAX', symbol: 'DAX', base: 19210, region: 'Europe' },
]

export function getIndices(): MockIndex[] {
  return INDEX_DEFS.map((d) => {
    const r = rng('idx-' + d.symbol)
    const changePct = range(r, -1.6, 1.9, 2)
    const value = Math.round(d.base * (1 + changePct / 100) * 100) / 100
    return {
      name: d.name,
      symbol: d.symbol,
      region: d.region,
      value,
      change: Math.round((value - d.base) * 100) / 100,
      changePct,
    }
  })
}

/* ---------- OHLCV candles ---------- */
export function getCandles(symbol: string, count = 90): Candle[] {
  const q = getQuote(symbol)
  const r = rng('candles-' + symbol)
  let price = q.price * 0.82
  const candles: Candle[] = []
  const now = Date.now()
  for (let i = count; i >= 0; i--) {
    const drift = (q.price - price) * 0.03
    const vol = price * range(r, 0.008, 0.03)
    const open = price
    const close = Math.max(1, open + drift + (r() - 0.5) * vol * 2)
    const high = Math.max(open, close) + r() * vol
    const low = Math.min(open, close) - r() * vol
    candles.push({
      time: Math.floor((now - i * 86400000) / 1000),
      date: new Date(now - i * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +Math.max(1, low).toFixed(2),
      close: +close.toFixed(2),
      volume: Math.round(range(r, 0.3, 6, 2) * 1_000_000),
    })
    price = close
  }
  return candles
}

export function getSparkline(seed: string, points = 24): number[] {
  const r = rng('spark-' + seed)
  let v = 50
  const out: number[] = []
  for (let i = 0; i < points; i++) {
    v = Math.max(5, Math.min(95, v + (r() - 0.48) * 14))
    out.push(+v.toFixed(2))
  }
  return out
}

/* ---------- Sectors ---------- */
export function getSectorPerformance() {
  return SECTORS.map((s) => {
    const r = rng('sector-' + s)
    return {
      name: s,
      changePct: range(r, -2.8, 3.4, 2),
      marketCap: Math.round(range(r, 4, 42) * 1e12),
      pe: range(r, 12, 38, 1),
      momentum: range(r, -100, 100, 0),
      leaders: COMPANIES.filter((c) => c.sector === s).slice(0, 3).map((c) => c.symbol),
    }
  }).sort((a, b) => b.changePct - a.changePct)
}

/* ---------- Options chain ---------- */
export function getOptionChain(symbol = 'NIFTY') {
  const spot = symbol === 'NIFTY' ? 24680 : getQuote(symbol).price
  const step = symbol === 'NIFTY' ? 50 : Math.max(10, Math.round(spot / 100) * 5)
  const atm = Math.round(spot / step) * step
  const rows = []
  for (let i = -8; i <= 8; i++) {
    const strike = atm + i * step
    const r = rng(`opt-${symbol}-${strike}`)
    const moneyness = (spot - strike) / spot
    const callLtp = Math.max(0.5, spot * 0.04 * Math.exp(moneyness * 6) + range(r, -8, 8))
    const putLtp = Math.max(0.5, spot * 0.04 * Math.exp(-moneyness * 6) + range(r, -8, 8))
    rows.push({
      strike,
      call: {
        ltp: +callLtp.toFixed(2),
        changePct: range(r, -18, 22, 1),
        oi: Math.round(range(r, 5, 180) * 1000),
        volume: Math.round(range(r, 1, 90) * 1000),
        iv: range(r, 11, 34, 1),
        delta: +Math.max(0.02, Math.min(0.98, 0.5 + moneyness * 4)).toFixed(2),
      },
      put: {
        ltp: +putLtp.toFixed(2),
        changePct: range(r, -22, 18, 1),
        oi: Math.round(range(r, 5, 180) * 1000),
        volume: Math.round(range(r, 1, 90) * 1000),
        iv: range(r, 11, 34, 1),
        delta: +Math.max(-0.98, Math.min(-0.02, -0.5 + moneyness * 4)).toFixed(2),
      },
      isATM: strike === atm,
    })
  }
  return { symbol, spot, atm, expiry: '28 Aug 2026', rows }
}

/* ---------- Portfolio ---------- */
export function getPortfolio() {
  const holdings = COMPANIES.slice(0, 8).map((c, i) => {
    const q = getQuote(c.symbol)
    const r = rng('pf-' + c.symbol)
    const qty = Math.round(range(r, 5, 120, 0))
    const avg = +(q.price * (1 - range(r, -0.18, 0.22))).toFixed(2)
    const value = +(qty * q.price).toFixed(2)
    const cost = +(qty * avg).toFixed(2)
    return {
      symbol: c.symbol, name: c.name, sector: c.sector,
      qty, avg, price: q.price, value, cost,
      pnl: +(value - cost).toFixed(2),
      pnlPct: +(((value - cost) / cost) * 100).toFixed(2),
      weight: 0,
    }
  })
  const totalValue = holdings.reduce((s, h) => s + h.value, 0)
  const totalCost = holdings.reduce((s, h) => s + h.cost, 0)
  holdings.forEach((h) => (h.weight = +((h.value / totalValue) * 100).toFixed(1)))
  const cash = 128450
  return {
    holdings,
    cash,
    totalValue: +(totalValue + cash).toFixed(2),
    investedValue: +totalValue.toFixed(2),
    totalCost: +totalCost.toFixed(2),
    totalPnl: +(totalValue - totalCost).toFixed(2),
    totalPnlPct: +(((totalValue - totalCost) / totalCost) * 100).toFixed(2),
    dayChange: +range(rng('pf-day'), -2.4, 2.8, 2),
  }
}

/* ---------- News & sentiment ---------- */
const HEADLINES = [
  { t: 'RBI holds repo rate steady, signals data-dependent stance', s: 'Reuters', cat: 'Macro' },
  { t: 'IT majors rally as US client budgets show recovery', s: 'Bloomberg', cat: 'Technology' },
  { t: 'Auto sales hit record festive-season high across segments', s: 'ET Markets', cat: 'Autos' },
  { t: 'FIIs turn net buyers after three weeks of outflows', s: 'Mint', cat: 'Flows' },
  { t: 'Crude slips below $78 as demand outlook softens', s: 'CNBC', cat: 'Commodities' },
  { t: 'Banking sector NPAs at decade low, credit growth robust', s: 'Business Standard', cat: 'Financials' },
  { t: 'Pharma exports climb on strong US generic demand', s: 'Reuters', cat: 'Healthcare' },
  { t: 'Rupee steadies near 83.2 as dollar index eases', s: 'Bloomberg', cat: 'Forex' },
  { t: 'Renewables capex surge lifts power utility outlook', s: 'ET Energy', cat: 'Utilities' },
  { t: 'Q2 earnings beat estimates for 62% of Nifty constituents', s: 'Mint', cat: 'Earnings' },
]

export function getNews(limit = 10) {
  return HEADLINES.slice(0, limit).map((h, i) => {
    const r = rng('news-' + i)
    const sent = range(r, -1, 1, 2)
    return {
      title: h.t,
      source: h.s,
      category: h.cat,
      sentiment: sent,
      sentimentLabel: sent > 0.25 ? 'Bullish' : sent < -0.25 ? 'Bearish' : 'Neutral',
      time: `${Math.round(range(r, 1, 11, 0))}h ago`,
    }
  })
}

/* ---------- Economic calendar ---------- */
export function getEconEvents() {
  const events = [
    { event: 'RBI Monetary Policy Decision', country: 'IN', impact: 'HIGH', forecast: '6.50%', prior: '6.50%' },
    { event: 'US CPI (YoY)', country: 'US', impact: 'HIGH', forecast: '2.9%', prior: '3.1%' },
    { event: 'India WPI Inflation', country: 'IN', impact: 'MEDIUM', forecast: '2.1%', prior: '1.8%' },
    { event: 'US Non-Farm Payrolls', country: 'US', impact: 'HIGH', forecast: '185K', prior: '206K' },
    { event: 'ECB Rate Decision', country: 'EU', impact: 'HIGH', forecast: '3.25%', prior: '3.50%' },
    { event: 'India IIP', country: 'IN', impact: 'MEDIUM', forecast: '4.2%', prior: '3.9%' },
    { event: 'China GDP (YoY)', country: 'CN', impact: 'HIGH', forecast: '4.8%', prior: '5.0%' },
    { event: 'US Retail Sales', country: 'US', impact: 'MEDIUM', forecast: '0.3%', prior: '0.4%' },
  ]
  return events.map((e, i) => ({ ...e, date: `${8 + i} Aug`, time: `${9 + (i % 8)}:30` }))
}

/* ---------- Generic tabular dataset builder (for feature pages) ---------- */
export function buildTable<T extends Record<string, any>>(
  seed: string,
  count: number,
  factory: (r: () => number, i: number) => T
): T[] {
  const r = rng(seed)
  return Array.from({ length: count }, (_, i) => factory(r, i))
}

export { range as mockRange, pick as mockPick }

/* ---------- Crypto ---------- */
export function getCrypto() {
  const defs = [
    { symbol: 'BTC', name: 'Bitcoin', base: 68420 },
    { symbol: 'ETH', name: 'Ethereum', base: 3540 },
    { symbol: 'BNB', name: 'BNB', base: 592 },
    { symbol: 'SOL', name: 'Solana', base: 168 },
    { symbol: 'XRP', name: 'XRP', base: 0.58 },
    { symbol: 'ADA', name: 'Cardano', base: 0.44 },
    { symbol: 'AVAX', name: 'Avalanche', base: 34.2 },
    { symbol: 'DOGE', name: 'Dogecoin', base: 0.14 },
    { symbol: 'DOT', name: 'Polkadot', base: 6.8 },
    { symbol: 'MATIC', name: 'Polygon', base: 0.71 },
  ]
  return defs.map((d) => {
    const r = rng('crypto-' + d.symbol)
    const changePct = range(r, -7, 8, 2)
    const price = +(d.base * (1 + changePct / 100)).toFixed(d.base < 1 ? 4 : 2)
    return {
      symbol: d.symbol, name: d.name, price, changePct,
      marketCap: Math.round(d.base * range(r, 8, 380) * 1e6),
      volume: Math.round(range(r, 0.5, 40) * 1e9),
    }
  })
}

/* ---------- Forex ---------- */
export function getForex() {
  const pairs = [
    { pair: 'USD/INR', base: 83.24 }, { pair: 'EUR/USD', base: 1.086 },
    { pair: 'GBP/USD', base: 1.271 }, { pair: 'USD/JPY', base: 149.6 },
    { pair: 'USD/CNY', base: 7.12 }, { pair: 'AUD/USD', base: 0.664 },
    { pair: 'USD/CAD', base: 1.362 }, { pair: 'EUR/INR', base: 90.4 },
    { pair: 'GBP/INR', base: 105.8 }, { pair: 'USD/CHF', base: 0.882 },
  ]
  return pairs.map((p) => {
    const r = rng('fx-' + p.pair)
    const changePct = range(r, -0.9, 0.9, 2)
    return {
      pair: p.pair,
      rate: +(p.base * (1 + changePct / 100)).toFixed(4),
      changePct,
      high: +(p.base * 1.004).toFixed(4),
      low: +(p.base * 0.996).toFixed(4),
    }
  })
}

/* ---------- Commodities ---------- */
export function getCommodities() {
  const defs = [
    { name: 'Gold', symbol: 'XAU', base: 2384, unit: '/oz' },
    { name: 'Silver', symbol: 'XAG', base: 28.4, unit: '/oz' },
    { name: 'Crude Oil (WTI)', symbol: 'CL', base: 78.2, unit: '/bbl' },
    { name: 'Brent Crude', symbol: 'BRN', base: 82.6, unit: '/bbl' },
    { name: 'Natural Gas', symbol: 'NG', base: 2.34, unit: '/MMBtu' },
    { name: 'Copper', symbol: 'HG', base: 4.28, unit: '/lb' },
    { name: 'Aluminium', symbol: 'ALI', base: 2456, unit: '/t' },
    { name: 'Zinc', symbol: 'ZN', base: 2812, unit: '/t' },
  ]
  return defs.map((d) => {
    const r = rng('cmdty-' + d.symbol)
    const changePct = range(r, -2.6, 2.8, 2)
    return {
      name: d.name, symbol: d.symbol, unit: d.unit,
      price: +(d.base * (1 + changePct / 100)).toFixed(2),
      changePct,
    }
  })
}
