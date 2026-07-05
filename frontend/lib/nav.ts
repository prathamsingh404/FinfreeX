export interface NavItem { route: string; title: string; icon: string }
export interface NavGroup { category: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    category: 'Core Intelligence',
    items: [
      { route: '/', title: 'Home', icon: 'solar:home-2-linear' },
      { route: '/dashboard', title: 'Dashboard', icon: 'solar:widget-5-linear' },
      { route: '/ai-analyst', title: 'AI Analyst', icon: 'solar:magic-stick-3-linear' },
      { route: '/intelligence', title: 'Intelligence', icon: 'solar:cpu-bolt-linear' },
      { route: '/portfolio-analyzer', title: 'Portfolio Analyzer', icon: 'solar:pie-chart-2-linear' },
      { route: '/portfolios', title: 'Portfolios', icon: 'solar:wallet-money-linear' },
    ],
  },
  {
    category: 'Market & Economics',
    items: [
      { route: '/market', title: 'Live Market', icon: 'solar:chart-square-linear' },
      { route: '/global-markets', title: 'Global Markets', icon: 'solar:globe-linear' },
      { route: '/macro-economics', title: 'Macro Economics', icon: 'solar:earth-linear' },
      { route: '/economic-calendar', title: 'Economic Calendar', icon: 'solar:calendar-date-linear' },
      { route: '/yield-curve', title: 'Yield Curve', icon: 'solar:chart-2-linear' },
      { route: '/vix-monitor', title: 'VIX & Volatility', icon: 'solar:graph-down-linear' },
      { route: '/market-breadth', title: 'Market Breadth', icon: 'solar:chart-pie-linear' },
    ],
  },
  {
    category: 'Equities & Fundamentals',
    items: [
      { route: '/equities-screener', title: 'Equities Screener', icon: 'solar:filter-linear' },
      { route: '/fundamental-analysis', title: 'Fundamental Analysis', icon: 'solar:document-text-linear' },
      { route: '/financial-ratios', title: 'Financial Ratios', icon: 'solar:calculator-linear' },
      { route: '/peer-comparison', title: 'Peer Comparison', icon: 'solar:users-group-two-rounded-linear' },
      { route: '/earnings-transcripts', title: 'Earnings Transcripts', icon: 'solar:microphone-linear' },
      { route: '/corporate-actions', title: 'Corporate Actions', icon: 'solar:calendar-linear' },
      { route: '/sectors', title: 'Sectors', icon: 'solar:layers-linear' },
    ],
  },
  {
    category: 'Advanced Trading',
    items: [
      { route: '/technical-charts', title: 'Technical Charts', icon: 'solar:chart-square-linear' },
      { route: '/algo-builder', title: 'Algo Bot Builder', icon: 'solar:code-linear' },
      { route: '/backtesting', title: 'Backtesting Engine', icon: 'solar:history-linear' },
      { route: '/paper-trading', title: 'Paper Trading', icon: 'solar:gamepad-linear' },
      { route: '/historical-data', title: 'Historical Data', icon: 'solar:server-square-linear' },
    ],
  },
  {
    category: 'Derivatives & Options',
    items: [
      { route: '/options-chain', title: 'Options Chain', icon: 'solar:diagram-down-linear' },
      { route: '/option-greeks', title: 'Option Greeks', icon: 'solar:math-linear' },
      { route: '/derivatives-heatmap', title: 'Derivatives Heatmap', icon: 'solar:map-arrow-up-linear' },
    ],
  },
  {
    category: 'Alternative Data',
    items: [
      { route: '/dark-pool', title: 'Dark Pool Monitor', icon: 'solar:eye-linear' },
      { route: '/institutional-holdings', title: 'Institutional Holdings', icon: 'solar:banknote-2-linear' },
      { route: '/insider-trading', title: 'Insider Trading', icon: 'solar:incognito-linear' },
      { route: '/news-sentiment', title: 'News & Sentiment', icon: 'solar:notebook-linear' },
      { route: '/esg-scores', title: 'ESG Scores', icon: 'solar:leaf-linear' },
      { route: '/alerts', title: 'Alerts', icon: 'solar:bell-linear' },
    ],
  },
  {
    category: 'Assets & Funds',
    items: [
      { route: '/mutual-funds', title: 'Mutual Funds', icon: 'solar:wallet-linear' },
      { route: '/etf-analyzer', title: 'ETF Analyzer', icon: 'solar:box-linear' },
      { route: '/reit-analyzer', title: 'REIT Analyzer', icon: 'solar:buildings-linear' },
      { route: '/fixed-income', title: 'Fixed Income', icon: 'solar:bill-list-linear' },
      { route: '/forex', title: 'Forex', icon: 'solar:dollar-linear' },
      { route: '/commodities', title: 'Commodities', icon: 'solar:gold-linear' },
      { route: '/crypto', title: 'Crypto', icon: 'solar:bitcoin-linear' },
      { route: '/ipo-watch', title: 'IPO Watch', icon: 'solar:rocket-linear' },
      { route: '/dividend-tracker', title: 'Dividend Tracker', icon: 'solar:money-bag-linear' },
    ],
  },
  {
    category: 'Risk & Strategy',
    items: [
      { route: '/risk-calculator', title: 'Risk Calculator', icon: 'solar:shield-warning-linear' },
      { route: '/correlation-matrix', title: 'Correlation Matrix', icon: 'solar:scanner-linear' },
      { route: '/sector-rotation', title: 'Sector Rotation', icon: 'solar:refresh-circle-linear' },
    ],
  },
]

export const TOP_NAV: NavItem[] = [
  { route: '/market', title: 'Markets', icon: 'solar:chart-square-linear' },
  { route: '/portfolios', title: 'Portfolios', icon: 'solar:wallet-money-linear' },
  { route: '/intelligence', title: 'Intelligence', icon: 'solar:cpu-bolt-linear' },
  { route: '/sectors', title: 'Sectors', icon: 'solar:layers-linear' },
  { route: '/technical-charts', title: 'Charts', icon: 'solar:chart-2-linear' },
  { route: '/pricing', title: 'Pricing', icon: 'solar:tag-price-linear' },
]

export const ALL_ROUTES = NAV.flatMap((g) => g.items)
