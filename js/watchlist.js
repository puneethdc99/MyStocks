/* ═══════════════════════════════════════════
   watchlist.js — Watchlist Management
   Persists stock list in localStorage.
═══════════════════════════════════════════ */
const Watchlist = (() => {
  const KEY = 'nse_watchlist';
  let _list = [];
  let _searchTimer = null;

  /* ── Load from localStorage ── */
  function load() {
    try { _list = JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { _list = []; }
    return _list;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(_list));
    updateBadge();
  }

  function getList() { return [..._list]; }

  function has(symbol) { return _list.includes(symbol); }

  function add(symbol) {
    symbol = symbol.toUpperCase();
    if (!_list.includes(symbol)) {
      _list.push(symbol);
      save();
      UI.showToast(`${symbol.replace('.NS', '')} added to watchlist`, 'success');
      renderWatchlist();
    }
  }

  function remove(symbol) {
    _list = _list.filter(s => s !== symbol);
    save();
    UI.showToast(`${symbol.replace('.NS', '')} removed`, 'info');
    renderWatchlist();
  }

  function toggle(symbol) { has(symbol) ? remove(symbol) : add(symbol); }

  function updateBadge() {
    const badge = document.getElementById('watchlist-badge');
    if (!badge) return;
    if (_list.length > 0) {
      badge.textContent = _list.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  /* ── Render Watchlist Grid ── */
  async function renderWatchlist(forceRefresh = false) {
    load();
    const grid = document.getElementById('watchlist-grid');
    const empty = document.getElementById('watchlist-empty');
    if (!grid) return;

    updateBadge();

    if (_list.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');

    // Skeleton placeholders
    grid.innerHTML = _list.map(s => `
      <div class="stock-card" id="wl-card-${s.replace(/[^A-Z0-9]/g, '_')}">
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="skeleton-block h-5 w-24 rounded mb-1"></div>
            <div class="skeleton-block h-3 w-32 rounded"></div>
          </div>
          <div class="skeleton-block h-6 w-14 rounded-lg"></div>
        </div>
        <div class="skeleton-block h-4 w-20 rounded mt-2"></div>
        <div class="skeleton-block h-9 w-full rounded mt-2"></div>
      </div>`).join('');

    // Fetch data (forceRefresh bypasses cache and busts upstream CDN)
    const quotes = await API.fetchMultipleQuotes(_list, forceRefresh);

    // Render cards + sparklines
    await Promise.all(quotes.map(async (q, i) => {
      const sym = _list[i];
      let hist = [];
      try { hist = await API.fetchHistory(sym, '5d', forceRefresh); } catch { }
      renderCard(q, hist);
    }));
  }

  function renderCard(q, history = []) {
    const sym = q.symbol;
    const id = sym.replace(/[^A-Z0-9]/g, '_');
    const card = document.getElementById(`wl-card-${id}`);
    if (!card) return;

    const isPos = q.changePct >= 0;
    const priceStr = API.formatPrice(q.price);
    const chgStr = (isPos ? '+' : '') + q.changePct.toFixed(2) + '%';
    const mockTag = q.isMock ? '<span class="text-xs text-text-muted ml-1">(sample)</span>' : '';

    card.innerHTML = `
      <div class="flex items-start justify-between mb-2">
        <div class="min-w-0 flex-1 cursor-pointer" onclick="App.openStock('${sym}')">
          <p class="font-bold text-base">${sym.replace('.NS', '')}</p>
          <p class="text-xs text-text-muted truncate">${q.shortName}</p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0 ml-2">
          <span class="${isPos ? 'badge-gain' : 'badge-loss'}">${chgStr}</span>
          <button onclick="Watchlist.remove('${sym}')" 
                  class="text-text-muted hover:text-loss transition-colors ml-1" title="Remove">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div class="cursor-pointer" onclick="App.openStock('${sym}')">
        <p class="text-xl font-bold ${isPos ? 'text-gain' : 'text-loss'}">${priceStr}${mockTag}</p>
        <p class="text-xs text-text-muted mt-0.5">
          H: ${API.formatPrice(q.high)} · L: ${API.formatPrice(q.low)} · Vol: ${API.formatVolume(q.volume)}
        </p>
        <div class="sparkline-container wl-sparkline" id="spark-${id}"></div>
      </div>`;

    // Render sparkline
    if (history.length > 1) {
      setTimeout(() => Charts.renderSparkline(`spark-${id}`, history, isPos), 50);
    }
  }

  /* ── Search input in watchlist add panel ── */
  function handleSearchInput(query) {
    clearTimeout(_searchTimer);
    const resultsEl = document.getElementById('watchlist-search-results');
    if (!resultsEl) return;

    if (!query || query.trim().length < 1) {
      resultsEl.innerHTML = '';
      return;
    }

    _searchTimer = setTimeout(() => {
      const q = query.toUpperCase().trim();
      const matches = UI.POPULAR.filter(s =>
        s.symbol.replace('.NS', '').includes(q) ||
        s.label.toUpperCase().includes(q)
      ).slice(0, 10);

      if (!matches.length) {
        resultsEl.innerHTML = `<p class="text-text-muted text-sm px-2 py-2">No results found</p>`;
        return;
      }

      resultsEl.innerHTML = matches.map(s => {
        const sym = s.symbol;
        const inList = has(sym);
        return `
          <div class="search-item rounded-lg mb-1">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold">${sym.replace('.NS', '')}</p>
              <p class="text-xs text-text-muted truncate">${s.label}</p>
            </div>
            <button onclick="Watchlist.${inList ? 'remove' : 'add'}('${sym}')"
                    class="${inList ? 'btn-danger' : 'btn-primary'} text-xs px-3 py-1.5 gap-1">
              ${inList
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Remove'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add'}
            </button>
          </div>`;
      }).join('');
    }, 250);
  }

  /* ── Manual Refresh (clears cache, forces live fetch) ── */
  async function refresh() {
    const btn = document.getElementById('watchlist-refresh-btn');
    if (btn) { btn.disabled = true; btn.querySelector('svg')?.classList.add('animate-spin'); }
    API.clearCache();
    UI.showToast('Refreshing watchlist prices…', 'info', 2000);
    await renderWatchlist(true);
    UI.showToast('Watchlist updated ✓', 'success', 2500);
    if (btn) { btn.disabled = false; btn.querySelector('svg')?.classList.remove('animate-spin'); }
  }

  /* ── Init ── */
  function init() {
    load();
    updateBadge();
  }

  return {
    init, load, save, getList, has,
    add, remove, toggle,
    renderWatchlist, refresh, handleSearchInput, updateBadge
  };
})();
