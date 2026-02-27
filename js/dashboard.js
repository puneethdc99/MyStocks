/* ═══════════════════════════════════════════
   dashboard.js — Market Overview Dashboard
   Shows NIFTY 50, SENSEX, Top Gainers/Losers
═══════════════════════════════════════════ */
const Dashboard = (() => {
  let _refreshTimer = null;

  const NSE50 = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
    'SBIN.NS', 'BHARTIARTL.NS', 'LT.NS', 'KOTAKBANK.NS', 'AXISBANK.NS',
    'BAJFINANCE.NS', 'WIPRO.NS', 'HCLTECH.NS', 'MARUTI.NS', 'TITAN.NS',
    'ASIANPAINT.NS', 'NTPC.NS', 'POWERGRID.NS', 'ONGC.NS', 'COALINDIA.NS',
    'TATAMOTORS.NS', 'TATASTEEL.NS', 'JSWSTEEL.NS', 'ITC.NS', 'M&M.NS',
  ];

  const SECTORS = [
    { name: 'IT & Tech', stocks: ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS'] },
    { name: 'Banking', stocks: ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'] },
    { name: 'Energy', stocks: ['RELIANCE.NS', 'ONGC.NS', 'BPCL.NS', 'NTPC.NS', 'POWERGRID.NS'] },
    { name: 'Auto', stocks: ['MARUTI.NS', 'TATAMOTORS.NS', 'M&M.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS'] },
    { name: 'Pharma', stocks: ['SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'APOLLOHOSP.NS'] },
    { name: 'FMCG', stocks: ['HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'TATACONSUM.NS'] },
    { name: 'Metals', stocks: ['TATASTEEL.NS', 'JSWSTEEL.NS', 'COALINDIA.NS', 'HINDALCO.NS', 'VEDL.NS'] },
    { name: 'Telecom', stocks: ['BHARTIARTL.NS', 'JIOFIN.NS'] },
  ];

  /* ── Format price ── */
  function fmtPrice(p) { return '₹' + (+p).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  /* ── Render Index Cards (NIFTY, SENSEX, MidCap) ── */
  async function renderIndexCards(forceRefresh = false) {
    const container = document.getElementById('index-cards');
    if (!container) return;

    // Skeleton
    const indexDef = [
      { label: 'NIFTY 50', sym: '^NSEI', desc: 'NSE Large Cap Index' },
      { label: 'BSE SENSEX', sym: '^BSESN', desc: 'BSE 30 Blue-Chip Index' },
      { label: 'NIFTY MidCap', sym: '^NSMIDCP', desc: 'NSE Mid Cap Index' },
    ];

    container.innerHTML = indexDef.map(d => `
      <div class="index-card glass-card rounded-xl p-5 animate-fade-in" id="idx-card-${d.sym.replace(/[^A-Z0-9]/g, '_')}">
        <p class="text-xs text-text-muted mb-1 font-medium">${d.desc}</p>
        <p class="text-base font-semibold mb-1">${d.label}</p>
        <div class="skeleton-block h-8 w-32 rounded mb-2"></div>
        <div class="skeleton-block h-4 w-24 rounded mb-3"></div>
        <div class="sparkline-container h-10" id="idx-spark-${d.sym.replace(/[^A-Z0-9]/g, '_')}"></div>
      </div>`).join('');

    // Fetch (forceRefresh bypasses 4-min sessionStorage cache)
    const quotes = await API.fetchMarketIndices(forceRefresh);
    const hists = await Promise.allSettled(
      ['^NSEI', '^BSESN', '^NSMIDCP'].map(s => API.fetchHistory(s, '5d', forceRefresh))
    );

    quotes.forEach((q, i) => {
      const def = indexDef[i];
      const key = def.sym.replace(/[^A-Z0-9]/g, '_');
      const card = document.getElementById(`idx-card-${key}`);
      if (!card) return;

      const isPos = q.changePct >= 0;
      const hist = hists[i].status === 'fulfilled' ? hists[i].value : [];
      const mockTag = q.isMock ? '<span class="text-xs text-text-muted ml-1">(sample)</span>' : '';
      const asOfTag = q.asOf ? `<span class="text-xs text-text-muted ml-auto">as of ${q.asOf}</span>` : '';

      card.className = `index-card glass-card rounded-xl p-5 animate-fade-in ${isPos ? 'gain-card' : 'loss-card'}`;
      card.innerHTML = `
        <div class="flex items-center justify-between mb-0.5">
          <p class="text-xs text-text-muted font-medium">${def.desc}</p>
          ${asOfTag}
        </div>
        <p class="text-base font-semibold mb-1">${def.label}</p>
        <p class="text-2xl font-bold mb-1 ${isPos ? 'text-gain' : 'text-loss'}">${fmtPrice(q.price)}${mockTag}</p>
        <p class="text-sm font-medium ${isPos ? 'text-gain' : 'text-loss'}">
          ${isPos ? '▲' : '▼'} ${Math.abs(q.change).toFixed(2)} (${isPos ? '+' : ''}${q.changePct.toFixed(2)}%)
        </p>
        <div class="sparkline-container h-10 mt-2" id="idx-spark-${key}"></div>`;

      if (hist.length > 1) setTimeout(() => Charts.renderSparkline(`idx-spark-${key}`, hist, isPos), 50);

      // Update header pills
      if (def.sym === '^NSEI') updateHeaderPill('header-nifty', q);
      if (def.sym === '^BSESN') updateHeaderPill('header-sensex', q);
    });
  }


  function updateHeaderPill(id, q) {
    const pill = document.getElementById(id);
    if (!pill) return;
    const isPos = q.changePct >= 0;
    const label = id.includes('nifty') ? 'NIFTY' : 'SENSEX';
    pill.innerHTML = `
      <span class="text-xs text-text-muted">${label}</span>
      <span class="text-sm font-bold ${isPos ? 'text-gain' : 'text-loss'}">
        ${q.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </span>
      <span class="text-xs ${isPos ? 'text-gain' : 'text-loss'}">${isPos ? '+' : ''}${q.changePct.toFixed(2)}%</span>`;
  }

  /* ── Top Gainers / Losers ── */
  async function renderMovers(forceRefresh = false) {
    const gainerEl = document.getElementById('top-gainers');
    const loserEl = document.getElementById('top-losers');
    if (!gainerEl || !loserEl) return;

    // Skeleton rows
    const skRow = () => `<div class="mover-row"><div class="skeleton-block h-4 flex-1 rounded"></div><div class="skeleton-block h-4 w-16 rounded ml-2"></div></div>`;
    gainerEl.innerHTML = Array(5).fill(skRow()).join('');
    loserEl.innerHTML = Array(5).fill(skRow()).join('');

    const sample = NSE50.slice(0, 15);
    const quotes = await API.fetchMultipleQuotes(sample, forceRefresh);
    const sorted = [...quotes].sort((a, b) => b.changePct - a.changePct);

    const gainers = sorted.filter(q => q.changePct >= 0).slice(0, 5);
    const losers = sorted.filter(q => q.changePct < 0).slice(-5).reverse();

    gainerEl.innerHTML = gainers.length
      ? gainers.map(q => moverRow(q, true)).join('')
      : '<p class="text-text-muted text-sm px-2">No gainers today</p>';

    loserEl.innerHTML = losers.length
      ? losers.map(q => moverRow(q, false)).join('')
      : '<p class="text-text-muted text-sm px-2">No losers today</p>';
  }

  function moverRow(q, isGain) {
    const chgStr = (isGain ? '+' : '') + q.changePct.toFixed(2) + '%';
    return `
      <div class="mover-row" onclick="App.openStock('${q.symbol}')">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" 
             style="background:${isGain ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; 
                    color:${isGain ? '#22c55e' : '#ef4444'}">
          ${q.symbol.replace('.NS', '').slice(0, 2)}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold truncate">${q.symbol.replace('.NS', '')}</p>
          <p class="text-xs text-text-muted truncate">${q.shortName}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-sm font-semibold">${API.formatPrice(q.price)}</p>
          <span class="${isGain ? 'badge-gain' : 'badge-loss'} text-xs">${chgStr}</span>
        </div>
      </div>`;
  }

  /* ── Market Heatmap ── */
  async function renderHeatmap() {
    const container = document.getElementById('market-heatmap');
    if (!container) return;

    container.innerHTML = SECTORS.map(s => `
      <div class="heatmap-cell glass-card" id="hm-${s.name.replace(/\s/g, '_')}">
        <p class="text-xs text-text-muted mb-1">${s.name}</p>
        <div class="skeleton-block h-6 w-20 rounded"></div>
        <div class="skeleton-block h-4 w-14 rounded mt-1"></div>
      </div>`).join('');

    await Promise.all(SECTORS.map(async (sector) => {
      const quotes = await API.fetchMultipleQuotes(sector.stocks.slice(0, 3));
      const avgChg = quotes.reduce((acc, q) => acc + q.changePct, 0) / quotes.length;
      const isPos = avgChg >= 0;
      const heatId = sector.name.replace(/\s/g, '_');
      const cell = document.getElementById(`hm-${heatId}`);
      if (!cell) return;

      // Intensity based on change magnitude (0-3%)
      const intensity = Math.min(Math.abs(avgChg) / 3, 1);
      const bg = isPos
        ? `rgba(34,197,94,${0.05 + intensity * 0.3})`
        : `rgba(239,68,68,${0.05 + intensity * 0.3})`;
      const border = isPos ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';

      cell.style.background = bg;
      cell.style.borderColor = border;
      cell.innerHTML = `
        <p class="text-xs font-medium opacity-80">${sector.name}</p>
        <p class="text-base font-bold ${isPos ? 'text-gain' : 'text-loss'} mt-1">
          ${isPos ? '+' : ''}${avgChg.toFixed(2)}%
        </p>
        <p class="text-xs text-text-muted mt-1">${sector.stocks.length} stocks</p>`;
    }));
  }

  /* ── Full Refresh ── */
  /* manualRefresh=true → clears cache so we always get fresh prices */
  async function refresh(manualRefresh = false) {
    const btn = document.getElementById('refresh-btn');
    if (btn) { btn.disabled = true; btn.querySelector('svg')?.classList.add('animate-spin'); }

    if (manualRefresh) {
      API.clearCache();
      UI.showToast('Fetching latest prices…', 'info', 2000);
    }

    await Promise.all([renderIndexCards(manualRefresh), renderMovers(manualRefresh)]);

    const ts = document.getElementById('last-updated');
    if (ts) {
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      ts.textContent = `Last updated: ${nowIST.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST`;
    }

    if (manualRefresh) UI.showToast('Data refreshed ✓', 'success', 2500);
    if (btn) { btn.disabled = false; btn.querySelector('svg')?.classList.remove('animate-spin'); }
  }

  /* ── Auto Refresh ── */
  function startAutoRefresh() {
    stopAutoRefresh();
    _refreshTimer = setInterval(() => refresh(), 60000); // every 60s
  }

  function stopAutoRefresh() {
    if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
  }

  /* ── Init ── */
  async function init() {
    await refresh();
    startAutoRefresh();
  }

  return { init, refresh, renderHeatmap, stopAutoRefresh };
})();
