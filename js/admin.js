(function () {
    var POLL_INTERVAL_MS = 15000; // milliseconds between application list refreshes
    function getApiBase() {
        return (window.API_BASE_URL || '').replace(/\/$/, '');
    }

    function getAdminToken() {
        try { return localStorage.getItem('rollex_admin_token') || null; } catch (e) { return null; }
    }

    function setAdminToken(token) {
        try { if (token) { localStorage.setItem('rollex_admin_token', token); } else { localStorage.removeItem('rollex_admin_token'); } } catch (e) { /* ignore */ }
    }

    function getAdminEmail() {
        try { return localStorage.getItem('rollex_admin_email') || ''; } catch (e) { return ''; }
    }

    function setAdminEmail(email) {
        try { if (email) { localStorage.setItem('rollex_admin_email', email); } else { localStorage.removeItem('rollex_admin_email'); } } catch (e) { /* ignore */ }
    }

    async function apiFetch(path, options) {
        const base = getApiBase();
        const token = getAdminToken();
        const headers = Object.assign({ 'Content-Type': 'application/json' }, (options && options.headers) || {});
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(base + path, Object.assign({}, options, { headers }));
        return res;
    }

    const state = {
        applications: [],
        pollTimer: null,
        isAdmin: false,
        selected: null,
    };

    function $(id) {
        return document.getElementById(id);
    }

    function show(el, display) {
        if (!el) return;
        el.classList.remove('hidden');
        el.style.display = display || 'block';
    }

    function hide(el) {
        if (!el) return;
        el.classList.add('hidden');
        el.style.display = 'none';
    }

    function setNotice(message) {
        const notice = $('adminNotice');
        if (!notice) return;
        if (!message) {
            hide(notice);
            notice.textContent = '';
        } else {
            notice.textContent = message;
            show(notice, 'block');
        }
    }

    function setCashNotice(message) {
        const notice = $('cashCodeNotice');
        if (!notice) return;
        if (!message) {
            hide(notice);
            notice.textContent = '';
        } else {
            notice.textContent = message;
            show(notice, 'block');
        }
    }

    function formatDate(value) {
        if (!value) return '—';
        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '—';
            return date.toLocaleString();
        } catch (err) {
            return '—';
        }
    }

    function normalizedText(value) {
        return String(value || '').toLowerCase().trim();
    }

    function renderTable() {
        const body = $('applicationsBody');
        if (!body) return;
        body.innerHTML = '';

        const search = normalizedText($('searchInput') && $('searchInput').value);
        const status = ($('statusFilter') && $('statusFilter').value) || '';

        const filtered = state.applications.filter(function (app) {
            const matchesSearch = !search ||
                normalizedText(app.fullName).includes(search) ||
                normalizedText(app.email).includes(search);
            const matchesStatus = !status || app.status === status;
            return matchesSearch && matchesStatus;
        });

        if (!filtered.length) {
            body.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-sm opacity-60">No applications found.</td></tr>';
            return;
        }

        filtered.forEach(function (app) {
            const row = document.createElement('tr');
            row.className = 'border-b border-black/5 hover:bg-black/5 transition-colors';

            row.innerHTML =
                '<td class="py-4 pr-4 font-semibold">' + (app.fullName || '—') + '</td>' +
                '<td class="py-4 pr-4">' + (app.email || '—') + '</td>' +
                '<td class="py-4 pr-4 capitalize">' + (app.status || 'submitted') + '</td>' +
                '<td class="py-4 pr-4">' + formatDate(app.createdAt) + '</td>' +
                '<td class="py-4 pr-4"><button class="text-[11px] uppercase tracking-widest font-semibold underline">View</button></td>';

            row.querySelector('button').addEventListener('click', function () { openDetail(app); });
            body.appendChild(row);
        });
    }

    function setLoading(isLoading) {
        const loader = $('loadingState');
        if (!loader) return;
        if (isLoading) {
            loader.textContent = 'Loading applications…';
            show(loader, 'block');
        } else {
            hide(loader);
        }
    }

    function openDetail(app) {
        state.selected = app;
        const drawer = $('detailDrawer');
        if (!drawer) return;

        $('detailTitle').textContent = app.fullName || 'Applicant';
        $('detailEmail').textContent = app.email ? 'Email: ' + app.email : 'Email: —';
        $('detailPhone').textContent = app.phone ? 'Phone: ' + app.phone : 'Phone: —';
        $('detailInstagram').textContent = app.instagram ? 'Instagram: ' + app.instagram : 'Instagram: —';

        $('detailHeight').textContent = app.heightCm ? 'Height: ' + app.heightCm + ' cm' : 'Height: —';
        $('detailWaist').textContent = app.waistCm ? 'Waist: ' + app.waistCm + ' cm' : 'Waist: —';
        $('detailShoe').textContent = app.shoeSizeEU ? 'Shoe: EU ' + app.shoeSizeEU : 'Shoe: —';
        $('detailEye').textContent = app.eyeColor ? 'Eye: ' + app.eyeColor : 'Eye: —';

        const statusSelect = $('detailStatus');
        if (statusSelect) statusSelect.value = app.status || 'submitted';

        const uploads = $('detailUploads');
        if (uploads) {
            uploads.innerHTML = '';
            const uploadItems = app.uploads || {};
            ['headshot', 'runway', 'fullBody'].forEach(function (key) {
                const item = uploadItems[key];
                const label = key === 'fullBody' ? 'Full Body' : key.charAt(0).toUpperCase() + key.slice(1);
                const button = document.createElement('button');
                button.className = 'px-3 py-2 rounded-full border border-black/15 text-[11px] uppercase tracking-widest font-semibold focus-ring';
                button.textContent = item ? 'Open ' + label : label + ' missing';
                button.disabled = !item;
                if (item) {
                    button.addEventListener('click', function () { openApplicationFile(app.id, key); });
                }
                uploads.appendChild(button);
            });
        }

        show(drawer, 'flex');
        document.body.classList.add('overflow-hidden');
    }

    function closeDetail() {
        const drawer = $('detailDrawer');
        if (!drawer) return;
        hide(drawer);
        document.body.classList.remove('overflow-hidden');
    }

    async function openApplicationFile(appId, kind) {
        const base = getApiBase();
        if (!base) { setNotice('API_BASE_URL is not configured.'); return; }
        const token = getAdminToken();
        if (!token) { setNotice('Not signed in.'); return; }
        const url = base + '/api/applications/' + appId + '/files/' + kind;
        window.open(url + '?token=' + encodeURIComponent(token), '_blank');
    }

    async function updateStatus(newStatus) {
        if (!state.selected || !state.selected.id) return;
        try {
            const res = await apiFetch('/api/applications/' + state.selected.id, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) {
                setNotice('Unable to update status.');
            }
        } catch (err) {
            setNotice('Unable to update status.');
        }
    }

    function generateCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let out = '';
        for (let i = 0; i < 8; i += 1) {
            out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }
        return 'RM-' + out;
    }

    async function createCashCode() {
        if (!state.isAdmin) {
            setCashNotice('Admin access required.');
            return;
        }
        try {
            const amountValue = Number(($('cashAmount') && $('cashAmount').value) || 0) || null;
            const res = await apiFetch('/api/payment-codes', {
                method: 'POST',
                body: JSON.stringify({ amount: amountValue }),
            });
            if (!res.ok) {
                setCashNotice('Unable to generate code.');
                return;
            }
            const data = await res.json();
            const output = $('generatedCashCode');
            if (output) output.textContent = 'Code: ' + data.code;
            setCashNotice('');
        } catch (err) {
            setCashNotice('Unable to generate code.');
        }
    }

    function stopPolling() {
        if (state.pollTimer) {
            clearInterval(state.pollTimer);
            state.pollTimer = null;
        }
    }

    function startPolling() {
        stopPolling();
        if (!state.isAdmin) return;

        async function poll() {
            try {
                const res = await apiFetch('/api/applications');
                if (res.status === 401 || res.status === 403) {
                    stopPolling();
                    signOut();
                    return;
                }
                if (!res.ok) {
                    setNotice('Unable to load applications.');
                    return;
                }
                const apps = await res.json();
                state.applications = apps;
                setLoading(false);
                renderTable();
            } catch (err) {
                setLoading(false);
                setNotice('Unable to load applications.');
            }
        }

        setLoading(true);
        poll();
        state.pollTimer = setInterval(poll, POLL_INTERVAL_MS);
    }

    function signOut() {
        state.isAdmin = false;
        state.applications = [];
        setAdminToken(null);
        setAdminEmail(null);
        stopPolling();

        const signedInPanel = $('signedInPanel');
        const loginForm = $('loginForm');
        const signedInEmail = $('signedInEmail');
        if (signedInPanel) hide(signedInPanel);
        if (loginForm) show(loginForm, 'block');
        if (signedInEmail) signedInEmail.textContent = '';

        renderTable();
        setNotice('Sign in with an admin account to view submissions.');
    }

    function handleSignedIn(email) {
        state.isAdmin = true;
        const signedInPanel = $('signedInPanel');
        const loginForm = $('loginForm');
        const signedInEmail = $('signedInEmail');

        if (signedInEmail) signedInEmail.textContent = email || '';
        if (signedInPanel) show(signedInPanel, 'block');
        if (loginForm) hide(loginForm);
        setNotice('');
        startPolling();
    }

    function attachListeners() {
        $('searchInput') && $('searchInput').addEventListener('input', renderTable);
        $('statusFilter') && $('statusFilter').addEventListener('change', renderTable);
        $('detailClose') && $('detailClose').addEventListener('click', closeDetail);
        $('detailDrawer') && $('detailDrawer').addEventListener('click', function (e) {
            if (e.target === $('detailDrawer')) closeDetail();
        });

        $('detailStatus') && $('detailStatus').addEventListener('change', function (e) {
            updateStatus(e.target.value);
        });

        $('loginForm') && $('loginForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            setNotice('');
            const email = ($('adminEmail') && $('adminEmail').value) || '';
            const password = ($('adminPassword') && $('adminPassword').value) || '';
            const base = getApiBase();
            if (!base) { setNotice('API_BASE_URL is not configured.'); return; }
            try {
                const res = await fetch(base + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                if (!res.ok) {
                    setNotice('Sign in failed. Check credentials.');
                    return;
                }
                const data = await res.json();
                setAdminToken(data.token);
                setAdminEmail(data.email);
                handleSignedIn(data.email);
            } catch (err) {
                setNotice('Sign in failed. Check credentials.');
            }
        });

        $('signOutBtn') && $('signOutBtn').addEventListener('click', function () {
            signOut();
        });

        $('generateCashCodeBtn') && $('generateCashCodeBtn').addEventListener('click', createCashCode);
    }

    document.addEventListener('DOMContentLoaded', function () {
        attachListeners();

        // Restore session from localStorage
        const token = getAdminToken();
        const email = getAdminEmail();
        if (token && email) {
            // Verify token is still valid by fetching applications
            handleSignedIn(email);
        } else {
            setNotice('Sign in with an admin account to view submissions.');
        }
    });
})();
