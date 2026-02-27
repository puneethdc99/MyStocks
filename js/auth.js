/* ═══════════════════════════════════════════
   auth.js — Open Authentication System
   • Any valid email + any password → works
   • First login auto-creates the account
   • Returning users must match their password
   • All data stored in localStorage (no backend)
   ⚠️ Client-side only — demo/prototype tool.
═══════════════════════════════════════════ */
const Auth = (() => {
    const USERS_KEY = 'nse_users';
    const SESSION_KEY = 'nse_session';

    /* ── Email format validator ── */
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    }

    /* ── Derive a display name from email (e.g. john.doe@... → John Doe) ── */
    function nameFromEmail(email) {
        const local = email.split('@')[0];           // "john.doe" or "john_doe"
        return local
            .replace(/[._\-+]/g, ' ')                 // replace separators with space
            .replace(/\b\w/g, c => c.toUpperCase())   // Title Case
            .trim() || email;
    }

    /* ── Storage helpers ── */
    function getUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
        catch { return []; }
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
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
        ['login', 'signup'].forEach(t => {
            document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
            document.getElementById(`form-${t}`)?.classList.toggle('hidden', t !== tab);
        });
        ['login-error', 'signup-error'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
    }

    function showError(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    /* ── LOGIN ──────────────────────────────
       Works for BOTH new and returning users:
       • New email   → auto-register + login
       • Known email → validate password, login
    ─────────────────────────────────────── */
    function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;

        if (!isValidEmail(email)) {
            showError('login-error', 'Please enter a valid email address (e.g. you@example.com).');
            return;
        }
        if (!password) {
            showError('login-error', 'Password cannot be empty.');
            return;
        }

        const users = getUsers();
        const existing = users.find(u => u.email === email);

        if (existing) {
            /* ── Returning user — validate password ── */
            if (existing.password !== btoa(password)) {
                showError('login-error', 'Incorrect password. Please try again.');
                return;
            }
            setSession(existing);
            App.onLogin(existing, false); // false = returning user

        } else {
            /* ── New user — auto-register with derived name ── */
            const name = nameFromEmail(email);
            const newUser = { name, email, password: btoa(password) };
            users.push(newUser);
            saveUsers(users);
            setSession(newUser);
            App.onLogin(newUser, true); // true = first time
        }
    }

    /* ── SIGN UP (explicit — lets user set a custom name) ─────────────── */
    function handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim().toLowerCase();
        const password = document.getElementById('signup-password').value;

        if (!isValidEmail(email)) {
            showError('signup-error', 'Please enter a valid email address.');
            return;
        }
        if (password.length < 6) {
            showError('signup-error', 'Password must be at least 6 characters.');
            return;
        }

        const users = getUsers();
        if (users.some(u => u.email === email)) {
            showError('signup-error', 'An account with this email already exists. Please log in instead.');
            return;
        }

        const newUser = { name: name || nameFromEmail(email), email, password: btoa(password) };
        users.push(newUser);
        saveUsers(users);
        setSession(newUser);
        App.onLogin(newUser, true);
    }

    /* ── Logout ── */
    function logout() {
        localStorage.removeItem(SESSION_KEY);
        App.showAuth();
        UI.showToast('Logged out successfully', 'info');
    }

    /* ── Init ── */
    function init() {
        return getSession(); // just return existing session (no demo seeding needed)
    }

    return { init, showTab, handleLogin, handleSignup, logout, getSession, isValidEmail };
})();
