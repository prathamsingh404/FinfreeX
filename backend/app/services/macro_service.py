import os
import httpx
import asyncio

FRED_API_KEY = os.getenv("FRED_KEY")
FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"

# Mapping of indicators to FRED series IDs and units
INDICATORS = {
    "US Core Inflation (YoY)": {"series_id": "CPILFESL", "units": "pc1"},
    "US GDP Growth (YoY)": {"series_id": "GDP", "units": "pc1"},
    "Unemployment Rate": {"series_id": "UNRATE", "units": "lin"},
    "Fed Funds Rate": {"series_id": "FEDFUNDS", "units": "lin"},
    "10-Year Treasury Yield": {"series_id": "DGS10", "units": "lin"}
}

async def _fetch_fred_series(name: str, config: dict):
    if not FRED_API_KEY:
        return None
        
    params = {
        "series_id": config["series_id"],
        "api_key": FRED_API_KEY,
        "file_type": "json",
        "units": config.get("units", "lin"),
        "sort_order": "desc",
        "limit": 2 # We need current and previous to calculate change
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(FRED_BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            observations = data.get("observations", [])
            if len(observations) >= 2:
                # Handle cases where value is '.'
                val0 = observations[0]["value"]
                val1 = observations[1]["value"]
                if val0 == '.' or val1 == '.':
                    return None
                    
                current_val = float(val0)
                prev_val = float(val1)
                date_str = observations[0]["date"]
                
                change = current_val - prev_val
                
                return {
                    "name": name,
                    "value": round(current_val, 2),
                    "change": round(change, 2),
                    "date": date_str,
                    "status": "In-line" # Hardcoded status for now as we don't have forecasts
                }
            return None
        except Exception as e:
            print(f"Error fetching FRED data for {name}: {e}")
            return None

async def get_macro_indicators():
    if not FRED_API_KEY or FRED_API_KEY == "your_fred_key_here":
        # Fallback if no key
        return [
            { "name": 'US Core Inflation (YoY)', "value": 3.2, "change": -0.1, "date": '2023-10-01', "status": 'In-line' },
            { "name": 'US GDP Growth (QoQ)', "value": 4.9, "change": 2.8, "date": '2023-09-01', "status": 'Beat' },
            { "name": 'Unemployment Rate', "value": 3.9, "change": 0.1, "date": '2023-10-01', "status": 'Miss' },
        ]

    tasks = [_fetch_fred_series(name, config) for name, config in INDICATORS.items()]
    results = await asyncio.gather(*tasks)
    
    # Filter out None and return
    return [res for res in results if res is not None]
