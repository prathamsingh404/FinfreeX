import os

features = [
    ("dashboard", "Overview Dashboard", "solar:home-2-linear"),
    ("ai-analyst", "AI Financial Analyst", "solar:magic-stick-3-linear"),
    ("portfolio-analyzer", "Portfolio Analyzer", "solar:pie-chart-2-linear"),
    ("equities-screener", "Equities Screener", "solar:filter-linear"),
    ("options-chain", "Options Chain", "solar:diagram-down-linear"),
    ("derivatives-heatmap", "Derivatives Heatmap", "solar:map-arrow-up-linear"),
    ("macro-economics", "Macro Economics", "solar:earth-linear"),
    ("sector-rotation", "Sector Rotation", "solar:refresh-circle-linear"),
    ("global-markets", "Global Markets", "solar:globe-linear"),
    ("fundamental-analysis", "Fundamental Analysis", "solar:document-text-linear"),
    ("technical-charts", "Technical Charts", "solar:chart-square-linear"),
    ("news-sentiment", "News & Sentiment", "solar:newspaper-linear"),
    ("corporate-actions", "Corporate Actions", "solar:calendar-linear"),
    ("earnings-transcripts", "Earnings Transcripts", "solar:microphone-linear"),
    ("insider-trading", "Insider Trading", "solar:incognito-linear"),
    ("mutual-funds", "Mutual Funds", "solar:wallet-linear"),
    ("etf-analyzer", "ETF Analyzer", "solar:box-linear"),
    ("fixed-income", "Fixed Income & Bonds", "solar:bill-linear"),
    ("forex", "Forex & Currencies", "solar:dollar-linear"),
    ("commodities", "Commodities Tracking", "solar:gold-linear"),
    ("crypto", "Crypto Assets", "solar:cpu-linear"),
    ("ipo-watch", "IPO Watch", "solar:rocket-linear"),
    ("yield-curve", "Yield Curve", "solar:chart-2-linear"),
    ("vix-monitor", "VIX & Volatility", "solar:graph-down-linear"),
    ("correlation-matrix", "Correlation Matrix", "solar:scanner-linear"),
    ("risk-calculator", "Risk Management", "solar:shield-warning-linear"),
    ("backtesting", "Backtesting Engine", "solar:history-linear"),
    ("dividend-tracker", "Dividend Tracker", "solar:money-bag-linear"),
    ("financial-ratios", "Financial Ratios", "solar:calculator-linear"),
    ("esg-scores", "ESG Score Analyzer", "solar:leaf-linear"),
    ("algo-builder", "Algo Bot Builder", "solar:code-linear"),
    ("paper-trading", "Paper Trading", "solar:gamepad-linear"),
    ("reit-analyzer", "REIT Analyzer", "solar:buildings-linear"),
    ("option-greeks", "Option Greeks", "solar:math-linear"),
    ("market-breadth", "Market Breadth", "solar:chart-pie-linear"),
    ("peer-comparison", "Peer Comparison", "solar:users-group-two-rounded-linear"),
    ("historical-data", "Historical Data", "solar:server-square-linear"),
    ("institutional-holdings", "Institutional Holdings", "solar:banknotes-linear"),
    ("dark-pool", "Dark Pool Monitor", "solar:eye-linear"),
    ("economic-calendar", "Economic Calendar", "solar:calendar-date-linear"),
    ("alerts", "Alerts & Notifications", "solar:bell-linear")
]

base_path = "app"

if not os.path.exists(base_path):
    print("Run this from the frontend directory")
    exit(1)

template = """import React from 'react';

export default function {component_name}Page() {{
  return (
    <div className="w-full h-full relative z-10 pt-32 px-6 pb-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-10 fade-up">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <iconify-icon icon="{icon}" width="24"></iconify-icon>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100 mb-1">{title}</h1>
            <p className="text-slate-500 text-sm">Institutional-grade intelligence for {title_lower}.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {{/* Placeholder content cards */}}
          <div className="glass-panel p-6 rounded-2xl glow-on-hover smooth-hover">
            <div className="h-4 w-1/3 bg-white/[0.06] rounded-lg mb-4 animate-pulse"></div>
            <div className="h-32 w-full bg-white/[0.04] rounded-xl animate-pulse"></div>
          </div>
          <div className="glass-panel p-6 rounded-2xl glow-on-hover smooth-hover lg:col-span-2">
            <div className="h-4 w-1/4 bg-white/[0.06] rounded-lg mb-4 animate-pulse"></div>
            <div className="h-32 w-full bg-white/[0.04] rounded-xl animate-pulse"></div>
          </div>
          <div className="glass-panel p-6 rounded-2xl glow-on-hover smooth-hover lg:col-span-3">
            <div className="h-4 w-1/5 bg-white/[0.06] rounded-lg mb-4 animate-pulse"></div>
            <div className="h-64 w-full bg-white/[0.04] rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}}
"""

for route, title, icon in features:
    dir_path = os.path.join(base_path, route)
    os.makedirs(dir_path, exist_ok=True)
    
    file_path = os.path.join(dir_path, "page.tsx")
    component_name = route.replace("-", " ").title().replace(" ", "")
    title_lower = title.lower()
    
    with open(file_path, "w") as f:
        f.write(template.format(component_name=component_name, title=title, title_lower=title_lower, icon=icon))

print(f"Successfully generated {len(features)} feature pages.")

# PortAI Scaffolder Template - Automates standard feature routes rebuild
