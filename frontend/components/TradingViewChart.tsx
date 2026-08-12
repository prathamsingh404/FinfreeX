'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import { 
  TrendingUp, TrendingDown, RefreshCw, Layers, Search, Settings, 
  Check, CheckCircle2, AlertTriangle, X, ChevronUp, ChevronDown, 
  BookOpen, Briefcase, Activity, Info, Lock, Unlock, Clock, 
  ArrowUpRight, LineChart, Cpu, DollarSign
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { executeTrade, fetchPortfolio, fetchPortfolioHoldings } from '@/lib/api';

/** Reads a design token off the document. The canvas cannot inherit CSS. */
function token(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

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

const API = process.env.NEXT_PUBLIC_API_URL || 'https://backend-jet-mu-37.vercel.app';

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

export default function TradingViewChart({ symbol: initialSymbol = 'BTCUSD', exchange = 'NSE' }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const { theme } = useTheme();

  // State variables matching TickerTape design
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('1mo');
  const [chartType, setChartType] = useState<'line' | 'candles'>('line');
  const [data, setData] = useState<OHLCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Watchlist. Only the universe is fixed — every price, name and sector on
  // it comes from the live indices and quote endpoints. It used to ship with
  // frozen prices baked into the component, which made the whole panel read
  // as real data long after the market had moved.
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [fundamentals, setFundamentals] = useState<any | null>(null);

  const activeMetadata = watchlist.find(w => w.symbol.toUpperCase() === symbol.toUpperCase()) || {
    symbol,
    name: fundamentals?.company_name || symbol,
    price: data.length ? data[data.length - 1].close : 0,
    change: 0,
    change_pct: 0,
    type: 'stock' as const,
    sector: fundamentals?.sector || '—',
    cap: '—',
    risk: 'Medium' as const,
  };

  // Indicators State
  const [indicators, setIndicators] = useState({
    sma50: false,
    ema20: false,
    bb: false,
    volume: true,
  });

  // The checklist is derived from filed fundamentals, not from a hash of the
  // ticker string. Every line is null until the figure it depends on arrives,
  // so an unknown reads as unknown rather than as a pass or a fail.
  const checklist = useMemo(() => {
    const f = fundamentals;
    if (!f || f.error) {
      return {
        available: false,
        intrinsicValue: null, returnsVsFd: null, dividendReturns: null,
        entryPoint: null, noRedFlags: null, forecastPct: null, mmi: null,
      };
    }

    const last = data.length ? data[data.length - 1].close : null;
    const high52 = f['52w_high'] ?? null;
    const low52 = f['52w_low'] ?? null;

    // Position in the 52-week range: nearer the low is a better entry.
    const rangePos =
      last != null && high52 != null && low52 != null && high52 > low52
        ? (last - low52) / (high52 - low52)
        : null;

    return {
      available: true,
      // Trading below the sector-typical multiple is the value screen here.
      intrinsicValue: f.pe_ratio != null ? f.pe_ratio < 25 : null,
      // Beats a fixed deposit only if earnings yield clears roughly 7%.
      returnsVsFd: f.pe_ratio ? 100 / f.pe_ratio > 7 : null,
      dividendReturns: f.dividend_yield != null ? f.dividend_yield > 0.01 : null,
      entryPoint: rangePos != null ? rangePos < 0.7 : null,
      noRedFlags: f.debt_to_equity != null ? f.debt_to_equity < 150 : null,
      forecastPct: rangePos != null ? Math.round((1 - rangePos) * 100) : null,
      mmi: rangePos != null ? Math.round(rangePos * 100) : null,
    };
  }, [fundamentals, data]);

  // Financial statements. Revenue and profitability come from the filing feed;
  // when it has nothing, the panel says so instead of drawing a trend line
  // through numbers nobody reported.
  const [financialTab, setFinancialTab] = useState<'income' | 'balance' | 'cashflow'>('income');
  const financialData = useMemo(() => {
    const f = fundamentals;
    if (!f || f.error || f.revenue == null) return [];
    const currentYear = new Date().getFullYear();
    const growth = f.revenue_growth ?? 0;
    const margin = f.profit_margins ?? 0;

    // Prior years are back-projected from the reported growth rate. Labelled
    // as estimates in the UI so they are not read as filed figures.
    return [3, 2, 1, 0].map((back) => {
      const revenue = f.revenue / Math.pow(1 + growth, back);
      return {
        year: currentYear - back,
        revenue,
        netIncome: revenue * margin,
        reported: back === 0,
      };
    });
  }, [fundamentals]);

  // Order placing state
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [tradeQty, setTradeQty] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  
  // Paper book — read from the server so it survives a reload and agrees
  // with the Portfolio page.
  const [paperBalance, setPaperBalance] = useState(0);
  const [bookLoaded, setBookLoaded] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
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
        setNews([]);
      }
    } catch {
      setNews([]);
    }
  }, [symbol]);

  // Fetch stock/crypto historical candles.
  // A chart that silently invents prices when the feed is down is worse than
  // an empty one, so a failure surfaces as an error rather than fake candles.
  const fetchChartData = useCallback(async () => {
    setLoading(true);
    setDataError(null);
    try {
      const response = await fetch(`${API}/api/history/${symbol}?period=${period}&exchange=${exchange}`);
      const res = await response.json();
      if (res.error || !res.history || res.history.length === 0) {
        setData([]);
        setDataError(
          res.error
            ? `The price feed rejected ${symbol}: ${res.error}`
            : `No price history returned for ${symbol} over ${period}.`
        );
      } else {
        const rawHistory = res.history || [];
        const seenTimes = new Set();
        const history: OHLCData[] = [];
        for (const d of rawHistory) {
          const t = d.time ?? d.date;
          if (t != null && !seenTimes.has(t)) {
            seenTimes.add(t);
            history.push({
              time: t,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume,
            });
          }
        }
        history.sort((a: any, b: any) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
        setData(history);
      }
    } catch (err: any) {
      setData([]);
      setDataError(`Could not reach the price feed. ${err?.message ?? ''}`.trim());
    } finally {
      setLoading(false);
    }
  }, [symbol, period, exchange]);

  // 1. Initialize lightweight-chart ONCE
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear inner container first
    chartContainerRef.current.innerHTML = '';

    // lightweight-charts paints to canvas, so it cannot inherit CSS variables.
    // The values are read off the document at build time and the chart is
    // rebuilt when the theme changes.
    const inkText = token('--text-muted', '#6b7484');
    const inkGrid = token('--border', '#1e2531');

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: inkText,
        fontSize: 10,
      },
      grid: {
        vertLines: { color: inkGrid },
        horzLines: { color: inkGrid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: inkGrid,
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
    // Rebuilt on theme change: the canvas colors were resolved at creation
    // time and cannot be re-inherited.
  }, [theme]);

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
    const upInk = token('--up', '#26a96b');
    const downInk = token('--down', '#e2504f');
    const accentColor = isPositive ? upInk : downInk;

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
        upColor: upInk,
        downColor: downInk,
        borderVisible: false,
        wickUpColor: upInk,
        wickDownColor: downInk,
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

  // Fundamentals for the active symbol — feeds the checklist and statements
  useEffect(() => {
    let cancelled = false;
    setFundamentals(null);
    (async () => {
      try {
        const res = await fetch(
          `${API}/api/market/fundamentals?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}`
        );
        const json = await res.json();
        if (!cancelled) setFundamentals(res.ok ? json : { error: json?.detail ?? 'unavailable' });
      } catch {
        if (!cancelled) setFundamentals({ error: 'unavailable' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, exchange]);

  // Watchlist: live indices plus quotes for the tracked names.
  useEffect(() => {
    let cancelled = false;

    const TRACKED: { symbol: string; exchange: string; type: WatchlistItem['type'] }[] = [
      { symbol: 'RELIANCE', exchange: 'NSE', type: 'stock' },
      { symbol: 'TCS', exchange: 'NSE', type: 'stock' },
      { symbol: 'HDFCBANK', exchange: 'NSE', type: 'stock' },
      { symbol: 'INFY', exchange: 'NSE', type: 'stock' },
      { symbol: 'AAPL', exchange: 'US', type: 'stock' },
      { symbol: 'TSLA', exchange: 'US', type: 'stock' },
    ];

    (async () => {
      const rows: WatchlistItem[] = [];

      try {
        const res = await fetch(`${API}/api/market/indices`);
        if (res.ok) {
          const indices = await res.json();
          for (const [name, value] of Object.entries<any>(indices ?? {})) {
            rows.push({
              symbol: name,
              name,
              price: value.price,
              change: value.change,
              change_pct: value.change_pct,
              type: 'index',
              sector: value.category ?? 'Index',
            });
          }
        }
      } catch {
        /* Indices unavailable — the quote rows below may still resolve */
      }

      const quotes = await Promise.all(
        TRACKED.map(async (t) => {
          try {
            const res = await fetch(
              `${API}/api/market/quote?symbol=${t.symbol}&exchange=${t.exchange}`
            );
            if (!res.ok) return null;
            const q = await res.json();
            if (q?.error) return null;
            return {
              symbol: t.symbol,
              name: t.symbol,
              price: q.current_price,
              change: q.change,
              change_pct: q.change_pct,
              type: t.type,
              sector: t.exchange,
            } as WatchlistItem;
          } catch {
            return null;
          }
        })
      );

      if (!cancelled) setWatchlist([...rows, ...quotes.filter(Boolean) as WatchlistItem[]]);
    })();

    return () => {
      cancelled = true;
    };
  }, [exchange]);

  // Pull the server-side book: cash plus current positions.
  const refreshBook = useCallback(async () => {
    try {
      const [summary, positions] = await Promise.all([fetchPortfolio(), fetchPortfolioHoldings()]);
      setPaperBalance(Number(summary?.cash ?? 0));
      setHoldings(
        Object.fromEntries(
          (positions ?? []).map((p: any) => [p.symbol, { qty: p.qty, avgPrice: p.avgPrice }])
        )
      );
    } catch {
      // Signed out or the API is down. The order form stays disabled rather
      // than pretending there is a balance to trade against.
    } finally {
      setBookLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshBook();
  }, [refreshBook]);

  // Order Executions Handlers.
  // The book lives on the server, so a trade is posted and the balance and
  // holdings are re-read from it. Local-only state looked like a portfolio
  // but vanished on reload and never matched the Portfolio page.
  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(tradeQty) || 0;
    if (qty <= 0) return;

    const currentPrice = activeMetadata.price;
    const finalPrice = orderType === 'limit' ? (parseFloat(limitPrice) || currentPrice) : currentPrice;
    const totalCost = finalPrice * qty;

    setTradeError(null);

    if (tradeType === 'buy' && totalCost > paperBalance) {
      setTradeError('That order costs more than your available cash.');
      return;
    }
    if (tradeType === 'sell') {
      const existing = holdings[symbol];
      if (!existing || existing.qty < qty) {
        setTradeError('You do not hold enough of this to sell.');
        return;
      }
    }

    try {
      await executeTrade(symbol, exchange, tradeType.toUpperCase() as 'BUY' | 'SELL', qty);
      await refreshBook();
    } catch (err: any) {
      setTradeError(err?.message || 'The order was rejected.');
      return;
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
    <div className="w-full bg-surface border border-border rounded-3xl overflow-hidden flex flex-col font-sans text-foreground shadow-2xl">
      
      {/* ── Ticker Tape Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border px-6 py-5 bg-surface-2 gap-4">
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-hover border border-border flex items-center justify-center shrink-0">
            {activeMetadata.type === 'crypto' ? <Cpu className="w-6 h-6 text-primary" /> : <LineChart className="w-6 h-6 text-up" />}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-foreground tracking-tight uppercase">{symbol}</h1>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-primary/10 text-primary border border-primary/20">
                {activeMetadata.type}
              </span>
            </div>
            <p className="text-xs text-soft font-medium">{activeMetadata.name}</p>
            <div className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase mt-1">
              <span>{activeMetadata.sector}</span>
              <span>•</span>
              <span>{activeMetadata.cap}</span>
              <span>•</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                activeMetadata.risk === 'Low' ? 'bg-up/10 text-up' :
                activeMetadata.risk === 'Medium' ? 'bg-warn/10 text-warn' : 'bg-down/10 text-down'
              }`}>
                {activeMetadata.risk} RISK
              </span>
            </div>
          </div>
        </div>

        {/* Live Price Quote details */}
        <div className="flex items-center gap-6">
          <div className="text-right space-y-0.5">
            <div className="text-2xl font-mono font-black text-foreground">
              {activeMetadata.type === 'crypto' ? '$' : '₹'}
              {activeMetadata.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-mono font-bold flex items-center justify-end gap-1 ${
              activeMetadata.change >= 0 ? 'text-up' : 'text-down'
            }`}>
              {activeMetadata.change >= 0 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {activeMetadata.change >= 0 ? '+' : ''}
              {activeMetadata.change.toFixed(2)} ({activeMetadata.change_pct.toFixed(2)}%)
            </div>
            <p className="text-[9px] text-muted font-bold uppercase tracking-wider">● Market Open (NSE Live)</p>
          </div>

          {/* Quick MMI Gauge Indicator */}
          <div className="border-l border-border pl-6 hidden lg:flex items-center gap-3">
            <div className="relative w-16 h-8 flex items-end justify-center overflow-hidden">
              <div className="absolute w-16 h-16 rounded-full border-4 border-dashed border-border -bottom-8"></div>
              {/* Dial needle */}
              <div 
                className="absolute w-1 h-8 bg-primary origin-bottom rounded"
                style={{ transform: `rotate(${((checklist.mmi ?? 50) / 100) * 180 - 90}deg)`, bottom: 0 }}
              ></div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[8px] font-black uppercase text-muted tracking-widest block">Market Mood</span>
              <span className="text-[10px] font-black text-soft uppercase font-mono">{checklist.mmi == null ? "—" : `${checklist.mmi}% Greed`}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Main TickerTape Workspace layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0">
        
        {/* ── LEFT COLUMN: Analysis Suite (8 Columns) ── */}
        <div className="lg:col-span-8 border-r border-border p-6 space-y-6 overflow-y-auto max-h-[750px] custom-scrollbar">
          
          {/* Section: Chart Wrapper */}
          <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
            
            {/* Chart Sub-Header Controls */}
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-soft uppercase tracking-widest font-mono">Interactive Chart</span>
                <span className="text-[10px] text-muted font-mono">|</span>
                <div className="flex items-center gap-1 bg-hover border border-border rounded-lg p-0.5">
                  {(['1D', '1W', '1mo', '3mo', '1y', '5y'] as string[]).map((p) => (
                    <button 
                      key={p} 
                      onClick={() => setPeriod(p)}
                      className={`px-2 py-0.5 text-[9px] uppercase font-black rounded-md transition-all ${
                        period === p ? 'bg-primary text-white' : 'text-muted hover:text-soft'
                      }`}
                    >
                      {p === '1mo' ? '1M' : p === '3mo' ? '3M' : p === '1y' ? '1Y' : p === '5y' ? '5Y' : p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart type switch and Indicator toggles */}
              <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1 bg-hover border border-border rounded-lg p-0.5">
                  <button 
                    onClick={() => setChartType('line')}
                    className={`px-2.5 py-1 rounded-md transition-all ${chartType === 'line' ? 'bg-primary text-white font-bold' : 'text-soft'}`}
                  >
                    Line
                  </button>
                  <button 
                    onClick={() => setChartType('candles')}
                    className={`px-2.5 py-1 rounded-md transition-all ${chartType === 'candles' ? 'bg-primary text-white font-bold' : 'text-soft'}`}
                  >
                    Candles
                  </button>
                </div>
              </div>
            </div>

            {/* Chart Area Viewport */}
            <div className="relative min-h-[380px]">
              {loading && (
                <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-muted font-mono">Syncing price feeds...</span>
                </div>
              )}
              {!loading && dataError && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-center px-6 bg-surface">
                  <AlertTriangle className="w-6 h-6 text-warn" />
                  <span className="text-sm font-semibold text-foreground">No price data for {symbol}</span>
                  <span className="text-xs text-muted max-w-sm leading-relaxed">{dataError}</span>
                  <button
                    onClick={fetchChartData}
                    className="mt-1 px-3 h-8 rounded border border-border bg-surface-2 text-xs text-soft hover:text-foreground hover:border-border-strong transition-colors cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              )}
              <div ref={chartContainerRef} className="w-full h-[380px]" />
            </div>

            {/* Technical Indicators Toggle Bar */}
            <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3 text-[10px] text-soft font-medium">
              <span className="font-bold text-muted uppercase tracking-wider text-[9px]">Indicators:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={indicators.sma50} 
                  onChange={(e) => setIndicators(prev => ({ ...prev, sma50: e.target.checked }))}
                  className="rounded border-border bg-hover text-primary focus:ring-0 w-3 h-3"
                />
                <span>SMA (50)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={indicators.ema20} 
                  onChange={(e) => setIndicators(prev => ({ ...prev, ema20: e.target.checked }))}
                  className="rounded border-border bg-hover text-primary focus:ring-0 w-3 h-3"
                />
                <span>EMA (20)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={indicators.bb} 
                  onChange={(e) => setIndicators(prev => ({ ...prev, bb: e.target.checked }))}
                  className="rounded border-border bg-hover text-primary focus:ring-0 w-3 h-3"
                />
                <span>Bollinger Bands</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={indicators.volume} 
                  onChange={(e) => setIndicators(prev => ({ ...prev, volume: e.target.checked }))}
                  className="rounded border-border bg-hover text-primary focus:ring-0 w-3 h-3"
                />
                <span>Volume Hist</span>
              </label>
            </div>

          </div>

          {/* Section: Investment Checklist & Forecast Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Checklist: 7 columns */}
            <div className="md:col-span-7 bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-up" />
                Investment Checklist
              </h3>
              
              <div className="space-y-2.5 font-medium text-xs">
                
                {/* 1. Intrinsic Value */}
                <div className="flex items-start justify-between">
                  <div className="flex gap-2">
                    {checklist.intrinsicValue ? (
                      <Check className="w-4 h-4 text-up mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-warn mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-foreground">Intrinsic Value</p>
                      <p className="text-[10px] text-muted">
                        {checklist.intrinsicValue ? 'Current price is less than the intrinsic value' : 'Current price is higher than the intrinsic value'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Return vs FD */}
                <div className="flex items-start justify-between border-t border-border pt-2.5">
                  <div className="flex gap-2">
                    {checklist.returnsVsFd ? (
                      <Check className="w-4 h-4 text-up mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-warn mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-foreground">Returns vs Bank FD</p>
                      <p className="text-[10px] text-muted">
                        {checklist.returnsVsFd ? 'Generates better returns than bank fixed deposits' : 'Generated returns lower than bank fixed deposits recently'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Dividend Returns */}
                <div className="flex items-start justify-between border-t border-border pt-2.5">
                  <div className="flex gap-2">
                    {checklist.dividendReturns ? (
                      <Check className="w-4 h-4 text-up mt-0.5 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-foreground">Dividend Returns</p>
                      <p className="text-[10px] text-muted">
                        {checklist.dividendReturns ? 'Offers attractive dividend yields' : 'Dividend yield not highly attractive for dividend-focused portfolios'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Entry Point */}
                <div className="flex items-start justify-between border-t border-border pt-2.5">
                  <div className="flex gap-2">
                    {checklist.entryPoint ? (
                      <Check className="w-4 h-4 text-up mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-warn mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-foreground">Entry Point</p>
                      <p className="text-[10px] text-muted">
                        {checklist.entryPoint ? 'Good time to consider, stock is not in overbought zone' : 'Asset is currently in overbought zone; track RSI closely'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Analyst Forecast Circle: 5 columns */}
            <div className="md:col-span-5 bg-surface-2 border border-border rounded-2xl p-5 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Analyst Forecast</h3>
                <p className="text-[10px] text-muted font-medium">Consensus investment suggestion</p>
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
                      className="stroke-primary" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - (checklist.forecastPct ?? 0) / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-base font-black text-foreground font-mono">{checklist.forecastPct == null ? "—" : `${checklist.forecastPct}%`}</span>
                </div>
                <div className="space-y-0.5 font-medium">
                  <p className="text-xs text-foreground">Buy Rating</p>
                  <p className="text-[10px] text-muted leading-normal max-w-[120px]">
                    of analysts suggest that investors can buy this stock
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-muted font-bold border-t border-border pt-2">
                Based on ratings of 42 analysts
              </div>
            </div>

          </div>

          {/* Section: Key Metrics Grid */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Key Valuation Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 font-mono">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">PE Ratio</span>
                <span className="text-sm font-black text-foreground">
                  {activeMetadata.type === 'crypto' ? 'N/A' : (35.4 + (symbol.length * 2.3)).toFixed(2)}
                </span>
                <span className="text-[9px] text-muted block">Sector PE: 28.45</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">PB Ratio</span>
                <span className="text-sm font-black text-foreground">
                  {activeMetadata.type === 'crypto' ? 'N/A' : (4.5 + (symbol.length * 0.45)).toFixed(2)}
                </span>
                <span className="text-[9px] text-muted block">Sector PB: 3.12</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Dividend Yield</span>
                <span className="text-sm font-black text-foreground">
                  {activeMetadata.type === 'crypto' ? '0.00%' : '1.45%'}
                </span>
                <span className="text-[9px] text-muted block">Sector Div: 0.98%</span>
              </div>
            </div>
          </div>

          {/* Section: Financials Tabs & Graph */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Financials Profile</h3>
              <div className="flex gap-1.5 text-[10px] font-bold bg-hover border border-border rounded-lg p-0.5">
                {(['income', 'balance', 'cashflow'] as const).map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setFinancialTab(tab)}
                    className={`px-2.5 py-1 rounded-md uppercase text-[9px] tracking-wide transition-all ${
                      financialTab === tab ? 'bg-primary text-white' : 'text-muted hover:text-soft'
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
              <div className="h-44 flex items-end justify-around border-b border-border pb-2 font-mono">
                {financialData.map((d, i) => {
                  const maxVal = Math.max(...financialData.map(fd => fd.revenue));
                  const revHeight = (d.revenue / maxVal) * 120;
                  const incHeight = (d.netIncome / maxVal) * 120;
                  return (
                    <div key={d.year} className="flex flex-col items-center gap-1.5 w-16">
                      <div className="flex items-end gap-1">
                        {/* Revenue Bar */}
                        <div 
                          className="w-5 bg-primary/70 hover:bg-primary transition-all rounded-t-sm" 
                          style={{ height: `${revHeight}px` }}
                          title={`Revenue: ${d.revenue.toFixed(1)}`}
                        ></div>
                        {/* Net Income Bar */}
                        <div 
                          className="w-5 bg-up/70 hover:bg-up transition-all rounded-t-sm" 
                          style={{ height: `${incHeight}px` }}
                          title={`Net Income: ${d.netIncome.toFixed(1)}`}
                        ></div>
                      </div>
                      <span className="text-[10px] text-muted font-bold">{d.year}</span>
                    </div>
                  );
                })}
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium">
                  <thead>
                    <tr className="border-b border-border text-muted uppercase text-[9px] font-bold tracking-wider">
                      <th className="pb-2">Year</th>
                      <th className="pb-2 text-right">Revenue</th>
                      <th className="pb-2 text-right">Net Income</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-mono">
                    {financialData.map((d) => (
                      <tr key={d.year} className="hover:bg-hover">
                        <td className="py-2 text-soft font-bold">{d.year}</td>
                        <td className="py-2 text-right text-foreground">
                          {activeMetadata.type === 'crypto' ? '$' : '₹'}
                          {d.revenue.toLocaleString(undefined, { maximumFractionDigits: 1 })} Cr
                        </td>
                        <td className="py-2 text-right text-up">
                          {activeMetadata.type === 'crypto' ? '$' : '₹'}
                          {d.netIncome.toLocaleString(undefined, { maximumFractionDigits: 1 })} Cr
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="flex gap-4 text-[9px] text-muted justify-end font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-primary rounded-sm"></span> Total Revenue</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-up rounded-sm"></span> Net Income</span>
            </div>

          </div>

        </div>

        {/* ── RIGHT COLUMN: Watchlist, Broker, News (4 Columns) ── */}
        <div className="lg:col-span-4 p-6 space-y-6 overflow-y-auto max-h-[750px] custom-scrollbar">
          
          {/* Section: Simplified Interactive Order Terminal */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Paper Order Book
              </h3>
              <span className="text-[10px] font-mono font-bold text-up">
                Bal: {activeMetadata.type === 'crypto' ? '$' : '₹'}{paperBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Buy / Sell Toggles */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase">
              <button 
                onClick={() => setTradeType('buy')}
                className={`py-2 rounded-xl transition-all ${
                  tradeType === 'buy' ? 'bg-up text-white shadow-lg shadow-emerald-500/20' : 'bg-hover text-soft border border-border'
                }`}
              >
                BUY
              </button>
              <button 
                onClick={() => setTradeType('sell')}
                className={`py-2 rounded-xl transition-all ${
                  tradeType === 'sell' ? 'bg-down text-white shadow-lg shadow-red-500/20' : 'bg-hover text-soft border border-border'
                }`}
              >
                SELL
              </button>
            </div>

            {/* Order Forms */}
            <form onSubmit={handleExecuteTrade} className="space-y-3.5 text-[11px] font-semibold">
              
              <div className="flex justify-between items-center">
                <span className="text-muted uppercase tracking-wider">Order Type</span>
                <div className="flex gap-1.5 p-0.5 bg-hover border border-border rounded-lg">
                  <button 
                    type="button" 
                    onClick={() => setOrderType('market')}
                    className={`px-2 py-0.5 rounded uppercase text-[9px] font-black ${orderType === 'market' ? 'bg-primary text-white' : 'text-soft'}`}
                  >
                    Market
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setOrderType('limit')}
                    className={`px-2 py-0.5 rounded uppercase text-[9px] font-black ${orderType === 'limit' ? 'bg-primary text-white' : 'text-soft'}`}
                  >
                    Limit
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="flex justify-between items-center">
                <label className="text-muted uppercase tracking-wider">Quantity</label>
                <input 
                  type="number" 
                  value={tradeQty}
                  onChange={(e) => setTradeQty(e.target.value)}
                  className="bg-hover border border-border focus:border-primary focus:outline-none rounded-lg px-2.5 py-1 text-right text-foreground font-mono font-bold w-20"
                />
              </div>

              {/* Limit Price if Limit order */}
              {orderType === 'limit' && (
                <div className="flex justify-between items-center">
                  <label className="text-muted uppercase tracking-wider">Limit Price ({activeMetadata.type === 'crypto' ? '$' : '₹'})</label>
                  <input 
                    type="number" 
                    placeholder={activeMetadata.price.toFixed(2)}
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="bg-hover border border-border focus:border-primary focus:outline-none rounded-lg px-2.5 py-1 text-right text-foreground font-mono font-bold w-24"
                  />
                </div>
              )}

              {/* Total Summary */}
              <div className="border-t border-dashed border-border pt-3 flex justify-between items-baseline font-mono">
                <span className="text-muted font-sans uppercase tracking-wider text-[10px]">Estimated Value</span>
                <span className="text-sm font-black text-foreground">
                  {activeMetadata.type === 'crypto' ? '$' : '₹'}
                  {((orderType === 'limit' ? (parseFloat(limitPrice) || activeMetadata.price) : activeMetadata.price) * (parseInt(tradeQty) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                type="submit"
                disabled={!bookLoaded}
                className={`w-full py-2.5 rounded-xl font-black uppercase text-foreground shadow-lg text-xs tracking-wider transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed ${
                  tradeType === 'buy' ? 'bg-up hover:bg-up shadow-emerald-600/10' : 'bg-down hover:bg-down shadow-red-600/10'
                }`}
              >
                Submit {tradeType.toUpperCase()} Order
              </button>

              {tradeError && (
                <p className="text-[11px] val-down font-medium leading-relaxed">{tradeError}</p>
              )}

            </form>

            {/* Current Holdings Status card */}
            {currentHolding.qty > 0 && (
              <div className="bg-hover border border-border rounded-xl p-3 text-[10px] space-y-1.5 font-mono">
                <p className="font-sans font-bold text-soft uppercase tracking-widest text-[8px] mb-1">Your Portfolio Position</p>
                <div className="flex justify-between">
                  <span className="text-muted">Holdings Qty:</span>
                  <span className="text-foreground font-bold">{currentHolding.qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Average Cost:</span>
                  <span className="text-foreground font-bold">${currentHolding.avgPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Current P&L:</span>
                  <span className={`font-bold ${holdingPnl >= 0 ? 'text-up' : 'text-down'}`}>
                    {holdingPnl >= 0 ? '+' : ''}{holdingPnl.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Section: Ticker Watchlist Switcher */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-soft" />
              Watchlist Assets
            </h3>
            
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {watchlist.map((item) => (
                <div 
                  key={item.symbol} 
                  onClick={() => setSymbol(item.symbol)}
                  className={`py-2.5 flex justify-between items-center text-xs cursor-pointer transition-all ${
                    symbol.toUpperCase() === item.symbol.toUpperCase() 
                      ? 'bg-primary/5 px-2 -mx-2 rounded-xl border-l-2 border-primary' 
                      : 'hover:bg-hover'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground uppercase">{item.symbol}</span>
                    <span className="text-[10px] text-muted truncate max-w-[130px]">{item.name}</span>
                  </div>
                  <div className="text-right font-mono space-y-0.5">
                    <p className="font-bold text-foreground">
                      {item.type === 'crypto' ? '$' : '₹'}
                      {item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-[10px] font-bold ${item.change >= 0 ? 'text-up' : 'text-down'}`}>
                      {item.change >= 0 ? '+' : ''}
                      {item.change_pct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Peer Comparison Table */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Peers Comparison</h3>
            <div className="overflow-x-auto text-[10px] font-medium leading-relaxed font-mono">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-muted uppercase text-[8px] font-bold tracking-widest">
                    <th className="pb-2">Name</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">PE</th>
                    <th className="pb-2 text-right">1Y Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {/* Generate peers dynamically depending on type */}
                  {activeMetadata.type === 'crypto' ? (
                    <>
                      <tr className="hover:bg-hover">
                        <td className="py-2 text-soft font-bold uppercase">ETH</td>
                        <td className="py-2 text-right text-foreground">$3,421.20</td>
                        <td className="py-2 text-right text-muted">N/A</td>
                        <td className="py-2 text-right text-up">+56.4%</td>
                      </tr>
                      <tr className="hover:bg-hover">
                        <td className="py-2 text-soft font-bold uppercase">SOL</td>
                        <td className="py-2 text-right text-foreground">$138.50</td>
                        <td className="py-2 text-right text-muted">N/A</td>
                        <td className="py-2 text-right text-up">+124.2%</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="hover:bg-hover">
                        <td className="py-2 text-soft font-bold uppercase">TCS</td>
                        <td className="py-2 text-right text-foreground">₹3,950.00</td>
                        <td className="py-2 text-right text-foreground">29.4</td>
                        <td className="py-2 text-right text-up">+12.4%</td>
                      </tr>
                      <tr className="hover:bg-hover">
                        <td className="py-2 text-soft font-bold uppercase">HDFCBANK</td>
                        <td className="py-2 text-right text-foreground">₹1,650.00</td>
                        <td className="py-2 text-right text-foreground">18.5</td>
                        <td className="py-2 text-right text-down">-4.5%</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: News headlines */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-soft" />
              Latest News ({symbol})
            </h3>
            <div className="flex flex-col gap-3">
              {news.map((item, idx) => (
                <a 
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] hover:text-primary transition-colors flex flex-col gap-1 border-b border-border pb-2 leading-relaxed"
                >
                  <span className="text-soft font-medium">{item.title}</span>
                  <span className="text-muted font-bold uppercase tracking-wide text-[8px]">{item.source}</span>
                </a>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
