/* ═══════════════════════════════════════════
   app.js — App Bootstrap & Hash Router
   Entry point — loaded last.
═══════════════════════════════════════════ */
const Settings = (() => {
    function update() {
        const session = Auth.getSession();
        if (!session) return;

        // Update settings page
        const setName = document.getElementById('settings-name');
        const setEmail = document.getElementById('settings-email');
        const setAvatar = document.getElementById('settings-avatar');
        if (setName) setName.textContent = session.name;
        if (setEmail) setEmail.textContent = session.email;
        if (setAvatar) setAvatar.textContent = session.name.charAt(0).toUpperCase();

        // Counts
        const wl = Watchlist.getList();
        const wlEl = document.getElementById('settings-watchlist-count');
        if (wlEl) wlEl.textContent = `${wl.length} stock${wl.length !== 1 ? 's' : ''}`;

        // Count notes
        let noteCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('nse_notes_') && localStorage.getItem(k)?.trim()) noteCount++;
        }
        const nlEl = document.getElementById('settings-notes-count');
        if (nlEl) nlEl.textContent = `${noteCount} note${noteCount !== 1 ? 's' : ''}`;
    }

    function clearWatchlist() {
        if (!confirm('Clear all watchlist stocks?')) return;
        localStorage.removeItem('nse_watchlist');
        Watchlist.init();
        Watchlist.renderWatchlist();
        update();
        UI.showToast('Watchlist cleared', 'info');
    }

    function clearNotes() {
        if (!confirm('Clear all your stock notes?')) return;
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('nse_notes_')) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
        update();
        UI.showToast(`${keys.length} note(s) cleared`, 'info');
    }

    function clearCache() {
        sessionStorage.clear();
        UI.showToast('Session cache cleared', 'info');
    }

    function clearAll() {
        if (!confirm('This will clear ALL local data (watchlist, notes, auth) and log you out. Are you sure?')) return;
        const sessionKey = localStorage.getItem('nse_session');
        localStorage.clear();
        sessionStorage.clear();
        UI.showToast('All data cleared', 'info');
        setTimeout(() => App.showAuth(), 500);
    }

    return { update, clearWatchlist, clearNotes, clearCache, clearAll };
})();

/* ═══════════════════════════════════════════
   App — Main Router & Controller
═══════════════════════════════════════════ */
const App = (() => {
    let _prevSection = 'dashboard';

    /* ── Boot ── */
    async function boot() {
        // Init Lucide icons
        if (window.lucide) lucide.createIcons();

        // Seed demo account
        const session = Auth.init();

        if (session) {
            showApp(session);
        } else {
            showAuth();
        }

        // Market clock ticker (update every 30s)
        UI.updateMarketStatus();
        setInterval(UI.updateMarketStatus, 30000);
    }

    /* ── Show Auth Page ── */
    function showAuth() {
        document.getElementById('page-auth').classList.remove('hidden');
        document.getElementById('page-app').classList.add('hidden');
        Dashboard.stopAutoRefresh?.();
        // Re-init icons
        setTimeout(() => lucide.createIcons(), 50);
    }

    /* ── Show App (after login) ── */
    function showApp(session) {
        document.getElementById('page-auth').classList.add('hidden');
        document.getElementById('page-app').classList.remove('hidden');

        // Populate sidebar user info
        const dn = document.getElementById('user-name-display');
        const de = document.getElementById('user-email-display');
        const av = document.getElementById('user-avatar');
        if (dn) dn.textContent = session.name;
        if (de) de.textContent = session.email;
        if (av) av.textContent = session.name.charAt(0).toUpperCase();

        // Init modules
        Watchlist.init();
        Settings.update();

        // Re-render icons inside app
        setTimeout(() => lucide.createIcons(), 50);

        // Route to hash or default dashboard
        _route(window.location.hash || '#/dashboard');
    }

    /* ── Login Callback ── */
    function onLogin(user) {
        const session = Auth.getSession();
        showApp(session);
        UI.showToast(`Welcome back, ${user.name}! 👋`, 'success');
    }

    /* ── Hash Router ── */
    function _route(hash) {
        if (!hash || hash === '#' || hash === '#/') hash = '#/dashboard';

        const parts = hash.replace('#/', '').split('/');
        const section = parts[0] || 'dashboard';
        const param = parts[1] || null;

        if (section === 'stock' && param) {
            _prevSection = document.querySelector('.app-section.active')?.id.replace('section-', '') || 'watchlist';
            Stock.open(decodeURIComponent(param));
        } else if (section === 'dashboard') {
            UI.showSection('dashboard');
            Dashboard.init();
        } else if (section === 'watchlist') {
            UI.showSection('watchlist');
            Watchlist.renderWatchlist();
        } else if (section === 'market') {
            UI.showSection('market');
            Dashboard.renderHeatmap();
        } else if (section === 'settings') {
            UI.showSection('settings');
            Settings.update();
        } else {
            UI.showSection('dashboard');
            Dashboard.init();
        }
    }

    /* ── Navigation helpers ── */
    function openStock(symbol) {
        window.location.hash = `#/stock/${encodeURIComponent(symbol)}`;
    }

    function goBack() {
        window.location.hash = `#/${_prevSection}`;
    }

    /* ── Init ── */
    window.addEventListener('hashchange', () => {
        const session = Auth.getSession();
        if (session) _route(window.location.hash);
        else showAuth();
    });

    window.addEventListener('DOMContentLoaded', boot);

    // Close search on Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.getElementById('search-dropdown')?.classList.add('hidden');
            UI.closeAddStock();
        }
    });

    return { boot, showAuth, showApp, onLogin, openStock, goBack };
})();
