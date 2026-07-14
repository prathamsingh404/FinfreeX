import { useState, useEffect } from 'react';
import { fetchQuote as fetchQuoteApi, Quote } from '../api';

export function useQuote(symbol: string, exchange = 'NSE') {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    
    let isMounted = true;
    const fetchQuote = async () => {
      setIsLoading(true);
      try {
        const res = await fetchQuoteApi(symbol, exchange);
        if (isMounted) {
          setQuote(res);
          setIsError(false);
        }
      } catch (err) {
        if (isMounted) {
          setIsError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchQuote();
    // Auto refresh every 10s
    const interval = setInterval(fetchQuote, 10000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol, exchange]);

  return { quote, isLoading, isError };
}
