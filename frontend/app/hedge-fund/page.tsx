'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ShinyText from '@/components/reactbits/ShinyText';
import GradientText from '@/components/reactbits/GradientText';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import Particles from '@/components/reactbits/Particles';
import StarBorder from '@/components/reactbits/StarBorder';
import AdvancedChart from '@/components/AdvancedChart';
import EquityChart from '@/components/EquityChart';
import PerformanceTable from '@/components/PerformanceTable';
import MonthlyReturnsHeatmap from '@/components/MonthlyReturnsHeatmap';
import DrawdownChart from '@/components/DrawdownChart';
import MiniChart from '@/components/MiniChart';
import CandleMiniChart from '@/components/CandleMiniChart';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalystInfo { label: string; description: string; icon: string; }
interface PersonaInfo { label: string; style: string; color: string; }
interface ProviderInfo { label: string; models: string[]; }

interface AnalystSignal {
  agent_id: string; ticker: string; signal: string;
  confidence: number; reasoning: string;
}
interface RiskSignal {
  ticker: string; signal: string; confidence: number; max_position_size: number;
}
interface PortfolioPosition {
  ticker: string; action: string; quantity: number; confidence: number; reasoning: string;
}
interface AnalysisResult {
  tickers: string[];
  analyst_signals: Record<string, AnalystSignal[]>;
  risk_adjusted_signals: RiskSignal[];
  portfolio_output: { positions: PortfolioPosition[]; cash_remaining: number; total_value: number };
  timestamp: string;
}
interface PaperPortfolio {
  cash: number; total_value: number;
  positions: Record<string, { shares: number; avg_cost: number; current_price: number }>;
  trades: any[];
  last_run: string | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const ANALYST_ICONS: Record<string, string> = {
  fundamentals: 'solar:chart-square-linear',
  technical: 'solar:graph-up-linear',
  sentiment: 'solar:document-text-linear',
  valuation: 'solar:calculator-linear',
  growth: 'solar:rocket-linear',
  macro_regime: 'solar:globe-linear',
};

const PERSONA_COLORS: Record<string, string> = {
  buffett: '#1c64f2', graham: '#7e3af2', munger: '#5850ec',  burry: '#818CF8',
  wood: '#d03801', ackman: '#047a55', lynch: '#0891b2', damodaran: '#6d28d9',
  druckenmiller: '#dc2626', fisher: '#0891b2', pabrai: '#7c3aed', jhunjhunwala: '#059669',
};

const SIGNAL_STYLES: Record<string, string> = {
  bullish: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  bearish: 'text-red-400 bg-red-500/10 border-red-500/20',
  neutral: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const ACTION_STYLES: Record<string, string> = {
  buy: 'text-emerald-400 bg-emerald-500/10',
  sell: 'text-red-400 bg-red-500/10',
  hold: 'text-amber-400 bg-amber-500/10',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function SignalBadge({ signal }: { signal: string }) {
  const s = signal?.toLowerCase() || 'neutral';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${SIGNAL_STYLES[s] || SIGNAL_STYLES.neutral}`}>
      {s === 'bullish' ? '▲' : s === 'bearish' ? '▼' : '—'} {s}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 65 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] font-mono font-bold text-slate-400 w-8 text-right">{value}%</span>
    </div>
  );
}

function StatusChip({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${online ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {online ? 'System Online' : 'System Offline'}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HedgeFundPage() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'backtest' | 'paper' | 'risk' | 'notifications'>('analyze');
  const [backendOnline, setBackendOnline] = useState(false);

  // Metadata from backend
  const [analysts, setAnalysts] = useState<Record<string, AnalystInfo>>({});
  const [personas, setPersonas] = useState<Record<string, PersonaInfo>>({});
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});

  // ── Analysis state ──────────────────────────────────────────────────────────
  const [tickers, setTickers] = useState('AAPL,MSFT');
  const [useLLM, setUseLLM] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [selectedModel, setSelectedModel] = useState('llama3-70b-8192');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // ── Backtest state ──────────────────────────────────────────────────────────
  const [btTickers, setBtTickers] = useState('AAPL,MSFT');
  const [btStartDate, setBtStartDate] = useState('2024-01-01');
  const [btEndDate, setBtEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [btCash, setBtCash] = useState(100000);
  const [btStopLoss, setBtStopLoss] = useState<number | ''>('');
  const [btTrailingStop, setBtTrailingStop] = useState<number | ''>('');
  const [btTakeProfit, setBtTakeProfit] = useState<number | ''>('');
  const [btFrequency, setBtFrequency] = useState('weekly');
  const [btLoading, setBtLoading] = useState(false);
  const [btError, setBtError] = useState<string | null>(null);
  const [btResult, setBtResult] = useState<any>(null);
  const [btEquityData, setBtEquityData] = useState<any[]>([]);
  const [btResultsTab, setBtResultsTab] = useState<'overview' | 'stats' | 'analysis' | 'trades'>('overview');

  // ── Paper trading state ─────────────────────────────────────────────────────
  const [paperPortfolio, setPaperPortfolio] = useState<PaperPortfolio | null>(null);
  const [ptTickers, setPtTickers] = useState('AAPL,MSFT,NVDA');
  const [ptCash, setPtCash] = useState(100000);
  const [ptLoading, setPtLoading] = useState(false);
  const [ptError, setPtError] = useState('');
  const [activePaperTicker, setActivePaperTicker] = useState<string>('');
  const [paperChartData, setPaperChartData] = useState<{ ohlc: any[]; volume: any[]; markers: any[] }>({ ohlc: [], volume: [], markers: [] });
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const ptLoadingRef = useRef(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // ── FX rate ─────────────────────────────────────────────────────────────────
  const [usdToInr, setUsdToInr] = useState(83.5);

  // ── Notifications state ─────────────────────────────────────────────────────
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestInterval, setDigestInterval] = useState(6);
  const [notifConfigured, setNotifConfigured] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [digestSending, setDigestSending] = useState(false);

  const fetchNotifStatus = async () => {
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications/status`);
      const d = await r.json();
      setNotifConfigured(d.telegram_configured);
      setDigestEnabled(d.digest?.enabled ?? false);
      setDigestInterval(d.digest?.interval_hours ?? 6);
    } catch {}
  };

