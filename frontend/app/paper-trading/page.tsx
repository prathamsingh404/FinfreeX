'use client';

import React, { useState, useEffect } from 'react';
import { api, PortfolioSummary, TradeHistoryItem, PositionItem } from '@/lib/api';
import { Wallet, ArrowDownRight, ArrowUpRight, TrendingUp, RefreshCw, Send, DollarSign, Activity } from 'lucide-react';

export default function PaperTradingPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [error, setError] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState('');

  // Trade Form states
  const [symbol, setSymbol] = useState('RELIANCE');
  const [exchange, setExchange] = useState('NSE');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(10);

  useEffect(() => {
    // Check if token exists in localStorage, otherwise set dummy token for testing in dev
    if (typeof window !== 'undefined' && !localStorage.getItem('supabase_access_token')) {
      localStorage.setItem('supabase_access_token', 'dev_guest_token');
    }
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    setLoading(true);
    setError('');
    try {
      const summaryData = await api.portfolio.summary();
      setSummary(summaryData);
      
      const historyData = await api.portfolio.history();
      setHistory(historyData);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch paper trading portfolio. Ensure you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || quantity <= 0) return;
    
    setTradeLoading(true);
    setError('');
    setTradeSuccess('');
    
    try {
      const res = await api.portfolio.trade({
        symbol: symbol.toUpperCase().trim(),
        exchange,
        trade_type: tradeType,
        quantity
      });
      
      setTradeSuccess(`Successfully executed: ${tradeType} ${quantity} ${symbol} at ₹${res.price}`);
      fetchPortfolio();
    } catch (e: any) {
      setError(e.message || 'Failed to execute paper transaction.');
    } finally {
      setTradeLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen relative z-10 pt-24 px-4 md:px-8 pb-16 bg-[#050508] text-slate-200">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-100 uppercase">Paper Trading Account</h1>
              <p className="text-zinc-500 text-xs font-mono">Institutional-grade risk assessment and P&L calculations</p>
            </div>
          </div>
          
          <button onClick={fetchPortfolio} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-mono text-xs font-bold uppercase rounded-xl transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Desk
          </button>
        </div>

        {/* Portfolio Stats Summary */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Cash Balance</span>
              <span className="text-2xl font-bold text-zinc-100 font-mono">₹{summary.cash_balance?.toLocaleString('en-IN')}</span>
              <span className="text-[9px] font-mono text-zinc-600 uppercase">Settled capital</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Holdings Valuation</span>
              <span className="text-2xl font-bold text-zinc-100 font-mono">₹{summary.total_position_value?.toLocaleString('en-IN')}</span>
              <span className="text-[9px] font-mono text-zinc-600 uppercase">Current market value</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Total Net Worth</span>
              <span className="text-2xl font-bold text-zinc-100 font-mono">₹{summary.total_value?.toLocaleString('en-IN')}</span>
              <span className="text-[9px] font-mono text-zinc-600 uppercase">Cash + Holdings</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-zinc-500 tracking-widest font-mono uppercase">Total P&L</span>
              <span className={`text-2xl font-bold font-mono ${summary.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ₹{summary.total_pnl?.toLocaleString('en-IN')} ({summary.total_pnl_pct?.toFixed(2)}%)
              </span>
              <span className="text-[9px] font-mono text-zinc-600 uppercase">Unrealized + Realized</span>
            </div>
          </div>
        )}

        {/* Main Grid: Holdings and Order Desk */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Active Positions Table */}
          <div className="lg:col-span-8 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono border-b border-zinc-900 pb-3">
              Active Positions
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-zinc-400">
                <thead className="text-zinc-500 border-b border-zinc-900 uppercase text-[9px]">
                  <tr>
                    <th className="pb-3">Symbol</th>
                    <th className="pb-3 text-right">Shares</th>
                    <th className="pb-3 text-right">Avg Price</th>
                    <th className="pb-3 text-right">Last Price</th>
                    <th className="pb-3 text-right">Cost Basis</th>
                    <th className="pb-3 text-right">Current Value</th>
                    <th className="pb-3 text-right">Total P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {summary?.positions?.map((pos: PositionItem) => (
                    <tr key={pos.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-4 font-bold text-zinc-100">{pos.symbol} <span className="text-[9px] text-zinc-500 font-normal">{pos.exchange}</span></td>
                      <td className="py-4 text-right text-zinc-200">{pos.quantity}</td>
                      <td className="py-4 text-right">₹{pos.avg_buy_price?.toFixed(2)}</td>
                      <td className="py-4 text-right">₹{pos.current_price?.toFixed(2)}</td>
                      <td className="py-4 text-right">₹{pos.cost_basis?.toFixed(2)}</td>
                      <td className="py-4 text-right text-zinc-200">₹{pos.current_value?.toFixed(2)}</td>
                      <td className={`py-4 text-right font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ₹{pos.pnl?.toFixed(2)} ({pos.pnl_pct?.toFixed(2)}%)
                      </td>
                    </tr>
                  ))}
                  {(!summary || summary.positions?.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-600 italic">No open positions. Use the order panel to acquire assets.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trade Executions Order Panel */}
          <div className="lg:col-span-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono border-b border-zinc-900 pb-3">
              Order placement box
            </h3>

            {tradeSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-mono">
                {tradeSuccess}
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-zinc-500 block mb-1">Stock Ticker</label>
                <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-200 uppercase focus:outline-none focus:border-indigo-500/40"
                  placeholder="e.g. RELIANCE"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-500 block mb-1">Exchange</label>
                  <select value={exchange} onChange={e => setExchange(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none">
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                    <option value="US">US</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Action</label>
                  <div className="flex bg-zinc-900 rounded-xl p-0.5 border border-zinc-850">
                    <button type="button" onClick={() => setTradeType('BUY')}
                      className={`flex-1 py-2 rounded-lg font-bold transition-colors ${tradeType === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      BUY
                    </button>
                    <button type="button" onClick={() => setTradeType('SELL')}
                      className={`flex-1 py-2 rounded-lg font-bold transition-colors ${tradeType === 'SELL' ? 'bg-red-500/10 text-red-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      SELL
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Quantity (Shares)</label>
                <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500/40"
                />
              </div>

              <button type="submit" disabled={tradeLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl transition-all disabled:opacity-50">
                <Send className="w-3.5 h-3.5" />
                {tradeLoading ? 'Transacting order...' : 'Place trade'}
              </button>
            </form>
          </div>
        </div>

        {/* Transaction History Logs */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono border-b border-zinc-900 pb-3">
            Transaction History Logs
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-zinc-500">
              <thead className="border-b border-zinc-900 text-zinc-600 uppercase text-[9px]">
                <tr>
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2 text-right">Shares</th>
                  <th className="pb-2 text-right">LTP Price</th>
                  <th className="pb-2 text-right">Total Outlay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {history.map((tx: TradeHistoryItem) => (
                  <tr key={tx.id}>
                    <td className="py-2.5 text-[11px] font-light">{new Date(tx.executed_at).toLocaleString()}</td>
                    <td className={`py-2.5 font-bold ${tx.trade_type === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{tx.trade_type}</td>
                    <td className="py-2.5 font-bold text-zinc-300">{tx.symbol}</td>
                    <td className="py-2.5 text-right">{tx.quantity}</td>
                    <td className="py-2.5 text-right">₹{tx.price?.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-zinc-400">₹{tx.total_value?.toFixed(2)}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-700 italic">No transaction records found.</td>
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
