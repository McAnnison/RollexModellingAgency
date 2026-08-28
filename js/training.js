// MongoDB REST API client for training events page.
// Replaces the previous Firebase client integration.

(function () {
    function getApiBase() {
        return (window.API_BASE_URL || '').replace(/\/$/, '');
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

    function escapeHtml(str) {
        var s = String(str || '');
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
    var U = window.RollexUtils;
    var getApiBase = U.getApiBase;
    var $ = U.$;
    var hide = U.hide;
    var formatDate = U.formatDate;

    function getImageUrl(eventId) {
        if (!eventId) return null;
        const base = getApiBase();
        if (!base) return null;
        return base + '/api/events/' + eventId + '/image';
    }

    async function renderEvents(events) {
        const list = $('eventsList');
        if (!list) return;
        list.innerHTML = '';

        if (!events.length) {
            list.innerHTML = '<div class="text-sm opacity-60">No training events yet.</div>';
            return;
        }

        events.forEach((evt) => {
            const card = document.createElement('div');
            card.className = 'glass rounded-2xl border border-black/10 p-6';
            const imageUrl = evt.imagePath ? getImageUrl(evt.id) : null;
            card.innerHTML = `
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p class="text-[10px] uppercase tracking-widest opacity-60">Event</p>
                        <h3 class="serif text-2xl mt-2">${escapeHtml(evt.title || 'Training session')}</h3>
                        <p class="mt-2 text-sm opacity-70">${escapeHtml(formatDate(evt.time))}</p>
                        <p class="mt-2 text-sm opacity-70">Location: ${escapeHtml(evt.location || '—')}</p>
                        <p class="mt-2 text-sm opacity-70">Venue: ${escapeHtml(evt.venue || '—')}</p>
                    </div>
                    ${imageUrl ? `<div class="w-full md:w-56 h-32 rounded-xl overflow-hidden border border-black/10"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(evt.title || 'Venue')}" class="w-full h-full object-cover"></div>` : ''}
                </div>
            `;
            list.appendChild(card);
        });
    }

    async function fetchEvents() {
        const base = getApiBase();
        const loading = $('eventsLoading');
        
        if (!base) {
            if (loading) loading.textContent = 'API_BASE_URL is not configured.';
            return;
        }

        try {
            const res = await fetch(base + '/api/events');
            if (!res.ok) {
                let detail = '';
                try { detail = (await res.json()).error || ''; } catch (e) { /* response not JSON */ }
                console.error('Load events failed:', res.status, detail);
                if (loading) loading.textContent = detail || 'Unable to load events (HTTP ' + res.status + ').';
                return;
            }
            const events = await res.json();
            if (loading) hide(loading);
            renderEvents(events);
        } catch (err) {
            console.error('Load events error:', err.message || err);
            if (loading) loading.textContent = 'Unable to load events. Network error — check your connection.';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const refEl = $('referenceId');
        try {
            const id = localStorage.getItem('lastApplicationId');
            if (refEl && id) refEl.textContent = id;
        } catch (err) {
            console.warn('localStorage unavailable, cannot restore application ID:', err.message);
        }

        fetchEvents();
    });
})();