  const saveNotifConfig = async () => {
    setNotifLoading(true);
    setNotifMsg(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const r = await fetch(`${base}/api/notifications/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: digestEnabled,
          interval_hours: digestInterval,
          telegram_bot_token: tgBotToken || undefined,
          telegram_chat_id: tgChatId || undefined,
        }),
      });
      const d = await r.json();
      setNotifConfigured(d.telegram_configured);
      setNotifMsg({ text: 'Configuration saved.', ok: true });
    } catch (e) {
      setNotifMsg({ text: 'Failed to save config.', ok: false });
    } finally {
      setNotifLoading(false);
    }
  };

  const sendTestTelegram = async () => {
    setNotifLoading(true);
    setNotifMsg(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const r = await fetch(`${base}/api/notifications/test`, { method: 'POST' });
      const d = await r.json();
      setNotifMsg({ text: d.message, ok: d.success });
    } catch {
      setNotifMsg({ text: 'Request failed.', ok: false });
    } finally {
      setNotifLoading(false);
    }
  };

  const sendDigestNow = async () => {
    setDigestSending(true);
    setNotifMsg(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const r = await fetch(`${base}/api/notifications/send-digest`, { method: 'POST' });
      const d = await r.json();
      setNotifMsg({ text: d.message, ok: d.success });
      addLog(`Telegram digest: ${d.success ? 'sent' : 'failed'}`);
    } catch {
      setNotifMsg({ text: 'Request failed.', ok: false });
    } finally {
      setDigestSending(false);
    }
  };

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [
      `[${new Date().toLocaleTimeString('en-GB')}] ${msg}`,
      ...prev.slice(0, 49)
    ]);
  };

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    checkBackend();
    fetchPaperPortfolio();
    fetchNotifStatus();
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/forex/usd-inr`)
      .then(r => r.json()).then(d => { if (d.rate) setUsdToInr(d.rate); }).catch(() => {});
    addLog("System Initialized. Await Signal.");
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoTrading) {
      interval = setInterval(() => {
        if (!ptLoadingRef.current) runPaperTrade();
      }, 10000); // 10s auto cycle
    }
    return () => clearInterval(interval);
  }, [isAutoTrading]);

  useEffect(() => {
    if (activePaperTicker) fetchHistoryForPaperChart(activePaperTicker);
  }, [activePaperTicker, paperPortfolio?.trades]);

  useEffect(() => {
    if (btResult?.results?.snapshots) {
      setBtEquityData(btResult.results.snapshots.map((s: any) => ({
        time: s.date,
        value: s.total_value,
      })));
    } else {
      setBtEquityData([]);
    }
  }, [btResult]);

  const checkBackend = async () => {
    try {
      const [analystsRes, personasRes, providersRes] = await Promise.all([
        fetch('/api/hedge-fund/analysts'),
        fetch('/api/hedge-fund/personas'),
        fetch('/api/hedge-fund/providers'),
      ]);
      setBackendOnline(analystsRes.ok);
      if (analystsRes.ok) setAnalysts((await analystsRes.json()).analysts || {});
      if (personasRes.ok) setPersonas((await personasRes.json()).personas || {});
      if (providersRes.ok) {
        const pd = await providersRes.json();
        setProviders(pd.providers || pd.all_providers || {});
      }
    } catch {
      setBackendOnline(false);
    }
  };

  const fetchPaperPortfolio = async () => {
    try {
      const res = await fetch('/api/hedge-fund/paper-portfolio');
      if (res.ok) {
        const data = await res.json();
        setPaperPortfolio(data);
        if (!activePaperTicker && Object.keys(data.positions || {}).length > 0) {
          setActivePaperTicker(Object.keys(data.positions)[0]);
        }
      }
    } catch { }
  };

  const fetchHistoryForPaperChart = async (ticker: string) => {
    try {
      const r = await fetch(`/api/history/${encodeURIComponent(ticker)}?period=6mo`);
      const d = await r.json();
      if (d.history) {
        const ohlc = d.history.map((h: any) => ({
          time: h.date, open: h.open, high: h.high, low: h.low, close: h.close
        }));
        const vol = d.history.map((h: any) => ({
          time: h.date, value: h.volume, color: h.close > h.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
        }));
        
        // Match paper trades to markers
        const tradeMarkers: any[] = [];
        if (paperPortfolio?.trades) {
          paperPortfolio.trades.forEach((t: any) => {
            if (t.ticker === ticker) {
              const dtDate = t.date?.split('T')[0] || t.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];
              tradeMarkers.push({
                time: dtDate,
                position: t.action === 'BUY' ? 'belowBar' : 'aboveBar',
                color: t.action === 'BUY' ? '#10b981' : '#818CF8',
                shape: t.action === 'BUY' ? 'arrowUp' : 'arrowDown',
                text: `${t.action} @ ${t.price?.toFixed(2)}`,
              });
            }
          });
        }
        setPaperChartData({ ohlc, volume: vol, markers: tradeMarkers });
      }
    } catch (e) { console.error('Error fetching chart data', e); }
  };

  // ── Analysis ────────────────────────────────────────────────────────────────
  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError('');
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/hedge-fund/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean),
          use_llm: useLLM,
          personas: selectedPersonas.length > 0 ? selectedPersonas : null,
          model_provider: selectedProvider,
          model_name: selectedModel,
          show_reasoning: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysisResult(data);
    } catch (e: any) {
      setAnalysisError(e.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // ── Backtest ────────────────────────────────────────────────────────────────
  const runBacktest = async () => {
    setBtLoading(true);
    setBtError('');
    setBtResult(null);
    try {
      const res = await fetch('/api/hedge-fund/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: btTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean),
          start_date: btStartDate,
          end_date: btEndDate,
          cash: btCash,
          stop_loss: btStopLoss !== '' ? Number(btStopLoss) / 100 : null,
          trailing_stop: btTrailingStop !== '' ? Number(btTrailingStop) / 100 : null,
          take_profit: btTakeProfit !== '' ? Number(btTakeProfit) / 100 : null,
          frequency: btFrequency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backtest failed');
      setBtResult(data);
    } catch (e: any) {
      setBtError(e.message);
    } finally {
      setBtLoading(false);
    }
  };

  // ── Paper Trading ───────────────────────────────────────────────────────────
  const runPaperTrade = async () => {
    ptLoadingRef.current = true;
    setPtLoading(true);
    setPtError('');
    try {
      const res = await fetch('/api/hedge-fund/paper-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: ptTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean),
          use_llm: useLLM,
          model_provider: selectedProvider,
          model_name: selectedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trade failed');
      setPaperPortfolio(data.portfolio);
      
      if (!activePaperTicker && Object.keys(data.portfolio?.positions || {}).length > 0) {
        setActivePaperTicker(Object.keys(data.portfolio.positions)[0]);
      } else if (activePaperTicker) {
        fetchHistoryForPaperChart(activePaperTicker); // Refetch chart with new markers
      }
    } catch (e: any) {
      setPtError(e.message);
    } finally {
      ptLoadingRef.current = false;
      setPtLoading(false);
    }
  };

  const resetPaperPortfolio = async () => {
    setPtLoading(true);
    setPtError('');
    try {
      const res = await fetch('/api/hedge-fund/paper-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _action: 'reset',
          cash: ptCash,
          tickers: ptTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setPaperPortfolio(data.portfolio);
    } catch (e: any) {
      setPtError(e.message);
    } finally {
      setPtLoading(false);
    }
  };

  const togglePersona = (key: string) => {
    setSelectedPersonas(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'analyze', label: 'Multi-Agent Analysis', icon: 'solar:users-group-two-rounded-linear' },
    { id: 'backtest', label: 'Backtesting', icon: 'solar:graph-up-linear' },
    { id: 'paper', label: 'Paper Trading', icon: 'solar:wallet-linear' },
    { id: 'risk', label: 'Risk Monitor', icon: 'solar:shield-warning-linear' },
    { id: 'notifications', label: 'Telegram Alerts', icon: 'solar:bell-linear' },
  ] as const;

  return (
    <main className="min-h-screen w-full bg-background text-slate-200 relative overflow-hidden">
      {/* Background Particles (subtle/low-contrast for light theme) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-5">
        <Particles particleCount={80} particleSpread={18} speed={0.04}
          particleColors={['#818CF8', '#E2E8F0', '#64748B']}
          alphaParticles particleBaseSize={40} cameraDistance={28} className="w-full h-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-36 pb-24">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20 text-[9px] font-mono uppercase tracking-widest mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <ShinyText text="AI HEDGE FUND ENGINE" speed={3} color="#818CF8" shineColor="#E2E8F0" className="tracking-wide font-bold" />
            </div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tighter text-slate-200">
              <GradientText colors={['#E2E8F0', '#818CF8', '#64748B', '#E2E8F0']} animationSpeed={6}>
                Stratton Oakmont
              </GradientText>
            </h1>
            <p className="text-slate-500 mt-2 text-xs md:text-sm font-semibold">
              6 core analysts · 12 investor personas · real-time signals · backtesting · paper trading
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusChip online={backendOnline} />
            {!backendOnline && (
              <p className="text-[10px] text-slate-600 text-right max-w-xs font-mono">
                Start: <code className="text-indigo-400">cd backend && uvicorn app.main:app --port 8000</code>
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 shadow-lg shadow-black/20">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === tab.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'}`}
            >
              <iconify-icon icon={tab.icon} width="15" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── TAB: Multi-Agent Analysis ───────────────────────────────────────── */}
        {activeTab === 'analyze' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Config */}
            <div className="lg:col-span-1 space-y-5">
              {/* Tickers */}
              <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-5 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.06)">
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-3 flex items-center gap-2">
                  <iconify-icon icon="solar:chart-2-linear" className="text-indigo-400" />
                  Tickers
                </h3>
                <input
                  value={tickers}
                  onChange={e => setTickers(e.target.value)}
                  placeholder="AAPL,MSFT,NVDA"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-400/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 font-mono"
                />
                <p className="text-[9px] text-slate-500/40 font-mono uppercase mt-2">Comma-separated (e.g. AAPL,MSFT,NVDA)</p>
              </SpotlightCard>

              {/* LLM Toggle */}
              <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-5 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.06)">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest flex items-center gap-2">
                    <iconify-icon icon="solar:stars-minimalistic-bold" className="text-amber-500" />
                    LLM Reasoning
                  </h3>
                  <button
                    onClick={() => setUseLLM(!useLLM)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${useLLM ? 'bg-indigo-500' : 'bg-white/[0.08]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white/[0.03] transition-all ${useLLM ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                {useLLM && (
                  <div className="space-y-3 font-mono">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Provider</label>
                      <select
                        value={selectedProvider}
                        onChange={e => {
                          setSelectedProvider(e.target.value);
                          const p = providers[e.target.value];
                          if (p?.models?.length) setSelectedModel(p.models[0]);
                        }}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                      >
                        {Object.entries(providers).map(([key, p]) => (
                          <option key={key} value={key}>{p.label || key}</option>
                        ))}
                        {Object.keys(providers).length === 0 && <option value="groq">Groq</option>}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Model</label>
                      <select
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                      >
                        {(providers[selectedProvider]?.models || ['llama3-70b-8192']).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </SpotlightCard>

              {/* Investor Personas */}
              <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-5 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.06)">
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-3 flex items-center gap-2">
                  <iconify-icon icon="solar:users-group-two-rounded-linear" className="text-indigo-400" />
                  Investor Personas
                  <span className="text-[9px] text-slate-500/40 font-semibold">(Requires LLM)</span>
                </h3>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto scrollbar-hide font-mono">
                  {Object.entries(personas).length > 0
                    ? Object.entries(personas).map(([key, p]) => (
                      <button
                        key={key}
                        onClick={() => togglePersona(key)}
                        disabled={!useLLM}
                        style={{ borderColor: selectedPersonas.includes(key) ? (PERSONA_COLORS[key] || '#EB3A14') : 'transparent' }}
                        className={`text-left p-2.5 rounded-xl border text-[10px] transition-all duration-200 ${selectedPersonas.includes(key) ? 'bg-indigo-500/5 border-2 shadow-lg shadow-black/20' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'} ${!useLLM ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="font-bold text-slate-200 truncate">{p.label}</div>
                        <div className="text-slate-500 text-[8px] truncate mt-0.5">{p.style}</div>
                      </button>
                    ))
                    : Object.entries(PERSONA_COLORS).map(([key, color]) => (
                      <button
                        key={key}
                        onClick={() => togglePersona(key)}
                        disabled={!useLLM}
                        style={{ borderColor: selectedPersonas.includes(key) ? color : 'transparent' }}
                        className={`text-left p-2.5 rounded-xl border text-[10px] transition-all duration-200 ${selectedPersonas.includes(key) ? 'bg-indigo-500/5 border-2' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'} ${!useLLM ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="font-bold text-slate-200 capitalize">{key}</div>
                      </button>
                    ))
                  }
                </div>
                {selectedPersonas.length > 0 && (
                  <div className="mt-3 flex gap-1.5 flex-wrap font-mono text-[9px]">
                    <button onClick={() => setSelectedPersonas(Object.keys(personas))} className="px-2 py-0.5 rounded-full bg-indigo-500/5 border border-accent/20 text-indigo-400 font-bold uppercase tracking-wider">Select All</button>
                    <button onClick={() => setSelectedPersonas([])} className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-500 font-bold uppercase tracking-wider">Clear</button>
                  </div>
                )}
              </SpotlightCard>

              {/* Run Button */}
              <StarBorder as="button" onClick={runAnalysis} disabled={analysisLoading || !tickers.trim()} color="#EB3A14" speed="4s"
                className={`w-full ${analysisLoading || !tickers.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <span className="flex items-center justify-center gap-2 font-mono font-bold uppercase tracking-widest text-[10px] text-slate-200">
                  {analysisLoading ? (
                    <><svg className="animate-spin w-4 h-4 text-slate-200" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Running Agents...</>
                  ) : (
                    <><iconify-icon icon="solar:stars-minimalistic-bold" width="18" />Run Analysis</>
                  )}
                </span>
              </StarBorder>
            </div>

            {/* Right: Results */}
            <div className="lg:col-span-2 space-y-5">
              {analysisError && (
                <div className="glass-panel rounded-[2rem] p-5 border border-accent/20 bg-indigo-500/5">
                  <div className="flex items-start gap-3">
                    <iconify-icon icon="solar:danger-triangle-linear" className="text-indigo-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-mono text-indigo-400 leading-relaxed">{analysisError}</p>
                  </div>
                </div>
              )}

              {!analysisResult && !analysisLoading && !analysisError && (
                <div className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-16 text-center shadow-lg shadow-black/20">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4 border border-white/[0.06]">
                    <iconify-icon icon="solar:chart-square-linear" width="34" className="text-slate-400/30" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider mb-2">Ready to Analyze</h3>
                  <p className="text-xs text-slate-400">Configure tickers and click "Run Analysis"</p>
                </div>
              )}

              {analysisLoading && (
                <div className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-12 text-center shadow-lg shadow-black/20">
                  <div className="w-16 h-16 rounded-full border-2 border-accent/20 border-t-accent animate-spin mx-auto mb-6" />
                  <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider mb-2">Agents Running</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Analysts processing {tickers} in parallel matrix…</p>
                  <div className="flex justify-center gap-3 mt-5 flex-wrap font-mono">
                    {Object.keys(analysts).length > 0
                      ? Object.entries(analysts).map(([key, a]) => (
                          <span key={key} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 animate-pulse">{a.label}</span>
                        ))
                      : null}
                  </div>
                </div>
              )}

              {analysisResult && (
                <>
                  {/* Analyst Signals */}
                  <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-5 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.05)">
                    <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                      <iconify-icon icon="solar:users-group-two-rounded-linear" className="text-indigo-400" />
                      Analyst Signals
                      <span className="text-[9px] text-slate-500/40 font-mono ml-auto">{analysisResult.timestamp ? new Date(analysisResult.timestamp).toLocaleTimeString() : ''}</span>
                    </h3>
                    <div className="overflow-x-auto -mx-1 px-1">
                      <table className="w-full text-xs border-separate border-spacing-0">
                        <thead>
                          <tr className="bg-white/[0.02]">
                            <th className="text-left text-[9px] text-slate-500 uppercase tracking-[0.2em] py-3 px-4 border-y border-white/[0.06] rounded-l-lg font-bold">Analyst Entity</th>
                            <th className="text-left text-[9px] text-slate-500 uppercase tracking-[0.2em] py-3 px-4 border-y border-white/[0.06] font-bold">Ticker</th>
                            <th className="text-left text-[9px] text-slate-500 uppercase tracking-[0.2em] py-3 px-4 border-y border-white/[0.06] font-bold">Strategic Signal</th>
                            <th className="text-left text-[9px] text-slate-500 uppercase tracking-[0.2em] py-3 px-4 border-y border-white/[0.06] font-bold w-40">Confidence Interval</th>
                            <th className="text-left text-[9px] text-slate-500 uppercase tracking-[0.2em] py-3 px-4 border-y border-white/[0.06] rounded-r-lg font-bold">Institutional Reasoning</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.03]">
                          {Object.entries(analysisResult.analyst_signals).flatMap(([agentId, signals]) =>
                            (signals as AnalystSignal[]).map((sig, i) => (
                              <tr key={`${agentId}-${i}`} className="hover:bg-white/[0.02] transition-all group">
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500/40 group-hover:bg-indigo-500 group-hover:scale-125 transition-all shadow-[0_0_8px_rgba(235,58,20,0.4)]" />
                                    <span className="text-[10px] text-slate-200 font-bold font-mono uppercase tracking-wider">{agentId.replace('_analyst', '').replace(/_/g, ' ')}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 font-mono text-slate-200 font-bold">{sig.ticker}</td>
                                <td className="py-4 px-4"><SignalBadge signal={sig.signal} /></td>
                                <td className="py-4 px-4 w-40"><ConfidenceBar value={sig.confidence} /></td>
                                <td className="py-4 px-4 text-xs text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors italic">"{sig.reasoning}"</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </SpotlightCard>

                  {/* Risk-Adjusted Signals */}
                  {analysisResult.risk_adjusted_signals?.length > 0 && (
                    <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-5 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.05)">
                      <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                        <iconify-icon icon="solar:shield-warning-linear" className="text-indigo-400" />
                        Risk-Adjusted Signals
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysisResult.risk_adjusted_signals.map((rs, i) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20">
                            <div>
                              <div className="text-xs font-bold font-mono text-slate-200">{rs.ticker}</div>
                              <div className="text-[9px] text-slate-500/40 font-mono mt-0.5 uppercase tracking-wider">Max Size: ${rs.max_position_size?.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                              <SignalBadge signal={rs.signal} />
                              <div className="mt-1.5"><ConfidenceBar value={rs.confidence} /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SpotlightCard>
                  )}

                  {/* Portfolio Decisions */}
                  {analysisResult.portfolio_output?.positions?.length > 0 && (
                    <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-5 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.05)">
                      <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                        <iconify-icon icon="solar:wallet-linear" className="text-indigo-400" />
                        Portfolio Decisions
                        <span className="ml-auto text-[10px] font-mono text-slate-500/40 uppercase tracking-widest">
                          Cash: ${analysisResult.portfolio_output.cash_remaining?.toLocaleString()}
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {analysisResult.portfolio_output.positions.map((pos, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20">
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider ${ACTION_STYLES[pos.action?.toLowerCase()] || ACTION_STYLES.hold}`}>
                              {pos.action}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-slate-200 font-bold">{pos.ticker}</span>
                                  <span className="text-slate-500/40 text-[10px] font-mono">×{pos.quantity}</span>
                                </div>
                                <div className="w-28"><ConfidenceBar value={pos.confidence} /></div>
                              </div>
                              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{pos.reasoning}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SpotlightCard>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Backtesting ────────────────────────────────────────────────── */}
        {activeTab === 'backtest' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-5">
              <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-5 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.06)">
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                  <iconify-icon icon="solar:graph-up-linear" className="text-indigo-400" />
                  Backtest Config
                </h3>
                <div className="space-y-4 font-mono text-[10px]">
                  <div>
                    <label className="text-slate-500 font-bold uppercase tracking-wider mb-1 block">Tickers</label>
                    <input value={btTickers} onChange={e => setBtTickers(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-500 font-bold uppercase tracking-wider mb-1 block">Start Date</label>
                      <input type="date" value={btStartDate} onChange={e => setBtStartDate(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" />
                    </div>
                    <div>
                      <label className="text-slate-500 font-bold uppercase tracking-wider mb-1 block">End Date</label>
                      <input type="date" value={btEndDate} onChange={e => setBtEndDate(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-500 font-bold uppercase tracking-wider mb-1 block">Starting Cash ($)</label>
                    <input type="number" value={btCash} onChange={e => setBtCash(Number(e.target.value))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="text-slate-500 font-bold uppercase tracking-wider mb-1 block">Frequency</label>
                    <select value={btFrequency} onChange={e => setBtFrequency(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {/* Protection */}
                  <div className="border-t border-white/[0.06] pt-4">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">Downside Protection (%)</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Stop Loss', val: btStopLoss, setter: setBtStopLoss },
                        { label: 'Trailing Stop', val: btTrailingStop, setter: setBtTrailingStop },
                        { label: 'Take Profit', val: btTakeProfit, setter: setBtTakeProfit },
                      ].map(({ label, val, setter }) => (
                        <div key={label} className="flex items-center gap-3">
                          <label className="text-slate-400 font-semibold w-24 flex-shrink-0">{label}</label>
                          <input type="number" value={val} onChange={e => setter(e.target.value === '' ? '' : Number(e.target.value))} placeholder="—"
                            className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              <StarBorder as="button" onClick={runBacktest} disabled={btLoading} color="#EB3A14" speed="4s" className={`w-full ${btLoading ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <span className="flex items-center justify-center gap-2 font-mono font-bold uppercase tracking-widest text-[10px] text-slate-200">
                  {btLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Running Simulation...</> : <><iconify-icon icon="solar:graph-up-linear" />Run Backtest</>}
                </span>
              </StarBorder>
            </div>

            <div className="lg:col-span-2">
              {btError && (
                <div className="glass-panel rounded-[2rem] p-5 border border-accent/20 bg-indigo-500/5 mb-5">
                  <p className="text-xs font-mono text-indigo-400 leading-relaxed">{btError}</p>
                </div>
              )}
              {btLoading && (
                <div className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-16 text-center shadow-lg shadow-black/20">
                  <div className="w-16 h-16 rounded-full border-2 border-accent/20 border-t-accent animate-spin mx-auto mb-6" />
                  <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider mb-2">Running Backtest</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Simulating historical pricing for {btTickers} from {btStartDate} to {btEndDate}…</p>
                </div>
              )}
              {!btResult && !btLoading && !btError && (
                <div className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-16 text-center shadow-lg shadow-black/20">
                  <iconify-icon icon="solar:graph-up-linear" width="48" className="text-slate-400/20 mb-4 block" />
                  <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider mb-2">Configure & Run</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Set date range and tickers, then trigger the historical simulation</p>
                </div>
              )}
              {btResult && (
                <SpotlightCard className="glass-panel border-white/[0.06] bg-white/[0.03] rounded-[2rem] overflow-hidden shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.05)">
                  {/* Header Banner */}
                  <div className="bg-white/[0.02] border-b border-white/[0.06] px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-200 tracking-tighter font-mono uppercase flex items-center gap-2">
                        <iconify-icon icon="solar:globus-bold-duotone" className="text-indigo-400" />
                        INSTITUTIONAL BACKTEST REPORT
                      </h3>
                      <p className="text-[8px] text-slate-500/40 font-mono uppercase tracking-[0.2em] font-bold mt-1">Simulation ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                    </div>
                    <div className="flex gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] font-mono">
                      {[
                        { id: 'overview', label: 'Overview', icon: 'solar:chart-2-linear' },
                        { id: 'stats', label: 'Statistics', icon: 'solar:library-linear' },
                        { id: 'analysis', label: 'Analysis', icon: 'solar:filters-linear' },
                        { id: 'trades', label: 'Trades', icon: 'solar:list-bold-duotone' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setBtResultsTab(tab.id as any)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${btResultsTab === tab.id ? 'bg-indigo-500 text-white' : 'text-slate-400/60 hover:bg-white/[0.05]'}`}
                        >
                          <iconify-icon icon={tab.icon} />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Tab 1: Overview */}
                    {btResultsTab === 'overview' && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Summary Box */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Equity', val: `$${btEquityData[btEquityData.length-1]?.value.toLocaleString()}`, color: 'text-slate-200' },
                            { label: 'Net Profit', val: `$${(btEquityData[btEquityData.length-1]?.value - btCash).toLocaleString()}`, color: 'text-emerald-400' },
                            { label: 'Returns', val: `${((btEquityData[btEquityData.length-1]?.value / btCash - 1) * 100).toFixed(2)}%`, color: 'text-emerald-400' },
                            { label: 'Volume', val: `$${btResult.results?.trades?.length * 10000}+`, color: 'text-slate-500/40' },
                          ].map(stat => (
                            <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20 rounded-xl p-4">
                              <div className="text-[8px] text-slate-500/40 uppercase tracking-widest font-bold font-mono mb-1">{stat.label}</div>
                              <div className={`text-lg font-bold tracking-tighter font-mono ${stat.color}`}>{stat.val}</div>
                            </div>
                          ))}
                        </div>

                        {/* Equity Chart */}
                        {btEquityData.length > 0 && (
                          <div className="p-1 bg-[#EAEAEA] rounded-[2rem] overflow-hidden border border-white/[0.06] shadow-inner">
                            <div className="bg-[#12121A] p-6 rounded-[calc(2rem-4px)]">
                              <EquityChart data={btEquityData} baseValue={btCash} height={400} />
                            </div>
                          </div>
                        )}
                        
                        {/* Top Metrics Row */}
                        <div className="pt-4 border-t border-white/[0.06]">
                           <h4 className="text-[9px] text-slate-500/40 uppercase font-mono font-bold tracking-widest mb-4">Core Performance Snapshot</h4>
                           <PerformanceTable data={btEquityData} baseValue={btCash} />
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Statistics */}
                    {btResultsTab === 'stats' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center justify-between mb-6">
                           <h4 className="text-[10px] text-slate-500/40 uppercase font-mono font-bold tracking-wider">All Algorithmic Statistics</h4>
                           <div className="text-[9px] text-emerald-400 flex items-center gap-1 font-mono font-bold uppercase tracking-wider">
                             <iconify-icon icon="solar:verified-check-bold" />
                             Verified Quantum Execution
                           </div>
                        </div>
                        <PerformanceTable data={btEquityData} baseValue={btCash} />
                        <div className="mt-12 p-6 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20 text-center">
                           <iconify-icon icon="solar:chart-square-linear" width="32" className="text-slate-400/20 mb-3" />
                           <p className="text-xs text-slate-400 max-w-md mx-auto italic leading-relaxed">
                             "The statistics above reflect a comprehensive risk-adjusted performance profile of the selected tickers across the historical timeline. Note that backtest performance is not indicative of future alpha."
                           </p>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Analysis */}
                    {btResultsTab === 'analysis' && (
                      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Heatmap */}
                        <div>
                          <h4 className="text-xs text-slate-200 uppercase font-mono font-bold tracking-widest mb-6 flex items-center gap-2">
                            <iconify-icon icon="solar:mask-vibrant-bold" className="text-indigo-400" />
                            Monthly Returns Heatmap
                          </h4>
                          <div className="bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20 rounded-[2rem] p-6">
                            <MonthlyReturnsHeatmap data={btEquityData} />
                          </div>
                        </div>

                        {/* Drawdown */}
                        <div>
                          <h4 className="text-xs text-slate-200 uppercase font-mono font-bold tracking-widest mb-6 flex items-center gap-2">
                             <iconify-icon icon="solar:danger-triangle-bold" className="text-indigo-400" />
                             Underwater (Drawdown %)
                          </h4>
                          <div className="bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20 rounded-[2rem] p-6">
                            <DrawdownChart data={btEquityData} height={350} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Trades */}
                    {btResultsTab === 'trades' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xs text-slate-500/40 font-mono font-bold uppercase tracking-wider">Execution Journal</h4>
                          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">{btResult.results?.trades?.length} Orders Logged</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                          {btResult.results?.trades?.map((t: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20 hover:shadow-md transition-all group">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono uppercase ${t.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                {t.action[0]}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-slate-200 text-sm font-bold tracking-tight">{t.ticker}</span>
                                  <span className="text-slate-500/40 text-[9px] uppercase font-mono font-bold tracking-widest">{t.action}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">{t.date}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-slate-200 text-xs font-bold font-mono">${(t.price * t.quantity).toLocaleString()}</div>
                                <div className="text-[9px] text-slate-500/40 font-mono mt-0.5">{t.quantity} @ ${t.price}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </SpotlightCard>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Paper Trading ──────────────────────────────────────────────── */}
        {activeTab === 'paper' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-5">
              <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-5 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.06)">
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                  <iconify-icon icon="solar:wallet-linear" className="text-indigo-400" />
                  Paper Trade Config
                </h3>
                <div className="space-y-4 font-mono text-[10px]">
                  <div>
                    <label className="text-slate-500 font-bold uppercase tracking-wider mb-1 block">Tickers to Trade</label>
                    <input value={ptTickers} onChange={e => setPtTickers(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="text-slate-500 font-bold uppercase tracking-wider mb-1 block">Starting Cash ($)</label>
                    <input type="number" value={ptCash} onChange={e => setPtCash(Number(e.target.value))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" />
                  </div>
                </div>
              </SpotlightCard>

              <div className="space-y-2">
                <StarBorder as="button" onClick={runPaperTrade} disabled={ptLoading} color="#EB3A14" speed="4s" className={`w-full ${ptLoading ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <span className="flex items-center justify-center gap-2 font-mono font-bold uppercase tracking-widest text-[10px] text-slate-200">
                    {ptLoading ? <><svg className="animate-spin w-4 h-4 text-slate-200" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Running Cycle...</> : <><iconify-icon icon="solar:play-circle-linear" />Run Trading Cycle</>}
                  </span>
                </StarBorder>
                <button onClick={resetPaperPortfolio} disabled={ptLoading}
                  className="w-full py-3 rounded-full border border-white/[0.08] text-slate-400 hover:text-indigo-400 hover:bg-white/[0.03] text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-sm">
                  Reset Portfolio (${ptCash.toLocaleString()})
                </button>
              </div>
              {ptError && <div className="glass-panel rounded-[2rem] p-4 border border-accent/20 bg-indigo-500/5"><p className="text-xs font-mono text-indigo-400 leading-relaxed">{ptError}</p></div>}
            </div>

            <div className="lg:col-span-2 space-y-5">
              {/* Candlestick Market Grid — driven by ptTickers */}
              {(() => {
                const tickers = ptTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
                return tickers.length > 0 ? (
                  <div className={`grid gap-4 mb-6 ${tickers.length === 1 ? 'grid-cols-1' : tickers.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {tickers.map(ticker => (
                      <CandleMiniChart
                        key={ticker}
                        ticker={ticker}
                        height={190}
                        live
                        pollIntervalMs={8000}
                        selected={activePaperTicker === ticker}
                        onSelect={setActivePaperTicker}
                        usdToInr={usdToInr}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-[190px] rounded-2xl border border-white/[0.06] bg-white/[0.03] shadow-sm flex items-center justify-center text-slate-400/35 text-xs font-mono uppercase tracking-widest mb-6">
                    Enter tickers above to see live charts
                  </div>
                );
              })()}

              {/* Auto Trading Master Switch */}
              <div className="flex items-center justify-between p-4 rounded-[2rem] glass-panel border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl transition-all ${isAutoTrading ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(5,150,105,0.2)]' : 'bg-indigo-500/10 text-indigo-400'}`}>
                    <iconify-icon icon={isAutoTrading ? "solar:radar-bold" : "solar:radar-linear"} width="22" className={isAutoTrading ? "animate-pulse" : ""} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">Autonomous Trading Engine</h3>
                    <p className="text-[9px] text-slate-500/40 font-mono uppercase tracking-widest mt-0.5">{isAutoTrading ? 'System is actively executing signals' : 'System is paused (Manual Override)'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAutoTrading(!isAutoTrading)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${isAutoTrading ? 'bg-emerald-500' : 'bg-white/[0.08]'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white/[0.03] shadow transition-transform ${isAutoTrading ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>

              {paperPortfolio ? (
                <>
                  {/* Portfolio Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Total Value', val: `$${paperPortfolio.total_value?.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-slate-200' },
                      { label: 'Cash', val: `$${paperPortfolio.cash?.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-indigo-400' },
                      { label: 'Positions', val: Object.keys(paperPortfolio.positions || {}).length.toString(), color: 'text-slate-200/70' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-5 text-center shadow-lg shadow-black/20">
                        <div className={`text-2xl font-bold tracking-tighter font-mono ${color}`}>{val}</div>
                        <div className="text-[9px] text-slate-500/40 font-mono uppercase tracking-widest mt-1.5">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Advanced Chart */}
                  <div className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-5 mb-4 shadow-lg shadow-black/20">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                      <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest flex items-center gap-2">
                        <iconify-icon icon="solar:chart-square-linear" className="text-indigo-400" />
                        Trading View
                      </h3>
                      <div className="flex gap-2 flex-wrap font-mono">
                        {Object.keys(paperPortfolio.positions || {}).length > 0 ? (
                          Object.keys(paperPortfolio.positions).map(ticker => (
                            <button key={ticker} onClick={() => setActivePaperTicker(ticker)} className={`text-[9px] px-3 py-1 rounded-full uppercase tracking-widest transition-colors ${activePaperTicker === ticker ? 'bg-indigo-500 text-white font-bold' : 'bg-white/[0.05] text-slate-500 hover:bg-white/[0.08]'}`}>
                              {ticker}
                            </button>
                          ))
                        ) : (
                          <span className="text-[9px] text-slate-500/40 uppercase tracking-widest font-semibold">No Active Positions</span>
                        )}
                      </div>
                    </div>
                    {activePaperTicker && paperChartData.ohlc.length > 0 ? (
                      <div className="p-1 bg-[#EAEAEA] rounded-[2rem] overflow-hidden border border-white/[0.06] shadow-inner">
                        <div className="bg-[#12121A] p-6 rounded-[calc(2rem-4px)]">
                          <AdvancedChart data={paperChartData.ohlc} volumeData={paperChartData.volume} markers={paperChartData.markers} height={450} ticker={activePaperTicker} />
                        </div>
                      </div>
                    ) : (
                      <div className="h-[350px] flex items-center justify-center border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.03]">
                        <p className="text-xs font-mono uppercase tracking-widest text-slate-500/40">
                          {activePaperTicker ? 'Loading Chart Data...' : 'Select an asset position to view technicals'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Positions */}
                  {Object.keys(paperPortfolio.positions).length > 0 && (
                    <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-6 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.05)">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest flex items-center gap-2">
                          <iconify-icon icon="solar:wallet-bold" className="text-indigo-400" />
                          ALGORITHMIC POSITIONS
                        </h3>
                        <span className="text-[9px] text-slate-500/40 font-mono tracking-widest font-bold">REAL-TIME VALUATION</span>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(paperPortfolio.positions).map(([ticker, pos]) => {
                          const pnl = (pos.current_price - pos.avg_cost) * pos.shares;
                          const pnlPct = ((pos.current_price / pos.avg_cost) - 1) * 100;
                          return (
                            <div key={ticker} className="group relative flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20 hover:shadow-md transition-all">
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-r-full bg-indigo-500/0 group-hover:bg-indigo-500 transition-all" />
                              <div className="flex flex-col">
                                <span className="font-mono text-base text-slate-200 font-bold tracking-tighter leading-none">{ticker}</span>
                                <span className="text-[8px] text-slate-500/40 font-mono uppercase tracking-[0.2em] mt-1.5 font-bold">Equity Asset</span>
                              </div>
                              <div className="flex-1 grid grid-cols-3 gap-4 border-l border-white/[0.06] pl-6 ml-2">
                                <div>
                                  <div className="text-[8px] text-slate-500/40 uppercase tracking-widest font-mono font-bold mb-1">Exposure</div>
                                  <div className="text-xs text-slate-400 font-mono font-bold">{pos.shares} <span className="text-[9px] text-slate-500/40 font-normal">units</span></div>
                                </div>
                                <div>
                                  <div className="text-[8px] text-slate-500/40 uppercase tracking-widest font-mono font-bold mb-1">Cost Basis</div>
                                  <div className="text-xs text-slate-400 font-mono font-bold">${pos.avg_cost?.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-[8px] text-slate-500/40 uppercase tracking-widest font-mono font-bold mb-1">Market</div>
                                  <div className="text-xs text-slate-200 font-bold font-mono">${pos.current_price?.toFixed(2)}</div>
                                </div>
                              </div>
                              <div className="text-right pl-4">
                                <div className={`text-xs font-bold font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                  {pnl >= 0 ? '▲' : '▼'} ${Math.abs(pnl).toLocaleString()}
                                </div>
                                <div className={`text-[9px] font-bold font-mono mt-0.5 ${pnl >= 0 ? 'text-emerald-600/60' : 'text-indigo-400/60'}`}>
                                  {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </SpotlightCard>
                  )}

                  {/* Trade History */}
                  {paperPortfolio.trades?.length > 0 && (
                    <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-6 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.05)">
                      <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-6 flex items-center gap-2">
                        <iconify-icon icon="solar:history-bold" className="text-indigo-400" />
                        Execution Journal
                      </h3>
                      <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {[...paperPortfolio.trades].reverse().slice(0, 50).map((t, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all group">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold font-mono ${t.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {t.action[0]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-200 text-sm font-bold tracking-tight">{t.ticker}</span>
                                <span className="text-slate-500 text-[9px] uppercase font-mono font-bold tracking-widest">{t.action}</span>
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">{t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-slate-200 text-xs font-bold font-mono">${t.total?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                              <div className="text-[9px] text-slate-500 font-mono mt-0.5">{t.quantity} @ ${t.price?.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SpotlightCard>
                  )}
                </>
              ) : (
                <div className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-16 text-center shadow-lg shadow-black/20">
                  <iconify-icon icon="solar:wallet-linear" width="48" className="text-slate-600 mb-4 block" />
                  <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider mb-2">No Portfolio Yet</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Set your starting cash and trigger a trading cycle</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Risk Monitor ──────────────────────────────────────────────── */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analysisResult?.risk_adjusted_signals?.length ? (
                <>
                  {/* Risk Signals */}
                  <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-6 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.05)">
                    <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                      <iconify-icon icon="solar:shield-warning-linear" className="text-indigo-400" />
                      Risk-Adjusted Signals
                    </h3>
                    <div className="space-y-3">
                      {analysisResult.risk_adjusted_signals.map((rs, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg shadow-black/20">
                          <div className="flex items-center justify-between mb-3 font-mono">
                            <span className="text-slate-200 font-bold">{rs.ticker}</span>
                            <SignalBadge signal={rs.signal} />
                          </div>
                          <ConfidenceBar value={rs.confidence} />
                          <div className="text-[9px] text-slate-500 font-mono mt-2 uppercase tracking-wider">Max position limit: ${rs.max_position_size?.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </SpotlightCard>
                </>
              ) : (
                <div className="col-span-2 glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-16 text-center shadow-lg shadow-black/20">
                  <iconify-icon icon="solar:shield-warning-linear" width="48" className="text-slate-600 mb-4 block" />
                  <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider mb-2">Run Analysis First</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">Run a multi-agent analyst matrix to populate stress signals here</p>
                  <button onClick={() => setActiveTab('analyze')}
                    className="px-6 py-3 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-md shadow-indigo-500/20">
                    Go to Analysis →
                  </button>
                </div>
              )}
            </div>

            {/* Risk Equity Curve */}
            <SpotlightCard className="glass-panel rounded-[2rem] border border-white/[0.06] bg-white/[0.03] p-8 shadow-lg shadow-black/20" spotlightColor="rgba(129,140,248,0.05)">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest flex items-center gap-2">
                  <iconify-icon icon="solar:graph-down-bold" className="text-indigo-400" />
                  STRESS LEVEL & DRAWDOWN ANALYSIS
                </h3>
              </div>
              {btEquityData.length > 0 ? (
                <div className="space-y-8">
                  <div className="p-1 bg-white/[0.02] rounded-[2rem] overflow-hidden border border-white/[0.06] shadow-inner">
                    <div className="bg-[#12121A] p-6 rounded-[calc(2rem-4px)]">
                      <EquityChart data={btEquityData} baseValue={btCash} height={400} />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/[0.06]">
                    <h4 className="text-[9px] text-slate-500 font-mono uppercase font-bold tracking-widest mb-6">Simulation Efficiency Metrics</h4>
                    <PerformanceTable data={btEquityData} baseValue={btCash} />
                  </div>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center border border-dashed border-white/[0.08] rounded-[2rem] bg-white/[0.02]">
                   <div className="text-center font-mono">
                    <iconify-icon icon="solar:shield-danger-bold-duotone" width="48" className="text-slate-600 mb-4" />
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Requires Backtest Payload to Initialize Core Stress Monitor</p>
                   </div>
                </div>
              )}
            </SpotlightCard>
          </div>
        )}

        {/* ── TAB: Telegram Notifications ─────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header card */}
            <SpotlightCard spotlightColor="rgba(129,140,248,0.06)" className="p-6 rounded-[2rem] border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-lg shadow-sm">📬</div>
                <div>
                  <h2 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">Telegram Alerts</h2>
                  <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">Routine market digests &amp; critical risk notifications.</p>
                </div>
                <div className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider border ${notifConfigured ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${notifConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {notifConfigured ? 'Connected' : 'Pending'}
                </div>
              </div>
            </SpotlightCard>

            {/* Credentials */}
            <SpotlightCard spotlightColor="rgba(129,140,248,0.06)" className="p-6 rounded-[2rem] border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
              <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-4">Bot Credentials</h3>
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <label className="text-slate-400 block mb-1.5 font-bold uppercase tracking-wider text-[9px]">Telegram Bot Token</label>
                  <input
                    type="password"
                    value={tgBotToken}
                    onChange={e => setTgBotToken(e.target.value)}
                    placeholder="1234567890:ABCdef..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                  />
                  <p className="text-[9px] text-slate-500 mt-1.5 leading-normal">Create a bot via <span className="text-indigo-400 underline">@BotFather</span> on Telegram.</p>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1.5 font-bold uppercase tracking-wider text-[9px]">Chat ID</label>
                  <input
                    type="text"
                    value={tgChatId}
                    onChange={e => setTgChatId(e.target.value)}
                    placeholder="-100123456789 or your personal chat ID"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                  />
                  <p className="text-[9px] text-slate-500 mt-1.5 leading-normal">Send a message to your bot, then check <span className="text-indigo-400 underline">@userinfobot</span> to retrieve your chat ID.</p>
                </div>
              </div>
            </SpotlightCard>

            {/* Digest schedule */}
            <SpotlightCard spotlightColor="rgba(129,140,248,0.06)" className="p-6 rounded-[2rem] border border-white/[0.06] bg-white/[0.03] shadow-lg shadow-black/20">
              <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-widest mb-4">Routine Digest Schedule</h3>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">Enable Auto Digest</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">Delivers market matrix + top alpha headlines to Telegram.</div>
                </div>
                <button
                  onClick={() => setDigestEnabled(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${digestEnabled ? 'bg-indigo-500' : 'bg-white/[0.08]'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white/[0.03] shadow transition-transform duration-200 ${digestEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="font-mono">
                <label className="text-slate-500 block mb-2 font-bold uppercase tracking-wider text-[9px]">Interval Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 6, 12, 24].map(h => (
                    <button
                      key={h}
                      onClick={() => setDigestInterval(h)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${digestInterval === h ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'}`}
                    >
                      {h} Hours
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 mt-2.5">Digest will be dispatched automatically every {digestInterval} hours.</p>
              </div>
            </SpotlightCard>

            {/* Feedback message */}
            {notifMsg && (
              <div className={`px-4 py-3 rounded-xl border font-mono text-[10px] ${notifMsg.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {notifMsg.ok ? '✓ ' : '✗ '}{notifMsg.text}
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
              <StarBorder
                as="button"
                onClick={saveNotifConfig}
                disabled={notifLoading}
                className="w-full py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-slate-200 disabled:opacity-50 transition-colors"
                color="#818CF8"
                speed="4s"
              >
                {notifLoading ? 'Saving…' : 'Save Config'}
              </StarBorder>
              <button
                onClick={sendTestTelegram}
                disabled={notifLoading || !notifConfigured}
                className="py-3 rounded-full text-xs font-bold border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.08] disabled:opacity-40 transition-all shadow-sm shadow-black/20"
              >
                Send Test Ping
              </button>
              <button
                onClick={sendDigestNow}
                disabled={digestSending || !notifConfigured}
                className="py-3 rounded-full text-xs font-bold border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.08] disabled:opacity-40 transition-all shadow-sm shadow-black/20"
              >
                {digestSending ? 'Sending…' : 'Send Digest Now'}
              </button>
            </div>

            {/* Info box */}
            <div className="p-5 rounded-[2rem] bg-white/[0.03] border border-white/[0.06] space-y-2 shadow-lg shadow-black/20 font-mono">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Included in Telegram Digest</p>
              {['🏦 Real-time NIFTY / SENSEX metrics', '🔥 Top 5 trending algorithmic equities', '📰 Curated business news headlines', '⚠️ Immediate drawdown stress alerts (>3% drop)'].map(item => (
                <div key={item} className="text-xs text-slate-400">{item}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Global Activity Terminal (Bottom Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[#12121A]/90 backdrop-blur-xl border-t border-white/[0.06] h-10 flex items-center px-6 overflow-hidden select-none shadow-2xl shadow-black/40">
          <div className="flex items-center gap-4 border-r border-white/[0.08] pr-4 mr-4 shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] text-slate-200 font-bold font-mono uppercase tracking-widest whitespace-nowrap">System Active</span>
          </div>
          <div className="flex-1 relative overflow-hidden h-full flex items-center">
              <div className="animate-marquee-slow flex whitespace-nowrap gap-12 items-center">
                  {terminalLogs.length > 0 ? (
                      terminalLogs.map((log, i) => (
                        <span key={i} className="text-[10px] font-mono text-slate-400 group cursor-default">
                           <span className="text-indigo-400 font-bold">{log.split(' ')[0]}</span>
                           <span className="ml-2 group-hover:text-slate-200 transition-colors">{log.split(' ').slice(1).join(' ')}</span>
                        </span>
                      ))
                  ) : (
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Awaiting Signal Matrix Initialization...</span>
                  )}
              </div>
          </div>
          <div className="flex items-center gap-6 border-l border-white/[0.08] pl-4 ml-4 shrink-0 font-mono text-[9px] uppercase tracking-wider font-bold">
              <div className="flex items-center gap-2">
                  <span className="text-slate-500">Latency:</span>
                  <span className="text-emerald-400 font-bold">14ms</span>
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-slate-500">Port:</span>
                  <span className="text-indigo-400 font-bold">8000</span>
              </div>
          </div>
      </div>
    </main>
  );
}

// Stratton Oakmont AI Hedge Fund Portal - Quant agent pipelines and Telegram integrations
