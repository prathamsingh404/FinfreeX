# PortAI: Staging step 1
import math
import asyncio
from datetime import datetime, timedelta
from app.services.market_data import get_quote

# Helper: Black-Scholes pricing model
def black_scholes(s, k, t, r, v, option_type="call"):
    """
    s: underlying price
    k: strike price
    t: time to expiration in years (e.g. 30/365)
    r: risk-free interest rate (e.g. 0.07 for India)
    v: volatility (e.g. 0.20)
    """
    if t <= 0:
        return max(0.0, s - k) if option_type == "call" else max(0.0, k - s)
        
    try:
        d1 = (math.log(s / k) + (r + 0.5 * v ** 2) * t) / (v * math.sqrt(t))
        d2 = d1 - v * math.sqrt(t)
        
        # Normal CDF approximation
        def cdf(x):
            return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0
            
        if option_type == "call":
            price = s * cdf(d1) - k * math.exp(-r * t) * cdf(d2)
            delta = cdf(d1)
        else:
            price = k * math.exp(-r * t) * cdf(-d2) - s * cdf(-d1)
            delta = cdf(d1) - 1.0
            
        gamma = math.exp(-d1**2 / 2.0) / (s * v * math.sqrt(2.0 * math.pi * t))
        theta = - (s * v * math.exp(-d1**2 / 2.0)) / (2.0 * math.sqrt(2.0 * math.pi * t))
        
        return {
            "price": max(0.05, round(price, 2)),
            "delta": round(delta, 3),
            "gamma": round(gamma, 5),
            "theta": round(theta / 365, 3) # daily theta decay
        }
    except Exception as e:
        print(f"Black-Scholes calculation error: {e}")
        return {"price": 1.0, "delta": 0.5 if option_type == "call" else -0.5, "gamma": 0.01, "theta": -0.05}

async def generate_option_chain(symbol: str, expiry: str = None) -> dict:
    """
    Generate an option chain for a ticker.
    Centred around the underlying's real-time price.
    """
    # Fetch underlying quote
    quote = await get_quote(symbol, "NSE")
    if "error" in quote:
        # Fallback to standard price if error
        underlying_price = 1000.0
    else:
        underlying_price = quote["current_price"]
        
    # Determine strike interval based on price magnitude
    if underlying_price < 100:
        interval = 2.5
    elif underlying_price < 500:
        interval = 5.0
    elif underlying_price < 2000:
        interval = 20.0
    elif underlying_price < 5000:
        interval = 50.0
    else:
        interval = 100.0
        
    # Strike range: center ± 8 strikes
    atm_strike = round(underlying_price / interval) * interval
    strikes = [atm_strike + (i * interval) for i in range(-8, 9)]
    
    # Expiration: Last Thursday of current month
    today = datetime.now()
    if not expiry:
        # Simple simulation: 2 weeks from now
        expiry_dt = today + timedelta(days=14)
        expiry = expiry_dt.strftime("%Y-%m-%d")
    else:
        try:
            expiry_dt = datetime.strptime(expiry, "%Y-%m-%d")
        except:
            expiry_dt = today + timedelta(days=14)
            
    days_to_expiry = max(1, (expiry_dt - today).days)
    t = days_to_expiry / 365.0
    
    # Risk-free rate (7% for India) and implied volatility (approx 16%)
    r = 0.07
    v = 0.18
    
    calls = []
    puts = []
    chain = []
    
    for strike in strikes:
        strike = round(strike, 2)
        # Call pricing
        c_stats = black_scholes(underlying_price, strike, t, r, v, "call")
        p_stats = black_scholes(underlying_price, strike, t, r, v, "put")
        
        # Calculate fictional but realistic volume and open interest (OI)
        dist_from_atm = abs(underlying_price - strike) / underlying_price
        base_oi = int(100000 * math.exp(-15 * dist_from_atm)) # peak at ATM
        
        call_item = {
            "strike": strike,
            "ltp": c_stats["price"],
            "change": round((c_stats["price"] - c_stats["price"]*0.95) * (1 if underlying_price > strike else -1), 2),
            "change_pct": round(5.0 * (1 if underlying_price > strike else -1), 2),
            "volume": int(base_oi * 0.8),
            "oi": base_oi,
            "implied_volatility": round(v * 100, 2),
            "delta": c_stats["delta"],
            "gamma": c_stats["gamma"],
            "theta": c_stats["theta"]
        }
        
        put_item = {
            "strike": strike,
            "ltp": p_stats["price"],
            "change": round((p_stats["price"] - p_stats["price"]*0.95) * (-1 if underlying_price > strike else 1), 2),
            "change_pct": round(5.0 * (-1 if underlying_price > strike else 1), 2),
            "volume": int(base_oi * 0.6),
            "oi": int(base_oi * 0.9),
            "implied_volatility": round(v * 105, 2),
            "delta": p_stats["delta"],
            "gamma": p_stats["gamma"],
            "theta": p_stats["theta"]
        }
        
        chain.append({
            "strike": strike,
            "call": call_item,
            "put": put_item
        })
        
    return {
        "symbol": symbol,
        "underlying_price": round(underlying_price, 2),
        "expiry": expiry,
        "days_to_expiry": days_to_expiry,
        "chain": chain
    }
