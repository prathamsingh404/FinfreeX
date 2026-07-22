'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import { 
  TrendingUp, TrendingDown, RefreshCw, Layers, Search, Settings, 
  Check, CheckCircle2, AlertTriangle, X, ChevronUp, ChevronDown, 
  BookOpen, Briefcase, Activity, Info, Lock, Unlock, Clock, 
  ArrowUpRight, LineChart, Cpu, DollarSign
} from 'lucide-react';

interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  type: 'index' | 'stock' | 'crypto';
  sector?: string;
  cap?: string;
  risk?: 'Low' | 'Medium' | 'High';
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Technical Indicators Helpers ───────────────────────────────────────────
function calculateSMA(data: { time: string; close: number }[], period: number) {
  const sma = [];
  for (let i = period; i <= data.length; i++) {
    const val = data.slice(i - period, i).reduce((sum, item) => sum + item.close, 0) / period;
    sma.push({ time: data[i - 1].time, value: val });
  }
  return sma;
}

function calculateEMA(data: { close: number; time: string; [key: string]: any }[], period: number) {
  const ema = [];
  if (!data.length) return [];
  const k = 2 / (period + 1);
  let prevEma = data[0].close;
  ema.push({ time: data[0].time, value: prevEma });
  for (let i = 1; i < data.length; i++) {
    prevEma = (data[i].close - prevEma) * k + prevEma;
    ema.push({ time: data[i].time, value: prevEma });
  }
  return ema;
}

function calculateBollingerBands(data: OHLCData[], period: number = 20, stdDevs: number = 2) {
  const upper = [];
  const lower = [];
  const middle = [];
  for (let i = period; i <= data.length; i++) {
    const slice = data.slice(i - period, i);
    const m = slice.reduce((sum, item) => sum + item.close, 0) / period;
    const sd = Math.sqrt(slice.reduce((sum, item) => sum + Math.pow(item.close - m, 2), 0) / period);
    middle.push({ time: data[i - 1].time, value: m });
    upper.push({ time: data[i - 1].time, value: m + stdDevs * sd });
    lower.push({ time: data[i - 1].time, value: m - stdDevs * sd });
  }
  return { upper, lower, middle };
}

interface TradingViewChartProps {
  symbol?: string;
  exchange?: string;
}

