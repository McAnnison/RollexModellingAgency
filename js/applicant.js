(function () {
    function getApiBase() {
        return (window.API_BASE_URL || '').replace(/\/$/, '');
    }

    function generateSecureId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return 'sess-' + crypto.randomUUID();
        }
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            return 'sess-' + Array.from(crypto.getRandomValues(new Uint8Array(16)), function (b) {
                return b.toString(16).padStart(2, '0');
            }).join('');
        }
        // Last resort fallback (should not occur in modern browsers)
        return 'sess-' + Date.now().toString(36) + '-' + (Math.random() * 0xffffffff | 0).toString(36);
    }

    function getSessionId() {
        // Prefer the shared helper from api-client.js if loaded
        if (typeof window.getSessionId === 'function') return window.getSessionId();
        try {
            let id = localStorage.getItem('rollex_session_id');
            if (!id) {
                id = generateSecureId();
                localStorage.setItem('rollex_session_id', id);
            }
            return id;
        } catch (e) {
            return generateSecureId();
        }
    }

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
        const notice = $('statusNotice');
        if (!notice) return;
        if (!message) {
            hide(notice);
            notice.textContent = '';
        } else {
            notice.textContent = message;
            show(notice, 'block');
        }
    }

    function setLoading(isLoading) {
        const loader = $('loadingState');
        if (!loader) return;
        if (isLoading) {
            loader.textContent = 'Loading your submissions…';
            show(loader, 'block');
        } else {
            hide(loader);
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

    function render(apps) {
        const body = $('applicationsBody');
        if (!body) return;
        body.innerHTML = '';

        if (!apps.length) {
            body.innerHTML = '<tr><td colspan="3" class="py-6 text-center text-sm opacity-60">No submissions found.</td></tr>';
            return;
        }

        apps.forEach(function (app) {
            const row = document.createElement('tr');
            row.className = 'border-b border-black/5';
            row.innerHTML =
                '<td class="py-4 pr-4 font-semibold">' + app.id + '</td>' +
                '<td class="py-4 pr-4 capitalize">' + (app.status || 'submitted') + '</td>' +
                '<td class="py-4 pr-4">' + formatDate(app.createdAt) + '</td>';
            body.appendChild(row);
        });
    }

    async function fetchApplications() {
        const base = getApiBase();
        if (!base) {
            setNotice('API_BASE_URL is not configured.');
            setLoading(false);
            return;
        }

        const sessionId = getSessionId();
        setLoading(true);

        try {
            const res = await fetch(base + '/api/my-applications?sessionId=' + encodeURIComponent(sessionId));
            if (!res.ok) {
                setLoading(false);
                setNotice('Unable to load submissions.');
                return;
            }
            const apps = await res.json();
            setLoading(false);
            render(apps);
        } catch (err) {
            setLoading(false);
            setNotice('Unable to load submissions.');
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        $('refreshBtn') && $('refreshBtn').addEventListener('click', function () {
            fetchApplications();
        });

        fetchApplications();
    });
})();
