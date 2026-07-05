/* ============================================================
   FinfreeX — Feature data generators (deterministic mock)
   Powers the specialized feature pages. No hardcoded scatter.
   ============================================================ */
import { rng, mockRange as range, getAllQuotes, SECTORS, getSparkline } from './mockData'

const COMPANIES = getAllQuotes()

/* ---------- Mutual Funds ---------- */
export function getMutualFunds() {
  const names = [
    ['Axis Bluechip Fund', 'Large Cap'], ['Mirae Asset Emerging', 'Mid Cap'],
    ['SBI Small Cap Fund', 'Small Cap'], ['Parag Parikh Flexi Cap', 'Flexi Cap'],
    ['HDFC Balanced Advantage', 'Hybrid'], ['ICICI Pru Technology', 'Sectoral'],
    ['Nippon India Growth', 'Mid Cap'], ['Kotak Emerging Equity', 'Mid Cap'],
    ['UTI Nifty Index Fund', 'Index'], ['Quant Active Fund', 'Multi Cap'],
    ['Canara Robeco Bluechip', 'Large Cap'], ['Motilal Oswal Midcap', 'Mid Cap'],
  ]
  return names.map(([name, cat], i) => {
    const r = rng('mf-' + name)
    return {
      name, category: cat,
      nav: range(r, 42, 890, 2),
      cagr1y: range(r, -6, 38, 1),
      cagr3y: range(r, 8, 28, 1),
      cagr5y: range(r, 10, 24, 1),
      aum: Math.round(range(r, 500, 42000)),
      expense: range(r, 0.3, 2.1, 2),
      rating: Math.max(1, Math.round(range(r, 2, 5))),
      risk: ['Low', 'Moderate', 'High', 'Very High'][Math.floor(range(r, 0, 3.9))],
    }
  })
}

/* ---------- ETFs ---------- */
export function getETFs() {
  const defs = [
    ['NIFTYBEES', 'Nippon Nifty 50 ETF', 'Equity'], ['BANKBEES', 'Nippon Bank ETF', 'Sectoral'],
    ['GOLDBEES', 'Nippon Gold ETF', 'Commodity'], ['JUNIORBEES', 'Nippon Nifty Next 50', 'Equity'],
    ['ITBEES', 'Nippon IT ETF', 'Sectoral'], ['SILVERBEES', 'Nippon Silver ETF', 'Commodity'],
    ['MON100', 'Motilal Nasdaq 100', 'International'], ['LIQUIDBEES', 'Nippon Liquid ETF', 'Debt'],
    ['PSUBNKBEES', 'Nippon PSU Bank ETF', 'Sectoral'], ['CPSEETF', 'CPSE ETF', 'Thematic'],
  ]
  return defs.map(([sym, name, cat]) => {
    const r = rng('etf-' + sym)
    const changePct = range(r, -2.4, 2.8, 2)
    return {
      symbol: sym, name, category: cat,
      price: range(r, 45, 720, 2), changePct,
      aum: Math.round(range(r, 200, 18000)),
      expense: range(r, 0.05, 0.6, 2),
      trackingError: range(r, 0.02, 0.4, 2),
      volume: Math.round(range(r, 0.1, 8) * 1e6),
    }
  })
}

/* ---------- REITs ---------- */
export function getREITs() {
  const defs = ['Embassy Office Parks', 'Mindspace Business Parks', 'Brookfield India', 'Nexus Select Trust']
  return defs.map((name) => {
    const r = rng('reit-' + name)
    return {
      name,
      price: range(r, 120, 420, 2),
      changePct: range(r, -1.8, 2.2, 2),
      yield: range(r, 5.2, 8.4, 2),
      occupancy: range(r, 82, 97, 1),
      noi: Math.round(range(r, 400, 2400)),
      navPremium: range(r, -12, 8, 1),
    }
  })
}

/* ---------- Fixed Income / Bonds ---------- */
export function getBonds() {
  const defs = [
    ['10Y G-Sec', 'Government'], ['5Y G-Sec', 'Government'], ['30Y G-Sec', 'Government'],
    ['AAA Corporate 5Y', 'Corporate'], ['AA+ Corporate 3Y', 'Corporate'],
    ['State Dev Loan 10Y', 'SDL'], ['T-Bill 91D', 'Treasury'], ['T-Bill 364D', 'Treasury'],
  ]
  return defs.map(([name, type]) => {
    const r = rng('bond-' + name)
    return {
      name, type,
      yield: range(r, 5.8, 8.6, 2),
      change: range(r, -0.12, 0.14, 2),
      price: range(r, 94, 104, 2),
      duration: range(r, 0.25, 12, 1),
    }
  })
}