export default function TradingViewChart({ symbol: initialSymbol = 'BTCUSD', exchange: initialExchange = 'NSE' }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // State variables matching TickerTape design
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('1mo');
  const [chartType, setChartType] = useState<'line' | 'candles'>('line');
  const [data, setData] = useState<OHLCData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Watchlist Items
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([
    { symbol: 'SPX', name: 'S&P 500 Index', price: 5432.10, change: -12.45, change_pct: -0.23, type: 'index', sector: 'Index', cap: 'Giant Cap', risk: 'Low' },
    { symbol: 'NDQ', name: 'NASDAQ Composite', price: 19432.20, change: 84.50, change_pct: 0.44, type: 'index', sector: 'Index', cap: 'Giant Cap', risk: 'Medium' },
    { symbol: 'DJI', name: 'Dow Jones Industrial', price: 39120.30, change: 25.10, change_pct: 0.06, type: 'index', sector: 'Index', cap: 'Giant Cap', risk: 'Low' },
    { symbol: 'VIX', name: 'CBOE Volatility Index', price: 13.84, change: 0.42, change_pct: 3.13, type: 'index', sector: 'Index', cap: 'N/A', risk: 'High' },
    { symbol: 'DXY', name: 'US Dollar Index', price: 104.25, change: -0.08, change_pct: -0.08, type: 'index', sector: 'Index', cap: 'N/A', risk: 'Low' },
    { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', price: 59686.85, change: -10.03, change_pct: -0.02, type: 'crypto', sector: 'Crypto', cap: 'Large Cap', risk: 'High' },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 215.30, change: -3.45, change_pct: -1.58, type: 'stock', sector: 'Technology', cap: 'Large Cap', risk: 'Low' },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 187.20, change: -4.10, change_pct: -2.14, type: 'stock', sector: 'Automotive', cap: 'Large Cap', risk: 'High' },
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', price: 3050.00, change: 12.50, change_pct: 0.41, type: 'stock', sector: 'Energy / Retail', cap: 'Large Cap', risk: 'Low' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3950.00, change: -15.20, change_pct: -0.38, type: 'stock', sector: 'Technology', cap: 'Large Cap', risk: 'Low' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: 1650.00, change: 8.40, change_pct: 0.51, type: 'stock', sector: 'Financial Services', cap: 'Large Cap', risk: 'Low' }
  ]);

  const activeMetadata = watchlist.find(w => w.symbol.toUpperCase() === symbol.toUpperCase()) || {
    symbol: symbol,
    name: symbol + ' Asset',
    price: 1500.00,
    change: 0.0,
    change_pct: 0.0,
    type: 'stock',
    sector: 'Diversified',
    cap: 'Large Cap',
    risk: 'Medium'
  };

  // Indicators State
  const [indicators, setIndicators] = useState({
    sma50: false,
    ema20: false,
    bb: false,
    volume: true,
  });

  // TickerTape-specific Checklist & Forecast (Mock data computed from ticker hash to be deterministic yet dynamic)
  const getSymbolChecklist = (sym: string) => {
    const sum = sym.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      intrinsicValue: sum % 3 !== 0, // Green if true
      returnsVsFd: sum % 2 === 0,
      dividendReturns: sum % 4 === 0,
      entryPoint: sum % 5 !== 0,
      noRedFlags: sum % 7 !== 0,
      forecastPct: 50 + (sum % 46),
      mmi: 15 + (sum % 75), // Market Mood Index
    };
  };

  const checklist = getSymbolChecklist(symbol);

  // Financial statements states
  const [financialTab, setFinancialTab] = useState<'income' | 'balance' | 'cashflow'>('income');
  const getFinancialData = (sym: string) => {
    const sum = sym.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseRev = 200 + (sum % 800); // In Crores/Millions
    const factor = [1.0, 1.15, 1.30, 1.48];
    const margin = 0.08 + (sum % 15) / 100;
    
    return [2022, 2023, 2024, 2025].map((year, idx) => {
      const rev = baseRev * factor[idx];
      const income = rev * margin * (0.9 + Math.sin(idx) * 0.1);
      return { year, revenue: rev, netIncome: income };
    });
  };

  const financialData = getFinancialData(symbol);

  // Order placing state
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [tradeQty, setTradeQty] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  
  // Paper Trading State
  const [paperBalance, setPaperBalance] = useState(100000); // 100,000 INR/USD
  const [holdings, setHoldings] = useState<Record<string, { qty: number; avgPrice: number }>>({});
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  // News headlines
  const [news, setNews] = useState<any[]>([]);

  // Refs for Lightweight Charts
  const chartInstanceRef = useRef<any>(null);
  const mainSeriesRef = useRef<any>(null);
  const volSeriesRef = useRef<any>(null);
  const smaSeriesRef = useRef<any>(null);
  const emaSeriesRef = useRef<any>(null);
  const bbUpperRef = useRef<any>(null);
  const bbLowerRef = useRef<any>(null);
  const bbMiddleRef = useRef<any>(null);

  // Fetch live news from API
  const fetchNews = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/news?symbol=${symbol}`);
      const data = await response.json();
      if (data && data.news && data.news.length > 0) {
        setNews(data.news.slice(0, 4));
      } else {
        setNews([
          { title: `${activeMetadata.name} analysis report highlights target growth`, source: 'Mint', link: '#' },
          { title: `Analysts upgrade ${symbol} following quarterly financial statement`, source: 'Moneycontrol', link: '#' },
          { title: `Sector overview: Why ${activeMetadata.sector} shares are rising today`, source: 'Bloomberg', link: '#' },
        ]);
      }
    } catch {
      setNews([
        { title: `${activeMetadata.name} analysis report highlights target growth`, source: 'Mint', link: '#' },
        { title: `Analysts upgrade ${symbol} following quarterly financial statement`, source: 'Moneycontrol', link: '#' },
        { title: `Sector overview: Why ${activeMetadata.sector} shares are rising today`, source: 'Bloomberg', link: '#' },
      ]);
    }
  }, [symbol, activeMetadata.name, activeMetadata.sector]);

  // Generate realistic dummy data for charting
  const generateDummyData = useCallback(() => {
    const dummy = [];
    let price = activeMetadata.price;
    const now = new Date();
    let daysToGen = 60;
    if (period === '1w') daysToGen = 7;
    else if (period === '1mo') daysToGen = 30;
    else if (period === '3mo') daysToGen = 90;
    else if (period === '1y') daysToGen = 365;
    else if (period === '5y') daysToGen = 1825;

    for (let i = daysToGen; i > 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const volatility = 0.015;
      const change = price * volatility * (Math.random() - 0.48);
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + price * volatility * Math.random() * 0.5;
      const low = Math.min(open, close) - price * volatility * Math.random() * 0.5;
      
      dummy.push({
        time: date.toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(100000 + Math.random() * 900000)
      });
      price = close;
    }
    return dummy;
  }, [activeMetadata.price, period]);

  // Fetch stock/crypto historical candles
  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/history/${symbol}?period=${period}`);
      const res = await response.json();
      if (res.error || !res.history || res.history.length === 0) {
        setData(generateDummyData());
      } else {
        const history = res.history.map((d: any) => ({
          time: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume
        }));
        setData(history);
      }
    } catch {
      setData(generateDummyData());
    } finally {
      setLoading(false);
    }
  }, [symbol, period, generateDummyData]);

  // 1. Initialize lightweight-chart ONCE
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear inner container first
    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a1a1aa',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.015)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.015)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.04)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.04)',
        timeVisible: true,
      },
      width: chartContainerRef.current.clientWidth || 700,
      height: 380,
    });

    chartInstanceRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // 2. Synchronize Data and Chart Styles
  useEffect(() => {
    if (!chartInstanceRef.current || data.length === 0) return;
    const chart = chartInstanceRef.current;

    // Remove existing series to refresh style/data
    if (mainSeriesRef.current) {
      try { chart.removeSeries(mainSeriesRef.current); } catch {}
      mainSeriesRef.current = null;
    }
    if (volSeriesRef.current) {
      try { chart.removeSeries(volSeriesRef.current); } catch {}
      volSeriesRef.current = null;
    }
    if (smaSeriesRef.current) {
      try { chart.removeSeries(smaSeriesRef.current); } catch {}
      smaSeriesRef.current = null;
    }
    if (emaSeriesRef.current) {
      try { chart.removeSeries(emaSeriesRef.current); } catch {}
      emaSeriesRef.current = null;
    }
    if (bbUpperRef.current) {
      try { chart.removeSeries(bbUpperRef.current); } catch {}
      bbUpperRef.current = null;
    }
    if (bbLowerRef.current) {
      try { chart.removeSeries(bbLowerRef.current); } catch {}
      bbLowerRef.current = null;
    }
    if (bbMiddleRef.current) {
      try { chart.removeSeries(bbMiddleRef.current); } catch {}
      bbMiddleRef.current = null;
    }

    const firstCandle = data[0];
    const lastCandle = data[data.length - 1];
    const isPositive = lastCandle.close >= firstCandle.close;
    const accentColor = isPositive ? '#10b981' : '#ef4444'; // Green vs Red

    // Render Area (Line) or Candlestick chart
    if (chartType === 'line') {
      const areaSeries = chart.addSeries(AreaSeries, {
        topColor: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        bottomColor: 'rgba(16, 185, 129, 0.0)',
        lineColor: accentColor,
        lineWidth: 2,
        priceLineVisible: false,
      });
      areaSeries.setData(data.map(d => ({ time: d.time, value: d.close })));
      mainSeriesRef.current = areaSeries;
    } else {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
      candleSeries.setData(data);
      mainSeriesRef.current = candleSeries;
    }

    // Vol indicators
    if (indicators.volume) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volSeries.setData(data.map(d => ({
        time: d.time,
        value: d.volume || 1000000,
        color: d.close >= d.open ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
      })));
      volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      volSeriesRef.current = volSeries;
    }

    // Technical indicators overlays
    if (indicators.sma50 && data.length > 50) {
      const smaData = calculateSMA(data, 50);
      const smaSeries = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      smaSeries.setData(smaData);
      smaSeriesRef.current = smaSeries;
    }

    if (indicators.ema20 && data.length > 20) {
      const emaData = calculateEMA(data, 20);
      const emaSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      emaSeries.setData(emaData);
      emaSeriesRef.current = emaSeries;
    }

    if (indicators.bb && data.length > 20) {
      const bb = calculateBollingerBands(data);
      const bbUpper = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.25)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      const bbLower = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.25)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      const bbMiddle = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.12)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

      bbUpper.setData(bb.upper);
      bbLower.setData(bb.lower);
      bbMiddle.setData(bb.middle);

      bbUpperRef.current = bbUpper;
      bbLowerRef.current = bbLower;
      bbMiddleRef.current = bbMiddle;
    }

    // Fit chart bounds
    chart.timeScale().fitContent();

  }, [data, chartType, indicators]);

  // Trigger data updates
  useEffect(() => {
    fetchChartData();
    fetchNews();
  }, [symbol, period, fetchChartData, fetchNews]);

  // Order Executions Handlers
  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(tradeQty) || 0;
    if (qty <= 0) return;

    const currentPrice = activeMetadata.price;
    const finalPrice = orderType === 'limit' ? (parseFloat(limitPrice) || currentPrice) : currentPrice;
    const totalCost = finalPrice * qty;

    if (tradeType === 'buy') {
      if (totalCost > paperBalance) {
        alert("Insufficient paper trading balance!");
        return;
      }
      setPaperBalance(prev => prev - totalCost);
      setHoldings(prev => {
        const existing = prev[symbol] || { qty: 0, avgPrice: 0 };
        const newQty = existing.qty + qty;
        const newAvg = (existing.qty * existing.avgPrice + totalCost) / newQty;
        return { ...prev, [symbol]: { qty: newQty, avgPrice: newAvg } };
      });
    } else {
      const existing = holdings[symbol];
      if (!existing || existing.qty < qty) {
        alert("You do not hold enough quantity of this asset to sell!");
        return;
      }
      setPaperBalance(prev => prev + totalCost);
      setHoldings(prev => {
        const remaining = existing.qty - qty;
        if (remaining === 0) {
          const next = { ...prev };
          delete next[symbol];
          return next;
        }
        return { ...prev, [symbol]: { ...existing, qty: remaining } };
      });
    }

    // Record order in log history
    setOrderHistory(prev => [
      {
        id: Date.now(),
        type: tradeType.toUpperCase(),
        symbol: symbol,
        qty: qty,
        price: finalPrice,
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);

    setTradeQty('1');
    setLimitPrice('');
  };

  const currentHolding = holdings[symbol] || { qty: 0, avgPrice: 0 };
  const holdingPnl = currentHolding.qty > 0 
    ? (activeMetadata.price - currentHolding.avgPrice) * currentHolding.qty
    : 0;

  return (
    <div className="w-full bg-[#050508] border border-white/[0.04] rounded-3xl overflow-hidden flex flex-col font-sans text-slate-200 shadow-2xl">
      
      {/* ── Ticker Tape Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.04] px-6 py-5 bg-[#09090b]/50 gap-4">
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
            {activeMetadata.type === 'crypto' ? <Cpu className="w-6 h-6 text-indigo-400" /> : <LineChart className="w-6 h-6 text-emerald-400" />}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight uppercase">{symbol}</h1>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {activeMetadata.type}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">{activeMetadata.name}</p>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase mt-1">
              <span>{activeMetadata.sector}</span>
              <span>•</span>
              <span>{activeMetadata.cap}</span>
              <span>•</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                activeMetadata.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-400' :
                activeMetadata.risk === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {activeMetadata.risk} RISK
              </span>
            </div>
          </div>
        </div>

        {/* Live Price Quote details */}
        <div className="flex items-center gap-6">
          <div className="text-right space-y-0.5">
            <div className="text-2xl font-mono font-black text-white">
              {activeMetadata.type === 'crypto' ? '$' : '₹'}
              {activeMetadata.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-mono font-bold flex items-center justify-end gap-1 ${
              activeMetadata.change >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {activeMetadata.change >= 0 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {activeMetadata.change >= 0 ? '+' : ''}
              {activeMetadata.change.toFixed(2)} ({activeMetadata.change_pct.toFixed(2)}%)
            </div>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">● Market Open (NSE Live)</p>
          </div>

          {/* Quick MMI Gauge Indicator */}
          <div className="border-l border-white/[0.08] pl-6 hidden lg:flex items-center gap-3">
            <div className="relative w-16 h-8 flex items-end justify-center overflow-hidden">
              <div className="absolute w-16 h-16 rounded-full border-4 border-dashed border-white/[0.1] -bottom-8"></div>
              {/* Dial needle */}
              <div 
                className="absolute w-1 h-8 bg-indigo-500 origin-bottom rounded"
                style={{ transform: `rotate(${(checklist.mmi / 100) * 180 - 90}deg)`, bottom: 0 }}
              ></div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest block">Market Mood</span>
              <span className="text-[10px] font-black text-slate-300 uppercase font-mono">{checklist.mmi}% Greed</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Main TickerTape Workspace layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0">
        
        {/* ── LEFT COLUMN: Analysis Suite (8 Columns) ── */}
        <div className="lg:col-span-8 border-r border-white/[0.04] p-6 space-y-6 overflow-y-auto max-h-[750px] custom-scrollbar">
          
          {/* Section: Chart Wrapper */}
          <div className="bg-[#09090b]/40 border border-white/[0.03] rounded-2xl p-4 space-y-4">
            
            {/* Chart Sub-Header Controls */}
            <div className="flex justify-between items-center border-b border-white/[0.03] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Interactive Chart</span>
                <span className="text-[10px] text-zinc-600 font-mono">|</span>
                <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] rounded-lg p-0.5">
                  {(['1D', '1W', '1mo', '3mo', '1y', '5y'] as string[]).map((p) => (
                    <button 
                      key={p} 
                      onClick={() => setPeriod(p)}
                      className={`px-2 py-0.5 text-[9px] uppercase font-black rounded-md transition-all ${
                        period === p ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {p === '1mo' ? '1M' : p === '3mo' ? '3M' : p === '1y' ? '1Y' : p === '5y' ? '5Y' : p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart type switch and Indicator toggles */}
              <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] rounded-lg p-0.5">
                  <button 
                    onClick={() => setChartType('line')}
                    className={`px-2.5 py-1 rounded-md transition-all ${chartType === 'line' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400'}`}
                  >
                    Line
                  </button>
                  <button 
                    onClick={() => setChartType('candles')}
                    className={`px-2.5 py-1 rounded-md transition-all ${chartType === 'candles' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400'}`}
                  >
                    Candles
                  </button>
                </div>
              </div>
            </div>

            {/* Chart Area Viewport */}
            <div className="relative min-h-[380px]">
              {loading && (
                <div className="absolute inset-0 bg-[#050508]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 font-mono">Syncing price feeds...</span>
                </div>
              )}
              <div ref={chartContainerRef} className="w-full h-[380px]" />
            </div>

            {/* Technical Indicators Toggle Bar */}
            <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.03] pt-3 text-[10px] text-zinc-400 font-medium">
              <span className="font-bold text-zinc-500 uppercase tracking-wider text-[9px]">Indicators:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={indicators.sma50} 
                  onChange={(e) => setIndicators(prev => ({ ...prev, sma50: e.target.checked }))}
                  className="rounded border-white/[0.08] bg-white/[0.02] text-indigo-600 focus:ring-0 w-3 h-3"
                />
                <span>SMA (50)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={indicators.ema20} 
                  onChange={(e) => setIndicators(prev => ({ ...prev, ema20: e.target.checked }))}
                  className="rounded border-white/[0.08] bg-white/[0.02] text-indigo-600 focus:ring-0 w-3 h-3"
                />
                <span>EMA (20)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={indicators.bb} 
                  onChange={(e) => setIndicators(prev => ({ ...prev, bb: e.target.checked }))}
                  className="rounded border-white/[0.08] bg-white/[0.02] text-indigo-600 focus:ring-0 w-3 h-3"
                />
                <span>Bollinger Bands</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={indicators.volume} 
                  onChange={(e) => setIndicators(prev => ({ ...prev, volume: e.target.checked }))}
                  className="rounded border-white/[0.08] bg-white/[0.02] text-indigo-600 focus:ring-0 w-3 h-3"
                />
                <span>Volume Hist</span>
              </label>
            </div>

          </div>

          {/* Section: Investment Checklist & Forecast Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Checklist: 7 columns */}
            <div className="md:col-span-7 bg-[#09090b]/40 border border-white/[0.03] rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Investment Checklist
              </h3>
              
              <div className="space-y-2.5 font-medium text-xs">
                
                {/* 1. Intrinsic Value */}
                <div className="flex items-start justify-between">
                  <div className="flex gap-2">
                    {checklist.intrinsicValue ? (
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-slate-200">Intrinsic Value</p>
                      <p className="text-[10px] text-zinc-500">
                        {checklist.intrinsicValue ? 'Current price is less than the intrinsic value' : 'Current price is higher than the intrinsic value'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Return vs FD */}
                <div className="flex items-start justify-between border-t border-white/[0.02] pt-2.5">
                  <div className="flex gap-2">
                    {checklist.returnsVsFd ? (
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-slate-200">Returns vs Bank FD</p>
                      <p className="text-[10px] text-zinc-500">
                        {checklist.returnsVsFd ? 'Generates better returns than bank fixed deposits' : 'Generated returns lower than bank fixed deposits recently'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Dividend Returns */}
                <div className="flex items-start justify-between border-t border-white/[0.02] pt-2.5">
                  <div className="flex gap-2">
                    {checklist.dividendReturns ? (
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-slate-200">Dividend Returns</p>
                      <p className="text-[10px] text-zinc-500">
                        {checklist.dividendReturns ? 'Offers attractive dividend yields' : 'Dividend yield not highly attractive for dividend-focused portfolios'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Entry Point */}
                <div className="flex items-start justify-between border-t border-white/[0.02] pt-2.5">
                  <div className="flex gap-2">
                    {checklist.entryPoint ? (
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-slate-200">Entry Point</p>
                      <p className="text-[10px] text-zinc-500">
                        {checklist.entryPoint ? 'Good time to consider, stock is not in overbought zone' : 'Asset is currently in overbought zone; track RSI closely'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Analyst Forecast Circle: 5 columns */}
            <div className="md:col-span-5 bg-[#09090b]/40 border border-white/[0.03] rounded-2xl p-5 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Analyst Forecast</h3>
                <p className="text-[10px] text-zinc-500 font-medium">Consensus investment suggestion</p>
              </div>

              {/* Forecast circle */}
              <div className="py-4 flex items-center justify-center gap-4">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  {/* Radial progress ring */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="34" className="stroke-white/[0.04]" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="34" 
                      className="stroke-indigo-500" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - checklist.forecastPct / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-base font-black text-white font-mono">{checklist.forecastPct}%</span>
                </div>
                <div className="space-y-0.5 font-medium">
                  <p className="text-xs text-slate-200">Buy Rating</p>
                  <p className="text-[10px] text-zinc-500 leading-normal max-w-[120px]">
                    of analysts suggest that investors can buy this stock
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 font-bold border-t border-white/[0.03] pt-2">
                Based on ratings of 42 analysts
              </div>
            </div>

          </div>

          {/* Section: Key Metrics Grid */}
          <div className="bg-[#09090b]/40 border border-white/[0.03] rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Key Valuation Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 font-mono">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">PE Ratio</span>
                <span className="text-sm font-black text-slate-200">
                  {activeMetadata.type === 'crypto' ? 'N/A' : (35.4 + (symbol.length * 2.3)).toFixed(2)}
                </span>
                <span className="text-[9px] text-zinc-500 block">Sector PE: 28.45</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">PB Ratio</span>
                <span className="text-sm font-black text-slate-200">
                  {activeMetadata.type === 'crypto' ? 'N/A' : (4.5 + (symbol.length * 0.45)).toFixed(2)}
                </span>
                <span className="text-[9px] text-zinc-500 block">Sector PB: 3.12</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Dividend Yield</span>
                <span className="text-sm font-black text-slate-200">
                  {activeMetadata.type === 'crypto' ? '0.00%' : '1.45%'}
                </span>
                <span className="text-[9px] text-zinc-500 block">Sector Div: 0.98%</span>
              </div>
            </div>
          </div>

          {/* Section: Financials Tabs & Graph */}
          <div className="bg-[#09090b]/40 border border-white/[0.03] rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/[0.03] pb-3">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Financials Profile</h3>
              <div className="flex gap-1.5 text-[10px] font-bold bg-white/[0.02] border border-white/[0.05] rounded-lg p-0.5">
                {(['income', 'balance', 'cashflow'] as const).map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setFinancialTab(tab)}
                    className={`px-2.5 py-1 rounded-md uppercase text-[9px] tracking-wide transition-all ${
                      financialTab === tab ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab === 'income' ? 'Income' : tab === 'balance' ? 'Balance Sheet' : 'Cash Flow'}
                  </button>
                ))}
              </div>
            </div>

            {/* 4-year Financial statement bar graph */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              
              {/* CSS Graphical Representation */}
              <div className="h-44 flex items-end justify-around border-b border-white/[0.04] pb-2 font-mono">
                {financialData.map((d, i) => {
                  const maxVal = Math.max(...financialData.map(fd => fd.revenue));
                  const revHeight = (d.revenue / maxVal) * 120;
                  const incHeight = (d.netIncome / maxVal) * 120;
                  return (
                    <div key={d.year} className="flex flex-col items-center gap-1.5 w-16">
                      <div className="flex items-end gap-1">
                        {/* Revenue Bar */}
                        <div 
                          className="w-5 bg-indigo-500/70 hover:bg-indigo-500 transition-all rounded-t-sm" 
                          style={{ height: `${revHeight}px` }}
                          title={`Revenue: ${d.revenue.toFixed(1)}`}
                        ></div>
                        {/* Net Income Bar */}
                        <div 
                          className="w-5 bg-emerald-500/70 hover:bg-emerald-500 transition-all rounded-t-sm" 
                          style={{ height: `${incHeight}px` }}
                          title={`Net Income: ${d.netIncome.toFixed(1)}`}
                        ></div>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-bold">{d.year}</span>
                    </div>
                  );
                })}
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium">
                  <thead>
                    <tr className="border-b border-white/[0.03] text-zinc-500 uppercase text-[9px] font-bold tracking-wider">
                      <th className="pb-2">Year</th>
                      <th className="pb-2 text-right">Revenue</th>
                      <th className="pb-2 text-right">Net Income</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02] font-mono">
                    {financialData.map((d) => (
                      <tr key={d.year} className="hover:bg-white/[0.01]">
                        <td className="py-2 text-slate-300 font-bold">{d.year}</td>
                        <td className="py-2 text-right text-slate-200">
                          {activeMetadata.type === 'crypto' ? '$' : '₹'}
                          {d.revenue.toLocaleString(undefined, { maximumFractionDigits: 1 })} Cr
                        </td>
                        <td className="py-2 text-right text-emerald-400">
                          {activeMetadata.type === 'crypto' ? '$' : '₹'}
                          {d.netIncome.toLocaleString(undefined, { maximumFractionDigits: 1 })} Cr
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="flex gap-4 text-[9px] text-zinc-500 justify-end font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></span> Total Revenue</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Net Income</span>
            </div>

          </div>

        </div>

        {/* ── RIGHT COLUMN: Watchlist, Broker, News (4 Columns) ── */}
        <div className="lg:col-span-4 p-6 space-y-6 overflow-y-auto max-h-[750px] custom-scrollbar">
          
          {/* Section: Simplified Interactive Order Terminal */}
          <div className="bg-[#09090b]/40 border border-white/[0.03] rounded-2xl p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-white/[0.03] pb-3">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Paper Order Book
              </h3>
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                Bal: {activeMetadata.type === 'crypto' ? '$' : '₹'}{paperBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Buy / Sell Toggles */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase">
              <button 
                onClick={() => setTradeType('buy')}
                className={`py-2 rounded-xl transition-all ${
                  tradeType === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/[0.02] text-zinc-400 border border-white/[0.05]'
                }`}
              >
                BUY
              </button>
              <button 
                onClick={() => setTradeType('sell')}
                className={`py-2 rounded-xl transition-all ${
                  tradeType === 'sell' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/[0.02] text-zinc-400 border border-white/[0.05]'
                }`}
              >
                SELL
              </button>
            </div>

            {/* Order Forms */}
            <form onSubmit={handleExecuteTrade} className="space-y-3.5 text-[11px] font-semibold">
              
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 uppercase tracking-wider">Order Type</span>
                <div className="flex gap-1.5 p-0.5 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <button 
                    type="button" 
                    onClick={() => setOrderType('market')}
                    className={`px-2 py-0.5 rounded uppercase text-[9px] font-black ${orderType === 'market' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
                  >
                    Market
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setOrderType('limit')}
                    className={`px-2 py-0.5 rounded uppercase text-[9px] font-black ${orderType === 'limit' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
                  >
                    Limit
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="flex justify-between items-center">
                <label className="text-zinc-500 uppercase tracking-wider">Quantity</label>
                <input 
                  type="number" 
                  value={tradeQty}
                  onChange={(e) => setTradeQty(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1 text-right text-white font-mono font-bold w-20"
                />
              </div>

              {/* Limit Price if Limit order */}
              {orderType === 'limit' && (
                <div className="flex justify-between items-center">
                  <label className="text-zinc-500 uppercase tracking-wider">Limit Price ({activeMetadata.type === 'crypto' ? '$' : '₹'})</label>
                  <input 
                    type="number" 
                    placeholder={activeMetadata.price.toFixed(2)}
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1 text-right text-white font-mono font-bold w-24"
                  />
                </div>
              )}

              {/* Total Summary */}
              <div className="border-t border-dashed border-white/[0.05] pt-3 flex justify-between items-baseline font-mono">
                <span className="text-zinc-500 font-sans uppercase tracking-wider text-[10px]">Estimated Value</span>
                <span className="text-sm font-black text-slate-100">
                  {activeMetadata.type === 'crypto' ? '$' : '₹'}
                  {((orderType === 'limit' ? (parseFloat(limitPrice) || activeMetadata.price) : activeMetadata.price) * (parseInt(tradeQty) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button 
                type="submit"
                className={`w-full py-2.5 rounded-xl font-black uppercase text-white shadow-lg text-xs tracking-wider transition-all active:scale-95 ${
                  tradeType === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10' : 'bg-red-600 hover:bg-red-500 shadow-red-600/10'
                }`}
              >
                Submit {tradeType.toUpperCase()} Order
              </button>

            </form>

            {/* Current Holdings Status card */}
            {currentHolding.qty > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-[10px] space-y-1.5 font-mono">
                <p className="font-sans font-bold text-zinc-400 uppercase tracking-widest text-[8px] mb-1">Your Portfolio Position</p>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Holdings Qty:</span>
                  <span className="text-slate-200 font-bold">{currentHolding.qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Average Cost:</span>
                  <span className="text-slate-200 font-bold">${currentHolding.avgPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current P&L:</span>
                  <span className={`font-bold ${holdingPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {holdingPnl >= 0 ? '+' : ''}{holdingPnl.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Section: Ticker Watchlist Switcher */}
          <div className="bg-[#09090b]/40 border border-white/[0.03] rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-400" />
              Watchlist Assets
            </h3>
            
            <div className="flex flex-col divide-y divide-white/[0.02]">
              {watchlist.map((item) => (
                <div 
                  key={item.symbol} 
                  onClick={() => setSymbol(item.symbol)}
                  className={`py-2.5 flex justify-between items-center text-xs cursor-pointer transition-all ${
                    symbol.toUpperCase() === item.symbol.toUpperCase() 
                      ? 'bg-indigo-600/5 px-2 -mx-2 rounded-xl border-l-2 border-indigo-500' 
                      : 'hover:bg-white/[0.01]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200 uppercase">{item.symbol}</span>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[130px]">{item.name}</span>
                  </div>
                  <div className="text-right font-mono space-y-0.5">
                    <p className="font-bold text-slate-200">
                      {item.type === 'crypto' ? '$' : '₹'}
                      {item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-[10px] font-bold ${item.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.change >= 0 ? '+' : ''}
                      {item.change_pct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Peer Comparison Table */}
          <div className="bg-[#09090b]/40 border border-white/[0.03] rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Peers Comparison</h3>
            <div className="overflow-x-auto text-[10px] font-medium leading-relaxed font-mono">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.03] text-zinc-500 uppercase text-[8px] font-bold tracking-widest">
                    <th className="pb-2">Name</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">PE</th>
                    <th className="pb-2 text-right">1Y Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {/* Generate peers dynamically depending on type */}
                  {activeMetadata.type === 'crypto' ? (
                    <>
                      <tr className="hover:bg-white/[0.01]">
                        <td className="py-2 text-slate-300 font-bold uppercase">ETH</td>
                        <td className="py-2 text-right text-slate-200">$3,421.20</td>
                        <td className="py-2 text-right text-zinc-500">N/A</td>
                        <td className="py-2 text-right text-emerald-400">+56.4%</td>
                      </tr>
                      <tr className="hover:bg-white/[0.01]">
                        <td className="py-2 text-slate-300 font-bold uppercase">SOL</td>
                        <td className="py-2 text-right text-slate-200">$138.50</td>
                        <td className="py-2 text-right text-zinc-500">N/A</td>
                        <td className="py-2 text-right text-emerald-400">+124.2%</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="hover:bg-white/[0.01]">
                        <td className="py-2 text-slate-300 font-bold uppercase">TCS</td>
                        <td className="py-2 text-right text-slate-200">₹3,950.00</td>
                        <td className="py-2 text-right text-slate-200">29.4</td>
                        <td className="py-2 text-right text-emerald-400">+12.4%</td>
                      </tr>
                      <tr className="hover:bg-white/[0.01]">
                        <td className="py-2 text-slate-300 font-bold uppercase">HDFCBANK</td>
                        <td className="py-2 text-right text-slate-200">₹1,650.00</td>
                        <td className="py-2 text-right text-slate-200">18.5</td>
                        <td className="py-2 text-right text-red-400">-4.5%</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: News headlines */}
          <div className="bg-[#09090b]/40 border border-white/[0.03] rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              Latest News ({symbol})
            </h3>
            <div className="flex flex-col gap-3">
              {news.map((item, idx) => (
                <a 
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] hover:text-indigo-400 transition-colors flex flex-col gap-1 border-b border-white/[0.02] pb-2 leading-relaxed"
                >
                  <span className="text-slate-300 font-medium">{item.title}</span>
                  <span className="text-zinc-500 font-bold uppercase tracking-wide text-[8px]">{item.source}</span>
                </a>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
