(function () {
    var U = window.RollexUtils;
    var getApiBase = U.getApiBase;
    var $ = U.$;
    var show = U.show;
    var hide = U.hide;
    var formatDate = U.formatDate;
    var getSessionId = U.getSessionId;

    var setNotice = U.createNotice('statusNotice');
    var setLoading = U.createLoader('loadingState', 'Loading your submissions\u2026');

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
