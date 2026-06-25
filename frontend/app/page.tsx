'use client';

import React, { useState, useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import StockChart from '../components/StockChart';
import DetailModal from '../components/DetailModal';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ReactBits Components
import ShinyText from '../components/reactbits/ShinyText';
import GradientText from '../components/reactbits/GradientText';
import CountUp from '../components/reactbits/CountUp';
import SpotlightCard from '../components/reactbits/SpotlightCard';
import StarBorder from '../components/reactbits/StarBorder';
import Particles from '../components/reactbits/Particles';
import LogoLoop from '../components/reactbits/LogoLoop/LogoLoop';
import TargetCursor from '../components/reactbits/TargetCursor/TargetCursor';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://portai-xsw3.onrender.com';

interface Analysis {
  summary: string;
  sentiment: string;
  key_insights: string[];
  risks: string[];
  recommendations: string[];
  data_sources: string[];
}

interface MarketIndex { price: number; change: number; change_pct: number; }
interface NewsArticle { title: string; source: string; url: string; publishedAt: string; description: string; }
interface TrendingStock { symbol: string; price: number; change: number; change_pct: number; }

function AnimatedGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    let phi = 0;
    let width = 0;
    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    }
    window.addEventListener('resize', onResize)
    onResize()

    if(!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 8000, // Optimized for performance
      mapBrightness: 6,
      baseColor: [0.15, 0.15, 0.25], 
      markerColor: [0.5, 0.55, 0.97], 
      glowColor: [0.15, 0.15, 0.3], 
      opacity: 0.8,
      markers: [
        { location: [20.5937, 78.9629], size: 0.1 }, // India
        { location: [37.7595, -122.4367], size: 0.06 }, // SF
        { location: [51.5074, -0.1278], size: 0.05 }, // London
        { location: [35.6762, 139.6503], size: 0.06 }, // Tokyo
        { location: [40.7128, -74.006], size: 0.04 }, // NY
      ],
      onRender: (state) => {
        state.phi = phi
        phi += 0.003
        // Handle resize within the render loop only if needed
        if (canvasRef.current && canvasRef.current.offsetWidth !== state.width / 2) {
          const newWidth = canvasRef.current.offsetWidth;
          state.width = newWidth * 2;
          state.height = newWidth * 2;
        }
      },
    });

    return () => {
      window.removeEventListener('resize', onResize);
      globe.destroy();
    }
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', aspectRatio: 1 }} className="transition-opacity duration-1000 opacity-90 relative z-10" />;
}

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [market, setMarket] = useState<Record<string, MarketIndex>>({});
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [apisUsed, setApisUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [marketTime, setMarketTime] = useState('');
  const [brokerToken, setBrokerToken] = useState<string | null>(null);
  const [brokerHoldings, setBrokerHoldings] = useState<any[]>([]);
  const [marketHistory, setMarketHistory] = useState<Record<string, any[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'stock' | 'news'>('stock');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    // Check for broker integration
    const token = localStorage.getItem('upstox_access_token');
    if (token) {
      setBrokerToken(token);
      fetchBrokerHoldings(token);
    }
    
    // Check for cached analysis from /portfolios page upload
    const cachedAnalysis = sessionStorage.getItem('cached_analysis');
    if (cachedAnalysis) {
      try {
        const parsed = JSON.parse(cachedAnalysis);
        setAnalysis(parsed.analysis);
        if (parsed.market) setMarket(parsed.market);
        if (parsed.apis_used) setApisUsed(parsed.apis_used);
        sessionStorage.removeItem('cached_analysis');
      } catch (e) {
        console.error("Failed to parse cached analysis", e);
      }
    }

    // Check for prefill from sectors page
    const prefill = sessionStorage.getItem('intelligence_prefill');
    if (prefill) {
      setQuery(prefill);
      sessionStorage.removeItem('intelligence_prefill');
    }

    fetchMarket();
    fetchNews();
    fetchTrendingStocks();
    fetchHistory('NIFTY 50');
    fetchHistory('SENSEX');
    
    // Auto-refresh market every 30 seconds, news every 2 minutes
    const interval = setInterval(() => {
      fetchMarket();
      fetchTrendingStocks();
    }, 30000);
    const newsInterval = setInterval(fetchNews, 120000);
    return () => {
      clearInterval(interval);
      clearInterval(newsInterval);
    };
  }, []);

  const fetchBrokerHoldings = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/broker/holdings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, broker: 'upstox' })
      });
      const data = await res.json();
      if (data.holdings) setBrokerHoldings(data.holdings);
    } catch (e) { console.error('Failed to fetch broker holdings', e); }
  };

  const fetchMarket = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/market`);
      const d = await r.json();
      setMarket(d.indices || {});
      setMarketTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) { console.error('Failed to fetch market data:', err); }
  };
  const fetchNews = async () => {
    try { const r = await fetch(`${API_BASE}/api/news`); const d = await r.json(); setNews(d.articles || []); } catch (err) { console.error('Failed to fetch news:', err); }
  };
  const fetchTrendingStocks = async () => {
    try { const r = await fetch(`${API_BASE}/api/trending-stocks`); const d = await r.json(); setTrendingStocks(d.stocks || []); } catch (err) { console.error('Failed to fetch trending stocks:', err); }
  };

  const fetchHistory = async (symbol: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/history/${encodeURIComponent(symbol)}?period=1mo`);
      const d = await r.json();
      if (d.history) {
        setMarketHistory(prev => ({ ...prev, [symbol]: d.history }));
      }
    } catch (err) { console.error(`Failed to fetch history for ${symbol}:`, err); }
  };

  const runAnalysis = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setAnalysis(null); setApisUsed([]);
    
    let ctx = '';
    if (brokerHoldings.length > 0) {
      ctx = `User Strategy/Portfolio Holdings from Upstox Broker Integration:\n${JSON.stringify(brokerHoldings, null, 2)}`;
    }

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context: ctx }),
      });
      const data = await res.json();
      setAnalysis(data.analysis);
      setMarket(data.market || market);
      setApisUsed(data.apis_used || []);
    } catch {
      setError('The AI engine is syncing. Please refresh in 10 seconds.');
    } finally { setLoading(false); }
  };

  const openStockModal = (sym: string, currentData: any) => {
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
    <main className="w-full h-full relative z-10">
      {/* Hero Section with Globe + Particles Background */}
      <section className="overflow-hidden pt-40 pb-20 relative border-b border-white/[0.06]">
          {/* Particles Background */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <Particles
              particleCount={120}
              particleSpread={15}
              speed={0.08}
              particleColors={['#818CF8', '#E2E8F0', '#818CF8', '#64748B']}
              alphaParticles={true}
              particleBaseSize={80}
              sizeRandomness={0.8}
              cameraDistance={25}
              className="w-full h-full"
            />
          </div>

          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
              
              {/* Hero Content */}
              <div className="z-10 relative">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.04] shadow-lg shadow-black/20 text-[10px] tracking-wide mb-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                      <ShinyText text="SMART AI-POWERED INSIGHTS" speed={3} color="#818CF8" shineColor="#E2E8F0" className="text-[10px] font-mono tracking-widest font-semibold" />
                  </div>
                  <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.1] mb-6 text-slate-100">
                      Your personal <br/>
                      <GradientText colors={['#818CF8', '#E2E8F0', '#818CF8', '#E2E8F0']} animationSpeed={5} className="inline-flex text-5xl md:text-7xl font-semibold tracking-tighter">
                        AI financial analyst.
                      </GradientText>
                  </h1>
                  <p className="text-slate-400 text-base md:text-lg font-light mb-8 max-w-md leading-relaxed text-balance">
                      Understand the Indian stock market with ease. Get clear, real-time insights, breaking news, and simple AI-powered analysis for your portfolio.
                  </p>
                  
                  {/* Live Status Indicator */}
                  <div className="flex items-center gap-4 mb-8">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/5 border border-accent/15">
                          <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                          <span className="text-[11px] text-accent font-semibold font-mono">All Systems Operational</span>
                      </div>
                      <div className="text-xs">
                          <ShinyText text="5+ Live Data Sources" speed={4} color="#64748B" shineColor="#E2E8F0" className="text-xs font-mono" />
                      </div>
                  </div>
              </div>

              {/* 3D Globe Visualization */}
              <div className="relative h-[400px] w-full flex items-center justify-center">
                  <SpotlightCard className="relative w-full aspect-square max-w-md rounded-3xl shadow-2xl flex items-center justify-center glass-panel" spotlightColor="rgba(129, 140, 248, 0.1)">
                      <AnimatedGlobe />
                      
                      {/* Floating UI on Globe */}
                      <div className="absolute top-6 left-6 z-20 pointer-events-none">
                          <div className="flex items-center gap-2 mb-1">
                              <iconify-icon icon="solar:globe-linear" className="text-accent"></iconify-icon>
                              <span className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-widest">GLOBAL NETWORK</span>
                          </div>
                          <div className="text-[10px] text-secondary/70">AI models and data aggregated globally</div>
                      </div>

                      <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none">
                          <div className="bg-white/[0.04] backdrop-blur-md rounded-xl p-3 border border-white/[0.06] flex items-center justify-between shadow-lg shadow-black/20">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                      <iconify-icon icon="solar:chart-2-linear"></iconify-icon>
                                  </div>
                                  <div>
                                      <div className="text-xs font-semibold text-slate-200">NIFTY 50</div>
                                      <div className="text-[10px] text-secondary/70">Analyst Model Active...</div>
                                  </div>
                              </div>
                              <span className="text-[10px] text-accent font-bold font-mono tracking-wider">+ LIVE</span>
                          </div>
                      </div>
                  </SpotlightCard>
                  
                  {/* Background Glow */}
                  <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-accent/5 blur-[100px] rounded-full pointer-events-none"></div>
              </div>
          </div>
      </section>

      {/* ── Trending Indices (Live) ─────────────────── */}
      <section id="markets" className="border-b border-white/[0.06] bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                          <iconify-icon icon="solar:graph-up-linear" width="22"></iconify-icon>
                      </div>
                      <div>
                          <h2 className="text-base font-semibold text-slate-200">Live Market Indices</h2>
                          <p className="text-[10px] text-slate-500">Auto-refreshes every 30s</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-accent text-[11px] font-bold font-mono tracking-widest flex items-center gap-1.5 bg-accent/5 border border-accent/10 px-3 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                          Live • {marketTime || '--:--:--'}
                      </span>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(market).length > 0 ? Object.entries(market).map(([name, data]) => (
                      <SpotlightCard
                        key={name}
                        className="rounded-xl glass-panel border border-white/[0.06] hover:border-white/[0.08] cursor-pointer"
                        spotlightColor={data.change_pct >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}
                      >
                      <button 
                        onClick={() => openStockModal(name, data)}
                        className="text-left p-5 hover:bg-white/[0.02] transition-all group w-full"
                      >
                          <div className="flex justify-between items-start mb-4 text-left">
                            <div>
                                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">{name}</div>
                                <div className="text-lg font-semibold text-slate-200 tracking-tight">₹{data.price?.toLocaleString('en-IN')}</div>
                            </div>
                            <div className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${data.change_pct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {data.change_pct >= 0 ? '+' : ''}{data.change_pct?.toFixed(2)}%
                            </div>
                          </div>
                          
                          {/* Miniature Chart */}
                          <div className="h-10 w-full mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            {marketHistory[name] ? (
                              <StockChart 
                                data={marketHistory[name]} 
                                color={data.change_pct >= 0 ? '#059669' : '#dc2626'} 
                                height={40} 
                                label={name}
                              />
                            ) : (
                              <div className="h-full w-full flex items-end gap-1 px-1 opacity-10">
                                {[...Array(15)].map((_, i) => (
                                  <div key={i} className="flex-1 bg-white/[0.1] rounded-t-sm" style={{ height: `${20 + Math.random() * 80}%` }}></div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-500 group-hover:text-accent transition-colors text-xs font-semibold mt-3 flex items-center gap-1">
                            Analyze details <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>
                          </div>
                      </button>
                      </SpotlightCard>
                  )) : (
                      Array.from({length: 5}).map((_, i) => (
                          <div key={i} className="glass-panel rounded-xl p-4 animate-pulse">
                              <div className="h-3 w-20 bg-white/[0.05] rounded mb-3"></div>
                              <div className="h-6 w-24 bg-white/[0.05] rounded mb-2"></div>
                              <div className="h-4 w-16 bg-white/[0.05] rounded"></div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </section>

      {/* ── Trending Stocks Today ─────────────────── */}
      <section className="border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                          <iconify-icon icon="solar:fire-linear" width="22"></iconify-icon>
                      </div>
                      <div>
                          <h2 className="text-base font-semibold text-slate-200">Top Stocks Today</h2>
                          <p className="text-[10px] text-slate-500">Popular NSE stocks • Updated live</p>
                      </div>
                  </div>
                  <button onClick={fetchTrendingStocks} className="text-[10px] font-semibold px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all">
                      ↻ Refresh
                  </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {trendingStocks.length > 0 ? trendingStocks.map((stock) => (
                      <SpotlightCard
                        key={stock.symbol}
                        className="rounded-xl glass-panel border border-transparent hover:border-white/[0.06] cursor-pointer"
                        spotlightColor={stock.change_pct >= 0 ? 'rgba(16, 185, 129, 0.06)' : 'rgba(244, 63, 94, 0.06)'}
                      >
                      <div 
                        onClick={() => openStockModal(stock.symbol, stock)}
                        className="p-4 hover:bg-white/[0.02] transition-all group"
                      >
                          <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-slate-200 font-mono">{stock.symbol}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold font-mono ${stock.change_pct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {stock.change_pct >= 0 ? '▲' : '▼'} {Math.abs(stock.change_pct)}%
                              </span>
                          </div>
                          <div className="text-lg font-semibold text-slate-200">₹{stock.price?.toLocaleString('en-IN')}</div>
                          <div className={`text-[10px] font-mono mt-1 ${stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2)}
                          </div>
                      </div>
                      </SpotlightCard>
                  )) : (
                      Array.from({length: 5}).map((_, i) => (
                          <div key={i} className="glass-panel rounded-xl p-4 animate-pulse">
                              <div className="h-3 w-16 bg-white/[0.05] rounded mb-3"></div>
                              <div className="h-5 w-20 bg-white/[0.05] rounded mb-2"></div>
                              <div className="h-3 w-12 bg-white/[0.05] rounded"></div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </section>

      {/* ── Market-Moving Headlines ─────────────────── */}
      <section className="border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                          <iconify-icon icon="solar:document-text-linear" width="22"></iconify-icon>
                      </div>
                      <div>
                          <h2 className="text-base font-semibold text-slate-200">Latest Financial News</h2>
                          <p className="text-[10px] text-slate-500">Updates from the Indian business landscape</p>
                      </div>
                  </div>
                  <button onClick={fetchNews} className="text-[10px] font-semibold px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all">
                      ↻ Refresh
                  </button>
              </div>
              {/* Headline Tape - Horizontal Scroll */}
              <div className="overflow-x-auto scrollbar-hide pb-2">
                  <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                      {news.length > 0 ? news.slice(0, 24).map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex-shrink-0 w-[320px] glass-panel rounded-xl p-5 hover:bg-white/[0.02] transition-all group border border-transparent hover:border-white/[0.06]">
                              <div className="flex items-center gap-2 mb-3">
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold font-mono">{a.source}</span>
                                  {a.publishedAt && <span className="text-[9px] font-mono text-slate-500/50">{new Date(a.publishedAt).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}</span>}
                              </div>
                              <h3 className="text-sm text-slate-200 font-semibold leading-snug group-hover:text-indigo-400 transition-colors mb-2">{a.title}</h3>
                              {a.description && <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{a.description}</p>}
                          </a>
                      )) : (
                          Array.from({length: 4}).map((_, i) => (
                              <div key={i} className="flex-shrink-0 w-[320px] glass-panel rounded-xl p-5 animate-pulse">
                                  <div className="h-3 w-16 bg-white/[0.05] rounded mb-4"></div>
                                  <div className="h-4 w-full bg-white/[0.05] rounded mb-2"></div>
                                  <div className="h-4 w-3/4 bg-white/[0.05] rounded mb-3"></div>
                                  <div className="h-3 w-full bg-white/[0.05] rounded"></div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      </section>

      {/* Stats Section with CountUp */}
      <section id="sectors" className="border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <SpotlightCard className="rounded-xl p-4 border border-white/[0.06] bg-white/[0.03]" spotlightColor="rgba(129, 140, 248, 0.05)">
                      <div className="text-3xl font-semibold tracking-tight text-slate-200 mb-1 flex items-baseline gap-1">
                        <span className="text-indigo-400">&lt;</span>
                        <CountUp to={3} duration={2} className="text-3xl font-semibold tracking-tight text-slate-200" />
                        <span className="text-indigo-400">s</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">Lightning Reports</div>
                  </SpotlightCard>
                  <SpotlightCard className="rounded-xl p-4 border border-white/[0.06] bg-white/[0.03]" spotlightColor="rgba(129, 140, 248, 0.05)">
                      <div className="text-3xl font-semibold tracking-tight text-slate-200 mb-1 flex items-baseline gap-1">
                        <CountUp to={5} duration={2} className="text-3xl font-semibold tracking-tight text-slate-200" />
                        <span className="text-indigo-400">+</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">Live Data Feeds</div>
                  </SpotlightCard>
                  <SpotlightCard className="rounded-xl p-4 border border-white/[0.06] bg-white/[0.03]" spotlightColor="rgba(129, 140, 248, 0.05)">
                      <div className="text-3xl font-semibold tracking-tight text-slate-200 mb-1 flex items-baseline gap-1">
                        <CountUp to={99} duration={2.5} className="text-3xl font-semibold tracking-tight text-slate-200" />
                        <span className="text-indigo-400">%</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">Model Accuracy</div>
                  </SpotlightCard>
                  <SpotlightCard className="rounded-xl p-4 border border-white/[0.06] bg-white/[0.03]" spotlightColor="rgba(129, 140, 248, 0.05)">
                      <div className="text-3xl font-semibold tracking-tight text-slate-200 mb-1 flex items-baseline gap-1">
                        <CountUp to={24} duration={2} className="text-3xl font-semibold tracking-tight text-slate-200" />
                        <span className="text-indigo-400">/7</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">Market Scans</div>
                  </SpotlightCard>
              </div>
          </div>
      </section>

      <div id="intelligence" className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Panel ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-200 mb-1 relative z-10">AI Portfolio Analyst</h2>
            <p className="text-slate-400 text-xs mb-5 relative z-10 max-w-xl">Ask anything about your investments. PortAI uses real-time market data to provide clear, actionable advice tailored to your needs.</p>

            <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={4}
              placeholder="e.g. Is it a good time to buy Tata Motors for long term holding?"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors resize-none relative z-10"
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-4 relative z-10">
              <button
                onClick={runAnalysis}
                disabled={loading || !query.trim()}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 ${loading || !query.trim() ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Processing...
                  </span>
                ) : (<><iconify-icon icon="solar:stars-minimalistic-bold" width="16"></iconify-icon> Start Analysis</>)}
              </button>
              <button onClick={() => setQuery('')}
                className="px-8 py-3 rounded-full border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors text-xs font-bold">
                Clear
              </button>
            </div>

            {error && <div className="mt-3 text-xs text-red-400 relative z-10 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</div>}
          </div>

          {/* Analysis Result */}
          {analysis && (
            <div className="space-y-5 fade-up">
              {/* APIs used banner */}
              {apisUsed.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    Aggregated Via
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {apisUsed.map(api => (
                      <span key={api} className="text-[10px] font-mono px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-200 font-semibold">{api}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
                <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none">
                    <iconify-icon icon="solar:document-text-linear" style={{fontSize: "120px"}}></iconify-icon>
                </div>
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <h3 className="text-base font-semibold text-slate-200">AI Analysis Summary</h3>
                  <div className="flex gap-2">
                    <button onClick={() => window.print()} className="px-3 py-1 flex items-center gap-1 hover:bg-white/[0.05] transition-colors rounded-lg text-slate-400 hover:text-white text-[10px] font-semibold">
                        <iconify-icon icon="solar:printer-linear"></iconify-icon> Print
                    </button>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold border shadow-sm uppercase ${sentimentBg(analysis.sentiment)} ${sentimentColor(analysis.sentiment)}`}>
                        {analysis.sentiment} Signal
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed relative z-10">{analysis.summary}</p>
              </div>

              {/* Insights + Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="glass-panel hover:bg-white/[0.02] transition-colors rounded-2xl p-6 border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                      <iconify-icon icon="solar:lightbulb-linear" width="24"></iconify-icon>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-200 mb-2">Important Insights</h3>
                  <ul className="space-y-3 mt-4">
                    {analysis.key_insights?.map((ins, i) => (
                      <li key={i} className="flex gap-3 text-xs text-slate-400 leading-relaxed">
                        <span className="text-emerald-400 mt-0.5 shrink-0"><iconify-icon icon="solar:check-circle-linear"></iconify-icon></span>
                        {ins}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="glass-panel hover:bg-white/[0.02] transition-colors rounded-2xl p-6 border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mb-4">
                      <iconify-icon icon="solar:danger-triangle-linear" width="24"></iconify-icon>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-200 mb-2">Potential Risks</h3>
                  <ul className="space-y-3 mt-4">
                    {analysis.risks?.map((r, i) => (
                      <li key={i} className="flex gap-3 text-xs text-slate-400 leading-relaxed">
                        <span className="text-red-400 mt-0.5 shrink-0"><iconify-icon icon="solar:close-circle-linear"></iconify-icon></span>
                        {r}
                      </li>
                    ))}
                    {(!analysis.risks || analysis.risks.length === 0) && <li className="text-xs text-slate-500/40 italic">No risks identified.</li>}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div className="glass-panel bg-gradient-to-br from-indigo-500/[0.02] to-transparent rounded-2xl p-6 relative overflow-hidden group border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <iconify-icon icon="solar:target-linear" width="20"></iconify-icon>
                    </div>
                    <h3 className="text-xs font-semibold text-slate-200">Recommended Actions</h3>
                </div>
                <div className="space-y-3 relative z-10">
                  {analysis.recommendations?.map((rec, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-md shadow-black/10">
                        <div className="w-6 h-6 rounded bg-indigo-500 text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0">{i+1}</div>
                        <div className="text-xs text-slate-300 font-medium">{rec}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!analysis && !loading && (
            <div className="glass-panel rounded-2xl p-16 text-center border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-6 shadow-inner text-indigo-400">
                <iconify-icon icon="solar:chart-square-linear" width="32"></iconify-icon>
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-2">Awaiting Your Question</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-8">
                Initiate an analysis of Indian stocks or portfolios to see your custom report here.
              </p>

              {/* Example Queries */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'Analyze TCS vs Infosys for long term',
                  'Impact of RBI rate cut on HDFC Bank',
                  'Is Nifty 50 overvalued right now?',
                ].map((q) => (
                  <button key={q} onClick={() => setQuery(q)}
                    className="text-[10px] font-semibold px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:border-indigo-400 hover:bg-indigo-500/10 transition-all shadow-md shadow-black/10">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ─────────────────────── */}
        <div className="space-y-6">
          
          {/* Market Ticker Sidebar Variant */}
          <div className="glass-panel rounded-2xl p-5 border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
            <h3 className="text-xs font-semibold text-slate-200 flex justify-between items-center mb-4">
              Market Overview
              <iconify-icon icon="solar:graph-up-linear" className="text-indigo-400"></iconify-icon>
            </h3>
            <div className="space-y-3">
              {Object.entries(market).map(([name, data]) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 transition-colors">
                  <div className="text-xs font-semibold text-slate-300 font-mono">{name}</div>
                  <div className="text-right">
                    <div className="text-xs text-slate-200 font-semibold font-mono">₹{data.price?.toLocaleString('en-IN')}</div>
                    <div className={`text-[10px] font-mono font-bold ${data.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.change_pct >= 0 ? '+' : ''}{data.change_pct}%
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(market).length === 0 && <div className="text-[10px] text-slate-500 font-mono uppercase italic">Loading...</div>}
            </div>
          </div>

          {/* News */}
          <div className="glass-panel rounded-2xl p-5 group border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                🇮🇳 News Feed
              </h3>
              <button onClick={fetchNews} className="text-[9px] w-6 h-6 flex items-center justify-center rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">↻</button>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-hide">
              {news.map((a, i) => (
                <a 
                  key={i} 
                  href={a.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full text-left block p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all cursor-pointer group no-underline"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-[9px] text-indigo-400/80 mb-1 font-bold font-mono">{a.source}</div>
                    <iconify-icon icon="solar:link-linear" className="text-slate-500 group-hover:text-indigo-400 transition-colors"></iconify-icon>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{a.title}</p>
                </a>
              ))}
              {news.length === 0 && <p className="text-xs text-slate-500 font-mono uppercase italic">Loading news...</p>}
            </div>
          </div>

        </div>
      </div>
      
      {/* Footer styled similarly */}
      <footer className="border-t border-white/[0.06] pt-16 pb-8 bg-[#0D0D15]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
                <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-4 font-mono text-xs font-bold uppercase tracking-widest text-indigo-400">
                        <iconify-icon icon="solar:shield-check-bold" className="text-indigo-400"></iconify-icon>
                        <span>PortAI</span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                        Clear, AI-driven financial insights to help Indian investors make smarter decisions.
                    </p>
                </div>
                
                <div>
                    <h4 className="text-[10px] font-bold text-slate-200 mb-4">Platform</h4>
                    <ul className="space-y-2 text-xs text-slate-400 font-medium">
                        <li><a href="#" className="hover:text-indigo-400 transition-colors">Portfolios</a></li>
                        <li><a href="#" className="hover:text-indigo-400 transition-colors">Risk Models</a></li>
                        <li><a href="#" className="hover:text-indigo-400 transition-colors">API Docs</a></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="text-[10px] font-bold text-slate-200 mb-4">Intelligence</h4>
                    <ul className="space-y-2 text-xs text-slate-400 font-medium">
                        <li><a href="#" className="hover:text-indigo-400 transition-colors">Sectors</a></li>
                        <li><a href="#" className="hover:text-indigo-400 transition-colors">Macro</a></li>
                        <li><a href="#" className="hover:text-indigo-400 transition-colors">Sentiment</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-[10px] font-bold text-slate-200 mb-4">Legal</h4>
                    <ul className="space-y-2 text-xs text-slate-400 font-medium">
                        <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms</a></li>
                        <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a></li>
                    </ul>
                </div>
            </div>
            
            <div className="flex items-center justify-between pt-8 border-t border-white/[0.06] font-mono text-[9px] uppercase tracking-widest text-slate-500">
                <p>© 2026 PortAI. All rights reserved.</p>
                <div className="flex gap-4 text-slate-500">
                    <iconify-icon icon="solar:brand-twitter-linear" className="hover:text-indigo-400 cursor-pointer" width="16"></iconify-icon>
                    <iconify-icon icon="solar:brand-linkedin-linear" className="hover:text-indigo-400 cursor-pointer" width="16"></iconify-icon>
                </div>
            </div>
        </div>
      </footer>
      {/* Detail Modal */}
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

// PortAI Landing Page - Underpinned by premium Plus Jakarta Sans typography and Indigo gradients
