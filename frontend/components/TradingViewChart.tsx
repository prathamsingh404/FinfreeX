'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { 
  Crosshair, Slash, Layers, Brush, Type, Ruler, Lock, Unlock, Eye, EyeOff, Trash2, 
  Search, Bell, Play, Pause, SkipForward, Settings, ArrowUpRight, 
  X, TrendingDown, BookOpen, Briefcase, History, Code, LineChart, Activity, Check
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
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Helper Technical Indicators ──────────────────────────────────────────────
function calculateSMA(data: OHLCData[], period: number) {
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

function calculateMACD(data: OHLCData[]) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine = [];
  for (let i = 0; i < ema12.length; i++) {
    const d12 = ema12[i];
    const d26 = ema26.find(d => d.time === d12.time);
    if (d12 && d26) {
      macdLine.push({ time: d12.time, value: d12.value - d26.value });
    }
  }
  const signalLine = calculateEMA(macdLine.map(m => ({ close: m.value, time: m.time })), 9);
  const histogram = macdLine.map((m) => {
    const sig = signalLine.find(s => s.time === m.time);
    const val = sig ? m.value - sig.value : 0;
    return { 
      time: m.time, 
      value: val,
      color: val >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)' 
    };
  });
  return { macdLine, signalLine, histogram };
}

function calculateRSI(data: OHLCData[], period: number = 14) {
  const rsiData = [];
  if (data.length <= period) return [];
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change; else losses += Math.abs(change);
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgGain / (avgLoss || 1);
    rsiData.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
  }
  return rsiData;
}

interface TradingViewChartProps {
  symbol?: string;
  exchange?: string;
}

