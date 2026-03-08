(function () {
    function ensureSupabase() {
        if (!window.supabase) {
            throw new Error('Supabase SDK not loaded.');
        }
        if (!window.SUPABASE_CONFIG) {
            throw new Error('Missing SUPABASE_CONFIG.');
        }
        if (!window.supabaseClient) {
            window.supabaseClient = window.supabase.createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.anonKey
            );
        }
        return window.supabaseClient;
    }

    function $(id) {
        return document.getElementById(id);
    }

    function show(el, display = 'block') {
        if (!el) return;
        el.classList.remove('hidden');
        el.style.display = display;
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

        apps.forEach((app) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-black/5';
            row.innerHTML = `
                <td class="py-4 pr-4 font-semibold">${app.id}</td>
                <td class="py-4 pr-4 capitalize">${app.status || 'submitted'}</td>
                <td class="py-4 pr-4">${formatDate(app.created_at)}</td>
            `;
            body.appendChild(row);
        });
    }

    function subscribeApplications(uid) {
        const supabase = ensureSupabase();
        setLoading(true);

        return supabase
            .from('applications')
            .select('*')
            .eq('uid', uid)
            .order('created_at', { ascending: false })
            .limit(20)
            .then(({ data, error }) => {
                setLoading(false);
                if (error) {
                    console.error('Load applications error:', error);
                    setNotice('Unable to load submissions.');
                    return;
                }
                render(data || []);
            });
    }

    document.addEventListener('DOMContentLoaded', () => {
        try {
            ensureSupabase();
        } catch (err) {
            setNotice('Supabase initialization failed.');
            return;
        }

        let unsubscribe = null;

        $('refreshBtn')?.addEventListener('click', () => {
            const user = window.supabaseClient?.auth?.getUser();
            if (user) {
                user.then(({ data }) => {
                    if (data?.user) {
                        subscribeApplications(data.user.id);
                    }
                });
            }
        });

        window.supabaseClient.auth.onAuthStateChanged(async (event, session) => {
            setNotice('');

            if (!session?.user) {
                try {
                    const { data, error } = await window.supabaseClient.auth.signInAnonymously();
                    if (error) throw error;
                    return;
                } catch (err) {
                    console.error('Sign-in error:', err);
                    setNotice('Sign-in failed. Please retry.');
                }
                return;
            }

            subscribeApplications(session.user.id);
        });
    });
})();
