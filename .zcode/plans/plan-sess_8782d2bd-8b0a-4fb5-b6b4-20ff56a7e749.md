## FinfreeX — Integrate UI/UX Redesign + Wire Real Data

### Confirmed decisions
- **Data:** full real data; build missing backend endpoints. Keep `lib/mockData.ts` + `lib/featureData.ts` in-repo **only** as the baseline that lets redesigned pages compile, and as the permanent source for the handful of pages with no free data feed (dark pool, derivatives heatmap, economic calendar, correlation matrix, backtest, risk engine).
- **Backend:** keep the main `backend/` untouched (redesign's is byte-identical except line endings). All new endpoints are added to main.
- **Folder:** delete `ui-ux-redesign/` entirely at the end.
- **Tokens:** migrate all 9 partially-migrated pages to the new emerald/coral system.

---

### Phase 0 — Safety
1. Create branch `ui-ux-redesign-integration` from `main`.
2. Confirm `backend/.env` and `frontend/.env.local` are present and gitignored (preserve secrets; never overwrite).

### Phase 1 — Overlay the redesign onto `frontend/` (new look, compiles against mock)
Bring the redesign's **changed + new** files into the main `frontend/`, preserving `node_modules/`, `package-lock.json`, `.next/`, `.env*`, `tsconfig.tsbuildinfo`.

**Replace (overwrite) from redesign → main:**
- Configs: `tailwind.config.js`, `app/globals.css`, `app/layout.tsx`, `app/sidebar.tsx`
- `components/Header.tsx` (only changed shared component)
- All ~50 rewritten pages under `app/**/page.tsx`

**Add new (copy from redesign → main):**
- `components/PageShell.tsx`, `components/Globe.tsx`
- `components/home/MarketTicker.tsx`
- `components/ui/kit.tsx`, `components/ui/AreaChart.tsx`, `components/ui/DataTable.tsx`
- `lib/nav.ts`, `lib/mockData.ts`, `lib/featureData.ts`

**Keep as-is (already identical in both):** `lib/api.ts`, `lib/supabase.ts`, `lib/hooks/*`, `context/AuthContext.tsx`, `types/*`, `utils/supabase/*`, all other shared components (AdvancedChart, reactbits/*, ai/AIAnalysisPanel, charts/*, etc.), `package.json`, `next.config.js`, `tsconfig.json`, `postcss.config.js`, `middleware.ts`, `public/*`.

**Migrate the 9 broken-token pages** to the new system (indigo→emerald, purple→coral/amber, cyan→emerald, slate-*→foreground/soft/muted, `#12121A`/`#0D0D15`→surface/background): `auth`, `about`, `advisor`, `analysis`, `todos`, `pricing`, `workflow`, `visualization`, `callback/upstox`.

**Gate check:** `npm run build` passes; site boots with the new emerald/coral look rendering mock data.

### Phase 2 — Wire pages to EXISTING endpoints (frontend-only, no backend work)
Replace mock calls with the existing `api` client / hooks for these pages:
- `market` → `api.market.quote/indices/topMovers` + `useOHLCV`
- `technical-charts` → fix `TradingViewChart` to hit real paths (`/api/charts/ohlcv`, `/api/news/feed`) instead of the wrong `/api/history`, `/api/news`; drop `generateDummyData` fallback or keep as last-resort
- `fundamental-analysis` → `api.market.fundamentals`
- `equities-screener` → `api.screener.run`
- `paper-trading` + `portfolio-analyzer` (holdings) → `api.portfolio.summary/trade/history`
- `market` watchlist panel → `api.watchlist`
- `alerts` → `api.alerts`
- `ai-analyst` → resurrect `components/ai/AIAnalysisPanel` (real `streamAnalysis` SSE) instead of the local fake chatbot
- `hedge-fund` AI committee → real `streamAnalysis`; notifications tab → real telegram router
- `news-sentiment` → `api.news.feed`
- `options-chain` → `api.options.chain`

### Phase 3 — Build NEW backend endpoints (yfinance-powered) and wire them
Add new routers to `backend/app/routers/` (registered in `main.py`), each backed by yfinance where possible, then swap the matching pages from mock→real. Waves:

**Wave 3a (single-ticker yfinance features):**
- `routers/market.py`: extend with `/dividends`, `/splits` (corporate-actions), `/holders` (institutional-holdings + insider-trading via `major_holders`/`institutional_holders`), `/sustainability` (esg-scores), `/ratios` + `/peers` (financial-ratios, peer-comparison from `info`), `/earnings-calendar` (earnings-transcripts via `calendar`)
- Wire pages: `dividend-tracker`, `corporate-actions`, `institutional-holdings`, `insider-trading`, `esg-scores`, `financial-ratios`, `peer-comparison`, `earnings-transcripts`

**Wave 3b (cross-asset / index features):**
- New `routers/global_market.py`: `/indices` (existing), `/forex`, `/commodities`, `/crypto` via yfinance tickers (EURUSD=X, GC=F, BTC-USD…)
- New `routers/macro.py`: `/yield-curve` (^TNX/^IRX…), `/vix` (^VIX/^INDIAVIX), `/sector-performance` (XLK/XLF… or NSE sector indices), `/market-breadth`
- Wire pages: `forex`, `commodities`, `crypto`, `global-markets`, `yield-curve`, `vix-monitor`, `sectors`, `market-breadth`, `sector-rotation`

**Wave 3c (funds):**
- New `routers/funds.py`: `/mutual-funds`, `/etf`, `/reit`, `/ipo`, `/fixed-income` (G-Sec via yfinance/known tickers or static+live-hybrid)
- Wire pages: `mutual-funds`, `etf-analyzer`, `reit-analyzer`, `ipo-watch`, `fixed-income`, `macro-economics`

For each Wave: add Pydantic models, add `api.*` methods to `frontend/lib/api.ts`, then rewrite the page's data hook from mock to real.

### Phase 4 — Keep simulation-backed pages on mock (document them)
No reliable free data source, so these stay on `lib/mockData.ts`/`featureData.ts` and are clearly marked in-page ("Simulated data — connect a data provider"): `dark-pool`, `derivatives-heatmap`, `economic-calendar`, `correlation-matrix`, `backtesting`, `risk-calculator` (risk engine can later derive from real OHLCV — noted as enhancement).

### Phase 5 — Cleanup & verification
1. Remove now-unused exports from `mockData.ts`/`featureData.ts` that were only consumed by wired-real pages.
2. Delete `ui-ux-redesign/` folder entirely.
3. Add `.gitattributes` (`* text=auto eol=lf`) to stop CRLF churn.
4. Full `npm run build` + backend smoke test of every new endpoint via `/docs`.

---

### What gets delivered
- **Phase 1:** the entire new emerald/coral design live, all 58 pages + shell + 9 token migrations, compiling and running.
- **Phase 2:** ~13 core pages on real backend data, real streaming AI analyst.
- **Phase 3:** ~25 additional pages on real data via new yfinance endpoints.
- **Phase 4–5:** remaining ~6 pages honestly flagged as simulated; folder deleted; clean build.

### Notes
- This is a large effort. I'll execute phase-by-phase and report after each, so the new UI is visible after Phase 1 before any backend work begins.
- No secrets are moved or overwritten; `backend/.env` and `frontend/.env.local` stay untouched.
- yfinance has rate limits and some data is US-centric; India-specific fields (NSE G-Sec curves, India VIX, IPO GMP) may need a hybrid static+live approach — I'll flag each as I hit it.