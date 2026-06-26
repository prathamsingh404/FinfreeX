# PortAI: Staging step 1
from app.db.client import get_supabase_client
from app.services.market_data import get_quote
from decimal import Decimal
import logging

def get_or_create_portfolio(user_id: str) -> dict:
    """Gets the user's paper portfolio or creates a default one if it doesn't exist."""
    db = get_supabase_client()
    res = db.table("paper_portfolios").select("*").eq("user_id", user_id).execute()
    
    if res.data:
        return res.data[0]
        
    # Create default
    new_port = {
        "user_id": user_id,
        "name": "My Paper Portfolio",
        "initial_cash": 1000000.00,
        "cash_balance": 1000000.00,
        "currency": "INR"
    }
    insert_res = db.table("paper_portfolios").insert(new_port).execute()
    return insert_res.data[0] if insert_res.data else new_port

async def get_portfolio_summary(user_id: str) -> dict:
    """Returns cash balance, total position value, total value, and overall P&L."""
    portfolio = get_or_create_portfolio(user_id)
    portfolio_id = portfolio["id"]
    db = get_supabase_client()
    
    # Get positions
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
        
        # Get live price
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

async def execute_trade(user_id: str, symbol: str, exchange: str, trade_type: str, quantity: int) -> dict:
    """Executes a paper trade, updates balances and positions in database."""
    if quantity <= 0:
        return {"error": "Quantity must be greater than zero"}
        
    db = get_supabase_client()
    portfolio = get_or_create_portfolio(user_id)
    portfolio_id = portfolio["id"]
    cash_balance = Decimal(str(portfolio["cash_balance"]))
    
    # Get quote
    quote = await get_quote(symbol, exchange)
    if "error" in quote:
        return {"error": f"Failed to get price quote for trade: {quote['error']}"}
        
    price = Decimal(str(quote["current_price"]))
    total_value = price * quantity
    
    # Verify transaction
    if trade_type == "BUY":
        if cash_balance < total_value:
            return {"error": "Insufficient funds to execute buy"}
        new_cash = cash_balance - total_value
    else: # SELL
        # Check current position
        pos_res = db.table("paper_positions").select("*").eq("portfolio_id", portfolio_id).eq("symbol", symbol).execute()
        current_qty = pos_res.data[0]["quantity"] if pos_res.data else 0
        if current_qty < quantity:
            return {"error": f"Insufficient shares to sell. Owned: {current_qty}, Request: {quantity}"}
        new_cash = cash_balance + total_value
        
    # Begin updates
    # 1. Update cash balance
    db.table("paper_portfolios").update({"cash_balance": float(new_cash)}).eq("id", portfolio_id).execute()
    
    # 2. Record trade
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
    
    # 3. Update position
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
                # Delete position
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

def get_trade_history(user_id: str) -> list[dict]:
    """Retrieves all transaction logs for the paper account."""
    portfolio = get_or_create_portfolio(user_id)
    db = get_supabase_client()
    res = db.table("paper_trades").select("*").eq("portfolio_id", portfolio["id"]).order("executed_at", desc=True).execute()
    return res.data or []
