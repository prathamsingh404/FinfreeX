'use client';

import React, { useState } from 'react';

const PortfolioAnalyzer = () => {
  const [assets, setAssets] = useState([
    { symbol: 'AAPL', quantity: 10, cost: 150, sector: 'Technology' },
    { symbol: 'MSFT', quantity: 5, cost: 310, sector: 'Technology' },
  ]);

  return (
    <main className="pt-36 pb-24 px-6 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter text-foreground font-mono uppercase mb-3">
          Portfolio Analyzer
        </h1>
        <p className="text-soft text-sm md:text-base leading-relaxed">
          Deep dive into your diversification and risk exposure with quantitative neural modeling.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-[2rem] border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20 relative overflow-hidden">
            <h3 className="text-xs font-bold text-foreground font-mono uppercase tracking-widest mb-6">Manage Assets</h3>

            <div className="space-y-4 mb-8">
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-dashed border-white/[0.08] text-[10px] font-mono font-bold uppercase tracking-widest text-soft hover:border-emerald-bright hover:text-emerald-bright transition-all duration-300">
                <iconify-icon icon="solar:upload-linear"></iconify-icon>
                Upload Portfolio CSV
              </button>
              <div className="text-center text-[9px] text-muted/40 font-mono uppercase tracking-widest font-bold">or</div>
              <button className="w-full py-3 rounded-full bg-emerald hover:bg-emerald-bright text-[#04120C] text-[10px] font-mono font-bold uppercase tracking-widest transition-colors duration-300 shadow-md">
                Add Asset Manually
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-[9px] text-muted font-mono uppercase tracking-wider font-semibold">Current Holdings</h4>
              {assets.map((asset, i) => (
                <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20">
                  <div>
                    <div className="text-xs font-bold text-foreground font-mono">{asset.symbol}</div>
                    <div className="text-[10px] text-soft font-mono mt-0.5">{asset.quantity} Shares @ ${asset.cost}</div>
                  </div>
                  <button className="text-soft/30 hover:text-emerald-bright transition-colors duration-300">
                    <iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-[2rem] border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
            <h3 className="text-xs font-bold text-foreground font-mono uppercase tracking-widest mb-4">Bias Interventions</h3>
            <p className="text-xs text-soft leading-relaxed">
              Our AI analysis detects behavioral anomalies and emotional heuristics in your historical trading logs.
            </p>
            <div className="mt-6 space-y-3">
               <div className="p-4 rounded-2xl bg-emerald/[0.05] border border-emerald/20">
                  <div className="text-[10px] text-emerald-bright font-bold font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <iconify-icon icon="solar:danger-triangle-linear" width="14"></iconify-icon>
                    Warning: FOMO Bias
                  </div>
                  <p className="text-xs text-soft leading-relaxed italic">You tend to buy assets after they rise more than 15% in a week.</p>
               </div>
            </div>
          </div>
        </div>

        {/* Analysis Output */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 rounded-[2rem] border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20 relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xs font-bold text-foreground font-mono uppercase tracking-widest mb-1.5">Diversification Health</h3>
                <p className="text-[10px] text-muted font-mono italic">Calculating based on sector and asset correlation.</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-bright font-mono">74/100</div>
                <div className="text-[9px] text-soft font-mono uppercase tracking-widest mt-1">Optimal Score</div>
              </div>
            </div>

            <div className="aspect-[21/9] bg-white/[0.02] rounded-[2rem] border border-white/[0.06] flex items-center justify-center mb-8 shadow-inner">
               <p className="text-muted/40 font-mono font-bold text-[10px] uppercase tracking-widest italic">Dynamic Allocation Chart</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-2 border-t border-white/[0.06]">
               <div>
                  <div className="text-[9px] text-muted font-mono uppercase tracking-wider font-semibold mb-1">Max Leakage</div>
                  <div className="text-xs text-emerald-bright font-bold font-mono">12.4% Tech</div>
               </div>
               <div>
                  <div className="text-[9px] text-muted font-mono uppercase tracking-wider font-semibold mb-1">Correlation</div>
                  <div className="text-xs text-foreground font-bold font-mono">0.64 Beta</div>
               </div>
               <div>
                  <div className="text-[9px] text-muted font-mono uppercase tracking-wider font-semibold mb-1">Alpha Potential</div>
                  <div className="text-xs text-emerald-bright font-bold font-mono">+4.2% Est.</div>
               </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
            <h3 className="text-xs font-bold text-foreground font-mono uppercase tracking-widest mb-6">Asset Intelligence</h3>
            <div className="space-y-4">
              {[
                { symbol: 'AAPL', insight: 'Maintaining strong support at $180. Oversold signal detected on institutional order flow.' },
                { symbol: 'MSFT', insight: 'AI integration and enterprise cloud expansion driving revised price target metrics to $420.' },
              ].map(asset => (
                <div key={asset.symbol} className="flex gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20 items-start">
                   <div className="w-12 h-12 rounded-xl bg-emerald text-[#04120C] flex items-center justify-center font-bold font-mono text-sm shrink-0 shadow-sm">{asset.symbol}</div>
                   <div className="pt-1">
                      <p className="text-xs text-soft leading-relaxed">{asset.insight}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PortfolioAnalyzer;


// Portfolio diversification analyzer and FOMO heuristic detector interface
