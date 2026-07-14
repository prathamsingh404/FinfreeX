'use client';

import React from 'react';

const AdvisorPage = () => {
  return (
    <main className="pt-40 pb-12 px-6 max-w-4xl mx-auto">
      <div className="glass-panel p-12 rounded-[2rem] border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20 overflow-hidden relative">
        {/* Report Header */}
        <div className="absolute top-0 right-0 p-8">
           <div className="text-right">
              <div className="text-[9px] text-muted/20 font-mono uppercase tracking-[0.2em] mb-1">Confidential Intelligence</div>
              <div className="text-[9px] text-muted/40 font-mono font-bold">ID: PA-492-X10</div>
           </div>
        </div>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-full bg-emerald flex items-center justify-center text-[#04120C] shadow-lg shadow-emerald/20">
              <iconify-icon icon="solar:shield-star-linear" width="18"></iconify-icon>
            </div>
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-emerald-bright font-mono">Executive Intelligence Report</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground uppercase mb-6">Portfolio Optimization & Risks</h1>
          <div className="flex gap-6 text-[10px] font-mono uppercase tracking-wider text-muted">
            <span>Prepared for: Retail Investor Alpha</span>
            <span>Date: March 2026</span>
            <span>Analyzed by: FinfreeX Neural Engine</span>
          </div>
        </div>

        <div className="prose max-w-none space-y-10 text-soft">
          <section>
            <h3 className="text-foreground text-base font-semibold uppercase mb-4">1. Executive Summary</h3>
            <p className="text-xs leading-relaxed">
              The aggregate portfolio demonstrates strong performance in the Technology sector but reveals significant "Concentration Risk" that may lead to excessive volatility in a high-interest-rate environment. Current diversification score is <span className="text-emerald-bright font-bold">74/100</span>.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20">
                <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest mb-4">Primary Strengths</h4>
                <ul className="text-xs space-y-2 list-disc pl-4 text-soft leading-normal">
                  <li>Strong exposure to Cash-Flow rich entities.</li>
                  <li>Optimal liquidity ratios for current market.</li>
                  <li>Efficient tax harvesting opportunities.</li>
                </ul>
             </div>
             <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20">
                <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest mb-4">Risk Vectors</h4>
                <ul className="text-xs space-y-2 list-disc pl-4 text-soft leading-normal">
                  <li>Over-exposure to Large Caps (65% of total value).</li>
                  <li>Negative correlation with rising Energy costs.</li>
                  <li>Lack of Emerging Markets hedges.</li>
                </ul>
             </div>
          </section>

          <section>
            <h3 className="text-foreground text-base font-semibold uppercase mb-4">2. Behavioral Insights</h3>
            <p className="text-xs leading-relaxed mb-6">
              Our neural analysis of your trade history (124 events) suggests a moderate pattern of <strong>"Loss Aversion"</strong>. You tend to hold losing positions 4.2x longer than winners, impacting overall IRR by estimated <span className="text-emerald-bright font-bold">2.1% annually</span>.
            </p>
            <div className="p-4 rounded-xl bg-emerald/[0.05] border border-emerald/20 italic text-xs text-emerald-bright font-mono leading-relaxed">
              Recommendation: Implement automated 'Trailing Stop-Loss' orders at 15% to mitigate downside variance without emotional intervention.
            </div>
          </section>

          <section>
            <h3 className="text-foreground text-base font-semibold uppercase mb-4">3. Strategic Allocation Matrix</h3>
            <div className="h-48 bg-white/[0.02] rounded-2xl border border-white/[0.06] flex items-center justify-center shadow-inner">
               <p className="text-[9px] text-muted/40 font-mono font-bold uppercase tracking-widest italic text-center">Neural Prediction Model: Estimated Volatility Surface</p>
            </div>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.06] flex justify-between items-center">
          <div className="flex gap-4">
             <button className="px-6 py-2.5 rounded-full bg-emerald hover:bg-emerald-bright text-[#04120C] text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-emerald/20">Download PDF</button>
             <button className="px-6 py-2.5 rounded-full border border-white/[0.08] hover:bg-white/[0.05] text-soft hover:text-foreground text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-black/20">Share Report</button>
          </div>
          <iconify-icon icon="solar:verified-check-linear" className="text-emerald-bright" width="24"></iconify-icon>
        </div>
      </div>
    </main>
  );
};

export default AdvisorPage;

// Quantitative Optimization Advisor - Confidential Executive Report visualizer
