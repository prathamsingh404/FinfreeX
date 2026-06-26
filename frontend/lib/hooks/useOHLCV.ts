import { useState, useEffect } from 'react';
import { api, Candle } from '../api';

export function useOHLCV(symbol: string, exchange = 'NSE', period = '3mo', interval = '1d') {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetchOHLCV = async () => {
    if (!symbol) return;
    setIsLoading(true);
    try {
      const res = await api.market.ohlcv(symbol, exchange, period, interval);
      setCandles(res || []);
      setIsError(false);
    } catch (err) {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOHLCV();
  }, [symbol, exchange, period, interval]);

  return { candles, isLoading, isError, refresh: fetchOHLCV };
}
