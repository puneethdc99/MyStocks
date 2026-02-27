/* ═══════════════════════════════════════════
   ui.js — UI utilities, sidebar, toasts,
   search, skeleton loaders, market clock
═══════════════════════════════════════════ */
const UI = (() => {
  /* ── Sidebar ── */
  function openSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    sb.classList.add('open');
    ov.classList.remove('hidden');
  }

  function closeSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    sb.classList.remove('open');
    ov.classList.add('hidden');
  }

  /* ── Section Router ── */
  function showSection(name) {
    document.querySelectorAll('.app-section').forEach(el => {
      el.classList.remove('active');
    });
    const target = document.getElementById(`section-${name}`);
    if (target) { target.classList.add('active'); }

    // Update nav highlight
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active', a.dataset.section === name);
    });
  }

  /* ── Toast Notifications ── */
  function showToast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const iconMap = { success: 'check-circle', error: 'alert-circle', info: 'info' };
    const icon = iconMap[type] || 'info';

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <i data-lucide="${icon}" style="width:16px;height:16px;flex-shrink:0;"></i>
      <span>${msg}</span>
    `;
    container.appendChild(el);
    if (window.lucide) lucide.createIcons({ el });

    setTimeout(() => {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 320);
    }, duration);
  }

  /* ── Skeleton helpers ── */
  function showSkeleton(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.classList.add('skeleton-block');
  }

  function hideSkeleton(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.classList.remove('skeleton-block');
  }

  /* ── Global Search ── */
  const POPULAR = [
    { symbol: 'RELIANCE.NS', label: 'Reliance Industries', exchange: 'NSE' },
    { symbol: 'TCS.NS', label: 'Tata Consultancy Services', exchange: 'NSE' },
    { symbol: 'HDFCBANK.NS', label: 'HDFC Bank', exchange: 'NSE' },
    { symbol: 'INFY.NS', label: 'Infosys', exchange: 'NSE' },
    { symbol: 'ICICIBANK.NS', label: 'ICICI Bank', exchange: 'NSE' },
    { symbol: 'SBIN.NS', label: 'State Bank of India', exchange: 'NSE' },
    { symbol: 'BAJFINANCE.NS', label: 'Bajaj Finance', exchange: 'NSE' },
    { symbol: 'WIPRO.NS', label: 'Wipro', exchange: 'NSE' },
    { symbol: 'AXISBANK.NS', label: 'Axis Bank', exchange: 'NSE' },
    { symbol: 'KOTAKBANK.NS', label: 'Kotak Mahindra Bank', exchange: 'NSE' },
    { symbol: 'LT.NS', label: 'Larsen & Toubro', exchange: 'NSE' },
    { symbol: 'HINDUNILVR.NS', label: 'Hindustan Unilever', exchange: 'NSE' },
    { symbol: 'MARUTI.NS', label: 'Maruti Suzuki', exchange: 'NSE' },
    { symbol: 'TITAN.NS', label: 'Titan Company', exchange: 'NSE' },
    { symbol: 'ASIANPAINT.NS', label: 'Asian Paints', exchange: 'NSE' },
    { symbol: 'ULTRACEMCO.NS', label: 'UltraTech Cement', exchange: 'NSE' },
    { symbol: 'NESTLEIND.NS', label: 'Nestle India', exchange: 'NSE' },
    { symbol: 'POWERGRID.NS', label: 'Power Grid Corp', exchange: 'NSE' },
    { symbol: 'NTPC.NS', label: 'NTPC', exchange: 'NSE' },
    { symbol: 'ONGC.NS', label: 'ONGC', exchange: 'NSE' },
    { symbol: 'BPCL.NS', label: 'BPCL', exchange: 'NSE' },
    { symbol: 'ADANIENT.NS', label: 'Adani Enterprises', exchange: 'NSE' },
    { symbol: 'ADANIPORTS.NS', label: 'Adani Ports', exchange: 'NSE' },
    { symbol: 'ADANIGREEN.NS', label: 'Adani Green Energy', exchange: 'NSE' },
    { symbol: 'SUNPHARMA.NS', label: 'Sun Pharmaceutical', exchange: 'NSE' },
    { symbol: 'DRREDDY.NS', label: 'Dr. Reddy\'s Laboratories', exchange: 'NSE' },
    { symbol: 'CIPLA.NS', label: 'Cipla', exchange: 'NSE' },
    { symbol: 'DIVISLAB.NS', label: 'Divi\'s Laboratories', exchange: 'NSE' },
    { symbol: 'APOLLOHOSP.NS', label: 'Apollo Hospitals', exchange: 'NSE' },
    { symbol: 'TECHM.NS', label: 'Tech Mahindra', exchange: 'NSE' },
    { symbol: 'HCLTECH.NS', label: 'HCL Technologies', exchange: 'NSE' },
    { symbol: 'BHARTIARTL.NS', label: 'Bharti Airtel', exchange: 'NSE' },
    { symbol: 'JIOFIN.NS', label: 'Jio Financial Services', exchange: 'NSE' },
    { symbol: 'COALINDIA.NS', label: 'Coal India', exchange: 'NSE' },
    { symbol: 'GRASIM.NS', label: 'Grasim Industries', exchange: 'NSE' },
    { symbol: 'TATAMOTORS.NS', label: 'Tata Motors', exchange: 'NSE' },
    { symbol: 'TATASTEEL.NS', label: 'Tata Steel', exchange: 'NSE' },
    { symbol: 'JSWSTEEL.NS', label: 'JSW Steel', exchange: 'NSE' },
    { symbol: 'M&M.NS', label: 'Mahindra & Mahindra', exchange: 'NSE' },
    { symbol: 'BAJAJ-AUTO.NS', label: 'Bajaj Auto', exchange: 'NSE' },
    { symbol: 'HEROMOTOCO.NS', label: 'Hero MotoCorp', exchange: 'NSE' },
    { symbol: 'EICHERMOT.NS', label: 'Eicher Motors', exchange: 'NSE' },
    { symbol: 'SHREECEM.NS', label: 'Shree Cement', exchange: 'NSE' },
    { symbol: 'INDUSINDBK.NS', label: 'IndusInd Bank', exchange: 'NSE' },
    { symbol: 'SBILIFE.NS', label: 'SBI Life Insurance', exchange: 'NSE' },
    { symbol: 'HDFCLIFE.NS', label: 'HDFC Life Insurance', exchange: 'NSE' },
    { symbol: 'BAJAJFINSV.NS', label: 'Bajaj Finserv', exchange: 'NSE' },
    { symbol: 'BRITANNIA.NS', label: 'Britannia Industries', exchange: 'NSE' },
    { symbol: 'ITC.NS', label: 'ITC', exchange: 'NSE' },
    { symbol: 'UPL.NS', label: 'UPL', exchange: 'NSE' },
    { symbol: 'ZOMATO.NS', label: 'Zomato', exchange: 'NSE' },
    { symbol: 'PAYTM.NS', label: 'One97 Communications (Paytm)', exchange: 'NSE' },
    { symbol: 'NYKAA.NS', label: 'FSN E-Commerce (Nykaa)', exchange: 'NSE' },
    { symbol: 'DMART.NS', label: 'Avenue Supermarts (DMart)', exchange: 'NSE' },
    { symbol: 'TATACONSUM.NS', label: 'Tata Consumer Products', exchange: 'NSE' },
    { symbol: 'PIDILITIND.NS', label: 'Pidilite Industries', exchange: 'NSE' },
    { symbol: 'HAVELLS.NS', label: 'Havells India', exchange: 'NSE' },
    { symbol: 'BERGEPAINT.NS', label: 'Berger Paints', exchange: 'NSE' },
    { symbol: 'SIEMENS.NS', label: 'Siemens India', exchange: 'NSE' },
    { symbol: 'ABB.NS', label: 'ABB India', exchange: 'NSE' },
    { symbol: 'IRCTC.NS', label: 'IRCTC', exchange: 'NSE' },
    { symbol: 'PFC.NS', label: 'Power Finance Corporation', exchange: 'NSE' },
    { symbol: 'RECLTD.NS', label: 'REC Limited', exchange: 'NSE' },
    { symbol: 'BANKBARODA.NS', label: 'Bank of Baroda', exchange: 'NSE' },
    { symbol: 'CANBK.NS', label: 'Canara Bank', exchange: 'NSE' },
    { symbol: 'PNB.NS', label: 'Punjab National Bank', exchange: 'NSE' },
  ];

  let searchTimer = null;

  function handleSearch(query) {
    clearTimeout(searchTimer);
    const dd = document.getElementById('search-dropdown');
    if (!query || query.trim().length < 1) { dd.classList.add('hidden'); return; }
    searchTimer = setTimeout(() => {
      const q = query.toUpperCase().trim();
      const results = POPULAR.filter(s =>
        s.symbol.includes(q) ||
        s.label.toUpperCase().includes(q)
      ).slice(0, 8);
      renderSearchDropdown(results, dd);
    }, 200);
  }

  function renderSearchDropdown(results, container) {
    if (!results.length) {
      container.innerHTML = `<div class="px-4 py-3 text-text-muted text-sm">No stocks found</div>`;
    } else {
      container.innerHTML = results.map(r => `
        <div class="search-item" onclick="App.openStock('${r.symbol}')">
          <div>
            <p class="text-sm font-semibold">${r.symbol.replace('.NS', '')}</p>
            <p class="text-xs text-text-muted">${r.label}</p>
          </div>
          <span class="text-xs text-text-muted">${r.exchange}</span>
        </div>`).join('');
    }
    container.classList.remove('hidden');

    // Close on outside click
    const close = (e) => {
      if (!container.parentElement.contains(e.target)) {
        container.classList.add('hidden');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  }

  /* ── Add Stock Panel (Watchlist) ── */
  function openAddStock() {
    const panel = document.getElementById('add-stock-panel');
    panel.classList.remove('hidden');
    setTimeout(() => document.getElementById('watchlist-search-input')?.focus(), 50);
  }

  function closeAddStock() {
    document.getElementById('add-stock-panel').classList.add('hidden');
    document.getElementById('watchlist-search-input').value = '';
    document.getElementById('watchlist-search-results').innerHTML = '';
  }

  /* ── Market Clock & Status ── */
  function updateMarketStatus() {
    // Always derive IST correctly regardless of user's local timezone
    // Using toLocaleString with Asia/Kolkata avoids the double-offset bug
    const now = new Date();
    const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const ist = new Date(istString);

    const day = ist.getDay();   // 0=Sun, 6=Sat (in IST)
    const hour = ist.getHours();
    const min = ist.getMinutes();
    const totalMin = hour * 60 + min;

    // NSE: Mon–Fri 9:15 AM – 3:30 PM IST
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = totalMin >= 555 && totalMin <= 930; // 9*60+15=555, 15*60+30=930

    const dot = document.getElementById('market-status-dot');
    const text = document.getElementById('market-status-text');
    const time = document.getElementById('market-time');

    if (isWeekday && isMarketHours) {
      dot.className = 'w-2 h-2 rounded-full bg-gain animate-pulse';
      text.textContent = 'Market Open';
      text.style.color = '#22c55e';
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-loss';
      text.textContent = 'Market Closed';
      text.style.color = '#6b7280';
    }

    // Display current IST time
    const hh = String(hour).padStart(2, '0');
    const mm = String(min).padStart(2, '0');
    time.textContent = `${hh}:${mm} IST`;
  }

  /* ── Theme Toggle ── */
  const THEME_KEY = 'nse_theme';

  function applyTheme(theme) {
    const isDark = (theme !== 'light');
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');

    const iconEl = document.getElementById('theme-icon');
    const labelEl = document.getElementById('theme-label');
    if (iconEl) {
      iconEl.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
      if (labelEl) labelEl.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      if (window.lucide) lucide.createIcons({ nodes: [iconEl] });
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
  }

  /* ── Public API ── */
  return {
    openSidebar, closeSidebar, showSection, showToast,
    showSkeleton, hideSkeleton, handleSearch,
    openAddStock, closeAddStock, updateMarketStatus,
    toggleTheme, applyTheme, initTheme,
    POPULAR
  };
})();

// Apply saved theme immediately (prevents flash-of-dark on light mode)
(function () {
  const t = localStorage.getItem('nse_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();