/* ---------- Yield curve ---------- */
export function getYieldCurve() {
  const tenors = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '30Y']
  return tenors.map((t, i) => {
    const r = rng('yc-' + t)
    return { tenor: t, yield: +(6.1 + i * 0.22 + range(r, -0.2, 0.2)).toFixed(2) }
  })
}

/* ---------- VIX / volatility ---------- */
export function getVolatility() {
  return {
    vix: range(rng('vix'), 11, 22, 2),
    change: range(rng('vixc'), -8, 9, 2),
    history: getSparkline('vix-hist', 40).map((v) => +(10 + v / 6).toFixed(2)),
    regime: 'Low volatility',
  }
}

/* ---------- Market breadth ---------- */
export function getBreadth() {
  const r = rng('breadth')
  const adv = Math.round(range(r, 800, 1600))
  const dec = Math.round(range(r, 500, 1400))
  const unch = Math.round(range(r, 50, 200))
  return {
    advances: adv, declines: dec, unchanged: unch,
    advDecRatio: +(adv / dec).toFixed(2),
    newHighs: Math.round(range(r, 20, 180)),
    newLows: Math.round(range(r, 5, 90)),
    aboveMA50: range(r, 32, 78, 0),
    aboveMA200: range(r, 40, 72, 0),
  }
}

/* ---------- Insider trading ---------- */
export function getInsiderTrades() {
  return COMPANIES.slice(0, 12).map((c, i) => {
    const r = rng('insider-' + c.symbol)
    const buy = r() > 0.45
    return {
      symbol: c.symbol, name: c.name,
      insider: ['Promoter', 'CEO', 'CFO', 'Director', 'Bulk Deal'][Math.floor(range(r, 0, 4.9))],
      type: buy ? 'BUY' : 'SELL',
      shares: Math.round(range(r, 5, 500) * 1000),
      value: Math.round(range(r, 0.5, 48) * 1e7),
      date: `${1 + (i % 27)} Aug`,
    }
  })
}

/* ---------- Institutional holdings ---------- */
export function getInstitutional() {
  return COMPANIES.slice(0, 12).map((c) => {
    const r = rng('inst-' + c.symbol)
    return {
      symbol: c.symbol, name: c.name,
      fii: range(r, 8, 42, 1),
      dii: range(r, 6, 32, 1),
      promoter: range(r, 28, 68, 1),
      public: range(r, 8, 26, 1),
      fiiChange: range(r, -3, 3.4, 2),
    }
  })
}

/* ---------- Dark pool ---------- */
export function getDarkPool() {
  return COMPANIES.slice(0, 10).map((c) => {
    const r = rng('dp-' + c.symbol)
    return {
      symbol: c.symbol, name: c.name,
      darkVolume: Math.round(range(r, 0.5, 12) * 1e6),
      darkPct: range(r, 12, 48, 1),
      sentiment: range(r, -1, 1, 2),
      blockTrades: Math.round(range(r, 3, 42)),
    }
  })
}

/* ---------- ESG scores ---------- */
export function getESG() {
  return COMPANIES.slice(0, 12).map((c) => {
    const r = rng('esg-' + c.symbol)
    const e = range(r, 40, 92, 0), s = range(r, 42, 90, 0), g = range(r, 50, 95, 0)
    return {
      symbol: c.symbol, name: c.name, sector: c.sector,
      environmental: e, social: s, governance: g,
      total: Math.round((e + s + g) / 3),
      rating: ['CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA'][Math.min(6, Math.floor(((e + s + g) / 3 - 40) / 8))],
    }
  })
}

/* ---------- IPOs ---------- */
export function getIPOs() {
  const names = ['Zentar Technologies', 'Aurora Renewables', 'MediCore Labs', 'FinNext Capital', 'AgriGrow Foods', 'CloudSpan Systems']
  return names.map((name, i) => {
    const r = rng('ipo-' + name)
    const status = ['Open', 'Upcoming', 'Listed', 'Open', 'Upcoming', 'Listed'][i]
    return {
      name, status,
      priceBand: `₹${Math.round(range(r, 80, 400))} - ${Math.round(range(r, 400, 900))}`,
      size: Math.round(range(r, 200, 4200)),
      subscription: status === 'Listed' || status === 'Open' ? range(r, 1.2, 82, 1) : 0,
      gmp: Math.round(range(r, -20, 180)),
      date: `${5 + i * 3} Aug`,
    }
  })
}

