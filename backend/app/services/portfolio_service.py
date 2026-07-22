import json
import os
import uuid
import logging
import asyncio
import socket
from urllib.parse import urlparse
from datetime import datetime
from decimal import Decimal
from app.db.client import get_supabase_client
from app.services.market_data import get_quote, get_fundamentals
from app.config import get_settings

# Configure logging
logger = logging.getLogger("portfolio_service")
settings = get_settings()

_supabase_offline = None

async def check_supabase_connection():
    global _supabase_offline
    url = settings.supabase_url
    if not url:
        _supabase_offline = True
        return
        
    try:
        host = urlparse(url).netloc
        if ":" in host:
            host = host.split(":")[0]
            
        loop = asyncio.get_running_loop()
        # Resolve host with a 1-second timeout limit in a non-blocking executor
        await asyncio.wait_for(
            loop.run_in_executor(None, socket.getaddrinfo, host, None),
            timeout=1.0
        )
        _supabase_offline = False
        logger.info("Supabase connection verified: online mode active.")
    except Exception as e:
        logger.warning(f"Supabase connection check failed: {e}. Enabling local offline database mode.")
        _supabase_offline = True

def is_supabase_offline() -> bool:
    global _supabase_offline
    if _supabase_offline is None:
        # If not checked yet, default to offline for safety
        return True
    return _supabase_offline

