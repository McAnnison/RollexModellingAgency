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

    async function getImageUrl(path) {
        if (!path) return null;
        const supabase = ensureSupabase();
        const { data } = supabase.storage
            .from('events')
            .getPublicUrl(path);
        return data?.publicUrl || null;
    }

    async function renderEvents(events) {
        const list = $('eventsList');
        if (!list) return;
        list.innerHTML = '';

        if (!events.length) {
            list.innerHTML = '<div class="text-sm opacity-60">No training events yet.</div>';
            return;
        }

        // Get public URLs for images
        const urls = await Promise.all(events.map((evt) => getImageUrl(evt.image_path).catch(() => null)));

        events.forEach((evt, idx) => {
            const card = document.createElement('div');
            card.className = 'glass rounded-2xl border border-black/10 p-6';
            const imageUrl = urls[idx];
            card.innerHTML = `
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p class="text-[10px] uppercase tracking-widest opacity-60">Event</p>
                        <h3 class="serif text-2xl mt-2">${evt.title || 'Training session'}</h3>
                        <p class="mt-2 text-sm opacity-70">${formatDate(evt.time)}</p>
                        <p class="mt-2 text-sm opacity-70">Location: ${evt.location || '—'}</p>
                        <p class="mt-2 text-sm opacity-70">Venue: ${evt.venue || '—'}</p>
                    </div>
                    ${imageUrl ? `<div class="w-full md:w-56 h-32 rounded-xl overflow-hidden border border-black/10"><img src="${imageUrl}" alt="${evt.title || 'Venue'}" class="w-full h-full object-cover"></div>` : ''}
                </div>
            `;
            list.appendChild(card);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const refEl = $('referenceId');
        try {
            const id = localStorage.getItem('lastApplicationId');
            if (refEl && id) refEl.textContent = id;
        } catch (err) {
            // ignore storage errors
        }

        const loading = $('eventsLoading');
        try {
            ensureSupabase();
        } catch (err) {
            if (loading) loading.textContent = 'Unable to load events.';
            return;
        }

        window.supabaseClient.auth.onAuthStateChanged(async (event, session) => {
            if (!session?.user) {
                try {
                    const { error } = await window.supabaseClient.auth.signInAnonymously();
                    if (error) throw error;
                } catch (err) {
                    if (loading) loading.textContent = 'Unable to sign in.';
                }
                return;
            }

            const supabase = ensureSupabase();
            
            supabase
                .from('training_events')
                .select('*')
                .order('time', { ascending: true })
                .then(({ data, error }) => {
                    if (loading) hide(loading);
                    if (error) {
                        console.error('Load events error:', error);
                        if (loading) loading.textContent = 'Unable to load events.';
                        return;
                    }
                    renderEvents(data || []);
                });
        });
    });
})();
