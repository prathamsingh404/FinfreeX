'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Layers, RefreshCw, Sparkles } from 'lucide-react';

const TradingViewChart = dynamic(() => import('@/components/TradingViewChart'), { ssr: false });

export default function TechnicalChartsPage() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [exchange, setExchange] = useState('NSE');
  const [chartKey, setChartKey] = useState(0);

  const handleUpdateChart = (e: React.FormEvent) => {
    e.preventDefault();
    // Force chart re-mount
    setChartKey(prev => prev + 1);
  };

  return (
    <div className="w-full min-h-screen relative z-10 pt-24 px-4 md:px-8 pb-16 bg-[#050508] text-slate-200">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-100 uppercase">Technical Charts Room</h1>
              <p className="text-zinc-500 text-xs font-mono">TradingView Lightweight Charts v5 with real-time indicators</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdateChart} className="flex items-center gap-2 font-mono text-xs">
            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 uppercase focus:outline-none focus:border-indigo-500/40 w-36"
              placeholder="Ticker"
            />
            <select value={exchange} onChange={e => setExchange(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500/40">
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
              <option value="US">US</option>
            </select>
            <button type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/10">
              Update Chart
            </button>
          </form>
        </div>

        {/* Chart Viewport */}
        <div className="shadow-2xl">
          <TradingViewChart key={chartKey} symbol={symbol.toUpperCase().trim()} exchange={exchange} />
        </div>

      </div>
    </div>
  );
}
