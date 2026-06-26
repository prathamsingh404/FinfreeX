'use client';

import React, { useState, useEffect } from 'react';
import { api, PriceAlert } from '@/lib/api';
import { Bell, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [symbol, setSymbol] = useState('RELIANCE');
  const [exchange, setExchange] = useState('NSE');
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [targetValue, setTargetValue] = useState<number>(2500);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.alerts.list();
      setAlerts(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch price alerts.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || targetValue <= 0) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await api.alerts.create({
        symbol: symbol.toUpperCase().trim(),
        exchange,
        condition,
        target_value: targetValue
      });
      setSuccess(`Price alert successfully registered for ${symbol} ${condition} ₹${targetValue}`);
      fetchAlerts();
    } catch (e: any) {
      setError(e.message || 'Failed to register price alert.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    setError('');
    try {
      await api.alerts.delete(alertId);
      setAlerts(prev => prev.filter(x => x.id !== alertId));
    } catch (e: any) {
      setError(e.message || 'Failed to delete price alert.');
    }
  };

  return (
    <div className="w-full min-h-screen relative z-10 pt-24 px-4 md:px-8 pb-16 bg-[#050508] text-slate-200">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-100 uppercase">Price Alerts Desk</h1>
              <p className="text-zinc-500 text-xs font-mono">Dynamic price boundary monitoring with Telegram notification triggers</p>
            </div>
          </div>
          
          <button onClick={fetchAlerts} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-mono text-xs font-bold uppercase rounded-xl transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Signals
          </button>
        </div>

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-mono">
            {success}
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-mono">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Create Alert Panel */}
          <div className="lg:col-span-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono border-b border-zinc-900 pb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              Configure New Threshold
            </h3>

            <form onSubmit={handleCreateAlert} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-zinc-500 block mb-1">Ticker Symbol</label>
                <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-250 uppercase focus:outline-none focus:border-indigo-500/40"
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
                  <label className="text-zinc-500 block mb-1">Trigger Condition</label>
                  <select value={condition} onChange={e => setCondition(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none">
                    <option value="ABOVE">ABOVE</option>
                    <option value="BELOW">BELOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Target Price (₹/💵)</label>
                <input type="number" step="0.01" value={targetValue} onChange={e => setTargetValue(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500/40"
                />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl transition-all disabled:opacity-50">
                Register price alert
              </button>
            </form>
          </div>

          {/* Active Alerts List */}
          <div className="lg:col-span-8 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono border-b border-zinc-900 pb-3">
              Monitored Price Boundaries
            </h3>

            <div className="space-y-2">
              {alerts.map((alert: PriceAlert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl font-mono text-xs hover:border-zinc-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-200">{alert.symbol}</span>
                      <span className="text-[10px] text-zinc-500 ml-1">({alert.exchange})</span>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        Trigger when price goes <span className="font-bold text-indigo-400">{alert.condition}</span> ₹{alert.target_value}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold uppercase tracking-widest">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active
                    </span>
                    
                    <button onClick={() => handleDeleteAlert(alert.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 bg-zinc-900 hover:bg-zinc-850 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {alerts.length === 0 && (
                <div className="p-8 text-center text-zinc-600 italic">No price alerts registered. Add one using the boundary desk.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
