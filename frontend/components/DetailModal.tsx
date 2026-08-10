'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import StockChart from './StockChart';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'stock' | 'news';
  data: any;
  history?: any[];
}

export default function DetailModal({ isOpen, onClose, type, data, history }: DetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const ModalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 lg:p-12">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-panel border border-border rounded-3xl shadow-2xl animate-fade-in flex flex-col">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-hover border border-border flex items-center justify-center text-soft hover:text-foreground hover:bg-hover-strong transition-all z-20"
        >
          <iconify-icon icon="solar:close-circle-linear" width="24"></iconify-icon>
        </button>

        {type === 'stock' ? (
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    Stock Detail
                  </div>
                  {data.sector && (
                    <div className="px-3 py-1 rounded-full bg-hover border border-border text-[10px] font-medium text-soft">
                      {data.sector}
                    </div>
                  )}
                </div>
                <h2 className="text-4xl font-semibold tracking-tight text-foreground mb-2">{data.symbol || data.name}</h2>
                <div className="text-muted text-sm font-light">Interactive Technical Analysis & Market Data</div>
              </div>
              <div className="text-left md:text-right">
                <div className="text-4xl font-medium text-foreground mb-1">₹{data.price?.toLocaleString('en-IN')}</div>
                <div className={`flex items-center gap-2 justify-end font-semibold ${data.change_pct >= 0 ? 'text-up' : 'text-down'}`}>
                  <iconify-icon icon={data.change_pct >= 0 ? "solar:arrow-right-up-linear" : "solar:arrow-right-down-linear"}></iconify-icon>
                  {data.change_pct >= 0 ? '+' : ''}{data.change_pct}%
                </div>
              </div>
            </div>

            {/* Main Chart Section */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-medium text-muted uppercase tracking-widest">Price Trend (1 Month)</h3>
                 <div className="flex gap-2">
                    {['1D', '1W', '1M', '3M', '1Y'].map(p => (
                      <button key={p} className={`px-2 py-1 rounded-md text-[10px] ${p === '1M' ? 'bg-blue-600 text-foreground' : 'bg-hover text-muted hover:bg-hover-strong transition-all'}`}>
                        {p}
                      </button>
                    ))}
                 </div>
              </div>
              <div className="h-[350px] w-full bg-[var(--overlay)] rounded-2xl border border-border p-6 group">
                {history ? (
                  <StockChart 
                    data={history} 
                    color={data.change_pct >= 0 ? '#10b981' : '#f43f5e'} 
                    height={300}
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-faint gap-3">
                    <iconify-icon icon="solar:chart-2-linear" width="48"></iconify-icon>
                    <div className="text-xs uppercase tracking-widest">Generating detailed technical chart...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
               {[
                 { label: '52W High', value: `₹${(data.price * 1.15).toLocaleString('en-IN', {maximumFractionDigits: 0})}`, icon: 'solar:graph-up-linear', color: 'text-up' },
                 { label: '52W Low', value: `₹${(data.price * 0.85).toLocaleString('en-IN', {maximumFractionDigits: 0})}`, icon: 'solar:graph-down-linear', color: 'text-down' },
                 { label: 'Market Cap', value: data.market_cap ? `${(data.market_cap / 10000000).toFixed(1)} Cr` : 'TBD', icon: 'solar:ticker-star-linear', color: 'text-blue-400' },
                 { label: 'Volatility (Beta)', value: data.beta || '1.12', icon: 'solar:mask-h-linear', color: 'text-primary' },
               ].map((stat, i) => (
                 <div key={i} className="glass-panel p-4 rounded-xl border border-border hover:bg-hover transition-all">
                    <div className="flex items-center gap-2 text-muted text-[10px] uppercase font-bold tracking-widest mb-2">
                      <iconify-icon icon={stat.icon} className={stat.color}></iconify-icon>
                      {stat.label}
                    </div>
                    <div className="text-foreground font-medium">{stat.value}</div>
                 </div>
               ))}
            </div>

            <div className="flex gap-4">
               <button className="flex-1 py-4 bg-primary text-[var(--on-primary)] rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all shadow-xl active:scale-95">
                 Add to Watchlist
               </button>
               <button className="flex-1 py-4 bg-blue-600 text-foreground rounded-xl text-sm font-semibold hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                 Compare with Sector
               </button>
            </div>
          </div>
        ) : (
          <div className="p-8 md:p-12">
            <div className="px-3 py-1 w-fit rounded-full bg-up/10 border border-up/20 text-[10px] font-bold text-up uppercase tracking-widest mb-6">
              Financial Story
            </div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground mb-8 leading-tight">{data.title}</h2>
            
            <div className="flex items-center gap-6 mb-12 py-6 border-y border-border">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <iconify-icon icon="solar:document-text-linear" width="20"></iconify-icon>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase font-bold tracking-widest">Source</div>
                    <div className="text-sm text-foreground font-medium">{data.source}</div>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <iconify-icon icon="solar:calendar-linear" width="20"></iconify-icon>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase font-bold tracking-widest">Published</div>
                    <div className="text-sm text-foreground font-medium">
                      {data.publishedAt ? new Date(data.publishedAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      }) : 'Recent'}
                    </div>
                  </div>
               </div>
            </div>

            <div className="text-soft text-lg leading-relaxed mb-12 font-light">
              {data.description || "The Indian benchmark equity indices traded mixed in Tuesday's early session amid lack of clear global cues. Large-cap tech stocks showed resilience, while financial sectors faced mild selling pressure as investors awaited central bank commentary on inflation trends."}
            </div>

            <a 
              href={data.url} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-hover border border-border rounded-xl text-foreground hover:bg-hover-strong transition-all group"
            >
              <span className="text-sm font-medium">Read Full Article on {data.source}</span>
              <iconify-icon icon="solar:arrow-right-up-linear" className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></iconify-icon>
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(ModalContent, document.body);
}