/* ---------- Dividends ---------- */
export function getDividends() {
  return COMPANIES.slice(0, 12).map((c, i) => {
    const r = rng('div-' + c.symbol)
    return {
      symbol: c.symbol, name: c.name,
      yield: range(r, 0.4, 6.8, 2),
      amount: Math.round(range(r, 2, 60)),
      payout: range(r, 12, 82, 0),
      exDate: `${2 + (i % 26)} Sep`,
      type: ['Final', 'Interim', 'Special'][Math.floor(range(r, 0, 2.9))],
    }
  })
}

/* ---------- Corporate actions ---------- */
export function getCorpActions() {
  const types = ['Dividend', 'Bonus', 'Split', 'Buyback', 'Rights']
  return COMPANIES.slice(0, 10).map((c, i) => {
    const r = rng('ca-' + c.symbol)
    return {
      symbol: c.symbol, name: c.name,
      action: types[Math.floor(range(r, 0, 4.9))],
      detail: ['₹12/share', '1:1', '5:1', '₹520 buyback', '2:9 @ ₹340'][Math.floor(range(r, 0, 4.9))],
      recordDate: `${3 + (i % 25)} Sep`,
    }
  })
}

/* ---------- Financial ratios ---------- */
export function getRatios(symbol?: string) {
  const list = symbol ? COMPANIES.filter((c) => c.symbol === symbol) : COMPANIES.slice(0, 12)
  return list.map((c) => {
    const r = rng('ratio-' + c.symbol)
    return {
      symbol: c.symbol, name: c.name, sector: c.sector,
      pe: range(r, 10, 62, 1), pb: range(r, 0.8, 14, 1),
      roe: range(r, 6, 34, 1), roce: range(r, 8, 38, 1),
      debtEquity: range(r, 0, 2.4, 2), currentRatio: range(r, 0.8, 3.4, 2),
      netMargin: range(r, 4, 32, 1), evEbitda: range(r, 6, 34, 1),
    }
  })
}

/* ---------- Peer comparison ---------- */
export function getPeers(sector = 'Technology') {
  return COMPANIES.filter((c) => c.sector === sector).slice(0, 6).map((c) => {
    const r = rng('peer-' + c.symbol)
    return {
      symbol: c.symbol, name: c.name,
      marketCap: Math.round(range(r, 1, 18) * 1e12),
      pe: range(r, 12, 44, 1), roe: range(r, 8, 32, 1),
      revenue: Math.round(range(r, 20, 380) * 1e9),
      growth: range(r, -4, 26, 1),
    }
  })
}

/* ---------- Earnings transcripts ---------- */
export function getEarnings() {
  return COMPANIES.slice(0, 8).map((c, i) => {
    const r = rng('earn-' + c.symbol)
    const beat = r() > 0.4
    return {
      symbol: c.symbol, name: c.name,
      quarter: 'Q2 FY26', date: `${4 + i * 2} Aug`,
      epsEst: range(r, 8, 120, 2), epsActual: range(r, 8, 130, 2),
      revYoY: range(r, -6, 28, 1),
      result: beat ? 'Beat' : 'Miss',
      sentiment: range(r, -1, 1, 2),
    }
  })
}

/* ---------- Risk metrics ---------- */
export function getRiskMetrics() {
  const r = rng('risk')
  return {
    var95: range(r, 1.8, 4.6, 2),
    var99: range(r, 3.2, 7.8, 2),
    beta: range(r, 0.7, 1.4, 2),
    sharpe: range(r, 0.6, 2.4, 2),
    sortino: range(r, 0.8, 3.1, 2),
    maxDrawdown: range(r, 8, 32, 1),
    volatility: range(r, 10, 26, 1),
    alpha: range(r, -2, 6, 2),
  }
}

/* ---------- Correlation matrix ---------- */
export function getCorrelation() {
  const assets = ['NIFTY', 'GOLD', 'USD/INR', 'CRUDE', 'BTC', 'BONDS']
  const matrix = assets.map((a, i) =>
    assets.map((b, j) => {
      if (i === j) return 1
      const r = rng(`corr-${[a, b].sort().join('-')}`)
      return +range(r, -0.85, 0.9, 2).toFixed(2)
    })
  )
  return { assets, matrix }
}

/* ---------- Sector rotation ---------- */
export function getRotation() {
  const phases = ['Leading', 'Weakening', 'Lagging', 'Improving']
  return SECTORS.map((s) => {
    const r = rng('rot-' + s)
    return {
      sector: s,
      rs: range(r, 88, 112, 1),
      momentum: range(r, -8, 8, 1),
      phase: phases[Math.floor(range(r, 0, 3.9))],
    }
  })
}