class LocalDB:
    FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db", "local_portfolio.json")

    @classmethod
    def load(cls) -> dict:
        if not os.path.exists(cls.FILE_PATH):
            os.makedirs(os.path.dirname(cls.FILE_PATH), exist_ok=True)
            data = {"portfolios": {}, "positions": {}, "trades": []}
            cls.save(data)
            return data
        try:
            with open(cls.FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading local portfolio DB: {e}")
            return {"portfolios": {}, "positions": {}, "trades": []}

    @classmethod
    def save(cls, data: dict):
        try:
            with open(cls.FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save local portfolio DB: {e}")

def get_or_create_portfolio_local(user_id: str) -> dict:
    db_data = LocalDB.load()
    if user_id not in db_data["portfolios"]:
        portfolio_id = str(uuid.uuid4())
        db_data["portfolios"][user_id] = {
            "id": portfolio_id,
            "user_id": user_id,
            "name": "My Paper Portfolio",
            "initial_cash": 1000000.00,
            "cash_balance": 1000000.00,
            "currency": "INR"
        }
        LocalDB.save(db_data)
    return db_data["portfolios"][user_id]

def get_or_create_portfolio(user_id: str) -> dict:
    """Gets the user's paper portfolio or creates a default one if it doesn't exist."""
    if is_supabase_offline():
        return get_or_create_portfolio_local(user_id)
        
    try:
        db = get_supabase_client()
        res = db.table("paper_portfolios").select("*").eq("user_id", user_id).execute()
        if res.data:
            return res.data[0]
            
        new_port = {
            "user_id": user_id,
            "name": "My Paper Portfolio",
            "initial_cash": 1000000.00,
            "cash_balance": 1000000.00,
            "currency": "INR"
        }
        insert_res = db.table("paper_portfolios").insert(new_port).execute()
        return insert_res.data[0] if insert_res.data else new_port
    except Exception as e:
        logger.warning(f"Supabase error in get_or_create_portfolio, fallback to local JSON: {e}")
        return get_or_create_portfolio_local(user_id)

async def get_portfolio_summary(user_id: str) -> dict:
    """Returns cash balance, total position value, total value, and overall P&L."""
    if is_supabase_offline():
        return await get_portfolio_summary_local(user_id)
        
    try:
        portfolio = get_or_create_portfolio(user_id)
        portfolio_id = portfolio["id"]
        
        db = get_supabase_client()
        pos_res = db.table("paper_positions").select("*").eq("portfolio_id", portfolio_id).execute()
        positions = pos_res.data or []
        
        total_position_value = Decimal("0.0")
        total_cost_basis = Decimal("0.0")
        active_positions = []
        
        for pos in positions:
            qty = pos["quantity"]
            if qty <= 0:
                continue
                
            symbol = pos["symbol"]
            exchange = pos["exchange"]
            avg_buy_price = Decimal(str(pos["avg_buy_price"]))
            
            quote = await get_quote(symbol, exchange)
            current_price = Decimal(str(quote.get("current_price", avg_buy_price)))
            
            cost_basis = avg_buy_price * qty
            current_value = current_price * qty
            pnl = current_value - cost_basis
            pnl_pct = (pnl / cost_basis * 100) if cost_basis else Decimal("0.0")
            
            total_position_value += current_value
            total_cost_basis += cost_basis
            
            active_positions.append({
                "id": pos["id"],
                "symbol": symbol,
                "exchange": exchange,
                "quantity": qty,
                "avg_buy_price": float(avg_buy_price),
                "current_price": float(current_price),
                "cost_basis": float(cost_basis),
                "current_value": float(current_value),
                "pnl": float(pnl),
                "pnl_pct": float(pnl_pct)
            })
            
        cash_balance = Decimal(str(portfolio["cash_balance"]))
        total_value = cash_balance + total_position_value
        total_pnl = total_value - Decimal(str(portfolio["initial_cash"]))
        total_pnl_pct = (total_pnl / Decimal(str(portfolio["initial_cash"]))) * 100
        
        return {
            "portfolio_id": portfolio_id,
            "name": portfolio["name"],
            "initial_cash": float(portfolio["initial_cash"]),
            "cash_balance": float(cash_balance),
            "total_position_value": float(total_position_value),
            "total_value": float(total_value),
            "total_pnl": float(total_pnl),
            "total_pnl_pct": float(total_pnl_pct),
            "currency": portfolio["currency"],
            "positions": active_positions
        }
    except Exception as e:
        logger.warning(f"Supabase failed in get_portfolio_summary, using local JSON: {e}")
        return await get_portfolio_summary_local(user_id)

async def get_portfolio_summary_local(user_id: str) -> dict:
    portfolio = get_or_create_portfolio_local(user_id)
    portfolio_id = portfolio["id"]
    db_data = LocalDB.load()
    
    positions = [pos for pos in db_data["positions"].values() if pos["portfolio_id"] == portfolio_id]
    
    active_positions = []
    total_position_value = 0.0
    total_cost_basis = 0.0
    
    for pos in positions:
        qty = pos["quantity"]
        if qty <= 0:
            continue
        symbol = pos["symbol"]
        exchange = pos["exchange"]
        avg_buy_price = pos["avg_buy_price"]
        
        try:
            quote = await get_quote(symbol, exchange)
            current_price = float(quote.get("current_price", avg_buy_price))
        except Exception:
            current_price = float(avg_buy_price)
            
        cost_basis = avg_buy_price * qty
        current_value = current_price * qty
        pnl = current_value - cost_basis
        pnl_pct = (pnl / cost_basis * 100) if cost_basis else 0.0
        
        total_position_value += current_value
        total_cost_basis += cost_basis
        
        active_positions.append({
            "id": pos["id"],
            "symbol": symbol,
            "exchange": exchange,
            "quantity": qty,
            "avg_buy_price": avg_buy_price,
            "current_price": current_price,
            "cost_basis": cost_basis,
            "current_value": current_value,
            "pnl": pnl,
            "pnl_pct": pnl_pct
        })
        
    cash_balance = float(portfolio["cash_balance"])
    total_value = cash_balance + total_position_value
    total_pnl = total_value - float(portfolio["initial_cash"])
    total_pnl_pct = (total_pnl / float(portfolio["initial_cash"]) * 100) if float(portfolio["initial_cash"]) else 0.0
    
    return {
        "portfolio_id": portfolio_id,
        "name": portfolio["name"],
        "initial_cash": float(portfolio["initial_cash"]),
        "cash_balance": cash_balance,
        "total_position_value": total_position_value,
        "total_value": total_value,
        "total_pnl": total_pnl,
        "total_pnl_pct": total_pnl_pct,
        "currency": portfolio["currency"],
        "positions": active_positions
    }

async def execute_trade(user_id: str, symbol: str, exchange: str, trade_type: str, quantity: int) -> dict:
    """Executes a paper trade, updates balances and positions."""
    if quantity <= 0:
        return {"error": "Quantity must be greater than zero"}
        
    # Get live quote to ensure real price execution
    quote = await get_quote(symbol, exchange)
    if "error" in quote:
        return {"error": f"Failed to get price quote for trade: {quote['error']}"}
        
    price = Decimal(str(quote["current_price"]))
    total_value = price * quantity
    
    if is_supabase_offline():
        return execute_trade_local(user_id, symbol, exchange, trade_type, quantity, price, total_value)

    try:
        portfolio = get_or_create_portfolio(user_id)
        portfolio_id = portfolio["id"]
        db = get_supabase_client()
        cash_balance = Decimal(str(portfolio["cash_balance"]))
        
        if trade_type == "BUY":
            if cash_balance < total_value:
                return {"error": "Insufficient funds to execute buy"}
            new_cash = cash_balance - total_value
        else: # SELL
            pos_res = db.table("paper_positions").select("*").eq("portfolio_id", portfolio_id).eq("symbol", symbol).execute()
            current_qty = pos_res.data[0]["quantity"] if pos_res.data else 0
            if current_qty < quantity:
                return {"error": f"Insufficient shares to sell. Owned: {current_qty}, Request: {quantity}"}
            new_cash = cash_balance + total_value
            
        # Update cash
        db.table("paper_portfolios").update({"cash_balance": float(new_cash)}).eq("id", portfolio_id).execute()
        
        # Record trade
        trade_data = {
            "portfolio_id": portfolio_id,
            "symbol": symbol,
            "exchange": exchange,
            "trade_type": trade_type,
            "quantity": quantity,
            "price": float(price),
            "total_value": float(total_value)
        }
        db.table("paper_trades").insert(trade_data).execute()
        
        # Update position
        pos_res = db.table("paper_positions").select("*").eq("portfolio_id", portfolio_id).eq("symbol", symbol).execute()
        if pos_res.data:
            pos = pos_res.data[0]
            pos_id = pos["id"]
            old_qty = pos["quantity"]
            
            if trade_type == "BUY":
                new_qty = old_qty + quantity
                old_avg = Decimal(str(pos["avg_buy_price"]))
                new_avg = ((old_avg * old_qty) + (price * quantity)) / new_qty
                db.table("paper_positions").update({
                    "quantity": new_qty,
                    "avg_buy_price": float(new_avg),
                    "updated_at": "now()"
                }).eq("id", pos_id).execute()
            else: # SELL
                new_qty = old_qty - quantity
                if new_qty == 0:
                    db.table("paper_positions").delete().eq("id", pos_id).execute()
                else:
                    db.table("paper_positions").update({
                        "quantity": new_qty,
                        "updated_at": "now()"
                    }).eq("id", pos_id).execute()
        else:
            if trade_type == "BUY":
                new_pos = {
                    "portfolio_id": portfolio_id,
                    "symbol": symbol,
                    "exchange": exchange,
                    "quantity": quantity,
                    "avg_buy_price": float(price)
                }
                db.table("paper_positions").insert(new_pos).execute()
                
        return {
            "success": True,
            "trade_type": trade_type,
            "symbol": symbol,
            "quantity": quantity,
            "price": float(price),
            "new_cash_balance": float(new_cash)
        }
    except Exception as e:
        logger.warning(f"Supabase failed in execute_trade, executing locally: {e}")
        return execute_trade_local(user_id, symbol, exchange, trade_type, quantity, price, total_value)

def execute_trade_local(user_id: str, symbol: str, exchange: str, trade_type: str, quantity: int, price: Decimal, total_value: Decimal) -> dict:
    portfolio = get_or_create_portfolio_local(user_id)
    portfolio_id = portfolio["id"]
    db_data = LocalDB.load()
    
    cash_balance = float(portfolio["cash_balance"])
    cost = float(total_value)
    
    if trade_type == "BUY":
        if cash_balance < cost:
            return {"error": "Insufficient funds to execute buy"}
        new_cash = cash_balance - cost
    else: # SELL
        pos_key = f"{portfolio_id}_{symbol}"
        current_qty = db_data["positions"].get(pos_key, {}).get("quantity", 0)
        if current_qty < quantity:
            return {"error": f"Insufficient shares to sell. Owned: {current_qty}, Request: {quantity}"}
        new_cash = cash_balance + cost

    # Update portfolio cash
    db_data["portfolios"][user_id]["cash_balance"] = new_cash
    
    # Record trade
    trade_id = str(uuid.uuid4())
    db_data["trades"].insert(0, {
        "id": trade_id,
        "portfolio_id": portfolio_id,
        "symbol": symbol,
        "exchange": exchange,
        "trade_type": trade_type,
        "quantity": quantity,
        "price": float(price),
        "total_value": cost,
        "executed_at": datetime.utcnow().isoformat()
    })
    
    # Update position
    pos_key = f"{portfolio_id}_{symbol}"
    if pos_key in db_data["positions"]:
        pos = db_data["positions"][pos_key]
        old_qty = pos["quantity"]
        if trade_type == "BUY":
            new_qty = old_qty + quantity
            new_avg = ((pos["avg_buy_price"] * old_qty) + cost) / new_qty
            pos["quantity"] = new_qty
            pos["avg_buy_price"] = new_avg
        else: # SELL
            new_qty = old_qty - quantity
            if new_qty == 0:
                del db_data["positions"][pos_key]
            else:
                pos["quantity"] = new_qty
    else:
        if trade_type == "BUY":
            db_data["positions"][pos_key] = {
                "id": str(uuid.uuid4()),
                "portfolio_id": portfolio_id,
                "symbol": symbol,
                "exchange": exchange,
                "quantity": quantity,
                "avg_buy_price": float(price)
            }

    LocalDB.save(db_data)
    
    return {
        "success": True,
        "trade_type": trade_type,
        "symbol": symbol,
        "quantity": quantity,
        "price": float(price),
        "new_cash_balance": new_cash
    }

def get_trade_history(user_id: str) -> list[dict]:
    """Retrieves all transaction logs for the paper account."""
    if is_supabase_offline():
        return get_trade_history_local(user_id)
        
    try:
        portfolio = get_or_create_portfolio(user_id)
        db = get_supabase_client()
        res = db.table("paper_trades").select("*").eq("portfolio_id", portfolio["id"]).order("executed_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.warning(f"Supabase failed in get_trade_history, reading local JSON: {e}")
        return get_trade_history_local(user_id)

def get_trade_history_local(user_id: str) -> list[dict]:
    portfolio = get_or_create_portfolio_local(user_id)
    portfolio_id = portfolio["id"]
    db_data = LocalDB.load()
    return [t for t in db_data["trades"] if t["portfolio_id"] == portfolio_id]
