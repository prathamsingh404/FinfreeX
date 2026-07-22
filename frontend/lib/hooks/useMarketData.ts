'use client'

/* ============================================================
   FinfreeX — React Hooks for Live Market Data
   Auto-fetching hooks with loading/error states and refresh.
   ============================================================ */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchQuote, fetchIndices, fetchMovers, fetchFundamentals,
  fetchOHLCV, fetchScreener, fetchNews, fetchOptionsChain,
  fetchForex, fetchCrypto, fetchCommodities, fetchTechnicals,
  fetchPortfolio, fetchPortfolioHoldings, fetchSectors, fetchTrades,
  fetchBrokerLoginUrl, fetchBrokerHoldings,
  type Quote, type IndexData, type Candle, type Fundamental,
  type NewsItem, type OptionsChain, type ForexPair, type CryptoAsset,
  type CommodityAsset, type ScreenerResult, type MacroIndicator, fetchMacro
} from '@/lib/api'

/* ---------- Generic fetch hook ---------- */

function useAPI<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  refreshInterval?: number
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const doFetch = useCallback(async () => {
    try {
      setLoading(prev => prev || data === null) // only show loading on first load
      setError(null)
      const result = await fetcher()
      if (mountedRef.current) {
        setData(result)
        setLoading(false)
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch data')
        setLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    doFetch()

    let timer: ReturnType<typeof setInterval> | undefined
    if (refreshInterval && refreshInterval > 0) {
      timer = setInterval(doFetch, refreshInterval)
    }

    return () => {
      mountedRef.current = false
      if (timer) clearInterval(timer)
    }
  }, [doFetch, refreshInterval])

  return { data, loading, error, refetch: doFetch }
}

/* ---------- Specific hooks ---------- */

/** Live stock quote — refreshes every 15s by default */
export function useQuote(symbol: string, exchange = 'NSE', refreshMs = 15_000) {
  return useAPI<Quote>(
    () => fetchQuote(symbol, exchange),
    [symbol, exchange],
    refreshMs
  )
}

/** All major indices — refreshes every 30s */
export function useIndices(refreshMs = 30_000) {
  return useAPI<Record<string, IndexData>>(
    fetchIndices,
    [],
    refreshMs
  )
}

/** Top gainers & losers — refreshes every 60s */
export function useMovers(exchange = 'NSE', refreshMs = 60_000) {
  return useAPI<{ gainers: Quote[]; losers: Quote[] }>(
    () => fetchMovers(exchange),
    [exchange],
    refreshMs
  )
}

/** Company fundamentals — no auto-refresh */
export function useFundamentals(symbol: string, exchange = 'NSE') {
  return useAPI<Fundamental>(
    () => fetchFundamentals(symbol, exchange),
    [symbol, exchange]
  )
}

/** Technical indicators — no auto-refresh */
export function useTechnicals(symbol: string, exchange = 'NSE') {
  return useAPI<any>(
    () => fetchTechnicals(symbol, exchange),
    [symbol, exchange]
  )
}

/** OHLCV candle data for charts */
export function useOHLCV(symbol: string, exchange = 'NSE', period = '3mo', interval = '1d') {
  return useAPI<Candle[]>(
    () => fetchOHLCV(symbol, exchange, period, interval),
    [symbol, exchange, period, interval]
  )
}

/** Stock screener results */
export function useScreener(params?: Record<string, string>) {
  return useAPI<ScreenerResult[]>(
    () => fetchScreener(params),
    [JSON.stringify(params)]
  )
}

/** News feed — refreshes every 5 minutes */
export function useNews(query?: string, category?: string, refreshMs = 300_000) {
  return useAPI<NewsItem[]>(
    () => fetchNews(query, category),
    [query, category],
    refreshMs
  )
}

/** Options chain */
export function useOptionsChain(symbol: string, expiry?: string) {
  return useAPI<OptionsChain>(
    () => fetchOptionsChain(symbol, expiry),
    [symbol, expiry]
  )
}

/** Forex pairs — refreshes every 30s */
export function useForex(refreshMs = 30_000) {
  return useAPI<ForexPair[]>(fetchForex, [], refreshMs)
}

/** Crypto assets — refreshes every 30s */
export function useCrypto(refreshMs = 30_000) {
  return useAPI<CryptoAsset[]>(fetchCrypto, [], refreshMs)
}

/** Commodities — refreshes every 30s */
export function useCommodities(refreshMs = 30_000) {
  return useAPI<CommodityAsset[]>(fetchCommodities, [], refreshMs)
}

/** Portfolio overview */
export function usePortfolio(refreshMs = 0) {
  return useAPI<any>(
    fetchPortfolio,
    [],
    refreshMs
  )
}

/** Portfolio holdings */
export function usePortfolioHoldings() {
  return useAPI<any[]>(
    fetchPortfolioHoldings,
    []
  )
}

/** Trade history */
export function useTrades(refreshMs = 0) {
  return useAPI<any[]>(
    fetchTrades,
    [],
    refreshMs
  )
}


/** Sectors */
export function useSectors(refreshMs = 60_000) {
  return useAPI<any[]>(fetchSectors, [], refreshMs)
}

/** Backtest (Placeholder) */
export function useBacktest(strategy: string) {
  // Will connect to real backtest API once built
  return { data: null as any, loading: false }
}

/** Macro Economics */
export function useMacro(refreshMs = 300_000) {
  return useAPI<MacroIndicator[]>(
    fetchMacro,
    [],
    refreshMs
  )
}

/** Broker Login URL */
export function useBrokerLoginUrl() {
  return useAPI<{ login_url: string }>(fetchBrokerLoginUrl, [])
}

/** Broker Holdings */
export function useBrokerHoldings() {
  return useAPI<any[]>(fetchBrokerHoldings, [])
}