/* ---------- Option greeks ---------- */
export function getGreeksTable(symbol = 'NIFTY') {
  const strikes = [24400, 24500, 24600, 24700, 24800, 24900, 25000]
  return strikes.map((strike) => {
    const r = rng(`greek-${symbol}-${strike}`)
    return {
      strike,
      delta: range(r, -0.9, 0.9, 2),
      gamma: range(r, 0.001, 0.02, 4),
      theta: range(r, -18, -2, 2),
      vega: range(r, 4, 22, 2),
      rho: range(r, -6, 6, 2),
      iv: range(r, 11, 32, 1),
    }
  })
}

/* ---------- Derivatives heatmap ---------- */
export function getDerivHeatmap() {
  return COMPANIES.slice(0, 12).map((c) => {
    const r = rng('deriv-' + c.symbol)
    return {
      symbol: c.symbol,
      oiChange: range(r, -28, 32, 1),
      priceChange: range(r, -6, 7, 2),
      pcr: range(r, 0.5, 1.8, 2),
      buildup: ['Long Buildup', 'Short Buildup', 'Long Unwinding', 'Short Covering'][Math.floor(range(r, 0, 3.9))],
    }
  })
}

/* ---------- Macro indicators ---------- */
export function getMacro() {
  const defs = [
    ['GDP Growth', '6.8%', 0.4], ['CPI Inflation', '4.9%', -0.2], ['Repo Rate', '6.50%', 0],
    ['Fiscal Deficit', '5.1%', -0.3], ['Forex Reserves', '$648B', 1.2], ['IIP Growth', '4.2%', 0.6],
    ['Unemployment', '7.1%', -0.4], ['Trade Deficit', '$21.8B', -0.8], ['PMI Manufacturing', '57.5', 0.9],
  ]
  return defs.map(([name, value, chg]) => ({ name: name as string, value: value as string, change: chg as number }))
}

/* ---------- Screener ---------- */
export function getScreener() {
  return COMPANIES.map((c) => {
    const r = rng('scr-' + c.symbol)
    return {
      symbol: c.symbol, name: c.name, sector: c.sector,
      price: c.price, changePct: c.changePct,
      pe: range(r, 10, 60, 1), marketCap: c.marketCap,
      roe: range(r, 6, 34, 1), rsi: range(r, 22, 82, 0),
      volume: c.volume,
    }
  })
}

/* ---------- Price Alerts ---------- */
export interface Alert {
  id: string
  symbol: string
  condition: 'above' | 'below'
  target: number
  current: number
  status: 'active' | 'triggered' | 'paused'
  created: string
}

export function getAlerts(): Alert[] {
  const seed: { symbol: string; condition: 'above' | 'below'; target: number; status: Alert['status']; created: string }[] = [
    { symbol: 'RELIANCE', condition: 'above', target: 2600, status: 'active', created: '2d ago' },
    { symbol: 'TCS', condition: 'below', target: 3800, status: 'active', created: '4d ago' },
    { symbol: 'HDFCBANK', condition: 'above', target: 1750, status: 'triggered', created: '1w ago' },
    { symbol: 'INFY', condition: 'below', target: 1450, status: 'active', created: '5h ago' },
    { symbol: 'ICICIBANK', condition: 'above', target: 1200, status: 'paused', created: '3w ago' },
  ]
  return seed.map((s, i) => {
    const r = rng('alert-' + s.symbol)
    const drift = s.condition === 'above' ? 0.96 : 1.05
    return {
      id: `a-${i}`,
      symbol: s.symbol,
      condition: s.condition,
      target: s.target,
      current: +(s.target * drift * (1 + range(r, -0.01, 0.01))).toFixed(2),
      status: s.status,
      created: s.created,
    }
  })
}

/* ---------- Backtest result ---------- */
export function getBacktest() {
  const equity = getSparkline('backtest', 80).map((v, i) => +(100000 * (1 + i * 0.008) * (1 + v / 400)).toFixed(0))
  const r = rng('bt')
  return {
    equity,
    totalReturn: range(r, 18, 84, 1),
    cagr: range(r, 12, 32, 1),
    sharpe: range(r, 0.8, 2.6, 2),
    maxDD: range(r, 8, 26, 1),
    winRate: range(r, 42, 68, 1),
    trades: Math.round(range(r, 80, 420)),
    profitFactor: range(r, 1.1, 2.8, 2),
  }
}
