'use client';

import React, { useState, useEffect } from 'react';
import { api, OptionChainRow } from '@/lib/api';
import { Layers, RefreshCw, PlayCircle, Info } from 'lucide-react';

export default function OptionsChainPage() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [chain, setChain] = useState<OptionChainRow[]>([]);
  const [underlyingPrice, setUnderlyingPrice] = useState<number>(0);
  const [expiry, setExpiry] = useState('');
  const [daysToExpiry, setDaysToExpiry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOptionChain();
  }, []);

  const fetchOptionChain = async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.options.chain(symbol.toUpperCase().trim());
      setChain(res.chain || []);
      setUnderlyingPrice(res.underlying_price || 0);
      setExpiry(res.expiry);
      setDaysToExpiry(res.days_to_expiry);
    } catch (e: any) {
      setError(e.message || 'Failed to generate option chain.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen relative z-10 pt-24 px-4 md:px-8 pb-16 bg-[#050508] text-slate-200">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-100 uppercase">Options Chain Sheets</h1>
              <p className="text-zinc-500 text-xs font-mono">Dynamic Black-Scholes Valuation Greeks Calculations (NSE/BSE)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 font-mono text-xs">
            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-200 uppercase focus:outline-none focus:border-indigo-500/40 w-36"
              placeholder="Ticker"
            />
            <button onClick={fetchOptionChain} disabled={loading || !symbol.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase rounded-xl transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Get Chain
            </button>
          </div>
        </div>

        {/* Underlying summary bar */}
        {underlyingPrice > 0 && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-6 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block">Underlying price</span>
              <span className="text-sm font-bold text-zinc-100">₹{underlyingPrice?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Symbol ticker</span>
              <span className="text-sm font-bold text-indigo-400">{symbol.toUpperCase().trim()}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Contract expiry</span>
              <span className="text-sm font-bold text-zinc-200">{expiry}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Days to expiration</span>
              <span className="text-sm font-bold text-zinc-200">{daysToExpiry} days</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 p-2.5 rounded-xl">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-[10px] text-zinc-400 font-light leading-relaxed max-w-xs">
                Prices and Greeks calculated dynamically centered around underlying price to safeguard against cloud scraping limits.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-mono">
            {error}
          </div>
        )}

        {/* Chain sheet table (side-by-side Call and Puts) */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-zinc-400 min-w-[900px]">
              {/* Main table headers */}
              <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase text-[9px] text-center font-bold">
                <tr>
                  <th colSpan={5} className="p-3 border-r border-zinc-800 text-indigo-400 bg-indigo-500/5">CALL OPTIONS (LONG SHORTS)</th>
                  <th className="p-3 bg-zinc-900/90 text-zinc-300">STRIKE</th>
                  <th colSpan={5} className="p-3 border-l border-zinc-800 text-purple-400 bg-purple-500/5">PUT OPTIONS (SHORT COVERS)</th>
                </tr>
                <tr className="text-zinc-500 text-[8px] bg-zinc-900/40 border-t border-zinc-800/80">
                  <th className="p-2">OI</th>
                  <th className="p-2">Vol</th>
                  <th className="p-2">Delta</th>
                  <th className="p-2">Theta</th>
                  <th className="p-2 border-r border-zinc-800">LTP</th>
                  <th className="p-2 text-zinc-300 font-bold bg-zinc-900/60">Strike Price</th>
                  <th className="p-2 border-l border-zinc-800">LTP</th>
                  <th className="p-2">Delta</th>
                  <th className="p-2">Theta</th>
                  <th className="p-2">Vol</th>
                  <th className="p-2">OI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-[11px] text-center">
                {chain.map((row) => {
                  const isITMCall = underlyingPrice > row.strike;
                  const isITMPut = underlyingPrice < row.strike;
                  
                  return (
                    <tr key={row.strike} className="hover:bg-zinc-900/20 transition-colors">
                      {/* Calls */}
                      <td className={`p-2.5 ${isITMCall ? 'bg-zinc-900/20 text-zinc-300' : ''}`}>{row.call.oi.toLocaleString()}</td>
                      <td className={`p-2.5 ${isITMCall ? 'bg-zinc-900/20 text-zinc-400' : ''}`}>{row.call.volume.toLocaleString()}</td>
                      <td className={`p-2.5 ${isITMCall ? 'bg-zinc-900/20 text-indigo-400 font-semibold' : ''}`}>{row.call.delta}</td>
                      <td className={`p-2.5 ${isITMCall ? 'bg-zinc-900/20 text-zinc-500' : ''}`}>{row.call.theta}</td>
                      <td className={`p-2.5 border-r border-zinc-800 font-bold text-zinc-100 ${isITMCall ? 'bg-zinc-900/40 text-emerald-400' : ''}`}>₹{row.call.ltp}</td>
                      
                      {/* Strike */}
                      <td className="p-2.5 font-bold text-zinc-200 bg-zinc-900/40 text-sm border-r border-l border-zinc-900">{row.strike}</td>
                      
                      {/* Puts */}
                      <td className={`p-2.5 border-l border-zinc-800 font-bold text-zinc-100 ${isITMPut ? 'bg-zinc-900/40 text-emerald-400' : ''}`}>₹{row.put.ltp}</td>
                      <td className={`p-2.5 ${isITMPut ? 'bg-zinc-900/20 text-purple-400 font-semibold' : ''}`}>{row.put.delta}</td>
                      <td className={`p-2.5 ${isITMPut ? 'bg-zinc-900/20 text-zinc-500' : ''}`}>{row.put.theta}</td>
                      <td className={`p-2.5 ${isITMPut ? 'bg-zinc-900/20 text-zinc-400' : ''}`}>{row.put.volume.toLocaleString()}</td>
                      <td className={`p-2.5 ${isITMPut ? 'bg-zinc-900/20 text-zinc-300' : ''}`}>{row.put.oi.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {chain.length === 0 && !loading && (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-zinc-600 italic">No option data generated. Enter ticker and select Get Chain.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-zinc-500 animate-pulse">Running Monte Carlo & Black-Scholes PDE solvers...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
