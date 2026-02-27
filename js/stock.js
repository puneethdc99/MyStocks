/* ═══════════════════════════════════════════
   stock.js — Stock Detail Panel
   Price, OHLC, Chart, Notes (localStorage)
═══════════════════════════════════════════ */
const Stock = (() => {
    let _symbol = null;
    let _quote = null;
    let _range = '5d';
    let _retryTimer = null;   // polling timer handle

    const NOTES_PREFIX = 'nse_notes_';

    /* ── Open Stock Detail ── */
    async function open(symbol) {
        _symbol = symbol;
        _range = '5d';
        UI.showSection('stock');
        _resetSkeletons();

        // Load notes immediately
        const savedNote = localStorage.getItem(NOTES_PREFIX + symbol) || '';
        const notesEl = document.getElementById('stock-notes');
        if (notesEl) notesEl.value = savedNote;

        // Set active period button
        ['5d', '1mo', '3mo', '1y'].forEach(r => {
            document.getElementById(`period-${r}`)?.classList.toggle('active', r === '5d');
        });

        // Fetch quote
        try {
            _quote = await API.fetchQuote(symbol);
            _renderQuote(_quote);
        } catch {
            _quote = API.getMockQuote(symbol);
            _renderQuote(_quote);
        }

        // Start chart: click 5D button, then keep retrying until the canvas appears.
        _triggerChartWithRetry();

        // Update watchlist toggle button
        _updateWatchlistBtn();
    }

    /* ── Chart trigger with retry ──
       Clicks the 5D button immediately, then polls every 500ms.
       If no <canvas> appears within the poll window, clicks again.
       Stops once the chart canvas exists OR after 15 s (30 tries). */
    function _triggerChartWithRetry() {
        // Cancel any previous retry loop (e.g. user opened a new stock fast)
        if (_retryTimer) clearInterval(_retryTimer);

        // Immediate first attempt
        document.getElementById('period-5d')?.click();

        let tries = 0;
        _retryTimer = setInterval(() => {
            const container = document.getElementById('stock-chart-container');
            const hasCanvas = container && container.querySelector('canvas');
            tries++;
            if (hasCanvas || tries >= 30) {
                clearInterval(_retryTimer);
                _retryTimer = null;
                return;
            }
            // No chart yet — re-click the 5D button
            document.getElementById('period-5d')?.click();
        }, 500);
    }

    function _resetSkeletons() {
        const header = document.getElementById('stock-header-info');
        if (header) header.innerHTML = '<div class="skeleton-block h-7 w-40 rounded-lg"></div>';

        ['sk-price', 'sk-change'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.className = 'skeleton-block h-10 w-32 rounded-lg';
        });
        ['stock-open', 'stock-high', 'stock-low', 'stock-close', 'stock-volume', 'stock-52high', 'stock-52low', 'stock-mktcap']
            .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
    }

    function _renderQuote(q) {
        if (!q) return;
        const isPos = q.changePct >= 0;

        // Header
        const header = document.getElementById('stock-header-info');
        if (header) header.innerHTML = `
      <h2 class="text-xl font-bold">${q.symbol.replace('.NS', '').replace('^', '')}</h2>
      <p class="text-text-muted text-sm">${q.shortName}${q.isMock ? ' · <span class="text-xs">sample data</span>' : ''}</p>`;

        // Price
        const skPrice = document.getElementById('sk-price');
        if (skPrice) {
            skPrice.className = `text-3xl font-bold ${isPos ? 'text-gain' : 'text-loss'}`;
            skPrice.id = 'sk-price';
            skPrice.textContent = API.formatPrice(q.price);
        }

        // Change
        const skChange = document.getElementById('sk-change');
        if (skChange) {
            skChange.className = `text-xl font-semibold ${isPos ? 'text-gain' : 'text-loss'}`;
            skChange.id = 'sk-change';
            skChange.textContent = `${isPos ? '+' : ''}${q.change.toFixed(2)} (${isPos ? '+' : ''}${q.changePct.toFixed(2)}%)`;
        }

        // OHLC
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('stock-open', API.formatPrice(q.open));
        set('stock-high', API.formatPrice(q.high));
        set('stock-low', API.formatPrice(q.low));
        set('stock-close', API.formatPrice(q.prev));
        set('stock-volume', API.formatVolume(q.volume));
        set('stock-52high', q.weekHigh52 ? API.formatPrice(q.weekHigh52) : '—');
        set('stock-52low', q.weekLow52 ? API.formatPrice(q.weekLow52) : '—');
        set('stock-mktcap', q.marketCap ? API.formatMktCap(q.marketCap) : '—');
    }

    async function _renderChart(symbol, range) {
        const container = document.getElementById('stock-chart-container');
        if (!container) return;

        // Show overlay while loading (don't wipe container.innerHTML — LWC owns it)
        let overlay = document.getElementById('stock-chart-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'stock-chart-overlay';
            overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:10';
            overlay.innerHTML = '<div class="skeleton-block" style="position:absolute;inset:0;border-radius:8px"></div>';
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
        overlay.style.display = 'flex';

        try {
            const data = await API.fetchHistory(symbol, range);
            overlay.style.display = 'none';

            if (!data || !data.length) {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:.875rem">No chart data</div>';
                return;
            }

            const isPos = data.length > 1 ? data[data.length - 1].close >= data[0].close : true;
            const chart = Charts.renderAreaChart('stock-chart-container', data, isPos);

            // Force correct dimensions immediately after creation
            if (chart) {
                chart.applyOptions({
                    width: container.clientWidth || 696,
                    height: container.clientHeight || 300,
                });
                chart.timeScale().fitContent();
            }
        } catch (err) {
            console.error('[Chart]', err);
            if (overlay) overlay.style.display = 'none';
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:.875rem">Chart unavailable</div>';
        }
    }

    /* ── Period change (called by HTML button onclick) ── */
    async function setRange(range) {
        _range = range;
        ['5d', '1mo', '3mo', '1y'].forEach(r => {
            document.getElementById(`period-${r}`)?.classList.toggle('active', r === range);
        });
        if (_symbol) await _renderChart(_symbol, range);
    }

    /* ── Watchlist toggle ── */
    function toggleWatchlist() {
        if (!_symbol) return;
        Watchlist.toggle(_symbol);
        _updateWatchlistBtn();
        if (document.getElementById('section-watchlist')?.classList.contains('active')) {
            Watchlist.renderWatchlist();
        }
    }

    function _updateWatchlistBtn() {
        if (!_symbol) return;
        const inList = Watchlist.has(_symbol);
        const btn = document.getElementById('watchlist-toggle-btn');
        const btnText = document.getElementById('watchlist-toggle-text');
        if (!btn || !btnText) return;
        btnText.textContent = inList ? 'In Watchlist' : 'Add to Watchlist';
        btn.className = inList
            ? 'btn-secondary text-sm gap-2 border-gain/40 text-gain'
            : 'btn-secondary text-sm gap-2';
    }

    /* ── Notes ── */
    let _notesTimer = null;
    function saveNotes() {
        clearTimeout(_notesTimer);
        _notesTimer = setTimeout(() => {
            if (!_symbol) return;
            const notesEl = document.getElementById('stock-notes');
            if (!notesEl) return;
            localStorage.setItem(NOTES_PREFIX + _symbol, notesEl.value);
            const label = document.getElementById('notes-saved-label');
            if (label) { label.textContent = 'Saved ✓'; setTimeout(() => { label.textContent = 'Auto-saved'; }, 2000); }
        }, 500);
    }

    function getCurrentSymbol() { return _symbol; }

    return { open, setRange, toggleWatchlist, saveNotes, getCurrentSymbol };
})();
