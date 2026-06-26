'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
} from 'lightweight-charts';
import { useOHLCV } from '@/lib/hooks/useOHLCV';

const TIMEFRAME_MAP: Record<string, { period: string; interval: string }> = {
  '1D':  { period: '5d',  interval: '5m'  },
  '1W':  { period: '1mo', interval: '1h'  },
  '1M':  { period: '3mo', interval: '1d'  },
  '3M':  { period: '6mo', interval: '1d'  },
  '1Y':  { period: '1y',  interval: '1wk' },
  '5Y':  { period: '5y',  interval: '1mo' },
  'ALL': { period: 'max', interval: '1mo' },
};

interface Props {
  symbol: string;
  exchange?: string;
  height?: number;
}

export default function AdvancedChart({ symbol, exchange = 'NSE', height = 480 }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs to persist lightweight-charts API objects
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const bbUpperRef = useRef<any>(null);
  const bbLowerRef = useRef<any>(null);
  const emaLineRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  
  const [timeframe, setTimeframe] = useState('3M');
  const [showVolume, setShowVolume] = useState(true);
  const [showEMA20, setShowEMA20] = useState(true);
  const [showBB, setShowBB] = useState(true);
  
  const { period, interval } = TIMEFRAME_MAP[timeframe];
  const { candles, isLoading } = useOHLCV(symbol, exchange, period, interval);
  
  const [activeCandle, setActiveCandle] = useState<any>(null);

  // 1. Initialize Chart Instance ONCE
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#050508' },
        textColor: '#9ca3af',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { 
        borderColor: 'rgba(255, 255, 255, 0.05)', 
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth || 600,
      height: height,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const bbUpper = chart.addSeries(LineSeries, { 
      color: 'rgba(99, 102, 241, 0.35)', 
      lineWidth: 1, 
      priceLineVisible: false, 
      lastValueVisible: false 
    });
    
    const bbLower = chart.addSeries(LineSeries, { 
      color: 'rgba(99, 102, 241, 0.35)', 
      lineWidth: 1, 
      priceLineVisible: false, 
      lastValueVisible: false 
    });
    
    const emaLine = chart.addSeries(LineSeries, { 
      color: '#f59e0b', 
      lineWidth: 1, 
      priceLineVisible: false 
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay inside main pane
    });
    
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    bbUpperRef.current = bbUpper;
    bbLowerRef.current = bbLower;
    emaLineRef.current = emaLine;
    volumeSeriesRef.current = volumeSeries;

    // Crosshair Movement Handler
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setActiveCandle(null);
        return;
      }
      const data = param.seriesData.get(candleSeries);
      if (data) {
        setActiveCandle(data);
      }
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      bbUpperRef.current = null;
      bbLowerRef.current = null;
      emaLineRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  // 2. Resize Observer (Handles container scaling dynamically without glitches)
  useEffect(() => {
    if (!chartContainerRef.current || !chartRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      if (entries[0] && chartRef.current) {
        const { width } = entries[0].contentRect;
        chartRef.current.applyOptions({ width });
      }
    });
    
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, [chartRef.current]);

  // 3. Update Chart Series Data on Candle Changes
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !candles || candles.length === 0) return;

    candleSeriesRef.current.setData(candles as any);

    // Bollinger Bands Calculation
    if (showBB) {
      const upperData: any[] = [];
      const lowerData: any[] = [];
      const periodBB = 20;
      for (let i = periodBB; i <= candles.length; i++) {
        const slice = candles.slice(i - periodBB, i);
        const mean = slice.reduce((sum, c) => sum + c.close, 0) / periodBB;
        const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - mean, 2), 0) / periodBB;
        const stdDev = Math.sqrt(variance);
        upperData.push({ time: candles[i - 1].time, value: mean + 2 * stdDev });
        lowerData.push({ time: candles[i - 1].time, value: mean - 2 * stdDev });
      }
      bbUpperRef.current.setData(upperData as any);
      bbLowerRef.current.setData(lowerData as any);
    } else {
      bbUpperRef.current.setData([]);
      bbLowerRef.current.setData([]);
    }

    // EMA 20 Calculation
    if (showEMA20) {
      const emaData: any[] = [];
      const k = 2 / (20 + 1);
      let prevEma = candles[0].close;
      emaData.push({ time: candles[0].time, value: prevEma });
      for (let i = 1; i < candles.length; i++) {
        prevEma = (candles[i].close - prevEma) * k + prevEma;
        emaData.push({ time: candles[i].time, value: prevEma });
      }
      emaLineRef.current.setData(emaData as any);
    } else {
      emaLineRef.current.setData([]);
    }

    // Volume Series
    if (showVolume) {
      volumeSeriesRef.current.setData(candles.map(c => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
      })) as any);
    } else {
      volumeSeriesRef.current.setData([]);
    }

    chartRef.current.timeScale().fitContent();
  }, [candles, showBB, showEMA20, showVolume]);

  const latestVal = activeCandle || (candles.length > 0 ? candles[candles.length - 1] : null);

  // Local helper stats to display in HUD card
  const getLatestStats = () => {
    if (!candles || candles.length < 20) return null;
    const latest = candles[candles.length - 1];
    
    // RSI calculation
    let gains = 0, losses = 0;
    for (let i = candles.length - 14; i < candles.length; i++) {
      if (i <= 0) continue;
      const diff = candles[i].close - candles[i - 1].close;
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const rsi = losses === 0 ? 100 : round(100 - (100 / (1 + (gains / 14) / (losses / 14))), 1);

    // BB Values
    const slice = candles.slice(-20);
    const mean = slice.reduce((sum, c) => sum + c.close, 0) / 20;
    const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - mean, 2), 0) / 20;
    const stdDev = Math.sqrt(variance);
    const upperBB = mean + 2 * stdDev;
    const lowerBB = mean - 2 * stdDev;

    // EMA
    const k = 2 / (20 + 1);
    let ema = candles[0].close;
    for (let i = 1; i < candles.length; i++) {
      ema = (candles[i].close - ema) * k + ema;
    }

    return { rsi, upperBB, lowerBB, ema };
  };

  const round = (num: number, dec: number) => {
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
  };

  const stats = getLatestStats();

  return (
    <div className="flex flex-col w-full bg-zinc-950 rounded-2xl border border-zinc-900 p-4 shadow-xl space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-bold text-zinc-100 uppercase tracking-tight">{symbol}</span>
            <span className="text-[9px] text-indigo-400 font-mono font-bold ml-1">{exchange}</span>
          </div>
          {latestVal && (
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono select-none">
              <span className="text-zinc-600">O: <span className={latestVal.close >= latestVal.open ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>{latestVal.open?.toFixed(2)}</span></span>
              <span className="text-zinc-600">H: <span className="text-zinc-300">{latestVal.high?.toFixed(2)}</span></span>
              <span className="text-zinc-600">L: <span className="text-zinc-300">{latestVal.low?.toFixed(2)}</span></span>
              <span className="text-zinc-600">C: <span className={latestVal.close >= latestVal.open ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{latestVal.close?.toFixed(2)}</span></span>
            </div>
          )}
        </div>
        
        {/* Indicators and Timeframe Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframes */}
          <div className="flex bg-zinc-900/55 rounded-xl p-0.5 border border-zinc-900">
            {Object.keys(TIMEFRAME_MAP).map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-[9px] font-mono rounded-lg font-bold uppercase transition-all ${timeframe === tf ? 'bg-zinc-800 text-indigo-400 border border-zinc-700/50 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {tf}
              </button>
            ))}
          </div>

          {/* Indicators */}
          <div className="flex bg-zinc-900/55 rounded-xl p-0.5 border border-zinc-900">
            <button onClick={() => setShowBB(!showBB)}
              className={`px-2.5 py-1 text-[9px] font-mono rounded-lg font-bold transition-all ${showBB ? 'bg-zinc-800 text-indigo-400 border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
              BB
            </button>
            <button onClick={() => setShowEMA20(!showEMA20)}
              className={`px-2.5 py-1 text-[9px] font-mono rounded-lg font-bold transition-all ${showEMA20 ? 'bg-zinc-800 text-indigo-400 border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
              EMA
            </button>
            <button onClick={() => setShowVolume(!showVolume)}
              className={`px-2.5 py-1 text-[9px] font-mono rounded-lg font-bold transition-all ${showVolume ? 'bg-zinc-800 text-indigo-400 border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
              Vol
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas wrapper with relative layout */}
      <div className="relative w-full overflow-hidden rounded-xl border border-zinc-900/80 bg-[#050508]" style={{ height: height }}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#050508]/85 backdrop-blur-md text-zinc-500 text-xs font-mono tracking-widest gap-2">
            <span className="w-4 h-4 rounded-full border border-indigo-500 border-t-transparent animate-spin"></span>
            SYNCING BROKER PRICING LOGS...
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Real-time Indicators Analysis HUD (SME Operational OS style) */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-900/20 border border-zinc-900 p-3 rounded-xl font-mono text-[10px] select-none text-zinc-500 leading-normal">
          <div className="space-y-0.5">
            <span className="block text-zinc-600 font-bold uppercase tracking-wider">RSI (14)</span>
            <div className="flex items-center gap-1.5">
              <span className={`font-bold text-xs ${stats.rsi > 70 ? 'text-red-400' : stats.rsi < 30 ? 'text-emerald-400' : 'text-zinc-200'}`}>{stats.rsi}</span>
              <span className="text-[9px] text-zinc-600">({stats.rsi > 70 ? 'OVERBOUGHT' : stats.rsi < 30 ? 'OVERSOLD' : 'NEUTRAL'})</span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="block text-zinc-600 font-bold uppercase tracking-wider">EMA (20)</span>
            <span className="font-bold text-xs text-zinc-200">₹{stats.ema.toFixed(2)}</span>
          </div>
          <div className="space-y-0.5">
            <span className="block text-zinc-600 font-bold uppercase tracking-wider">BB UPPER</span>
            <span className="font-semibold text-xs text-zinc-400">₹{stats.upperBB.toFixed(2)}</span>
          </div>
          <div className="space-y-0.5">
            <span className="block text-zinc-600 font-bold uppercase tracking-wider">BB LOWER</span>
            <span className="font-semibold text-xs text-zinc-400">₹{stats.lowerBB.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
