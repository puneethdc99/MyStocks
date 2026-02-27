/* ═══════════════════════════════════════════
   api.js — NSE Market Data Service
   Yahoo Finance v8 API + timestamp cache-bust.
   NSE: symbol + ".NS"  |  BSE: symbol + ".BO"
═══════════════════════════════════════════ */
const API = (() => {
    const CACHE_PREFIX = 'nse_cache_';
    const CACHE_TTL = 90 * 1000; // 90 seconds — short enough to feel live

    /* ────────────────────────────────────────
       The single most important fix:
       Append _t=<epoch-ms> to every URL so that
       Yahoo Finance CDN AND every proxy treats
       each request as brand-new, never returning
       a stale cached response.
    ──────────────────────────────────────── */
    const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';

    function buildUrls(symbol, params, bust) {
        // bust = unique timestamp string; makes each URL unique to force fresh fetch
        const yfUrl = `${YF_BASE}${encodeURIComponent(symbol)}?${params}&_t=${bust}`;
        const isLocal = location.protocol === 'file:';
        return [
            // 1. Direct — works on GitHub Pages / HTTPS; skipped on file:// (CORS blocked)
            ...(isLocal ? [] : [yfUrl]),
            // 2. corsproxy.io
            `https://corsproxy.io/?${encodeURIComponent(yfUrl)}`,
            // 3. allorigins.win
            `https://api.allorigins.win/raw?url=${encodeURIComponent(yfUrl)}`,
            // 4. thingproxy
            `https://thingproxy.freeboard.io/fetch/${yfUrl}`,
        ];
    }

    /* ── sessionStorage cache (short TTL) ── */
    function cacheGet(key) {
        try {
            const raw = sessionStorage.getItem(CACHE_PREFIX + key);
            if (!raw) return null;
            const { data, ts } = JSON.parse(raw);
            if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_PREFIX + key); return null; }
            return data;
        } catch { return null; }
    }

    function cacheSet(key, data) {
        try { sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() })); }
        catch { /* quota full */ }
    }

    // Called on manual Refresh — wipes the short-TTL cache too
    function clearCache() {
        const toDelete = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith(CACHE_PREFIX)) toDelete.push(k);
        }
        toDelete.forEach(k => sessionStorage.removeItem(k));
    }

    /* ── Core fetch with upstream cache-bust ── */
    async function fetchWithFallback(cacheKey, symbol, params, bypassCache = false) {
        // Only use our short-TTL cache on auto-refresh; skip on manual refresh
        if (!bypassCache) {
            const cached = cacheGet(cacheKey);
            if (cached) return cached;
        }

        // Unique timestamp → every URL is unique → no CDN/proxy cache hit
        const bust = Date.now();
        const urls = buildUrls(symbol, params, bust);
        let lastErr = null;

        for (const url of urls) {
            try {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), 5000);

                const res = await fetch(url, {
                    signal: ctrl.signal,
                    // 'reload' instructs the browser HTTP cache to bypass and revalidate
                    cache: 'reload',
                    headers: { 'Accept': 'application/json' },
                });
                clearTimeout(timer);

                if (!res.ok) { lastErr = new Error(`HTTP ${res.status} from ${url}`); continue; }

                let json;
                try { json = await res.json(); } catch { const t = await res.clone().text(); try { json = JSON.parse(t); } catch { lastErr = new Error('Bad JSON'); continue; } }

                if (!json?.chart?.result?.[0]) { lastErr = new Error('Unexpected shape'); continue; }

                cacheSet(cacheKey, json);        // cache the successful response
                return json;
            } catch (err) {
                lastErr = err;
                // network error or abort → try next proxy
            }
        }

        throw lastErr || new Error('All endpoints failed');
    }

    /* ══════════════════════════════════════
       Public API Methods
    ══════════════════════════════════════ */

    async function fetchQuote(symbol, forceRefresh = false) {
        const cacheKey = `quote_${symbol}`;
        try {
            const json = await fetchWithFallback(cacheKey, symbol, 'interval=1d&range=1d', forceRefresh);
            const meta = json.chart.result[0].meta;
            return parseQuote(meta, symbol);
        } catch (err) {
            console.warn(`[API] fetchQuote failed for ${symbol}:`, err.message);
            return getMockQuote(symbol);
        }
    }

    function parseQuote(meta, symbol) {
        const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
        const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - prev;
        const changePct = prev ? (change / prev) * 100 : 0;

        // Yahoo gives regularMarketTime as a Unix epoch (seconds)
        const marketTs = meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now();
        const marketDate = new Date(marketTs);
        // Format as HH:MM in IST
        const asOf = marketDate.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
        });

        return {
            symbol,
            shortName: meta.shortName || symbol.replace('.NS', '').replace('^', ''),
            price: +price.toFixed(2),
            change: +change.toFixed(2),
            changePct: +changePct.toFixed(2),
            open: meta.regularMarketOpen ?? price,
            high: meta.regularMarketDayHigh ?? price,
            low: meta.regularMarketDayLow ?? price,
            prev: +prev.toFixed(2),
            volume: meta.regularMarketVolume ?? 0,
            weekHigh52: meta.fiftyTwoWeekHigh ?? null,
            weekLow52: meta.fiftyTwoWeekLow ?? null,
            marketCap: meta.marketCap ?? null,
            currency: meta.currency || 'INR',
            asOf,          // "HH:MM" string — show on cards
            isMock: false,
            timestamp: Date.now(),
        };
    }

    async function fetchHistory(symbol, range = '5d', forceRefresh = false) {
        const intervalMap = { '5d': '15m', '1mo': '1h', '3mo': '1d', '1y': '1wk' };
        const intv = intervalMap[range] || '1d';
        const params = `interval=${intv}&range=${range}`;
        const cacheKey = `history_${symbol}_${range}`;

        try {
            const json = await fetchWithFallback(cacheKey, symbol, params, forceRefresh);
            const result = json.chart.result[0];
            const times = result.timestamp || [];
            const q0 = result.indicators?.quote?.[0] || {};

            return times.map((t, i) => ({
                time: t,
                open: +(q0.open?.[i] || q0.close?.[i] || 0).toFixed(2),
                high: +(q0.high?.[i] || q0.close?.[i] || 0).toFixed(2),
                low: +(q0.low?.[i] || q0.close?.[i] || 0).toFixed(2),
                close: +(q0.close?.[i] || 0).toFixed(2),
                value: +(q0.close?.[i] || 0).toFixed(2),
            })).filter(d => d.close > 0);
        } catch (err) {
            console.warn(`[API] fetchHistory failed for ${symbol}:`, err.message);
            return getMockHistory(symbol, range);
        }
    }

    async function fetchMarketIndices(forceRefresh = false) {
        const indices = ['^NSEI', '^BSESN', '^NSMIDCP'];
        const results = await Promise.allSettled(indices.map(s => fetchQuote(s, forceRefresh)));
        return results.map((r, i) => r.status === 'fulfilled' ? r.value : getMockQuote(indices[i]));
    }

    async function fetchMultipleQuotes(symbols, forceRefresh = false) {
        const results = await Promise.allSettled(symbols.map(s => fetchQuote(s, forceRefresh)));
        return results.map((r, i) => r.status === 'fulfilled' ? r.value : getMockQuote(symbols[i]));
    }

    /* ══════════════════════════════════════
       Mock / Fallback Data
    ══════════════════════════════════════ */
    function getMockQuote(symbol) {
        const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const rand = (min, max) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min);
        const base = {
            '^NSEI': { n: 'NIFTY 50', p: 22350, c: 0.56 },
            '^BSESN': { n: 'BSE SENSEX', p: 73750, c: 0.56 },
            '^NSMIDCP': { n: 'NIFTY MidCap', p: 10850, c: -0.78 },
            'RELIANCE.NS': { n: 'Reliance Ind.', p: 2890, c: 0.99 },
            'TCS.NS': { n: 'TCS', p: 3450, c: -0.64 },
            'HDFCBANK.NS': { n: 'HDFC Bank', p: 1640, c: 0.76 },
            'INFY.NS': { n: 'Infosys', p: 1520, c: -0.58 },
            'ICICIBANK.NS': { n: 'ICICI Bank', p: 1080, c: 1.43 },
        };
        const m = base[symbol] || { n: symbol.replace('.NS', '').replace('^', ''), p: 1000 + rand(0, 2000), c: rand(-2, 2) };
        const p = m.p;
        const chg = (p * m.c / 100);
        const now = new Date();
        const asOf = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
        return {
            symbol, shortName: m.n,
            price: +p.toFixed(2), change: +chg.toFixed(2), changePct: +m.c.toFixed(2),
            open: +(p * 0.995).toFixed(2), high: +(p * 1.012).toFixed(2),
            low: +(p * 0.988).toFixed(2), prev: +(p - chg).toFixed(2),
            volume: 3500000, weekHigh52: +(p * 1.28).toFixed(2), weekLow52: +(p * 0.72).toFixed(2),
            marketCap: null, currency: 'INR', asOf, isMock: true, timestamp: Date.now(),
        };
    }

    function getMockHistory(symbol, range) {
        const counts = { '5d': 50, '1mo': 30, '3mo': 90, '1y': 52 };
        const steps = { '5d': 900, '1mo': 3600, '3mo': 86400, '1y': 604800 };
        const n = counts[range] || 30, step = steps[range] || 86400;
        const now = Math.floor(Date.now() / 1000);
        let price = 2000 + Math.random() * 1500;
        return Array.from({ length: n }, (_, i) => {
            price += (Math.random() - 0.48) * 25;
            return {
                time: now - (n - i) * step,
                open: +(price).toFixed(2),
                high: +(price + Math.random() * 18).toFixed(2),
                low: +(price - Math.random() * 18).toFixed(2),
                close: +(price + (Math.random() - 0.5) * 8).toFixed(2),
                value: +(price).toFixed(2),
            };
        });
    }

    /* ══════════════════════════════════════
       Format Helpers
    ══════════════════════════════════════ */
    const fmt = (p) => p == null || isNaN(p) ? '—'
        : '₹' + (+p).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function formatPrice(p) { return fmt(p); }
    function formatVolume(v) {
        if (!v) return '—';
        if (v >= 1e7) return (v / 1e7).toFixed(2) + ' Cr';
        if (v >= 1e5) return (v / 1e5).toFixed(2) + ' L';
        return v.toLocaleString('en-IN');
    }
    function formatMktCap(mc) {
        if (!mc) return '—';
        if (mc >= 1e12) return '₹' + (mc / 1e12).toFixed(2) + ' T';
        if (mc >= 1e9) return '₹' + (mc / 1e9).toFixed(2) + '  B';
        return '₹' + (mc / 1e6).toFixed(2) + ' M';
    }

    return {
        fetchQuote, fetchHistory, fetchMarketIndices, fetchMultipleQuotes,
        getMockQuote, getMockHistory, clearCache,
        formatPrice, formatVolume, formatMktCap,
    };
})();