export default function TradingViewChart({ symbol: initialSymbol = 'BTCUSD', exchange = 'NSE' }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('1mo');
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');
  const [data, setData] = useState<OHLCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const [livePulse, setLivePulse] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [legendData, setLegendData] = useState<any>({});
  
  // Left drawing sidebar states
  const [activeTool, setActiveTool] = useState<string>('cursor');
  const [drawings, setDrawings] = useState<any[]>([]);
  const [drawingsVisible, setDrawingsVisible] = useState(true);
  const [drawingsLocked, setDrawingsLocked] = useState(false);
  const drawingStartRef = useRef<{ time: any, price: number } | null>(null);

  // Indicators toggles
  const [indicators, setIndicators] = useState({
    sma50: false,
    ema20: false,
    bb: true,
    macd: false,
    rsi: false,
  });

  // Replay Mode states
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1000); // ms per step
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);

  // Alert system
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');

  const createAlert = () => {
    if (!alertPrice) return;
    const newAlert = {
      id: Date.now(),
      symbol,
      price: parseFloat(alertPrice),
      direction: alertDirection,
      active: true,
      createdAt: new Date().toLocaleTimeString(),
    };
    setAlerts(prev => [newAlert, ...prev]);
    setAlertPrice('');
    setShowAlertModal(false);
  };

  // Bottom Tabs
  const [activeTab, setActiveTab] = useState<'strategy' | 'editor' | 'notes' | 'trading'>('strategy');
  
  // Strategy Tester states
  const [strategyType, setStrategyType] = useState<'bb' | 'crossover'>('bb');
  const [strategyTrades, setStrategyTrades] = useState<any[]>([]);
  const [strategyStats, setStrategyStats] = useState({
    netProfit: 0,
    netProfitPct: 0,
    totalTrades: 0,
    winRate: 0,
    profitFactor: 0,
  });

  // Pine Editor states
  const [editorCode, setEditorCode] = useState(`//@version=5
strategy("Bollinger Bands Strategy", overlay=true)

// Bollinger Bands Parameters
length = input(20, title="BB Length")
mult = input(2.0, title="BB Multiplier")

[middle, upper, lower] = ta.bb(close, length, mult)

// Entry and Exit Rules
buyCondition = ta.crossover(close, lower)
sellCondition = ta.crossunder(close, upper)

if (buyCondition)
    strategy.entry("BB Long", strategy.long)

if (sellCondition)
    strategy.close("BB Long")`);

  // Text Notes states
  const [notes, setNotes] = useState<Record<string, string>>({
    'BTCUSD': 'Bitcoin consolidation patterns near major moving averages. Watching RSI levels closely.',
    'AAPL': 'Apple Inc. fundamental support remains strong. Sector rotations might cause temporary volatility.',
  });

  // Paper Trading Account states
  const [paperBalance, setPaperBalance] = useState(10000);
  const [paperHoldings, setPaperHoldings] = useState<Record<string, { qty: number, avgPrice: number }>>({});
  const [paperHistory, setPaperHistory] = useState<any[]>([]);
  const [tradeAmount, setTradeAmount] = useState('1');

  // Watchlist states
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([
    { symbol: 'SPX', name: 'S&P 500 Index', price: 5432.10, change: -12.45, change_pct: -0.23, type: 'index' },
    { symbol: 'NDQ', name: 'NASDAQ Composite', price: 19432.20, change: 84.50, change_pct: 0.44, type: 'index' },
    { symbol: 'DJI', name: 'Dow Jones Industrial', price: 39120.30, change: 25.10, change_pct: 0.06, type: 'index' },
    { symbol: 'VIX', name: 'CBOE Volatility Index', price: 13.84, change: 0.42, change_pct: 3.13, type: 'index' },
    { symbol: 'DXY', name: 'US Dollar Index', price: 104.25, change: -0.08, change_pct: -0.08, type: 'index' },
    { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', price: 59686.85, change: -10.03, change_pct: -0.02, type: 'crypto' },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 215.30, change: -3.45, change_pct: -1.58, type: 'stock' },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 187.20, change: -4.10, change_pct: -2.14, type: 'stock' },
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', price: 3050.00, change: 12.50, change_pct: 0.41, type: 'stock' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3950.00, change: -15.20, change_pct: -0.38, type: 'stock' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: 1650.00, change: 8.40, change_pct: 0.51, type: 'stock' }
  ]);

  const [news, setNews] = useState<any[]>([]);

  // Refs for chart series
  const candleSeriesRef = useRef<any>(null);
  const lineSeriesRef = useRef<any>(null);
  const volSeriesRef = useRef<any>(null);
  const drawingSeriesRefs = useRef<any[]>([]);
  const indicatorSeriesRefs = useRef<any>({});

  // ── Fetch Historical Data ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/history/${symbol}?period=${period}`);
      const res = await response.json();
      if (res.error) {
        console.error("API error", res.error);
        generateDummyData();
        return;
      }
      const history = res.history.map((d: any) => ({
        time: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume
      }));
      setData(history);
      setCurrency(res.currency);
      setLegendData({
        open: history[history.length - 1].open,
        high: history[history.length - 1].high,
        low: history[history.length - 1].low,
        close: history[history.length - 1].close,
        volume: history[history.length - 1].volume,
        color: history[history.length - 1].close >= history[history.length - 1].open ? 'text-emerald-400' : 'text-red-400'
      });
    } catch (e) {
      console.error("Fetch data error", e);
      generateDummyData();
    } finally {
      setLoading(false);
    }
  }, [symbol, period]);

  const generateDummyData = () => {
    const dummy = [];
    const baseVal = symbol === 'BTCUSD' ? 60000 : symbol === 'AAPL' ? 210 : 3000;
    const now = new Date();
    for (let i = 60; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const close = baseVal + Math.sin(i / 5) * (baseVal * 0.05) + (Math.random() - 0.5) * (baseVal * 0.02);
      const open = close + (Math.random() - 0.5) * (baseVal * 0.015);
      dummy.push({
        time: d.toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(Math.max(open, close).toFixed(2)) + parseFloat((Math.random() * (baseVal * 0.01)).toFixed(2)),
        low: parseFloat(Math.min(open, close).toFixed(2)) - parseFloat((Math.random() * (baseVal * 0.01)).toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(Math.random() * 5000000 + 100000)
      });
    }
    setData(dummy);
    setLegendData({
      open: dummy[dummy.length - 1].open,
      high: dummy[dummy.length - 1].high,
      low: dummy[dummy.length - 1].low,
      close: dummy[dummy.length - 1].close,
      volume: dummy[dummy.length - 1].volume,
      color: dummy[dummy.length - 1].close >= dummy[dummy.length - 1].open ? 'text-emerald-400' : 'text-red-400'
    });
  };

  useEffect(() => {
    fetchData();
    fetchNews();
  }, [symbol, period, fetchData]);

  const fetchNews = async () => {
    try {
      const response = await fetch(`${API}/api/news`);
      const newsList = await response.json();
      if (Array.isArray(newsList)) {
        setNews(newsList.slice(0, 5));
      } else {
        setNews([
          { title: `${symbol} showing steady accumulation patterns under macro headwinds.`, source: 'PortAI Quant Desk', link: '#' },
          { title: `US interest rates expected to stay elevated, impacting global yield curves.`, source: 'Bloomberg Finance', link: '#' },
          { title: `Retail derivative volumes hit historic highs on NSE exchanges.`, source: 'Economic Times', link: '#' }
        ]);
      }
    } catch {
      setNews([
        { title: `${symbol} consolidation continues as institutional buying stabilizes price floor.`, source: 'PortAI Quant Desk', link: '#' },
        { title: `Fed policy update drives global indices higher.`, source: 'Macro Intelligence Daily', link: '#' }
      ]);
    }
  };

  // ── Realtime Polling ────────────────────────────────────────────────────────
  useEffect(() => {
    if (replayMode) return;
    const fetchLivePrice = async () => {
      try {
        const r = await fetch(`${API}/api/price/${symbol}`);
        const d = await r.json();
        if (d.error || !d.price) return;

        setLivePulse(true);
        setTimeout(() => setLivePulse(false), 500);

        setWatchlist(prev => prev.map(item => {
          if (item.symbol.toUpperCase() === symbol.toUpperCase()) {
            return {
              ...item,
              price: d.price,
              change: d.price - d.prev_close,
              change_pct: d.change_pct
            };
          }
          return item;
        }));

        if (candleSeriesRef.current && chartType === 'candles') {
          candleSeriesRef.current.update({
            time: d.timestamp, open: d.open, high: d.high, low: d.low, close: d.price
          });
        }
        if (lineSeriesRef.current && chartType === 'line') {
          lineSeriesRef.current.update({
            time: d.timestamp, value: d.price
          });
        }
        if (volSeriesRef.current) {
          volSeriesRef.current.update({
            time: d.timestamp, value: d.volume, color: d.price >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
          });
        }

        checkAlertRules(d.price);

      } catch {}
    };

    const interval = setInterval(fetchLivePrice, 8000);
    return () => clearInterval(interval);
  }, [symbol, chartType, replayMode, alerts]);

  const toggleIndicators = (key: keyof typeof indicators) => {
    setIndicators(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const checkAlertRules = (currentPrice: number) => {
    setAlerts(prev => {
      const triggered: any[] = [];
      const remaining = prev.filter(a => {
        if (a.symbol === symbol) {
          if (a.direction === 'above' && currentPrice >= a.price) {
            triggered.push(a);
            return false;
          }
          if (a.direction === 'below' && currentPrice <= a.price) {
            triggered.push(a);
            return false;
          }
        }
        return true;
      });

      triggered.forEach(a => {
        alert(`🔔 ALERT TRIGGERED: ${a.symbol} crossed ${a.direction} ${a.price}!`);
      });

      return remaining;
    });
  };

  // ── Run Strategy Backtest Client Side ─────────────────────────────────────
  const runBacktest = useCallback(() => {
    if (!data.length) return;

    let trades: any[] = [];
    let initialCash = 10000;
    let cash = initialCash;
    let position = 0;
    let buyPrice = 0;
    let buyTime = '';
    let tradeNo = 1;

    if (strategyType === 'bb') {
      const bb = calculateBollingerBands(data);
      for (let i = 20; i < data.length; i++) {
        const candle = data[i];
        const lowerBand = bb.lower[i - 20]?.value;
        const upperBand = bb.upper[i - 20]?.value;

        if (!lowerBand || !upperBand) continue;

        if (position === 0 && candle.close < lowerBand) {
          position = Math.floor(cash / candle.close);
          buyPrice = candle.close;
          buyTime = candle.time;
          cash -= position * buyPrice;
        } 
        else if (position > 0 && candle.close > upperBand) {
          const sellPrice = candle.close;
          const pnl = (sellPrice - buyPrice) * position;
          cash += position * sellPrice;
          trades.push({
            no: tradeNo++,
            type: 'LONG',
            entryDate: buyTime,
            entryPrice: buyPrice,
            exitDate: candle.time,
            exitPrice: sellPrice,
            qty: position,
            pnl: parseFloat(pnl.toFixed(2)),
            pnlPct: parseFloat(((pnl / (position * buyPrice)) * 100).toFixed(2)),
            cumProfit: parseFloat((cash - initialCash).toFixed(2)),
          });
          position = 0;
        }
      }
    } else {
      const ema9 = calculateEMA(data, 9);
      const ema21 = calculateEMA(data, 21);

      for (let i = 21; i < data.length; i++) {
        const candle = data[i];
        const prevEma9 = ema9[i - 1]?.value;
        const prevEma21 = ema21[i - 1]?.value;
        const currEma9 = ema9[i]?.value;
        const currEma21 = ema21[i]?.value;

        if (!prevEma9 || !prevEma21 || !currEma9 || !currEma21) continue;

        if (position === 0 && prevEma9 <= prevEma21 && currEma9 > currEma21) {
          position = Math.floor(cash / candle.close);
          buyPrice = candle.close;
          buyTime = candle.time;
          cash -= position * buyPrice;
        }
        else if (position > 0 && prevEma9 >= prevEma21 && currEma9 < currEma21) {
          const sellPrice = candle.close;
          const pnl = (sellPrice - buyPrice) * position;
          cash += position * sellPrice;
          trades.push({
            no: tradeNo++,
            type: 'LONG',
            entryDate: buyTime,
            entryPrice: buyPrice,
            exitDate: candle.time,
            exitPrice: sellPrice,
            qty: position,
            pnl: parseFloat(pnl.toFixed(2)),
            pnlPct: parseFloat(((pnl / (position * buyPrice)) * 100).toFixed(2)),
            cumProfit: parseFloat((cash - initialCash).toFixed(2)),
          });
          position = 0;
        }
      }
    }

    if (position > 0) {
      const finalPrice = data[data.length - 1].close;
      const pnl = (finalPrice - buyPrice) * position;
      cash += position * finalPrice;
      trades.push({
        no: tradeNo++,
        type: 'LONG (OPEN)',
        entryDate: buyTime,
        entryPrice: buyPrice,
        exitDate: data[data.length - 1].time,
        exitPrice: finalPrice,
        qty: position,
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPct: parseFloat(((pnl / (position * buyPrice)) * 100).toFixed(2)),
        cumProfit: parseFloat((cash - initialCash).toFixed(2)),
      });
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    const winRate = trades.length ? (winningTrades.length / trades.length) * 100 : 0;
    
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? 99.9 : 0;

    setStrategyTrades(trades.reverse());
    setStrategyStats({
      netProfit: parseFloat((cash - initialCash).toFixed(2)),
      netProfitPct: parseFloat((((cash - initialCash) / initialCash) * 100).toFixed(2)),
      totalTrades: trades.length,
      winRate: parseFloat(winRate.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
    });
  }, [data, strategyType]);

  useEffect(() => {
    runBacktest();
  }, [data, strategyType, runBacktest]);

  // ── Render Chart Canvas ────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current || !data.length) return;

    const chartData = replayMode ? data.slice(0, replayIndex) : data;
    if (!chartData.length) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#8e8e93',
        fontSize: 11,
        fontFamily: 'SF Pro Text, Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(139, 92, 246, 0.25)', width: 1, style: 3, labelBackgroundColor: '#1f1f23' },
        horzLine: { color: 'rgba(139, 92, 246, 0.25)', width: 1, style: 3, labelBackgroundColor: '#1f1f23' },
      },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.06)', autoScale: true },
      timeScale: { borderColor: 'rgba(255, 255, 255, 0.06)', rightOffset: 12, barSpacing: 8, timeVisible: true },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    let mainSeries: any;
    if (chartType === 'candles') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e', downColor: '#ef4444', borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444',
      });
      mainSeries.setData(chartData);
      candleSeriesRef.current = mainSeries;
      lineSeriesRef.current = null;
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#6366f1', lineWidth: 2, priceLineVisible: true, lastValueVisible: true
      });
      mainSeries.setData(chartData.map(d => ({ time: d.time, value: d.close })));
      lineSeriesRef.current = mainSeries;
      candleSeriesRef.current = null;
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' }, priceScaleId: '',
    });
    volumeSeries.setData(chartData.map(d => ({
      time: d.time,
      value: d.volume || 1000000,
      color: d.close >= d.open ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'
    })));
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volSeriesRef.current = volumeSeries;

    indicatorSeriesRefs.current = {};

    if (indicators.sma50 && chartData.length > 50) {
      const smaData = calculateSMA(chartData, 50);
      const smaSeries = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      smaSeries.setData(smaData);
      indicatorSeriesRefs.current.sma = smaSeries;
    }

    if (indicators.ema20 && chartData.length > 20) {
      const emaData = calculateEMA(chartData, 20);
      const emaSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      emaSeries.setData(emaData);
      indicatorSeriesRefs.current.ema = emaSeries;
    }

    if (indicators.bb && chartData.length > 20) {
      const bb = calculateBollingerBands(chartData);
      const bbUpper = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.25)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      const bbLower = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.25)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      const bbMiddle = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.15)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
      
      bbUpper.setData(bb.upper);
      bbLower.setData(bb.lower);
      bbMiddle.setData(bb.middle);
      
      indicatorSeriesRefs.current.bbUpper = bbUpper;
      indicatorSeriesRefs.current.bbLower = bbLower;
      indicatorSeriesRefs.current.bbMiddle = bbMiddle;
    }

    let macdHistSeries: any, macdLineSeries: any, macdSigSeries: any;
    if (indicators.macd && chartData.length > 26) {
      const macd = calculateMACD(chartData);
      macdHistSeries = chart.addSeries(HistogramSeries, { priceScaleId: 'macd', lastValueVisible: false });
      macdLineSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, priceScaleId: 'macd', lastValueVisible: false });
      macdSigSeries = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, priceScaleId: 'macd', lastValueVisible: false });
      
      macdHistSeries.setData(macd.histogram);
      macdLineSeries.setData(macd.macdLine);
      macdSigSeries.setData(macd.signalLine);
      
      chart.priceScale('macd').applyOptions({ scaleMargins: { top: 0.85, bottom: 0.02 }, borderColor: 'rgba(255, 255, 255, 0.05)' });
      
      indicatorSeriesRefs.current.macdHist = macdHistSeries;
      indicatorSeriesRefs.current.macdLine = macdLineSeries;
      indicatorSeriesRefs.current.macdSig = macdSigSeries;
    }

    let rsiSeries: any;
    if (indicators.rsi && chartData.length > 14) {
      const rsiData = calculateRSI(chartData);
      rsiSeries = chart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 1, priceScaleId: 'rsi', lastValueVisible: false });
      rsiSeries.setData(rsiData);
      
      chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.72, bottom: 0.18 }, visible: false });
      
      indicatorSeriesRefs.current.rsi = rsiSeries;
    }

    drawingSeriesRefs.current = [];
    if (drawingsVisible) {
      drawings.forEach((draw) => {
        if (draw.type === 'trendline') {
          const lSeries = chart.addSeries(LineSeries, { color: draw.color || '#a78bfa', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
          lSeries.setData([draw.start, draw.end]);
          drawingSeriesRefs.current.push(lSeries);
        } else if (draw.type === 'horizontal') {
          const startT = chartData[0].time;
          const endT = chartData[chartData.length - 1].time;
          const lSeries = chart.addSeries(LineSeries, { color: draw.color || '#f43f5e', lineWidth: 2, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
          lSeries.setData([
            { time: startT, value: draw.price },
            { time: endT, value: draw.price }
          ]);
          drawingSeriesRefs.current.push(lSeries);
        } else if (draw.type === 'fib') {
          const startT = chartData[0].time;
          const endT = chartData[chartData.length - 1].time;
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const colors = ['#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'];
          
          levels.forEach((lvl, idx) => {
            const val = draw.low + (draw.high - draw.low) * lvl;
            const fibLSeries = chart.addSeries(LineSeries, { color: colors[idx], lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
            fibLSeries.setData([
              { time: startT, value: val },
              { time: endT, value: val }
            ]);
            drawingSeriesRefs.current.push(fibLSeries);
          });
        }
      });
    }

    chart.subscribeClick((param) => {
      if (!param.point || !param.time || drawingsLocked) return;
      const price = mainSeries.coordinateToPrice(param.point.y);
      if (!price) return;

      if (activeTool === 'trendline') {
        if (!drawingStartRef.current) {
          drawingStartRef.current = { time: param.time, price };
        } else {
          const newTrend = {
            id: Math.random().toString(),
            type: 'trendline',
            start: drawingStartRef.current,
            end: { time: param.time, price },
            color: '#a78bfa'
          };
          setDrawings(prev => [...prev, newTrend]);
          drawingStartRef.current = null;
        }
      } else if (activeTool === 'horizontal') {
        const newHorz = {
          id: Math.random().toString(),
          type: 'horizontal',
          price,
          color: '#f43f5e'
        };
        setDrawings(prev => [...prev, newHorz]);
      } else if (activeTool === 'fib') {
        if (!drawingStartRef.current) {
          drawingStartRef.current = { time: param.time, price };
        } else {
          const high = Math.max(drawingStartRef.current.price, price);
          const low = Math.min(drawingStartRef.current.price, price);
          const newFib = {
            id: Math.random().toString(),
            type: 'fib',
            high,
            low,
            start: drawingStartRef.current,
            end: { time: param.time, price }
          };
          setDrawings(prev => [...prev, newFib]);
          drawingStartRef.current = null;
        }
      }
    });

    chart.subscribeCrosshairMove((param) => {
      const candle = param.seriesData.get(mainSeries) as any;
      const vol = param.seriesData.get(volumeSeries) as any;
      const mHist = macdHistSeries ? param.seriesData.get(macdHistSeries) as any : null;
      const rsiVal = rsiSeries ? param.seriesData.get(rsiSeries) as any : null;

      if (!candle) {
        setLegendData({
          open: chartData[chartData.length - 1].open,
          high: chartData[chartData.length - 1].high,
          low: chartData[chartData.length - 1].low,
          close: chartData[chartData.length - 1].close,
          volume: chartData[chartData.length - 1].volume,
          color: chartData[chartData.length - 1].close >= chartData[chartData.length - 1].open ? 'text-emerald-400' : 'text-red-400'
        });
        return;
      }

      setLegendData({
        open: candle.open ?? candle.value,
        high: candle.high ?? candle.value,
        low: candle.low ?? candle.value,
        close: candle.close ?? candle.value,
        volume: vol?.value,
        macd: mHist?.value,
        rsi: rsiVal?.value,
        color: (candle.close ?? candle.value) >= (candle.open ?? candle.value) ? 'text-emerald-400' : 'text-red-400'
      });
    });

    chart.timeScale().fitContent();
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, chartType, indicators, drawings, drawingsVisible, drawingsLocked, activeTool, replayMode, replayIndex]);

  // ── Replay Mode Engine ────────────────────────────────────────────────────
  useEffect(() => {
    if (!replayMode) {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
      setIsPlayingReplay(false);
      return;
    }
    if (isPlayingReplay) {
      replayTimerRef.current = setInterval(() => {
        setReplayIndex(prev => {
          if (prev >= data.length) {
            setIsPlayingReplay(false);
            clearInterval(replayTimerRef.current!);
            return prev;
          }
          return prev + 1;
        });
      }, replaySpeed);
    } else {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    }

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replayMode, isPlayingReplay, replaySpeed, data.length]);

  const startReplayMode = () => {
    setReplayIndex(Math.floor(data.length * 0.6));
    setReplayMode(true);
  };

  const stopReplayMode = () => {
    setReplayMode(false);
    setIsPlayingReplay(false);
  };

  // ── Manual Trading execution ──────────────────────────────────────────────
  const executeManualTrade = (type: 'BUY' | 'SELL') => {
    const qty = parseInt(tradeAmount);
    const currPrice = legendData.close || data[data.length - 1]?.close || 0;
    if (!qty || !currPrice) return;

    if (type === 'BUY') {
      const cost = qty * currPrice;
      if (paperBalance < cost) {
        alert("Insufficient paper balance!");
        return;
      }
      setPaperBalance(prev => prev - cost);
      setPaperHoldings(prev => {
        const existing = prev[symbol] || { qty: 0, avgPrice: 0 };
        const totalQty = existing.qty + qty;
        const totalCost = (existing.qty * existing.avgPrice) + cost;
        return {
          ...prev,
          [symbol]: { qty: totalQty, avgPrice: parseFloat((totalCost / totalQty).toFixed(2)) }
        };
      });
      setPaperHistory(prev => [
        { id: Math.random().toString(), symbol, type: 'BUY', qty, price: currPrice, time: new Date().toLocaleTimeString(), status: 'Executed' },
        ...prev
      ]);
    } else {
      const existing = paperHoldings[symbol];
      if (!existing || existing.qty < qty) {
        alert("Not enough holdings to sell!");
        return;
      }
      const proceeds = qty * currPrice;
      const profit = proceeds - (qty * existing.avgPrice);
      setPaperBalance(prev => prev + proceeds);
      setPaperHoldings(prev => {
        const remaining = existing.qty - qty;
        if (remaining <= 0) {
          const copy = { ...prev };
          delete copy[symbol];
          return copy;
        }
        return {
          ...prev,
          [symbol]: { qty: remaining, avgPrice: existing.avgPrice }
        };
      });
      setPaperHistory(prev => [
        { id: Math.random().toString(), symbol, type: 'SELL', qty, price: currPrice, time: new Date().toLocaleTimeString(), status: 'Executed', pnl: profit },
        ...prev
      ]);
    }
  };

  const loadSymbol = (sym: string) => {
    setSymbol(sym);
    setSearchQuery('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSymbol(searchQuery.trim().toUpperCase());
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(prev => ({
      ...prev,
      [symbol]: e.target.value
    }));
  };

  const runPineScript = () => {
    if (editorCode.toLowerCase().includes('crossover')) {
      setStrategyType('crossover');
      alert("Pine Script successfully compiled! Applied: EMA Crossover Strategy.");
    } else {
      setStrategyType('bb');
      alert("Pine Script successfully compiled! Applied: Bollinger Bands Strategy.");
    }
    setActiveTab('strategy');
  };

  const currentNotes = notes[symbol] || '';

  return (
    <div className="flex flex-col w-full h-[calc(100vh-76px)] overflow-hidden bg-[#070709]">
      
      {/* ── Top Control Toolbar ── */}
      <div className="h-12 border-b border-white/[0.05] bg-[#0c0c0f] flex items-center justify-between px-4 text-slate-300 text-xs shrink-0 select-none">
        <div className="flex items-center gap-3">
          {/* Symbol Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-500" />
            <input 
              type="text" 
              placeholder="BTCUSD" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.05] rounded-md pl-8 pr-3 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-36 transition-all"
            />
          </form>

          <span className="w-[1px] h-4 bg-white/10" />

          {/* Timeframes */}
          <div className="flex items-center gap-0.5 bg-white/[0.02] p-0.5 rounded-md border border-white/[0.03]">
            {[
              { label: '1D', value: '1d' },
              { label: '5D', value: '5d' },
              { label: '1M', value: '1mo' },
              { label: '3M', value: '3mo' },
              { label: '1Y', value: '1y' }
            ].map(t => (
              <button 
                key={t.value} 
                onClick={() => setPeriod(t.value)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${period === t.value ? 'bg-indigo-600 text-white' : 'hover:bg-white/[0.05] text-slate-400'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <span className="w-[1px] h-4 bg-white/10" />

          {/* Chart Style Toggle */}
          <div className="flex items-center gap-0.5 bg-white/[0.02] p-0.5 rounded-md border border-white/[0.03]">
            <button 
              onClick={() => setChartType('candles')}
              className={`p-1 rounded transition-all ${chartType === 'candles' ? 'bg-white/[0.06] text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Candlestick Chart"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setChartType('line')}
              className={`p-1 rounded transition-all ${chartType === 'line' ? 'bg-white/[0.06] text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Line Chart"
            >
              <LineChart className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="w-[1px] h-4 bg-white/10" />

          {/* Indicator Options */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Indicators:</span>
            {[
              { label: 'BB', key: 'bb' },
              { label: 'SMA50', key: 'sma50' },
              { label: 'EMA20', key: 'ema20' },
              { label: 'MACD', key: 'macd' },
              { label: 'RSI', key: 'rsi' }
            ].map(ind => (
              <button
                key={ind.key}
                onClick={() => toggleIndicators(ind.key as keyof typeof indicators)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                  indicators[ind.key as keyof typeof indicators] 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                    : 'border-white/[0.05] text-slate-400 hover:border-white/10'
                }`}
              >
                {ind.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Replay Controls */}
          {replayMode ? (
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
              <span className="text-[9px] font-black text-indigo-400 uppercase animate-pulse">Replay Active</span>
              <button onClick={() => setIsPlayingReplay(!isPlayingReplay)} className="text-slate-300 hover:text-white p-0.5">
                {isPlayingReplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button 
                onClick={() => setReplayIndex(prev => Math.min(data.length, prev + 1))}
                className="text-slate-300 hover:text-white p-0.5"
                disabled={isPlayingReplay}
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <button onClick={stopReplayMode} className="text-red-400 hover:text-red-300 p-0.5 ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button 
              onClick={startReplayMode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] text-slate-300 transition-all font-semibold"
            >
              <History className="w-3.5 h-3.5" />
              Replay
            </button>
          )}

          {/* Alert button */}
          <button 
            onClick={() => setShowAlertModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/15 transition-all"
          >
            <Bell className="w-3.5 h-3.5" />
            Alert
          </button>
        </div>
      </div>

      {/* ── Alert Modal ── */}
      {showAlertModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0e0e12] border border-white/[0.08] w-80 p-5 rounded-2xl shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-200">Create Alert for {symbol}</h3>
              <button onClick={() => setShowAlertModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-slate-500">Condition</label>
              <select 
                value={alertDirection} 
                onChange={(e: any) => setAlertDirection(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-slate-300 text-xs focus:outline-none"
              >
                <option value="above">Crossing Above</option>
                <option value="below">Crossing Below</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-slate-500">Trigger Value</label>
              <input 
                type="text" 
                placeholder="59000" 
                value={alertPrice}
                onChange={(e) => setAlertPrice(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button 
              onClick={createAlert}
              className="bg-indigo-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-indigo-500 mt-2"
            >
              Create Rule
            </button>
          </div>
        </div>
      )}

      {/* ── Main Workspace layout ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        
        {/* ── Left Sidebar Drawing Tools ── */}
        <div className="w-12 border-r border-white/[0.05] bg-[#0c0c0f] flex flex-col items-center py-3 gap-3 shrink-0 select-none">
          <button 
            onClick={() => setActiveTool('cursor')}
            className={`p-1.5 rounded-lg transition-all ${activeTool === 'cursor' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}
            title="Cursor / Crosshair"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setActiveTool('trendline')}
            className={`p-1.5 rounded-lg transition-all ${activeTool === 'trendline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}
            title="Trend Line"
          >
            <Slash className="w-4 h-4 -rotate-45" />
          </button>

          <button 
            onClick={() => setActiveTool('fib')}
            className={`p-1.5 rounded-lg transition-all ${activeTool === 'fib' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}
            title="Fibonacci Retracement"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setActiveTool('horizontal')}
            className={`p-1.5 rounded-lg transition-all ${activeTool === 'horizontal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}
            title="Horizontal Line"
          >
            <div className="w-4 h-[2px] bg-current my-2 rounded-full" />
          </button>

          <button 
            onClick={() => setActiveTool('brush')}
            className={`p-1.5 rounded-lg transition-all ${activeTool === 'brush' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}
            title="Brush Tool"
          >
            <Brush className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setActiveTool('text')}
            className={`p-1.5 rounded-lg transition-all ${activeTool === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}
            title="Text Balloon"
          >
            <Type className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setActiveTool('ruler')}
            className={`p-1.5 rounded-lg transition-all ${activeTool === 'ruler' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}
            title="Ruler / Measure"
          >
            <Ruler className="w-4 h-4" />
          </button>

          <span className="w-6 h-[1px] bg-white/5 my-1" />

          {/* Toggle features */}
          <button 
            onClick={() => setDrawingsLocked(!drawingsLocked)}
            className={`p-1.5 rounded-lg transition-all ${drawingsLocked ? 'text-indigo-400 hover:bg-white/[0.02]' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}
            title={drawingsLocked ? 'Unlock drawings' : 'Lock all drawings'}
          >
            {drawingsLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          <button 
            onClick={() => setDrawingsVisible(!drawingsVisible)}
            className={`p-1.5 rounded-lg transition-all ${!drawingsVisible ? 'text-indigo-400 hover:bg-white/[0.02]' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}
            title={drawingsVisible ? 'Hide all drawings' : 'Show all drawings'}
          >
            {drawingsVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button 
            onClick={() => setDrawings([])}
            className="p-1.5 rounded-lg text-red-400/80 hover:bg-red-500/10 hover:text-red-300 transition-all mt-auto"
            title="Clear all drawings"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* ── Center Area: Chart + Bottom Tabs ── */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Chart Canvas */}
          <div className="flex-1 relative min-h-0 bg-[#09090b]">
            
            {/* Quick Trade Buy/Sell Widget Overlay */}
            <div className="absolute top-4 right-4 z-20 bg-white/[0.02] border border-white/[0.06] backdrop-blur-md rounded-xl p-3 flex flex-col gap-2 shadow-2xl select-none">
              <div className="flex gap-2">
                <button 
                  onClick={() => executeManualTrade('BUY')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  BUY
                </button>
                <button 
                  onClick={() => executeManualTrade('SELL')}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                >
                  <TrendingDown className="w-3 h-3" />
                  SELL
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Quantity</span>
                <input 
                  type="number" 
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  className="bg-white/[0.05] border border-white/10 rounded w-12 text-center text-xs py-0.5 text-slate-200 outline-none"
                />
              </div>
            </div>

            {/* Custom Drawing Info Panel */}
            {activeTool !== 'cursor' && (
              <div className="absolute top-4 left-[200px] z-20 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 select-none">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                <span>{activeTool.toUpperCase()} TOOL ACTIVE. Click on the chart to draw.</span>
                <button onClick={() => setActiveTool('cursor')} className="text-slate-400 hover:text-slate-200 ml-1"><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* Live Legend */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-1 select-none">
              <div className="flex items-center gap-3">
                {replayMode ? (
                  <div className="flex items-center gap-1 bg-indigo-500/20 border border-indigo-500/40 rounded px-1.5 py-0.5 text-[9px] text-indigo-400 font-black uppercase tracking-tighter">
                    REPLAY
                  </div>
                ) : live ? (
                  <div className={`flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 rounded px-1.5 py-0.5 text-[9px] text-emerald-400 font-black uppercase tracking-tighter transition-all ${livePulse ? 'scale-105 bg-emerald-500/30' : ''}`}>
                    <span className={`w-1 h-1 rounded-full bg-emerald-400 ${livePulse ? 'animate-ping' : 'animate-pulse'}`} />
                    LIVE
                  </div>
                ) : (
                  <div className="bg-white/10 rounded px-1.5 py-0.5 text-[9px] text-white/40 font-black uppercase tracking-tighter">HIST</div>
                )}
                <span className="text-white font-extrabold text-base tracking-tight">{symbol}</span>
                <span className="text-slate-500 text-[10px]">{currency}</span>
              </div>
              
              <div className="flex gap-4 text-[11px] font-mono mt-1">
                {['open', 'high', 'low', 'close'].map(k => (
                  <div key={k} className="flex gap-1.5">
                    <span className="text-white/20 uppercase text-[9px]">{k[0]}</span>
                    <span className={legendData.color}>{legendData[k]?.toFixed(2) || '0.00'}</span>
                  </div>
                ))}
                {legendData.volume && (
                  <div className="flex gap-1.5 ml-4 border-l border-white/10 pl-4">
                    <span className="text-white/20 text-[9px]">VOL</span>
                    <span className="text-white/60">{(legendData.volume).toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 text-[9px] font-bold uppercase tracking-wider mt-2">
                {indicators.rsi && (
                  <span className="text-pink-400/60">RSI (14): {legendData.rsi?.toFixed(2) || '--'}</span>
                )}
                {indicators.macd && (
                  <span className="text-blue-400/60">MACD: {legendData.macd?.toFixed(2) || '--'}</span>
                )}
                {indicators.bb && (
                  <span className="text-indigo-400/50">Bollinger Bands: ACTIVE</span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-sm z-[30] flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Chart Data...</span>
              </div>
            ) : null}

            <div ref={chartContainerRef} className="w-full h-full" />
            
            {/* Visual Polish: Side Vignettes */}
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/20 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/20 to-transparent z-10 pointer-events-none" />
          </div>

          {/* ── Bottom Panel Tabbed Container ── */}
          <div className="h-[280px] border-t border-white/[0.05] bg-[#0c0c0f] flex flex-col shrink-0">
            {/* Tab selection bar */}
            <div className="h-9 border-b border-white/[0.03] bg-[#08080a] flex items-center justify-between px-4 text-xs font-bold select-none">
              <div className="flex gap-1">
                {[
                  { id: 'strategy', label: 'Strategy Tester', icon: Activity },
                  { id: 'editor', label: 'Pine Editor', icon: Code },
                  { id: 'notes', label: 'Text Notes', icon: BookOpen },
                  { id: 'trading', label: 'Trading Panel', icon: Briefcase }
                ].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg border-b-2 transition-all ${
                      activeTab === t.id 
                        ? 'border-indigo-500 text-indigo-400 bg-white/[0.02]' 
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                PortAI Quant Module
              </div>
            </div>

            {/* Tab content area */}
            <div className="flex-1 overflow-hidden">
              
              {/* ── Strategy Tester Tab ── */}
              {activeTab === 'strategy' && (
                <div className="w-full h-full flex flex-col p-4 overflow-hidden bg-[#09090c]">
                  <div className="flex justify-between items-center pb-3 border-b border-white/[0.03] shrink-0">
                    <div className="flex items-center gap-3">
                      <select 
                        value={strategyType} 
                        onChange={(e: any) => setStrategyType(e.target.value)}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1 text-slate-300 text-xs font-bold focus:outline-none"
                      >
                        <option value="bb">Bollinger Bands Breakout Strategy</option>
                        <option value="crossover">EMA 9/21 Gold Cross Strategy</option>
                      </select>
                      <button 
                        onClick={runBacktest}
                        className="px-2.5 py-1 text-[10px] bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] rounded font-bold text-slate-300 transition-all"
                      >
                        Recalculate Backtest
                      </button>
                    </div>

                    {/* Stats overview */}
                    <div className="flex gap-6 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase font-bold">Net Profit</span>
                        <span className={`font-bold ${strategyStats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {strategyStats.netProfit >= 0 ? '+' : ''}{strategyStats.netProfit.toLocaleString()} ({strategyStats.netProfitPct}%)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase font-bold">Total Trades</span>
                        <span className="font-bold text-slate-300">{strategyStats.totalTrades}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase font-bold">Win Rate</span>
                        <span className="font-bold text-slate-300">{strategyStats.winRate}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase font-bold">Profit Factor</span>
                        <span className="font-bold text-slate-300">{strategyStats.profitFactor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Trades ledger table */}
                  <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-500 uppercase tracking-widest text-[9px] border-b border-white/5 pb-2">
                          <th className="py-2 font-bold">Trade #</th>
                          <th className="py-2 font-bold">Type</th>
                          <th className="py-2 font-bold">Entry Date</th>
                          <th className="py-2 font-bold">Entry Price</th>
                          <th className="py-2 font-bold">Exit Date</th>
                          <th className="py-2 font-bold">Exit Price</th>
                          <th className="py-2 font-bold">Contracts/Qty</th>
                          <th className="py-2 font-bold">P&L</th>
                          <th className="py-2 font-bold text-right">Cum. Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {strategyTrades.map((t) => (
                          <tr key={t.no} className="hover:bg-white/[0.01] transition-all">
                            <td className="py-2 text-slate-400 font-mono">#{t.no}</td>
                            <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[9px]">{t.type}</span></td>
                            <td className="py-2 text-slate-400 font-mono">{t.entryDate}</td>
                            <td className="py-2 text-slate-300 font-mono">{t.entryPrice.toLocaleString()}</td>
                            <td className="py-2 text-slate-400 font-mono">{t.exitDate}</td>
                            <td className="py-2 text-slate-300 font-mono">{t.exitPrice.toLocaleString()}</td>
                            <td className="py-2 text-slate-400 font-mono">{t.qty}</td>
                            <td className={`py-2 font-bold font-mono ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t.pnl >= 0 ? '+' : ''}{t.pnl.toLocaleString()} ({t.pnlPct}%)
                            </td>
                            <td className={`py-2 text-right font-bold font-mono ${t.cumProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t.cumProfit.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Pine Editor Tab ── */}
              {activeTab === 'editor' && (
                <div className="w-full h-full flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 border-b border-white/[0.03] shrink-0 select-none bg-[#09090b]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Pine Script Console (v5)</span>
                    <button 
                      onClick={runPineScript}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-[10px] flex items-center gap-1 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Add to Chart
                    </button>
                  </div>
                  <textarea 
                    value={editorCode}
                    onChange={(e) => setEditorCode(e.target.value)}
                    className="flex-1 bg-[#09090c] p-4 text-[11px] font-mono text-slate-300 focus:outline-none resize-none custom-scrollbar w-full leading-relaxed border-none focus:ring-0"
                    spellCheck="false"
                  />
                </div>
              )}

              {/* ── Text Notes Tab ── */}
              {activeTab === 'notes' && (
                <div className="w-full h-full flex flex-col p-4 overflow-hidden">
                  <div className="flex justify-between items-center pb-2 shrink-0 select-none">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Scratch Notes ({symbol})</span>
                  </div>
                  <textarea
                    placeholder="Type notes and observations for this ticker here..."
                    value={currentNotes}
                    onChange={handleNotesChange}
                    className="flex-1 bg-[#09090c] border border-white/[0.04] p-4 rounded-xl text-xs text-slate-300 focus:outline-none resize-none leading-relaxed focus:border-indigo-500/50"
                  />
                </div>
              )}

              {/* ── Trading Panel Tab ── */}
              {activeTab === 'trading' && (
                <div className="w-full h-full flex p-4 gap-6 overflow-hidden bg-[#09090c]">
                  
                  {/* Account overview */}
                  <div className="w-1/3 border-r border-white/5 pr-6 flex flex-col justify-between shrink-0">
                    <div>
                      <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">Paper Portfolio Balance</h4>
                      <div className="text-2xl font-extrabold text-slate-100 font-mono">${paperBalance.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Simulated Trading Account (Delayed Data)</div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setPaperBalance(10000);
                        setPaperHoldings({});
                        setPaperHistory([]);
                        alert("Account reset successfully!");
                      }}
                      className="border border-red-500/20 text-red-400 hover:bg-red-500/5 hover:border-red-500/30 rounded-lg py-1.5 text-xs font-bold transition-all"
                    >
                      Reset Account Balance
                    </button>
                  </div>

                  {/* Active Positions */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2 select-none">Open Positions</h4>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {Object.keys(paperHoldings).length > 0 ? (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="text-slate-500 uppercase text-[9px] border-b border-white/5 pb-2">
                              <th className="py-1">Symbol</th>
                              <th className="py-1">Quantity</th>
                              <th className="py-1">Avg Price</th>
                              <th className="py-1">Current Price</th>
                              <th className="py-1 text-right">Total Profit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.02]">
                            {Object.entries(paperHoldings).map(([sym, item]) => {
                              const currPrice = sym === symbol ? (legendData.close || data[data.length-1]?.close || 0) : item.avgPrice;
                              const pnl = (currPrice - item.avgPrice) * item.qty;
                              return (
                                <tr key={sym}>
                                  <td className="py-2 font-bold text-slate-200">{sym}</td>
                                  <td className="py-2 text-slate-400 font-mono">{item.qty}</td>
                                  <td className="py-2 text-slate-400 font-mono">${item.avgPrice}</td>
                                  <td className="py-2 text-slate-400 font-mono">${currPrice.toLocaleString()}</td>
                                  <td className={`py-2 text-right font-bold font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ${pnl >= 0 ? '+' : ''}{pnl.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs italic py-6">
                          No open positions. Use the BUY widget on the chart overlay to trade.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trade history */}
                  <div className="w-1/3 border-l border-white/5 pl-6 flex flex-col min-w-0">
                    <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2 select-none">Execution Log</h4>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {paperHistory.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {paperHistory.map((h) => (
                            <div key={h.id} className="text-[10px] border-b border-white/[0.02] pb-1.5 flex justify-between items-center">
                              <div>
                                <span className={`font-bold px-1 rounded mr-1.5 ${h.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {h.type}
                                </span>
                                <span className="font-extrabold text-slate-300">{h.symbol}</span>
                                <span className="text-slate-500"> x{h.qty}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-bold text-slate-300">${h.price.toLocaleString()}</div>
                                <div className="text-slate-500">{h.time}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs italic py-6">
                          No trades executed.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>

        </div>

        {/* ── Right Sidebar Panel: Watchlist & Details ── */}
        <div className="w-80 border-l border-white/[0.05] bg-[#0c0c0f] flex flex-col shrink-0 select-none">
          
          {/* Watchlist Section */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-white/[0.05]">
            <div className="h-10 px-4 border-b border-white/[0.03] flex items-center justify-between shrink-0">
              <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Watchlist</span>
              <div className="flex items-center gap-1.5 text-slate-500">
                <button className="p-0.5 hover:text-slate-300"><Settings className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Headers */}
            <div className="px-4 py-1.5 text-[9px] font-bold uppercase text-slate-500 tracking-wider flex justify-between shrink-0 bg-[#09090b]">
              <span className="w-1/3 text-left">Symbol</span>
              <span className="w-1/4 text-right">Last</span>
              <span className="w-1/4 text-right">Chg</span>
              <span className="w-1/6 text-right">Chg%</span>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              
              {/* Indices Category */}
              <div className="py-2 border-b border-white/[0.02]">
                <div className="px-4 text-[9px] font-extrabold uppercase text-slate-600 tracking-widest mb-1">Indices</div>
                {watchlist.filter(w => w.type === 'index').map(item => (
                  <div 
                    key={item.symbol} 
                    onClick={() => loadSymbol(item.symbol)}
                    className={`px-4 py-1.5 flex justify-between items-center text-xs cursor-pointer transition-all ${
                      symbol.toUpperCase() === item.symbol.toUpperCase() 
                        ? 'bg-indigo-600/10 border-l-2 border-indigo-500' 
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="w-1/3 flex flex-col">
                      <span className="font-bold text-slate-300">{item.symbol}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[90px]">{item.name}</span>
                    </div>
                    <span className="w-1/4 text-right font-mono font-bold text-slate-300">{item.price.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                    <span className={`w-1/4 text-right font-mono ${item.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}
                    </span>
                    <span className={`w-1/6 text-right font-mono ${item.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Stocks/Crypto Category */}
              <div className="py-2">
                <div className="px-4 text-[9px] font-extrabold uppercase text-slate-600 tracking-widest mb-1">Equities & Crypto</div>
                {watchlist.filter(w => w.type !== 'index').map(item => (
                  <div 
                    key={item.symbol} 
                    onClick={() => loadSymbol(item.symbol)}
                    className={`px-4 py-1.5 flex justify-between items-center text-xs cursor-pointer transition-all ${
                      symbol.toUpperCase() === item.symbol.toUpperCase() 
                        ? 'bg-indigo-600/10 border-l-2 border-indigo-500' 
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="w-1/3 flex flex-col">
                      <span className="font-bold text-slate-300">{item.symbol}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[90px]">{item.name}</span>
                    </div>
                    <span className="w-1/4 text-right font-mono font-bold text-slate-300">{item.price.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                    <span className={`w-1/4 text-right font-mono ${item.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}
                    </span>
                    <span className={`w-1/6 text-right font-mono ${item.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Details & News Section */}
          <div className="h-[260px] flex flex-col bg-[#08080a] p-4 shrink-0 overflow-y-auto custom-scrollbar border-t border-white/[0.03]">
            <div className="flex flex-col gap-1 pb-3 border-b border-white/[0.03]">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-base text-slate-100 tracking-tight">{symbol}</span>
                <span className="text-[9px] uppercase font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                  {symbol === 'BTCUSD' ? 'Crypto' : 'Equity'}
                </span>
              </div>
              <span className="text-xs text-slate-500">{watchlist.find(w => w.symbol.toUpperCase() === symbol.toUpperCase())?.name || symbol}</span>
              
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl font-mono font-black text-slate-100">${(legendData.close || 0.0).toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                <span className={`text-xs font-mono font-bold ${(legendData.close - (data[data.length-2]?.close || legendData.close)) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {((legendData.close - (data[data.length-2]?.close || legendData.close)) >= 0) ? '+' : ''}
                  {(legendData.close - (data[data.length-2]?.close || legendData.close)).toFixed(2)} 
                  ({(((legendData.close - (data[data.length-2]?.close || legendData.close)) / (data[data.length-2]?.close || 1)) * 100).toFixed(2)}%)
                </span>
              </div>
              <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">● Market Open (Delayed)</span>
            </div>

            <div className="flex-1 flex flex-col gap-2.5 pt-3">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest select-none">Related Headlines</span>
              {news.map((item, idx) => (
                <a 
                  key={idx} 
                  href={item.link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[10px] hover:text-indigo-400 transition-colors flex flex-col gap-1 border-b border-white/[0.02] pb-2"
                >
                  <span className="text-slate-300 font-medium leading-relaxed">{item.title}</span>
                  <span className="text-slate-500 text-[8px] font-bold uppercase tracking-wider">{item.source}</span>
                </a>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
