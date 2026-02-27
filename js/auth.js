/* ═══════════════════════════════════════════
   auth.js — Mock Authentication System
   Stores users & session in localStorage.
   ⚠️ Client-side only — demo purposes only.
═══════════════════════════════════════════ */
const Auth = (() => {
    const USERS_KEY = 'nse_users';
    const SESSION_KEY = 'nse_session';

    /* ── Seed demo account on first load ── */
    function seedDemo() {
        const users = getUsers();
        const hasdemo = users.some(u => u.email === 'demo@mystocks.in');
        if (!hasdemo) {
            users.push({ name: 'Demo User', email: 'demo@mystocks.in', password: btoa('demo123') });
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
    }

    function getUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
        catch { return []; }
    }

    function getSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
        catch { return null; }
    }

    function setSession(user) {
        const session = { email: user.email, name: user.name, loginAt: Date.now() };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
    }

    /* ── Tab Switching ── */
    function showTab(tab) {
        const tabs = ['login', 'signup'];
        const errors = ['login-error', 'signup-error'];

        tabs.forEach(t => {
            document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
            document.getElementById(`form-${t}`).classList.toggle('hidden', t !== tab);
        });
        errors.forEach(e => { const el = document.getElementById(e); if (el) el.classList.add('hidden'); });
    }

    /* ── Show Error ── */
    function showError(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    /* ── Login Handler ── */
    function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;
        const users = getUsers();
        const user = users.find(u => u.email === email && u.password === btoa(password));

        if (!user) {
            showError('login-error', 'Invalid email or password. Try demo@mystocks.in / demo123');
            return;
        }

        setSession(user);
        App.onLogin(user);
    }

    /* ── Signup Handler ── */
    function handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim().toLowerCase();
        const password = document.getElementById('signup-password').value;
        const users = getUsers();

        if (users.some(u => u.email === email)) {
            showError('signup-error', 'An account with this email already exists.');
            return;
        }

        const newUser = { name, email, password: btoa(password) };
        users.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        setSession(newUser);
        App.onLogin(newUser);
        UI.showToast(`Welcome, ${name}! 🎉`, 'success');
    }

    /* ── Logout ── */
    function logout() {
        localStorage.removeItem(SESSION_KEY);
        App.showAuth();
        UI.showToast('Logged out successfully', 'info');
    }

    /* ── Init ── */
    function init() {
        seedDemo();
        return getSession();
    }

    return { init, showTab, handleLogin, handleSignup, logout, getSession };
})();
