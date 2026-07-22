-- Users are auto-created by Supabase Auth. Extend with profile:
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  preferred_currency TEXT DEFAULT 'INR',
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,          -- e.g. "RELIANCE", "AAPL"
  exchange TEXT NOT NULL DEFAULT 'NSE', -- "NSE", "BSE", "NYSE", "NASDAQ"
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paper Trading Portfolio
CREATE TABLE IF NOT EXISTS paper_portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Paper Portfolio',
  initial_cash NUMERIC(20, 2) DEFAULT 1000000.00,  -- ₹10,00,000 default
  cash_balance NUMERIC(20, 2) DEFAULT 1000000.00,
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paper_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES paper_portfolios(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC(20, 4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paper_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES paper_portfolios(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  quantity INTEGER NOT NULL,
  price NUMERIC(20, 4) NOT NULL,
  total_value NUMERIC(20, 4) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price Alerts
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('ABOVE', 'BELOW', 'PERCENT_CHANGE')),
  target_value NUMERIC(20, 4) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Screener Filters
CREATE TABLE IF NOT EXISTS saved_screeners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('hourly', 'daily', 'weekly', 'off')),
  alert_on_price_trigger BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Chart Layouts
CREATE TABLE IF NOT EXISTS chart_layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1D',
  indicators JSONB DEFAULT '[]',
  drawings JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_screeners ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see/edit their own data)
CREATE OR REPLACE POLICY "Users own their profiles" ON user_profiles FOR ALL USING (auth.uid() = id);
CREATE OR REPLACE POLICY "Users own their watchlists" ON watchlists FOR ALL USING (auth.uid() = user_id);
CREATE OR REPLACE POLICY "Users access watchlist items via watchlist" ON watchlist_items FOR ALL
  USING (EXISTS (SELECT 1 FROM watchlists w WHERE w.id = watchlist_id AND w.user_id = auth.uid()));
CREATE OR REPLACE POLICY "Users own their portfolios" ON paper_portfolios FOR ALL USING (auth.uid() = user_id);
CREATE OR REPLACE POLICY "Users access positions via portfolio" ON paper_positions FOR ALL
  USING (EXISTS (SELECT 1 FROM paper_portfolios p WHERE p.id = portfolio_id AND p.user_id = auth.uid()));
CREATE OR REPLACE POLICY "Users access trades via portfolio" ON paper_trades FOR ALL
  USING (EXISTS (SELECT 1 FROM paper_portfolios p WHERE p.id = portfolio_id AND p.user_id = auth.uid()));
CREATE OR REPLACE POLICY "Users own their alerts" ON price_alerts FOR ALL USING (auth.uid() = user_id);
CREATE OR REPLACE POLICY "Users own their screeners" ON saved_screeners FOR ALL USING (auth.uid() = user_id);
CREATE OR REPLACE POLICY "Users own their notifications" ON notification_settings FOR ALL USING (auth.uid() = user_id);
CREATE OR REPLACE POLICY "Users own their chart layouts" ON chart_layouts FOR ALL USING (auth.uid() = user_id);
