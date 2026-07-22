export interface NavItem {
  route: string
  title: string
  icon: string
  /** 'core' items are always visible; 'pro' items sit behind the group's "More" expander */
  tier?: 'core' | 'pro'
  /** Short description used by the command palette and empty states */
  desc?: string
}
export interface NavGroup {
  category: string
  icon: string
  items: NavItem[]
}

/*
 * Information architecture — grouped by job, ordered by daily use.
 * Markets and Research lead; the assistant is one capability among
 * many, not the product's whole identity. `tier: 'pro'` items sit
 * behind each group's "more" expander.
 */
export const NAV: NavGroup[] = [
  {
    category: 'Markets',
    icon: 'solar:chart-square-linear',
    items: [
      { route: '/market', title: 'Live Markets', icon: 'solar:chart-square-linear', tier: 'core', desc: 'Indices, movers and live prices' },
      { route: '/technical-charts', title: 'Charts', icon: 'solar:chart-2-linear', tier: 'core', desc: 'Full-screen technical charting' },
      { route: '/sectors', title: 'Sectors', icon: 'solar:layers-linear', tier: 'core', desc: 'Sector performance and rotation' },
      { route: '/global-markets', title: 'Global', icon: 'solar:globe-linear', tier: 'core', desc: 'World indices and cross-market view' },
      { route: '/market-breadth', title: 'Breadth', icon: 'solar:chart-pie-linear', tier: 'pro', desc: 'Advance/decline internals' },
    ],
  },
  {
    category: 'Research',
    icon: 'solar:filter-linear',
    items: [
      { route: '/equities-screener', title: 'Screener', icon: 'solar:filter-linear', tier: 'core', desc: 'Filter the market by any metric' },
      { route: '/fundamental-analysis', title: 'Fundamentals', icon: 'solar:document-text-linear', tier: 'core', desc: 'Company financials in depth' },
      { route: '/news-sentiment', title: 'News', icon: 'solar:notebook-linear', tier: 'core', desc: 'Company and market news' },
      { route: '/earnings-transcripts', title: 'Earnings', icon: 'solar:microphone-linear', tier: 'core', desc: 'Transcripts and earnings history' },
      { route: '/financial-ratios', title: 'Ratios', icon: 'solar:calculator-linear', tier: 'pro', desc: 'Ratio deep-dives' },
      { route: '/peer-comparison', title: 'Peers', icon: 'solar:users-group-two-rounded-linear', tier: 'pro', desc: 'Side-by-side comparisons' },
      { route: '/corporate-actions', title: 'Corporate Actions', icon: 'solar:calendar-linear', tier: 'pro', desc: 'Dividends, splits, buybacks' },
      { route: '/esg-scores', title: 'ESG', icon: 'solar:leaf-linear', tier: 'pro', desc: 'Sustainability scores' },
    ],
  },
  {
    category: 'Portfolio',
    icon: 'solar:wallet-money-linear',
    items: [
      { route: '/portfolios', title: 'Portfolios', icon: 'solar:wallet-money-linear', tier: 'core', desc: 'Your holdings, exposure and P&L' },
      { route: '/portfolio-analyzer', title: 'Analyzer', icon: 'solar:pie-chart-2-linear', tier: 'core', desc: 'Portfolio diagnostics' },
      { route: '/paper-trading', title: 'Paper Trading', icon: 'solar:gamepad-linear', tier: 'core', desc: 'Practice with virtual capital' },
      { route: '/risk-calculator', title: 'Risk', icon: 'solar:shield-warning-linear', tier: 'pro', desc: 'Position sizing and risk math' },
    ],
  },
  {
    category: 'Analysis',
    icon: 'solar:chart-square-linear',
    items: [
      { route: '/ai-analyst', title: 'Research Assistant', icon: 'solar:chat-square-linear', tier: 'core', desc: 'Run a multi-model analysis on any company' },
      { route: '/alerts', title: 'Alerts', icon: 'solar:bell-linear', tier: 'core', desc: 'Conditional market alerts' },
      { route: '/analysis', title: 'Saved Reports', icon: 'solar:document-text-linear', tier: 'core', desc: 'Past research output' },
      { route: '/intelligence', title: 'Workspace', icon: 'solar:widget-5-linear', tier: 'pro', desc: 'Saved research workspaces' },
      { route: '/hedge-fund', title: 'Model Committee', icon: 'solar:users-group-two-rounded-linear', tier: 'pro', desc: 'Run the full model committee' },
      { route: '/advisor', title: 'Advisor', icon: 'solar:chat-round-money-linear', tier: 'pro', desc: 'Personal portfolio guidance' },
      { route: '/workflow', title: 'Workflows', icon: 'solar:routing-2-linear', tier: 'pro', desc: 'Chain analyses into repeatable flows' },
    ],
  },
  {
    category: 'Macro',
    icon: 'solar:earth-linear',
    items: [
      { route: '/macro-economics', title: 'Economy', icon: 'solar:earth-linear', tier: 'core', desc: 'GDP, inflation, rates dashboards' },
      { route: '/economic-calendar', title: 'Calendar', icon: 'solar:calendar-date-linear', tier: 'core', desc: 'Upcoming economic events' },
      { route: '/yield-curve', title: 'Yield Curve', icon: 'solar:chart-2-linear', tier: 'pro', desc: 'Rates and curve shape' },
      { route: '/vix-monitor', title: 'VIX & Volatility', icon: 'solar:graph-down-linear', tier: 'pro', desc: 'Fear gauges and vol regime' },
    ],
  },
  {
    category: 'Assets',
    icon: 'solar:box-linear',
    items: [
      { route: '/mutual-funds', title: 'Mutual Funds', icon: 'solar:wallet-linear', tier: 'core', desc: 'Fund explorer and analysis' },
      { route: '/etf-analyzer', title: 'ETFs', icon: 'solar:box-linear', tier: 'core', desc: 'ETF holdings and overlap' },
      { route: '/crypto', title: 'Crypto', icon: 'solar:bitcoin-linear', tier: 'core', desc: 'Digital asset markets' },
      { route: '/ipo-watch', title: 'IPO Watch', icon: 'solar:rocket-linear', tier: 'pro', desc: 'Upcoming and recent listings' },
      { route: '/dividend-tracker', title: 'Dividends', icon: 'solar:money-bag-linear', tier: 'pro', desc: 'Income tracking' },
      { route: '/reit-analyzer', title: 'REITs', icon: 'solar:buildings-linear', tier: 'pro', desc: 'Real-estate trusts' },
      { route: '/fixed-income', title: 'Fixed Income', icon: 'solar:bill-list-linear', tier: 'pro', desc: 'Bonds and debt markets' },
      { route: '/forex', title: 'Forex', icon: 'solar:dollar-linear', tier: 'pro', desc: 'Currency pairs' },
      { route: '/commodities', title: 'Commodities', icon: 'solar:gold-linear', tier: 'pro', desc: 'Metals, energy, agri' },
    ],
  },
  {
    category: 'Professional',
    icon: 'solar:case-round-linear',
    items: [
      { route: '/options-chain', title: 'Options Chain', icon: 'solar:diagram-down-linear', tier: 'core', desc: 'Live option chains' },
      { route: '/backtesting', title: 'Backtesting', icon: 'solar:history-linear', tier: 'core', desc: 'Test strategies on history' },
      { route: '/algo-builder', title: 'Algo Builder', icon: 'solar:code-linear', tier: 'pro', desc: 'Build trading bots' },
      { route: '/option-greeks', title: 'Greeks', icon: 'solar:math-linear', tier: 'pro', desc: 'Options risk surfaces' },
      { route: '/derivatives-heatmap', title: 'Derivatives Heatmap', icon: 'solar:map-arrow-up-linear', tier: 'pro', desc: 'OI and futures heat' },
      { route: '/correlation-matrix', title: 'Correlation', icon: 'solar:scanner-linear', tier: 'pro', desc: 'Cross-asset correlation' },
      { route: '/sector-rotation', title: 'Sector Rotation', icon: 'solar:refresh-circle-linear', tier: 'pro', desc: 'RRG-style rotation view' },
      { route: '/historical-data', title: 'Historical Data', icon: 'solar:server-square-linear', tier: 'pro', desc: 'Raw OHLCV downloads' },
      { route: '/dark-pool', title: 'Dark Pool', icon: 'solar:eye-linear', tier: 'pro', desc: 'Off-exchange block activity' },
      { route: '/insider-trading', title: 'Insider Trading', icon: 'solar:incognito-linear', tier: 'pro', desc: 'Insider buys and sells' },
      { route: '/institutional-holdings', title: 'Institutions', icon: 'solar:banknote-2-linear', tier: 'pro', desc: 'FII/DII and fund positions' },
    ],
  },
]

