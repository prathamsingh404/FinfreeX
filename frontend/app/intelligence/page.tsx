'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StockChart from '../../components/StockChart';
import DetailModal from '../../components/DetailModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://portai-xsw3.onrender.com';

interface Analysis {
  summary: string;
  sentiment: string;
  key_insights: string[];
  risks: string[];
  recommendations: string[];
  data_sources?: string[];
  portfolio_score?: number;
}

interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description: string;
}

interface TrendingStock {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
}

const SUGGESTED_QUERIES = [
  { label: '📈 Nifty Outlook', query: 'What is the short-term outlook for Nifty 50 based on current market conditions?' },
  { label: '🏦 Banking Sector', query: 'Analyze the Indian banking sector. Which bank stocks are worth buying today?' },
  { label: '💡 IT Sector', query: 'How is the IT sector performing? Give recommendations for TCS, Infosys, and Wipro.' },
  { label: '🛢 Energy Stocks', query: 'What is the outlook for energy and oil stocks like ONGC and Reliance Industries?' },
  { label: '💊 Pharma Pick', query: 'Which pharma stocks should I consider buying for long-term? Analyze Sun Pharma and Dr Reddy.' },
  { label: '📊 Mid-Cap Gems', query: 'Give me 3 high-potential mid-cap Indian stocks to watch right now and explain why.' },
  { label: '🌍 Global Impact', query: 'How are US Federal Reserve decisions and global macro trends impacting Indian equities?' },
  { label: '💰 Dividend Focus', query: 'Which Nifty 50 stocks offer the best dividend yield and are financially stable?' },
];

