import React from 'react';

export default function VixMonitorPage() {
  return (
    <div className="w-full h-full relative z-10 pt-32 px-6 pb-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-10 fade-up">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <iconify-icon icon="solar:graph-down-linear" width="24"></iconify-icon>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100 mb-1">VIX & Volatility</h1>
            <p className="text-slate-500 text-sm">Institutional-grade intelligence for vix & volatility.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {/* Placeholder content cards */}
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
}
