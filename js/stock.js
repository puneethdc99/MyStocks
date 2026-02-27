/* ═══════════════════════════════════════════
   stock.js — Stock Detail Panel
   Price, OHLC, Chart, Notes (localStorage)
═══════════════════════════════════════════ */
const Stock = (() => {
    let _symbol = null;
    let _quote = null;
    let _range = '5d';

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

        // Fetch & render chart
        _renderChart(symbol, '5d');

        // Update watchlist toggle button
        _updateWatchlistBtn();
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
        document.getElementById('stock-open')?.(() => { })();
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
        container.innerHTML = `<div class="flex items-center justify-center h-full"><div class="skeleton-block w-full h-full rounded-lg" style="height:300px"></div></div>`;

        try {
            const data = await API.fetchHistory(symbol, range);
            const isPos = data.length > 1 ? data[data.length - 1].close >= data[0].close : true;
            container.innerHTML = '';

            // Use candlestick for longer ranges, area for short
            if (range === '5d' || range === '1mo') {
                Charts.renderAreaChart('stock-chart-container', data, isPos);
            } else {
                Charts.renderCandlestickChart('stock-chart-container', data);
            }
        } catch (err) {
            container.innerHTML = `<div class="flex items-center justify-center h-full text-text-muted text-sm">Chart unavailable</div>`;
        }
    }

    /* ── Period change ── */
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
        if (document.getElementById('section-watchlist').classList.contains('active')) {
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