export default function IntelligencePage() {
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apisUsed, setApisUsed] = useState<string[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [history, setHistory] = useState<{ query: string; analysis: Analysis }[]>([]);
  const [activeTab, setActiveTab] = useState<'analyst' | 'news' | 'trending'>('analyst');
  const [marketHistory, setMarketHistory] = useState<Record<string, any[]>>({});
  const [analysisSymbol, setAnalysisSymbol] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'stock' | 'news'>('stock');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    fetchNews();
    fetchTrendingStocks();

    // Load cached history
    const cached = sessionStorage.getItem('intelligence_history');
    if (cached) {
      try { setHistory(JSON.parse(cached)); } catch(e) {}
    }

    // Load cached analysis if redirected from portfolios
    const cachedAnalysis = sessionStorage.getItem('cached_analysis');
    if (cachedAnalysis) {
      try {
        const parsed = JSON.parse(cachedAnalysis);
        setAnalysis(parsed.analysis);
        if (parsed.apis_used) setApisUsed(parsed.apis_used);
        sessionStorage.removeItem('cached_analysis');
      } catch (e) {}
    }
  }, []);

  const fetchNews = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/news`);
      const d = await r.json();
      setNews(d.articles || d || []);
    } catch (e) {}
  };

  const fetchTrendingStocks = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/trending`);
      const d = await r.json();
      const stocks = Array.isArray(d) ? d : d.stocks || [];
      setTrendingStocks(stocks);
      // Fetch history for top 6 trending stocks
      stocks.slice(0, 6).forEach((s: any) => fetchHistory(s.symbol));
    } catch (e) {}
  };

  const fetchHistory = async (symbol: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/history/${encodeURIComponent(symbol)}?period=1mo`);
      const d = await r.json();
      if (d.history) {
        setMarketHistory(prev => ({ ...prev, [symbol]: d.history }));
      }
    } catch (err) {}
  };

  const runAnalysis = async (q?: string) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;
    if (q) setQuery(q);
    setLoading(true); setError(''); setAnalysis(null); setApisUsed([]); setAnalysisSymbol(null);
    try {
      // Try to extract symbol from query (e.g. "Analyze TCS" -> "TCS")
      const symbolMatch = finalQuery.match(/\b[A-Z]{2,10}\b/);
      const symbol = symbolMatch ? symbolMatch[0] : null;
      if (symbol) {
        setAnalysisSymbol(symbol);
        fetchHistory(symbol);
      }

      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery, context: '' }),
      });
      const data = await res.json();
      setAnalysis(data.analysis);
      setApisUsed(data.apis_used || []);

      // Save to session history
      if (data.analysis) {
        const newEntry = { query: finalQuery, analysis: data.analysis };
        const updated = [newEntry, ...history].slice(0, 10);
        setHistory(updated);
        sessionStorage.setItem('intelligence_history', JSON.stringify(updated));
      }
    } catch {
      setError('The AI engine is syncing. Please refresh in 10 seconds.');
    } finally { setLoading(false); }
  };

  const openStockModal = (sym: string, currentData: any = {}) => {
    setSelectedItem({ ...currentData, symbol: sym });
    setModalType('stock');
    setModalOpen(true);
    if (!marketHistory[sym]) fetchHistory(sym);
  };

  const openNewsModal = (article: NewsArticle) => {
    setSelectedItem(article);
    setModalType('news');
    setModalOpen(true);
  };

  const sentimentColor = (s: string) => s === 'Bullish' ? 'text-emerald-400' : s === 'Bearish' ? 'text-red-400' : 'text-blue-400';
  const sentimentBg = (s: string) => s === 'Bullish' ? 'bg-emerald-500/10 border-emerald-500/20' : s === 'Bearish' ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20';

  return (
    <main className="min-h-screen w-full relative z-10">
      {/* Page Header */}
      <div className="pt-40 pb-8 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-[10px] text-indigo-400 mb-4 font-mono uppercase tracking-widest font-semibold shadow-lg shadow-black/20">
              <iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon>
              INTELLIGENCE HUB
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-200 font-mono">AI Financial Intelligence</h1>
            <p className="text-slate-400 text-xs mt-1">Hedge-fund quality analysis. Powered by live Indian market data.</p>
          </div>
          <Link href="/portfolios" className="hidden md:flex items-center gap-2 text-[10px] text-secondary/60 hover:text-white hover:bg-white/[0.06] transition-colors border border-white/[0.08] px-5 py-2.5 rounded-full font-mono uppercase tracking-widest font-bold shadow-lg shadow-black/20 bg-white/[0.03]">
            <iconify-icon icon="solar:wallet-2-linear"></iconify-icon> Manage Portfolios
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Left: AI Analyst ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.06] w-fit shadow-lg shadow-black/20">
              {(['analyst', 'news', 'trending'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-mono uppercase tracking-widest font-bold transition-all ${activeTab === tab ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
                  {tab === 'analyst' ? '🤖 Analyst' : tab === 'news' ? '📰 News' : '🔥 Trending'}
                </button>
              ))}
            </div>

            {/* Tab: AI Analyst */}
            {activeTab === 'analyst' && (
              <div className="space-y-6">
                {/* Query Input */}
                <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/5 blur-3xl rounded-full pointer-events-none"></div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-200 font-mono uppercase mb-1 relative z-10">Ask the AI Analyst</h2>
                  <p className="text-slate-400 text-xs mb-4 relative z-10">Get institutional-grade insights on any Indian stock or market theme.</p>

                  <textarea value={query} onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) runAnalysis(); }}
                    rows={3} placeholder="e.g. Should I buy HDFC Bank at current levels? Analyze risk-reward..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors resize-none relative z-10 mb-4"
                  />

                  <div className="flex gap-3 relative z-10">
                    <button onClick={() => runAnalysis()} disabled={loading || !query.trim()}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed">
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Analyzing...
                        </span>
                      ) : (<><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> Get AI Analysis</>)}
                    </button>
                    {analysis && (
                      <button onClick={() => window.print()}
                        className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/[0.08] bg-white/[0.03] text-slate-400 text-xs font-bold uppercase tracking-widest hover:bg-white/[0.06] hover:text-white transition-colors shadow-lg shadow-black/20">
                        <iconify-icon icon="solar:printer-linear"></iconify-icon> Print
                      </button>
                    )}
                  </div>
                  {error && <div className="mt-3 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</div>}
                </div>

                {/* Quick Suggestions */}
                {!analysis && !loading && (
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold mb-3">Suggested Analyses</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {SUGGESTED_QUERIES.map((s) => (
                        <button key={s.label} onClick={() => runAnalysis(s.query)}
                          className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all group shadow-lg shadow-black/20">
                          <div className="text-xs text-slate-300 font-bold group-hover:text-indigo-400 transition-colors leading-relaxed">{s.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis Result */}
                {analysis && (
                  <div className="space-y-4 fade-up">
                    {/* Data sources */}
                    {apisUsed.length > 0 && (
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span> Aggregated Via
                        </span>
                        {apisUsed.map(api => (
                          <span key={api} className="text-[10px] font-mono px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-200 font-bold shadow-lg shadow-black/20">{api}</span>
                        ))}
                      </div>
                    )}

                    {/* Summary Card */}
                    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-slate-200">AI Analysis Summary</h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold border shadow-sm uppercase ${sentimentBg(analysis.sentiment)} ${sentimentColor(analysis.sentiment)}`}>
                          {analysis.sentiment} Signal
                        </span>
                      </div>
                      {analysis.portfolio_score !== undefined && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="text-xs text-slate-500 font-mono">Score</div>
                          <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{width: `${analysis.portfolio_score}%`}}></div>
                          </div>
                          <div className="text-xs font-bold text-slate-200 font-mono">{analysis.portfolio_score}/100</div>
                        </div>
                      )}
                      
                      {analysisSymbol && marketHistory[analysisSymbol] && (
                        <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20">
                           <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] text-slate-500 font-bold">Technical Chart: {analysisSymbol}</span>
                              <span className="text-[10px] text-indigo-400 font-mono font-bold">1 Month Trend</span>
                           </div>
                           <div className="h-32 w-full">
                              <StockChart data={marketHistory[analysisSymbol]} height={128} color="#818CF8" />
                           </div>
                        </div>
                      )}

                      <p className="text-xs text-slate-300 leading-relaxed">{analysis.summary}</p>
                    </div>

                    {/* Insights + Risks */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="glass-panel rounded-2xl p-5 hover:bg-white/[0.02] transition-colors border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <iconify-icon icon="solar:lightbulb-linear" width="18"></iconify-icon>
                          </div>
                          <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase">Key Insights</h3>
                        </div>
                        <ul className="space-y-2">
                          {analysis.key_insights?.map((ins, i) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-400 leading-relaxed">
                              <iconify-icon icon="solar:check-circle-linear" className="text-emerald-400 flex-shrink-0 mt-0.5"></iconify-icon>
                              {ins}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="glass-panel rounded-2xl p-5 hover:bg-white/[0.02] transition-colors border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                            <iconify-icon icon="solar:danger-triangle-linear" width="18"></iconify-icon>
                          </div>
                          <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase">Risk Factors</h3>
                        </div>
                        <ul className="space-y-2">
                          {analysis.risks?.map((r, i) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-400 leading-relaxed">
                              <iconify-icon icon="solar:close-circle-linear" className="text-red-400 flex-shrink-0 mt-0.5"></iconify-icon>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="glass-panel rounded-2xl p-5 border border-white/[0.06] bg-[#12121A] shadow-lg shadow-black/20 bg-gradient-to-br from-indigo-500/[0.02] to-transparent">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                          <iconify-icon icon="solar:target-linear" width="18"></iconify-icon>
                        </div>
                        <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase">Recommended Actions</h3>
                      </div>
                      <div className="space-y-2">
                        {analysis.recommendations?.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20">
                            <div className="w-5 h-5 rounded bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold font-mono flex-shrink-0">{i+1}</div>
                            <div className="text-xs text-slate-300 font-medium">{rec}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* New Query */}
                    <button onClick={() => { setAnalysis(null); setQuery(''); }}
                      className="w-full py-2.5 rounded-full border border-white/[0.08] text-slate-400 text-xs font-bold hover:text-white hover:bg-white/[0.05] transition-all shadow-lg shadow-black/20">
                      ↺ Ask Another Question
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: News Feed */}
            {activeTab === 'news' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-200 tracking-wider">Latest Financial News</h2>
                  <button onClick={fetchNews} className="text-[10px] font-mono font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
                    ↻ Refresh
                  </button>
                </div>
                <div className="space-y-3">
                  {news.length > 0 ? news.map((a, i) => (
                    <button 
                      key={i} 
                      onClick={() => openNewsModal(a)}
                      className="w-full text-left flex gap-4 p-4 glass-panel rounded-xl hover:bg-white/[0.02] hover:border-indigo-500/30 transition-all group border border-transparent hover:border-white/[0.06] cursor-pointer shadow-lg shadow-black/20"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold font-mono">{a.source}</span>
                          {a.publishedAt && <span className="text-[9px] font-mono text-secondary/40">{new Date(a.publishedAt).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}</span>}
                        </div>
                        <h3 className="text-sm text-slate-200 font-semibold leading-snug group-hover:text-indigo-400 transition-colors mb-1">{a.title}</h3>
                        {a.description && <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{a.description}</p>}
                      </div>
                      <iconify-icon icon="solar:eye-linear" className="text-slate-500 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-1"></iconify-icon>
                    </button>
                  )) : Array.from({length: 6}).map((_, i) => (
                    <div key={i} className="p-4 glass-panel rounded-xl animate-pulse">
                      <div className="h-3 w-20 bg-white/[0.05] rounded mb-3"></div>
                      <div className="h-4 w-full bg-white/[0.05] rounded mb-2"></div>
                      <div className="h-3 w-3/4 bg-white/[0.05] rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Trending */}
            {activeTab === 'trending' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-200 tracking-wider">Trending NSE Stocks</h2>
                  <button onClick={fetchTrendingStocks} className="text-[10px] font-mono font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
                    ↻ Refresh
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trendingStocks.length > 0 ? trendingStocks.map((stock) => (
                    <button key={stock.symbol} onClick={() => openStockModal(stock.symbol, stock)}
                      className="glass-panel rounded-xl p-5 text-left hover:bg-white/[0.02] hover:border-indigo-500/30 transition-all cursor-pointer group border border-white/[0.06] shadow-lg shadow-black/20">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-xs font-bold text-slate-200 font-mono uppercase">{stock.symbol}</span>
                          <div className="text-lg font-semibold text-slate-200 font-mono">₹{stock.price?.toLocaleString('en-IN')}</div>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg ${stock.change_pct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct}%
                        </span>
                      </div>

                      {/* Miniature Chart in Intelligence Hub */}
                      <div className="h-10 w-full mb-3 opacity-60 group-hover:opacity-100 transition-opacity">
                         {marketHistory[stock.symbol] ? (
                            <StockChart 
                              data={marketHistory[stock.symbol]} 
                              color={stock.change_pct >= 0 ? '#059669' : '#dc2626'} 
                              height={40} 
                            />
                         ) : (
                           <div className="h-full w-full flex items-end gap-1 px-1 opacity-10">
                              {[...Array(12)].map((_, i) => (
                                <div key={i} className="flex-1 bg-white/[0.1] rounded-t-sm" style={{ height: `${20 + ((i * 17) % 75)}%` }}></div>
                              ))}
                           </div>
                         )}
                      </div>

                      <div className="flex items-center justify-between font-mono">
                         <div className="text-[9px] text-slate-500 group-hover:text-indigo-400 font-bold transition-colors">
                           Full Chart →
                         </div>
                         <button 
                           onClick={(e) => { e.stopPropagation(); setActiveTab('analyst'); runAnalysis(`Analyze ${stock.symbol} stock. Should I buy it today?`); }} 
                           className="px-3 py-1 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-[9px] font-bold uppercase tracking-widest transition-all"
                         >
                           AI Analyst
                         </button>
                      </div>
                    </button>
                  )) : Array.from({length: 6}).map((_, i) => (
                    <div key={i} className="glass-panel rounded-xl p-4 animate-pulse">
                      <div className="h-3 w-16 bg-white/[0.05] rounded mb-3"></div>
                      <div className="h-5 w-20 bg-white/[0.05] rounded mb-2"></div>
                      <div className="h-3 w-12 bg-white/[0.05] rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-5 font-mono text-xs uppercase tracking-wider">

            {/* Analysis History */}
            {history.length > 0 && (
              <div className="glass-panel rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase mb-4 flex items-center gap-2">
                  <iconify-icon icon="solar:clock-circle-linear" className="text-accent"></iconify-icon>
                  Recent Queries
                </h3>
                <div className="space-y-2">
                  {history.slice(0, 5).map((item, i) => (
                    <button key={i} onClick={() => { setQuery(item.query); setAnalysis(item.analysis); setActiveTab('analyst'); }}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all group font-mono shadow-lg shadow-black/20">
                      <div className="text-[10px] text-slate-400 leading-normal line-clamp-2 group-hover:text-indigo-400 transition-colors font-bold font-mono">{item.query}</div>
                      <div className={`text-[9px] mt-1 font-bold ${item.analysis.sentiment === 'Bullish' ? 'text-emerald-400' : item.analysis.sentiment === 'Bearish' ? 'text-red-400' : 'text-blue-600'}`}>
                        {item.analysis.sentiment} Signal
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Suggestions Sidebar */}
            <div className="glass-panel rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-200 font-mono uppercase mb-4 flex items-center gap-2">
                <iconify-icon icon="solar:layers-minimalistic-linear" className="text-accent"></iconify-icon>
                Quick Links
              </h3>
              <div className="space-y-2">
                {SUGGESTED_QUERIES.map((s) => (
                  <button key={s.label} onClick={() => { setActiveTab('analyst'); runAnalysis(s.query); }}
                    className="w-full text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all group shadow-lg shadow-black/20 font-mono">
                    <div className="text-[10px] text-secondary font-bold group-hover:text-accent transition-colors font-mono">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Live News Snapshot (Sidebar) */}
            {news.length > 0 && (
              <div className="glass-panel rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <iconify-icon icon="solar:document-text-linear" className="text-accent"></iconify-icon> Hot Topics
                  </span>
                  <button onClick={() => setActiveTab('news')} className="text-[9px] text-accent hover:text-accent/80 font-bold uppercase tracking-widest font-mono">See all →</button>
                </h3>
                <div className="space-y-3">
                  {news.slice(0, 4).map((a, i) => (
                    <button key={i} onClick={() => openNewsModal(a)}
                      className="w-full text-left group block">
                      <div className="text-[10px] text-slate-200 font-bold font-mono leading-normal group-hover:text-indigo-400 transition-colors line-clamp-2">{a.title}</div>
                      <div className="text-[8px] font-mono text-slate-500/40 mt-1 font-bold">{a.source}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <DetailModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        type={modalType} 
        data={selectedItem} 
        history={selectedItem ? marketHistory[selectedItem.symbol] : undefined}
      />
    </main>
  );
}

// AI Financial Intelligence Hub - Aggregate NSE markets feed telemetry and LLM reasoning
