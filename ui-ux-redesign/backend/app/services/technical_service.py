import pandas as pd
import ta
from app.services.market_data import get_ohlcv

async def compute_indicators(symbol: str, exchange: str = "NSE", period: str = "6mo") -> dict:
    """Compute all technical indicators on OHLCV data using `ta` library."""
    candles = await get_ohlcv(symbol, exchange, period=period, interval="1d")
    if not candles:
        return {"error": "No data found for the ticker"}

    df = pd.DataFrame(candles)
    df["close"] = df["close"].astype(float)
    df["high"] = df["high"].astype(float)
    df["low"] = df["low"].astype(float)
    df["volume"] = df["volume"].astype(float)

    # RSI
    df["rsi"] = ta.momentum.RSIIndicator(df["close"], window=14).rsi()
    # MACD
    macd = ta.trend.MACD(df["close"])
    df["macd"] = macd.macd()
    df["macd_signal"] = macd.macd_signal()
    df["macd_hist"] = macd.macd_diff()
    # Bollinger Bands
    bb = ta.volatility.BollingerBands(df["close"])
    df["bb_upper"] = bb.bollinger_hband()
    df["bb_lower"] = bb.bollinger_lband()
    df["bb_mid"] = bb.bollinger_mavg()
    # EMAs
    df["ema20"] = ta.trend.EMAIndicator(df["close"], window=20).ema_indicator()
    df["ema50"] = ta.trend.EMAIndicator(df["close"], window=50).ema_indicator()
    df["ema200"] = ta.trend.EMAIndicator(df["close"], window=200).ema_indicator()
    # ATR
    df["atr"] = ta.volatility.AverageTrueRange(df["high"], df["low"], df["close"]).average_true_range()
    # Stochastic
    stoch = ta.momentum.StochasticOscillator(df["high"], df["low"], df["close"])
    df["stoch_k"] = stoch.stoch()
    df["stoch_d"] = stoch.stoch_signal()
    # VWAP (approximate daily)
    df["vwap"] = (df["volume"] * (df["high"] + df["low"] + df["close"]) / 3).cumsum() / df["volume"].cumsum()

    # Replace NaN with None for JSON serialization
    df = df.where(pd.notnull(df), None)

    # Generate signals
    latest = df.iloc[-1]
    signals = {
        "rsi_signal": "OVERSOLD" if latest["rsi"] and latest["rsi"] < 30 else
                      ("OVERBOUGHT" if latest["rsi"] and latest["rsi"] > 70 else "NEUTRAL"),
        "macd_signal": "BULLISH" if latest["macd"] and latest["macd_signal"] and latest["macd"] > latest["macd_signal"] else "BEARISH",
        "bb_signal": "OVERSOLD" if latest["close"] < latest["bb_lower"] else
                     ("OVERBOUGHT" if latest["close"] > latest["bb_upper"] else "NEUTRAL"),
        "trend": "BULLISH" if latest["ema20"] and latest["ema50"] and latest["ema20"] > latest["ema50"] else "BEARISH",
    }

    return {
        "candles_with_indicators": df[["time", "open", "high", "low", "close", "volume",
                                        "rsi", "macd", "macd_signal", "macd_hist",
                                        "bb_upper", "bb_lower", "bb_mid",
                                        "ema20", "ema50", "ema200",
                                        "atr", "stoch_k", "stoch_d", "vwap"]].to_dict(orient="records"),
        "latest": {k: round(float(v), 4) if v is not None else None for k, v in latest.items() if k != "time"},
        "signals": signals
    }
