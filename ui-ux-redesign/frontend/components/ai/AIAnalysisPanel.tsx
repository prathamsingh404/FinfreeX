'use client';

import { useState } from 'react';
import { streamAnalysis, AIChunk } from '@/lib/api';
import { Loader2, PlayCircle, ShieldAlert, Sparkles, User, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  defaultTicker?: string;
}

export default function AIAnalysisPanel({ defaultTicker = 'RELIANCE' }: Props) {
  const [ticker, setTicker] = useState(defaultTicker);
  const [exchange, setExchange] = useState('NSE');
  const [activePersonas, setActivePersonas] = useState<string[]>(['buffett', 'jhunjhunwala', 'graham', 'burry']);
  
  const [statusText, setStatusText] = useState('');
  const [marketData, setMarketData] = useState<any>(null);
  const [specialists, setSpecialists] = useState<Record<string, any>>({});
  const [personas, setPersonas] = useState<Record<string, any>>({});
  const [finalVerdict, setFinalVerdict] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const triggerAnalysis = () => {
    if (!ticker.trim()) return;
    setLoading(true);
    setError('');
    setStatusText('Summoning multi-agent AI network...');
    setMarketData(null);
    setSpecialists({});
    setPersonas({});
    setFinalVerdict(null);

    streamAnalysis(
      ticker.toUpperCase().trim(),
      exchange,
      activePersonas,
      (chunk: AIChunk) => {
        if (chunk.type === 'status') {
          setStatusText(chunk.message || '');
        } else if (chunk.type === 'market_data') {
          setMarketData(chunk.data);
        } else if (chunk.type === 'specialist') {
          setSpecialists(prev => ({ ...prev, [chunk.agent || 'Agent']: chunk.result }));
        } else if (chunk.type === 'persona') {
          setPersonas(prev => ({ ...prev, [chunk.persona || 'Persona']: chunk.result }));
        } else if (chunk.type === 'final_verdict') {
          setFinalVerdict(chunk.result);
        } else if (chunk.type === 'error') {
          setError(chunk.message || 'An error occurred during execution.');
        }
      },
      () => {
        setLoading(false);
        setStatusText('Analysis complete.');
      },
      (err) => {
        setError(err.message || 'Stream connection failed.');
        setLoading(false);
      }
    );
  };

  const getSignalColor = (sig: string) => {
    if (sig === 'Bullish') return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (sig === 'Bearish') return 'text-red-400 border-red-500/20 bg-red-500/5';
    return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
  };

  return (
    <div className="space-y-6">
      {/* Search and Configuration panel */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-2 font-mono uppercase tracking-widest">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          Multi-Agent Analyst Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">Ticker Symbol</label>
            <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g. RELIANCE"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors uppercase font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">Exchange</label>
            <select value={exchange} onChange={(e) => setExchange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500/50 transition-colors font-mono">
              <option value="NSE">NSE (India)</option>
              <option value="BSE">BSE (India)</option>
              <option value="US">US (NASDAQ/NYSE)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={triggerAnalysis} disabled={loading || !ticker.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-lg shadow-indigo-600/10">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Initiate Research
                </>
              )}
            </button>
          </div>
        </div>

        {/* Persona Selectors */}
        <div className="mt-4 pt-4 border-t border-zinc-900">
          <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-2">Active Investing Personas</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'buffett', label: 'Warren Buffett', desc: 'Moats & Value' },
              { id: 'jhunjhunwala', label: 'R. Jhunjhunwala', desc: 'Aggressive Growth' },
              { id: 'graham', label: 'Benjamin Graham', desc: 'Margin of Safety' },
              { id: 'burry', label: 'Michael Burry', desc: 'Contrarian Tail-Risks' }
            ].map(p => {
              const isActive = activePersonas.includes(p.id);
              return (
                <button key={p.id} disabled={loading}
                  onClick={() => {
                    if (isActive) {
                      setActivePersonas(prev => prev.filter(x => x !== p.id));
                    } else {
                      setActivePersonas(prev => [...prev, p.id]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${isActive ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>
                  {p.label}
                  <span className="block text-[9px] text-zinc-500 font-normal">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-time Status Loader */}
      {statusText && (
        <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 p-4 rounded-xl text-zinc-400 text-xs font-mono">
          {loading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
          <span>{statusText}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-950/20 border border-red-900/30 p-4 rounded-xl text-red-400 text-xs font-mono">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Error:</span> {error}
          </div>
        </div>
      )}

      {/* Grid: Market Data & Specialists */}
      {(marketData || Object.keys(specialists).length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Market Stats Panel */}
          {marketData && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg space-y-4">
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono border-b border-zinc-900 pb-2">
                Market Stats
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block">Current Price</span>
                  <span className="text-zinc-200 font-bold">₹{marketData.current_price?.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Change</span>
                  <span className={`font-bold ${marketData.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {marketData.change >= 0 ? '+' : ''}{marketData.change?.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Market Cap</span>
                  <span className="text-zinc-200">₹{(marketData.market_cap / 10000000).toFixed(0)} Cr.</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">TTM P/E</span>
                  <span className="text-zinc-200">{marketData.pe_ratio?.toFixed(1) || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Forward P/E</span>
                  <span className="text-zinc-200">{marketData.forward_pe?.toFixed(1) || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">ROE</span>
                  <span className="text-zinc-200">{marketData.roe?.toFixed(1) || 'N/A'}%</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Debt / Equity</span>
                  <span className="text-zinc-200">{marketData.debt_to_equity?.toFixed(2) || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Beta (Beta)</span>
                  <span className="text-zinc-200">{marketData.beta?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
              <div className="pt-2">
                <span className="text-[10px] text-zinc-500 font-mono block">Company Business</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3 mt-1 font-light">
                  {marketData.description}
                </p>
              </div>
            </div>
          )}

          {/* Specialist Evaluations */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg space-y-4">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono border-b border-zinc-900 pb-2">
              Specialist Analyst Grid
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(specialists).map(([agent, result]: [string, any]) => (
                <div key={agent} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-300 font-mono">{agent}</span>
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${getSignalColor(result.signal)}`}>
                        {result.signal}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
                      {result.reasoning}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>Model Confidence</span>
                    <span className="font-bold text-indigo-400">{result.confidence}%</span>
                  </div>
                </div>
              ))}
              
              {/* Skeletons while fetching */}
              {loading && Object.keys(specialists).length < 5 && (
                <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-xl p-4 flex items-center justify-center text-zinc-500 text-xs font-mono h-28 animate-pulse">
                  Evaluating indicators...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section: Investing Personas */}
      {Object.keys(personas).length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono">
            Investing Personas Opinions
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(personas).map(([name, result]: [string, any]) => (
              <div key={name} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-md relative overflow-hidden group hover:border-zinc-800 transition-colors">
                <div className="absolute top-3 right-3 text-zinc-800/40 pointer-events-none">
                  <User className="w-12 h-12" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <span className="text-xs font-bold text-zinc-200 font-mono">{name}</span>
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${getSignalColor(result.signal)}`}>
                      {result.signal}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed italic font-light relative z-10">
                    "{result.reasoning}"
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono border-t border-zinc-900 pt-3 text-zinc-500">
                  <span>Conviction Score</span>
                  <span className="font-bold text-indigo-400">{result.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Verdict Summary */}
      {finalVerdict && (
        <div className="bg-gradient-to-r from-zinc-900 to-indigo-950/20 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">Consolidated Verdict</h3>
              <div className="flex items-baseline gap-4">
                <span className={`text-4xl font-extrabold font-mono tracking-tighter ${finalVerdict.verdict === 'BUY' ? 'text-emerald-400' : (finalVerdict.verdict === 'SELL' ? 'text-red-400' : 'text-yellow-400')}`}>
                  {finalVerdict.verdict}
                </span>
                <span className="text-xs text-zinc-500 font-mono">Consensus Score: {finalVerdict.score > 0 ? '+' : ''}{finalVerdict.score?.toFixed(2)}</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl font-light">
                {finalVerdict.summary}
              </p>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:w-80 shrink-0 space-y-3 font-mono text-xs">
              <span className="text-zinc-500 block uppercase text-[10px] font-bold">Key Reasons</span>
              <ul className="space-y-2">
                {finalVerdict.reasons?.map((reason: string, i: number) => (
                  <li key={i} className="flex gap-2 text-zinc-300 leading-relaxed font-light">
                    <span className="text-indigo-400 mt-0.5 shrink-0">▪</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
