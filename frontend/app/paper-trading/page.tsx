'use client'

import React, { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, SectionTitle, StatCard, Badge, Btn, Change, fmt } from '@/components/ui/kit'
import { usePortfolio, usePortfolioHoldings, useTrades, useQuote } from '@/lib/hooks/useMarketData'
import { executeTrade } from '@/lib/api'

export default function PaperTradingPage() {
  const { data: portfolioData, refetch: refetchPortfolio } = usePortfolio(15_000) // auto-refresh portfolio summary every 15s
  const { data: holdingsData, refetch: refetchHoldings } = usePortfolioHoldings()
  const { data: tradesData, refetch: refetchTrades } = useTrades()

  const [symbol, setSymbol] = useState('RELIANCE')
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState(10)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)

  // Fetch live quote for the symbol currently being traded
  const { data: activeQuote } = useQuote(symbol.toUpperCase().trim())

  const pf = portfolioData || { totalValue: 1000000.0, totalPnl: 0.0, totalPnlPct: 0.0, cash: 1000000.0, investedValue: 0.0 }
  const positions = holdingsData || []
  const history = tradesData || []

  const activePrice = activeQuote?.current_price || 0
  const unrealized = positions.reduce((s, p) => s + (p.pnl || 0), 0)

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const sym = symbol.toUpperCase().trim()
    if (!sym) {
      setMsg({ tone: 'err', text: 'Please enter a valid stock symbol.' })
      return
    }
    if (quantity <= 0) {
      setMsg({ tone: 'err', text: 'Quantity must be greater than zero.' })
      return
    }

    setLoadingOrder(true)
    try {
      const res = await executeTrade(sym, 'NSE', tradeType, quantity)
      if (res.error) {
        setMsg({ tone: 'err', text: res.error })
      } else {
        setMsg({
          tone: 'ok',
          text: `Success! ${tradeType === 'BUY' ? 'Bought' : 'Sold'} ${quantity} ${sym} @ ₹${fmt(res.price)}`,
        })
        // Trigger refreshes
        refetchPortfolio()
        refetchHoldings()
        refetchTrades()
      }
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message || 'Failed to execute trade.' })
    } finally {
      setLoadingOrder(false)
    }
  }

  return (
    <PageShell
      title="Paper Trading"
      subtitle="Practice with a simulated ₹10L portfolio and live NSE market prices"
      category="Tools"
      icon="solar:wallet-money-bold-duotone"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Cash Balance" value={fmt(pf.cash, { prefix: '₹', compact: true })} icon="solar:banknote-2-bold-duotone" hint="Settled capital" />
        <StatCard label="Holdings Value" value={fmt(pf.investedValue, { prefix: '₹', compact: true })} icon="solar:pie-chart-2-bold-duotone" hint="Current market value" />
        <StatCard label="Net Worth" value={fmt(pf.totalValue, { prefix: '₹', compact: true })} icon="solar:wallet-bold-duotone" hint="Cash + holdings" />
        <StatCard label="Total P&L" value={fmt(pf.totalPnl, { prefix: '₹', compact: true })} change={pf.totalPnlPct} icon="solar:graph-up-bold-duotone" hint="Since inception" />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 border-border" pad={false}>
          <div className="px-5 pt-5">
            <SectionTitle title="Active Positions" subtitle={`${positions.length} holdings · unrealized ${fmt(unrealized, { prefix: '₹', compact: true })}`} />
          </div>
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-soft border-b border-border">
                  <th className="px-5 py-3 font-medium">Symbol</th>
                  <th className="px-3 py-3 font-medium text-right">Qty</th>
                  <th className="px-3 py-3 font-medium text-right">Avg</th>
                  <th className="px-3 py-3 font-medium text-right">Live LTP</th>
                  <th className="px-3 py-3 font-medium text-right">Value</th>
                  <th className="px-5 py-3 font-medium text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.symbol} className="border-b border-border hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3 font-semibold text-foreground">
                      <div>{p.symbol}</div>
                      <div className="text-[10px] text-muted font-normal">{p.name || 'Stock'}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{p.qty}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-soft">{fmt(p.avgPrice, { prefix: '₹' })}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{p.price ? fmt(p.price, { prefix: '₹' }) : '...'}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmt(p.value, { prefix: '₹', compact: true })}</td>
                    <td className="px-5 py-3 text-right">
                      <div className={(p.pnl || 0) >= 0 ? 'text-emerald-bright' : 'text-coral'}>
                        {(p.pnl || 0) >= 0 ? '+' : ''}₹{fmt(Math.abs(p.pnl || 0), { compact: true })}
                      </div>
                      <Change value={p.pnlPct} showArrow={false} className="text-[11px]" />
                    </td>
                  </tr>
                ))}
                {positions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-soft">No open positions. Place an order to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-4 h-fit border-border">
          <SectionTitle title="Order Ticket" subtitle="Simulated execution at live LTP" />
          {msg && (
            <div className={`mb-4 rounded-lg px-3 py-2 text-xs border ${msg.tone === 'ok' ? 'bg-primary/10 border-primary/25 text-primary' : 'bg-coral/10 border-coral/25 text-coral'}`}>
              {msg.text}
            </div>
          )}
          <form onSubmit={placeOrder} className="space-y-4">
            <label className="block">
              <span className="block text-xs text-soft mb-1.5">Symbol (NSE)</span>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground uppercase outline-none focus:border-primary"
                placeholder="e.g. TCS"
              />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTradeType('BUY')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${tradeType === 'BUY' ? 'border-primary text-primary bg-primary/10' : 'border-border text-soft hover:border-primary/50'}`}>
                Buy
              </button>
              <button type="button" onClick={() => setTradeType('SELL')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${tradeType === 'SELL' ? 'border-coral text-coral bg-coral/10' : 'border-border text-soft hover:border-coral/50'}`}>
                Sell
              </button>
            </div>
            <label className="block">
              <span className="block text-xs text-soft mb-1.5">Quantity</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <div className="flex items-center justify-between text-xs text-soft">
              <span>Live Price</span>
              <span className="tabular-nums text-foreground">{activePrice ? fmt(activePrice, { prefix: '₹' }) : 'Fetching...'}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-soft">
              <span>Est. order value</span>
              <span className="tabular-nums text-foreground">{fmt(activePrice * quantity, { prefix: '₹', compact: true })}</span>
            </div>
            <Btn type="submit" variant={tradeType === 'BUY' ? 'primary' : 'coral'} disabled={loadingOrder} className="w-full justify-center mt-2">
              {loadingOrder ? 'Executing...' : `Place ${tradeType === 'BUY' ? 'Buy' : 'Sell'} Order`}
            </Btn>
          </form>
        </Card>
      </div>

      <Card className="mt-6 border-border" pad={false}>
        <div className="px-5 pt-5">
          <SectionTitle title="Transaction History" subtitle={`${history.length} orders`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-soft border-b border-border">
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Symbol</th>
                <th className="px-3 py-3 font-medium text-right">Qty</th>
                <th className="px-3 py-3 font-medium text-right">Price</th>
                <th className="px-5 py-3 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {history.map((t) => (
                <tr key={t.id || t.executed_at} className="border-b border-border hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-3 text-soft">
                    {t.executed_at ? new Date(t.executed_at).toLocaleString() : 'Just now'}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={t.trade_type === 'BUY' ? 'primary' : 'coral'}>{t.trade_type}</Badge>
                  </td>
                  <td className="px-3 py-3 font-semibold text-foreground">{t.symbol}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{t.quantity}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-soft">{fmt(t.price, { prefix: '₹' })}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmt(t.total_value, { prefix: '₹', compact: true })}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-soft">No transactions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  )
}
