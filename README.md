# 📈 MyStocks — NSE Market Intelligence

A serverless, single-page stock analysis tool for the **Indian market (NSE/BSE)**, built with plain HTML, CSS & JavaScript. Designed to run entirely in the browser with no backend server — host it on **GitHub Pages** for free.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 **Authentication** | Local account system (email + password). Per-user data isolation via `localStorage`. |
| 📊 **Live Market Data** | Real-time quotes via Yahoo Finance API with CORS proxy fallback chain. |
| 📉 **Price Charts** | Interactive area/line charts (TradingView Lightweight Charts) with 5D · 1M · 3M · 1Y periods. |
| 👀 **Watchlist** | Add/remove NSE stocks. Watchlist is saved per user and persists across sessions. |
| 🗒️ **Stock Notes** | Auto-saved personal notes per stock, stored in `localStorage`. |
| 🌡️ **Market Heatmap** | Visual sector-wise overview of NSE large-cap stocks. |
| 🌙 **Dark / Light Mode** | Toggle between themes. Preference is saved and restored on next visit. |
| 🔄 **Auto-Refresh** | Dashboard indices and watchlist prices refresh automatically with live data. |
| 📱 **Responsive** | Works on desktop, tablet, and mobile. |

---

## 🚀 Tech Stack

- **Frontend:** Vanilla HTML5 · CSS3 · JavaScript (ES2020+)
- **Styling:** Tailwind CSS (CDN) + Custom CSS Variables for theming
- **Charts:** [Lightweight Charts v4](https://github.com/tradingview/lightweight-charts) by TradingView
- **Icons:** [Lucide](https://lucide.dev/)
- **Data:** Yahoo Finance v8 API (unofficial) via CORS proxies
- **Storage:** `localStorage` (watchlist, notes, auth, theme) · `sessionStorage` (API cache)
- **Hosting:** GitHub Pages (zero config, zero cost)

---

## 🏗️ Project Structure

```
MyStocks/
├── index.html          # App shell — single page
├── css/
│   └── style.css       # Design system, CSS variables, dark/light themes
└── js/
    ├── ui.js           # UI helpers, search, market status, theme toggle
    ├── auth.js         # Local auth (register, login, session management)
    ├── api.js          # Yahoo Finance fetcher with CORS proxy fallback
    ├── charts.js       # LightweightCharts wrappers (area, sparkline)
    ├── dashboard.js    # Dashboard & market heatmap rendering
    ├── watchlist.js    # Per-user watchlist logic
    ├── stock.js        # Stock detail panel (quote, chart, notes)
    └── app.js          # App bootstrap & hash router
```

---

## 🔌 Data & API

All market data is fetched from the **Yahoo Finance public API** (`query1.finance.yahoo.com`) with a 4-level CORS proxy fallback:

1. **Direct** *(GitHub Pages / HTTPS)*
2. **corsproxy.io**
3. **allorigins.win**
4. **thingproxy.freeboard.io**

> ⚠️ This uses Yahoo Finance's **unofficial** API. It is not guaranteed to be stable. For production use, consider a paid data provider like [Alpha Vantage](https://www.alphavantage.co/).

Responses are cached in `sessionStorage` for 90 seconds to avoid hammering the API.

---

## 🔐 Authentication

- **No backend** — credentials are stored in `localStorage` with basic obfuscation (`btoa`).
- Each user gets an isolated watchlist under the key `nse_watchlist_{email}`.
- Session is persisted across page reloads via `localStorage`.

> ⚠️ This is a **demo authentication system** — not suitable for sensitive data. Passwords are not securely hashed.

---

## 🖥️ Running Locally

Just open `index.html` in a browser:

```bash
# Clone the repo
git clone https://github.com/puneethdc99/MyStocks.git
cd MyStocks

# Option 1 — open directly
open index.html        # macOS
start index.html       # Windows

# Option 2 — serve with any static server
npx serve .
```

---

## 🌐 Deploying to GitHub Pages

1. Push the repo to GitHub.
2. Go to **Settings → Pages**.
3. Set source to `main` branch, `/ (root)`.
4. Your app will be live at `https://<username>.github.io/MyStocks/`.

---

## 📸 Screenshots

| Dashboard (Dark) | Stock Detail | Light Mode |
|---|---|---|
| Bloomberg-style dark theme with live indices | Interactive price chart with OHLC data | Full light mode with seamless toggle |

---

## 📋 Roadmap

- [ ] Portfolio tracker (P&L calculation)
- [ ] Price alerts (browser notifications)
- [ ] Export watchlist to CSV
- [ ] Candlestick chart option
- [ ] More indices (Nifty Bank, Nifty IT, etc.)

---

## ⚖️ Disclaimer

> This tool is for **informational and educational purposes only**. Data is sourced from public APIs and may be delayed. **This is not financial advice.** Always consult a qualified financial advisor before making investment decisions.

---

## 👤 Author

Built by **[puneethdc99](https://github.com/puneethdc99)**

---

*MyStocks v1.0.0 — Zero backend. Zero cost. Pure browser.*
