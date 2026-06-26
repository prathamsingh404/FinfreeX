'use client';

import React, { useState, useEffect } from 'react';
import { api, ScreenerResult, ScreenerFilters } from '@/lib/api';
import { Filter, Star, Search, RefreshCw, ChevronDown, ListFilter, PlayCircle } from 'lucide-react';

const PREBUILT_THEMES = [
  { name: "Piotroski High Scan", desc: "Solid companies with strong balance sheets", filters: { roe_min: 15, debt_to_equity_max: 0.8, revenue_growth_min: 12 } },
  { name: "Growth without Dilution", desc: "High ROE with low debt accumulation", filters: { roe_min: 18, debt_to_equity_max: 0.5, pe_max: 30 } },
  { name: "Golden Crossover / Vol Ratio", desc: "Short term momentum and volume surge", filters: { volume_ratio_min: 1.5, return_1m_min: 5 } },
  { name: "FII Buying & Accumulation", desc: "Strong interest from foreign institutions", filters: { market_cap_min: 100000000000, roe_min: 14 } },
];

export default function EquitiesScreenerPage() {
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter states
  const [peMin, setPeMin] = useState<number | ''>('');
  const [peMax, setPeMax] = useState<number | ''>(40);
  const [pbMax, setPbMax] = useState<number | ''>('');
  const [roeMin, setRoeMin] = useState<number | ''>(15);
  const [capMin, setCapMin] = useState<number | ''>('');
  const [debtMax, setDebtMax] = useState<number | ''>(1.0);
  const [sector, setSector] = useState<string>('');
  
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    runSearch();
  }, [sortBy, sortOrder]);

  const runSearch = async (customFilters?: ScreenerFilters) => {
    setLoading(true);
    setError('');
    
    const requestFilters: ScreenerFilters = customFilters || {
      pe_min: peMin === '' ? null : peMin,
      pe_max: peMax === '' ? null : peMax,
      pb_max: pbMax === '' ? null : pbMax,
      roe_min: roeMin === '' ? null : roeMin,
      market_cap_min: capMin === '' ? null : capMin,
      debt_to_equity_max: debtMax === '' ? null : debtMax,
      sector: sector || null,
      sort_by: sortBy,
      sort_order: sortOrder,
      limit: 30
    };
    
    try {
      const data = await api.screener.run(requestFilters);
      setResults(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch screener results.');
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (themeFilters: any) => {
    // Set UI states
    setPeMin(themeFilters.pe_min ?? '');
    setPeMax(themeFilters.pe_max ?? '');
    setPbMax(themeFilters.pb_max ?? '');
    setRoeMin(themeFilters.roe_min ?? '');
    setCapMin(themeFilters.market_cap_min ?? '');
    setDebtMax(themeFilters.debt_to_equity_max ?? '');
    
    runSearch({
      ...themeFilters,
      sort_by: sortBy,
      sort_order: sortOrder,
      limit: 30
    });
  };

  return (
    <div className="w-full min-h-screen relative z-10 pt-24 px-4 md:px-8 pb-16 bg-[#050508] text-slate-200">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Filter className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-100 uppercase">Equities Screener</h1>
              <p className="text-zinc-500 text-xs font-mono">Dynamic Server-Side Filter Pipeline for NSE Universe</p>
            </div>
          </div>
          
          <button onClick={() => runSearch()} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-mono text-xs font-bold uppercase rounded-xl transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Run Scan
          </button>
        </div>

        {/* Popular Scan Themes (Screener.in style, matching Image 1) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-2">
            <Star className="w-4 h-4 text-indigo-400" />
            Popular Screener Themes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PREBUILT_THEMES.map(theme => (
              <button key={theme.name} onClick={() => applyTheme(theme.filters)}
                className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 hover:border-indigo-500/40 text-left transition-all duration-300 group flex flex-col justify-between h-28">
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors font-mono">{theme.name}</h4>
                  <p className="text-[11px] text-zinc-500 font-light mt-1.5 leading-relaxed">{theme.desc}</p>
                </div>
                <span className="text-[9px] font-mono text-zinc-600 mt-2 uppercase block">Apply Scan →</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Filters Form */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-indigo-400" />
            Filter Constraints Configuration
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
            <div>
              <label className="text-zinc-500 block mb-1">Max P/E Ratio</label>
              <input type="number" value={peMax} onChange={e => setPeMax(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-indigo-500/40"
              />
            </div>
            <div>
              <label className="text-zinc-500 block mb-1">Min ROE (%)</label>
              <input type="number" value={roeMin} onChange={e => setRoeMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-indigo-500/40"
              />
            </div>
            <div>
              <label className="text-zinc-500 block mb-1">Max Debt/Equity</label>
              <input type="number" step="0.1" value={debtMax} onChange={e => setDebtMax(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-indigo-500/40"
              />
            </div>
            <div>
              <label className="text-zinc-500 block mb-1">Max P/B Ratio</label>
              <input type="number" value={pbMax} onChange={e => setPbMax(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-indigo-500/40"
              />
            </div>
            <div>
              <label className="text-zinc-500 block mb-1">Sector</label>
              <select value={sector} onChange={e => setSector(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-indigo-500/40">
                <option value="">All Sectors</option>
                <option value="Technology">Technology</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Consumer Cyclical">Consumer Cyclical</option>
                <option value="Energy">Energy</option>
                <option value="Healthcare">Healthcare</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => runSearch()} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase py-2 px-4 rounded-lg transition-all disabled:opacity-30">
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results table */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-zinc-400">
              <thead className="bg-zinc-900/60 text-zinc-500 border-b border-zinc-800 uppercase text-[10px]">
                <tr>
                  <th className="p-4">Stock Name</th>
                  <th className="p-4 text-right cursor-pointer" onClick={() => { setSortBy('current_price'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Price</th>
                  <th className="p-4 text-right cursor-pointer" onClick={() => { setSortBy('pe_ratio'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>P/E</th>
                  <th className="p-4 text-right cursor-pointer" onClick={() => { setSortBy('roe'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>ROE (%)</th>
                  <th className="p-4 text-right cursor-pointer" onClick={() => { setSortBy('debt_to_equity'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>D/E</th>
                  <th className="p-4 text-right cursor-pointer" onClick={() => { setSortBy('market_cap'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Market Cap</th>
                  <th className="p-4 text-right cursor-pointer" onClick={() => { setSortBy('return_1y'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>1Y Return</th>
                  <th className="p-4 text-right cursor-pointer" onClick={() => { setSortBy('volume_ratio'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Vol Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {results.map(stock => (
                  <tr key={stock.symbol} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-zinc-100">{stock.symbol}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{stock.name}</div>
                    </td>
                    <td className="p-4 text-right text-zinc-200 font-bold">₹{stock.current_price?.toFixed(2)}</td>
                    <td className="p-4 text-right">{stock.pe_ratio?.toFixed(1) || '—'}</td>
                    <td className="p-4 text-right">{stock.roe?.toFixed(1) || '—'}%</td>
                    <td className="p-4 text-right">{stock.debt_to_equity?.toFixed(2) || '—'}</td>
                    <td className="p-4 text-right">₹{(stock.market_cap / 10000000).toFixed(0)} Cr.</td>
                    <td className={`p-4 text-right font-bold ${stock.return_1y && stock.return_1y >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stock.return_1y ? `${stock.return_1y >= 0 ? '+' : ''}${stock.return_1y.toFixed(1)}%` : '—'}
                    </td>
                    <td className="p-4 text-right text-indigo-400">{stock.volume_ratio?.toFixed(1)}x</td>
                  </tr>
                ))}
                {results.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-600 italic">No stocks match the given criteria. Adjust filters and scan again.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500 animate-pulse">Running queries on NSE 500 stocks...</td>
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