export const TOP_NAV: NavItem[] = [
  { route: '/market', title: 'Markets', icon: 'solar:chart-square-linear' },
  { route: '/equities-screener', title: 'Screener', icon: 'solar:filter-linear' },
  { route: '/fundamental-analysis', title: 'Research', icon: 'solar:document-text-linear' },
  { route: '/portfolios', title: 'Portfolio', icon: 'solar:wallet-money-linear' },
  { route: '/pricing', title: 'Pricing', icon: 'solar:tag-price-linear' },
]

export const ALL_ROUTES = NAV.flatMap((g) => g.items)

/** Extra destinations reachable via command palette but not in the sidebar */
export const PALETTE_EXTRAS: NavItem[] = [
  { route: '/', title: 'Home', icon: 'solar:home-2-linear', desc: 'FinfreeX home' },
  { route: '/dashboard', title: 'Dashboard', icon: 'solar:widget-5-linear', desc: 'Market overview dashboard' },
  { route: '/pricing', title: 'Pricing', icon: 'solar:tag-price-linear', desc: 'Plans and pricing' },
  { route: '/docs', title: 'Docs', icon: 'solar:book-2-linear', desc: 'Documentation' },
  { route: '/visualization', title: 'Visualization', icon: 'solar:graph-new-linear', desc: '3D market visualization' },
]
