'use client';

import React, { useState, useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api, streamAnalysis, AIChunk } from '@/lib/api';
import { 
  Sparkles, Terminal, Bell, HelpCircle, ArrowUpRight, 
  TrendingUp, TrendingDown, RefreshCw, Layers, Loader2,
  Activity, Cpu, Database, ShieldAlert, Cpu as CpuIcon
} from 'lucide-react';
import gsap from 'gsap';

// Dynamically import AdvancedChart with SSR disabled to prevent hydration issues
const AdvancedChart = dynamic(() => import('@/components/charts/AdvancedChart'), { ssr: false });

function AnimatedGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    let phi = 0;
    let width = 0;
    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 8000,
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
        state.phi = phi;
        phi += 0.003;
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
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', aspectRatio: 1 }} className="transition-opacity duration-1000 opacity-90 relative z-10" />;
}

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '➜  ~  PortAI Core Operating System v2.1.0 is online.',
    '➜  ~  Enter command: "analyze <symbol>" to launch agent cluster. (e.g. analyze RELIANCE)',
    '➜  ~  Type any finance query to talk directly to the AI Advisor cluster.'
  ]);
  
  const [marketIndices, setMarketIndices] = useState<any>({});
  const [topMovers, setTopMovers] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tickerForChart, setTickerForChart] = useState('RELIANCE');
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [miniGreeks, setMiniGreeks] = useState<any[]>([]);
  const [underlyingPrice, setUnderlyingPrice] = useState<number>(0);

  // Format currency dynamically based on asset name
  const formatIndexPrice = (name: string, price: number) => {
    if (!price) return 'N/A';
    if (name === 'USDINR') return `₹${price.toFixed(4)}`;
    if (['SP500', 'NASDAQ', 'DOW', 'VIX_US', 'GOLD', 'CRUDE'].includes(name)) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    setMounted(true);
    
    // GSAP fade-in effect on mount
    gsap.fromTo('.hero-fade-in', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1.0, stagger: 0.15, ease: 'power2.out' }
    );

    // Initial Data Fetches
    fetchMarketData();
    
    // Polling every 12s
    const idxInterval = setInterval(fetchMarketData, 12000);

    // Micro-fluctuation price tick simulator (simulates real-time Websocket data stream)
    const tickInterval = setInterval(() => {
      // Fluctuate indices
      setMarketIndices((prev: any) => {
        const next = { ...prev };
        Object.keys(next).forEach(name => {
          const item = next[name];
          if (!item) return;
          const pct = (Math.random() - 0.5) * 0.0004; // tiny fluctuation
          const delta = item.price * pct;
          next[name] = {
            ...item,
            price: Math.max(0.001, item.price + delta),
            change: item.change + delta,
            change_pct: item.change_pct + pct * 100
          };
        });
        return next;
      });

      // Fluctuate top movers
      setTopMovers((prev: any) => {
        if (!prev) return prev;
        const next = { ...prev };
        const tickQuote = (q: any) => {
          const pct = (Math.random() - 0.5) * 0.0004;
          const delta = q.current_price * pct;
          return {
            ...q,
            current_price: Math.max(0.1, q.current_price + delta),
            change: q.change + delta,
            change_pct: q.change_pct + pct * 100
          };
        };
        if (next.gainers) next.gainers = next.gainers.map(tickQuote);
        if (next.losers) next.losers = next.losers.map(tickQuote);
        return next;
      });
    }, 1800);

    return () => {
      clearInterval(idxInterval);
      clearInterval(tickInterval);
    };
  }, []);

  // Fetch greeks details whenever chart symbol switches
  useEffect(() => {
    if (!mounted) return;
    fetchGreeks();
  }, [tickerForChart, mounted]);

  const fetchMarketData = async () => {
    try {
      const idx = await api.market.indices();
      setMarketIndices(idx);
      
      const movers = await api.market.topMovers();
      setTopMovers(movers);
      
      const feeds = await api.news.feed();
      setNews(feeds);
    } catch (e) {
      console.error("Failed to sync live markets:", e);
    }
  };

  const fetchGreeks = async () => {
    try {
      const res = await api.options.chain(tickerForChart);
      if (res && res.chain) {
        setUnderlyingPrice(res.underlying_price || 0);
        // Find 3 strikes closest to underlying price
        const sorted = [...res.chain].sort((a, b) => 
          Math.abs(a.strike - res.underlying_price) - Math.abs(b.strike - res.underlying_price)
        );
        setMiniGreeks(sorted.slice(0, 3).sort((a, b) => a.strike - b.strike));
      }
    } catch (e) {
      console.error("Failed to fetch option greeks:", e);
      setMiniGreeks([]);
    }
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;
    
    setTerminalLogs(prev => [...prev, `➜  ~ ${cmd}`]);
    setTerminalInput('');
    
    const parts = cmd.split(' ');
    const commandName = parts[0].toLowerCase();
    
    if (commandName === 'analyze' && parts[1]) {
      const symbol = parts[1].toUpperCase();
      setTickerForChart(symbol);
      runTerminalAnalysis(symbol);
    } else if (commandName === 'clear') {
      setTerminalLogs([]);
      setChatHistory([]);
    } else if (commandName === 'help') {
      setTerminalLogs(prev => [
        ...prev,
        'Available commands:',
        '  analyze <symbol>   - Run multi-agent AI valuation report',
        '  chart <symbol>     - Switch interactive technical chart symbol',
        '  clear              - Clear terminal lines',
        '  help               - List helper commands',
        '  <any prompt>       - Chat directly with AI Financial Advisor'
      ]);
    } else if (commandName === 'chart' && parts[1]) {
      const symbol = parts[1].toUpperCase();
      setTickerForChart(symbol);
      setTerminalLogs(prev => [...prev, `[System] Chart symbol set to ${symbol}`]);
    } else {
      // General QA Chat prompt - Call actual LLM chat API
      setLoading(true);
      setTerminalLogs(prev => [...prev, `[System] Connecting to AI Advisor cluster...`]);
      
      const newHistory = [...chatHistory, { role: 'user', content: cmd }];
      setChatHistory(newHistory);
      
      try {
        const res = await api.ai.chat(newHistory, tickerForChart);
        const answer = res.answer;
        
        setChatHistory(prev => [...prev, { role: 'assistant', content: answer }]);
        
        // Typewriter streaming print simulation
        let printed = "";
        setTerminalLogs(prev => [...prev, `[AI Advisor] `]);
        
        let charIndex = 0;
        const typingInterval = setInterval(() => {
          if (charIndex < answer.length) {
            printed += answer[charIndex];
            setTerminalLogs(prev => {
              const next = [...prev];
              next[next.length - 1] = `[AI Advisor] ${printed}`;
              return next;
            });
            charIndex++;
          } else {
            clearInterval(typingInterval);
            setLoading(false);
          }
        }, 12);
      } catch (err: any) {
        setLoading(false);
        setTerminalLogs(prev => [...prev, `[Error] Failed to connect to models weights: ${err.message}`]);
      }
    }
  };

  const runTerminalAnalysis = (symbol: string) => {
    setLoading(true);
    setTerminalLogs(prev => [...prev, `[System] Initializing broker data sockets for ${symbol}...`]);
    
    streamAnalysis(
      symbol,
      'NSE',
      ['buffett', 'jhunjhunwala', 'graham', 'burry'],
      (chunk: AIChunk) => {
        if (chunk.type === 'status') {
          setTerminalLogs(prev => [...prev, `[Queue] ${chunk.message}`]);
        } else if (chunk.type === 'market_data') {
          setTerminalLogs(prev => [
            ...prev,
            `[Market] Data synced for ${symbol}: Price ₹${chunk.data.current_price} | PE: ${chunk.data.pe_ratio || 'N/A'} | Cap: ₹${(chunk.data.market_cap / 10000000).toFixed(0)} Cr.`
          ]);
        } else if (chunk.type === 'specialist') {
          setTerminalLogs(prev => [
            ...prev,
            `[Agent: ${chunk.agent}] Verdict: ${chunk.result.signal} (Conviction: ${chunk.result.confidence}%)`,
            `    > ${chunk.result.reasoning}`
          ]);
        } else if (chunk.type === 'persona') {
          setTerminalLogs(prev => [
            ...prev,
            `[Investor: ${chunk.persona}] Signal: ${chunk.result.signal} | "${chunk.result.reasoning}"`
          ]);
        } else if (chunk.type === 'final_verdict') {
          setTerminalLogs(prev => [
            ...prev,
            '-------------------------------------------------------',
            `👑 PORTAI CONSOLIDATED RECOMMENDATION: ${chunk.result.verdict}`,
            `    Score: ${chunk.result.score > 0 ? '+' : ''}${chunk.result.score} / Summary: ${chunk.result.summary}`,
            '-------------------------------------------------------'
          ]);
        } else if (chunk.type === 'error') {
          setTerminalLogs(prev => [...prev, `[Error] ${chunk.message}`]);
        }
      },
      () => {
        setLoading(false);
        setTerminalLogs(prev => [...prev, `➜  Analysis finished. Awaiting next query.`]);
      },
      (err) => {
        setLoading(false);
        setTerminalLogs(prev => [...prev, `[Socket Exception] Connection failed: ${err.message}`]);
      }
    );
  };

  return (
    <main className="w-full min-h-screen relative z-10 overflow-hidden bg-[#050508] text-slate-200">
      {/* Ambient Radial Background Glows */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-radial-gradient from-indigo-500/[0.04] to-transparent blur-[100px]" />
        <div className="absolute bottom-[20%] left-[20%] w-[500px] h-[500px] rounded-full bg-radial-gradient from-purple-500/[0.02] to-transparent blur-[120px]" />
      </div>

      {/* Scrolling Ticker Marquee */}
      <div className="w-full bg-zinc-950/80 border-b border-zinc-900 py-3 overflow-hidden backdrop-blur-md select-none sticky top-0 z-50">
        <div className="flex animate-[marquee_40s_linear_infinite] whitespace-nowrap gap-12 text-xs font-mono">
          {Object.entries(marketIndices).map(([name, data]: [string, any]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-zinc-500 font-bold">{name}</span>
              <span className="text-zinc-100 font-medium">{formatIndexPrice(name, data.price)}</span>
              <span className={`font-semibold ${data.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.change_pct >= 0 ? '▲' : '▼'} {data.change_pct?.toFixed(2)}%
              </span>
            </div>
          ))}
          {/* Duplicate list for loop effect */}
          {Object.entries(marketIndices).map(([name, data]: [string, any]) => (
            <div key={`${name}-dup`} className="flex items-center gap-2">
              <span className="text-zinc-500 font-bold">{name}</span>
              <span className="text-zinc-100 font-medium">{formatIndexPrice(name, data.price)}</span>
              <span className={`font-semibold ${data.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.change_pct >= 0 ? '▲' : '▼'} {data.change_pct?.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-6 space-y-6">
        
        {/* SME OS Header Control Dashboard */}
        <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <CpuIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-100 uppercase font-mono">PORTAI OPERATIONAL SYSTEM</h1>
              <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Hedge-Fund Grade Intelligence Workbench</p>
            </div>
          </div>

          {/* Diagnostic HUD stats (Blinking green/orange LEDs) */}
          <div className="flex flex-wrap items-center gap-6 font-mono text-[10px] text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>SYS STATUS: <span className="text-emerald-400 font-bold">OPERATIONAL</span></span>
            </div>
            <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>LIVE FEEDS: <span className="text-zinc-200">yfinance + nsepy</span></span>
            </div>
            <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>DATABASE: <span className="text-zinc-200">SUPABASE CONNECTED</span></span>
            </div>
            <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI NODES: <span className="text-emerald-400 font-bold">4/4 ONLINE</span></span>
            </div>
          </div>
        </section>

        {/* 3-Column Operational Workspace Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column 1: Market Tickers & Monitor (col-span-3) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Live Indices Grid */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Indices Tracker
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {Object.entries(marketIndices).slice(0, 4).map(([name, data]: [string, any]) => (
                  <div key={name} className="bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block">{name}</span>
                      <span className="text-xs font-bold text-zinc-200">{formatIndexPrice(name, data.price)}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${data.change_pct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {data.change_pct >= 0 ? '+' : ''}{data.change_pct?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
                {Object.keys(marketIndices).length === 0 && (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-zinc-900/30 rounded-xl animate-pulse" />
                  ))
                )}
              </div>
            </div>

            {/* Top Movers (NSE Gainers/Losers list) */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  NSE Movers
                </span>
                <button onClick={fetchMarketData} className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5" /> Reload
                </button>
              </div>

              <div className="space-y-3">
                {/* Gainers */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-wider block">Top Gainers</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {topMovers?.gainers?.slice(0, 4).map((stock: any) => (
                      <button key={stock.symbol} onClick={() => setTickerForChart(stock.symbol)}
                        className={`p-2 rounded-xl bg-zinc-900/30 border text-left text-[11px] font-mono transition-colors flex items-center justify-between ${
                          tickerForChart === stock.symbol ? 'border-indigo-500/40 text-indigo-400 font-bold' : 'border-zinc-900/50 hover:border-zinc-800 text-zinc-300'
                        }`}>
                        <span>{stock.symbol}</span>
                        <span className="text-emerald-400">+{stock.change_pct?.toFixed(1)}%</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Losers */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-wider block">Top Losers</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {topMovers?.losers?.slice(0, 4).map((stock: any) => (
                      <button key={stock.symbol} onClick={() => setTickerForChart(stock.symbol)}
                        className={`p-2 rounded-xl bg-zinc-900/30 border text-left text-[11px] font-mono transition-colors flex items-center justify-between ${
                          tickerForChart === stock.symbol ? 'border-indigo-500/40 text-indigo-400 font-bold' : 'border-zinc-900/50 hover:border-zinc-800 text-zinc-300'
                        }`}>
                        <span>{stock.symbol}</span>
                        <span className="text-red-400">{stock.change_pct?.toFixed(1)}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Column 2: Visualizations & Analytics Workspace (col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Interactive Charts Panel */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  TECHNICAL CHARTING LOGS
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">TRACKING: {tickerForChart}</span>
              </div>
              {mounted && <AdvancedChart symbol={tickerForChart} height={380} />}
            </div>

            {/* Live Option Greeks Panel (Centers around active symbol underlying price) */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 shadow-lg space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  {tickerForChart} Option Greeks Summary
                </span>
                <span className="text-[10px] text-zinc-400 font-bold">Underlying: ₹{underlyingPrice.toFixed(2)}</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[9px] leading-normal">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-900">
                      <th className="py-1.5">Call Delta</th>
                      <th className="py-1.5">Call IV</th>
                      <th className="py-1.5 text-center text-zinc-300 font-bold">Strike</th>
                      <th className="py-1.5 text-right">Put Delta</th>
                      <th className="py-1.5 text-right">Put IV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miniGreeks.map((row, i) => (
                      <tr key={i} className="border-b border-zinc-900/50 text-zinc-300 hover:bg-zinc-900/10">
                        <td className="py-2 text-emerald-400 font-semibold">{row.call.delta?.toFixed(2) || 'N/A'}</td>
                        <td className="py-2 text-zinc-400">{row.call.implied_volatility ? `${(row.call.implied_volatility * 100).toFixed(0)}%` : 'N/A'}</td>
                        <td className="py-2 text-center text-indigo-400 font-bold bg-zinc-900/10 border-x border-zinc-900/30">{row.strike}</td>
                        <td className="py-2 text-right text-red-400 font-semibold">{row.put.delta?.toFixed(2) || 'N/A'}</td>
                        <td className="py-2 text-right text-zinc-400">{row.put.implied_volatility ? `${(row.put.implied_volatility * 100).toFixed(0)}%` : 'N/A'}</td>
                      </tr>
                    ))}
                    {miniGreeks.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-zinc-600 text-[10px] italic">Option Greeks simulation pending...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* WebGL globe element for visual depth */}
            <div className="relative w-full aspect-[2.1/1] overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-900 flex items-center justify-center p-3 shadow-md">
              {mounted && <AnimatedGlobe />}
              <div className="absolute top-3 left-3 font-mono text-[8px] text-zinc-500 uppercase tracking-widest">
                <span className="text-indigo-400 animate-ping">▪</span> GLOBAL NETWORK STATUS
              </div>
            </div>

          </div>

          {/* Column 3: PortAI Operating Terminal & Specialists (col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* AI Terminal CLI console panel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  PortAI Operating Console
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              <div className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl shadow-xl flex flex-col overflow-hidden h-[460px] font-mono">
                {/* Header bar */}
                <div className="bg-zinc-900/50 px-3 py-2 flex items-center gap-3 border-b border-zinc-900 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500/40 border border-red-500/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/40 border border-yellow-500/60" />
                    <div className="w-2 h-2 rounded-full bg-green-500/40 border border-green-500/60" />
                  </div>
                  <div className="flex-1 text-center text-[9px] text-zinc-500 uppercase tracking-widest">
                    portai-agent-desk — sh — 80x24
                  </div>
                </div>
                
                {/* Terminal Logs */}
                <div className="p-3.5 flex-1 overflow-y-auto text-[11px] text-zinc-400 space-y-2 bg-[#050508]/90 select-text scrollbar-thin">
                  {terminalLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed whitespace-pre-wrap">
                      {log.startsWith('➜') ? (
                        <span className="text-indigo-400 font-bold">{log}</span>
                      ) : log.startsWith('[System]') ? (
                        <span className="text-zinc-500 font-light">{log}</span>
                      ) : log.startsWith('[Queue]') ? (
                        <span className="text-indigo-300 font-semibold">{log}</span>
                      ) : log.startsWith('[Market]') ? (
                        <span className="text-cyan-400 font-semibold">{log}</span>
                      ) : log.startsWith('[Agent:') ? (
                        <span className="text-emerald-400 font-medium">{log}</span>
                      ) : log.startsWith('[Investor:') ? (
                        <span className="text-purple-400">{log}</span>
                      ) : log.startsWith('[Error]') ? (
                        <span className="text-red-400 font-bold">{log}</span>
                      ) : log.includes('👑') ? (
                        <span className="text-yellow-400 font-bold">{log}</span>
                      ) : (
                        <span className="text-zinc-300">{log}</span>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 text-indigo-400 animate-pulse mt-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing weights with advisor cluster...</span>
                    </div>
                  )}
                </div>

                {/* Terminal Input Form */}
                <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 p-3 border-t border-zinc-900 bg-zinc-950 shrink-0">
                  <span className="text-indigo-400 text-xs shrink-0 font-bold">➜</span>
                  <span className="text-indigo-400 text-xs shrink-0 font-bold">~</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    disabled={loading}
                    className="bg-transparent border-none outline-none text-zinc-100 w-full placeholder-zinc-700 focus:placeholder-zinc-500 text-xs"
                    placeholder='Ask anything (e.g. "should I buy Reliance?" or "analyze tcs")...'
                    autoComplete="off"
                    spellCheck="false"
                  />
                </form>
              </div>
            </div>

            {/* Financial News Feed */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 shadow-lg space-y-4">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                Latest Financial Feeds
              </span>
              <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                {news.slice(0, 5).map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noreferrer"
                    className="block p-2 rounded-xl bg-zinc-900/10 border border-zinc-900 hover:border-zinc-800 transition-colors">
                    <div className="flex justify-between items-start mb-0.5 text-[9px] font-mono">
                      <span className="text-indigo-400 font-bold">{item.source}</span>
                      <span className="text-zinc-600 font-light">{item.publishedAt}</span>
                    </div>
                    <h5 className="text-[11px] font-bold text-zinc-300 hover:text-indigo-400 transition-colors leading-snug line-clamp-1">{item.title}</h5>
                  </a>
                ))}
                {news.length === 0 && (
                  <div className="text-zinc-600 text-[10px] font-mono uppercase italic animate-pulse">Syncing RSS news stream...</div>
                )}
              </div>
            </div>

          </div>

        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/20 py-10 mt-12 backdrop-blur-md">
        <div className="max-w-[1500px] mx-auto px-4 md:px-6 text-center md:text-left space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block mb-3">Core Modules</span>
              <ul className="space-y-1.5 text-xs font-mono text-zinc-500">
                <li><a href="/" className="hover:text-indigo-400 transition-colors">OS Workbench</a></li>
                <li><a href="/technical-charts" className="hover:text-indigo-400 transition-colors">Charts Console</a></li>
                <li><a href="/equities-screener" className="hover:text-indigo-400 transition-colors">Ratios Screener</a></li>
              </ul>
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block mb-3">Trading Desk</span>
              <ul className="space-y-1.5 text-xs font-mono text-zinc-500">
                <li><a href="/paper-trading" className="hover:text-indigo-400 transition-colors">Paper Trading</a></li>
                <li><a href="/options-chain" className="hover:text-indigo-400 transition-colors">Options Greeks</a></li>
                <li><a href="/alerts" className="hover:text-indigo-400 transition-colors">Price Alerts</a></li>
              </ul>
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block mb-3">Location</span>
              <p className="text-xs text-zinc-500 font-mono font-light">Mumbai / Bangalore, India</p>
              <p className="text-xs text-zinc-500 font-mono font-light">Distributed Cluster Node</p>
            </div>
            <div className="flex flex-col justify-between items-center md:items-end">
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block mb-2">Workbench Scroll</span>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 flex items-center justify-center transition-all duration-300">
                ↑
              </button>
            </div>
          </div>
          <div className="pt-6 border-t border-zinc-900/80 flex flex-col md:flex-row items-center justify-between text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
            <p>© 2026 PortAI (FinfreeX). All Systems Active.</p>
            <p className="flex gap-4">
              <span>All Services Operational</span>
              <span className="text-emerald-500 animate-pulse">●</span>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
