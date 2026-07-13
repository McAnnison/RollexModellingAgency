// MongoDB REST API client for training events page.
// Replaces the previous Firebase client integration.

(function () {
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
                if (loading) loading.textContent = 'Unable to load events.';
                return;
            }
            const events = await res.json();
            if (loading) hide(loading);
            renderEvents(events);
        } catch (err) {
            console.error('Load events error:', err);
            if (loading) loading.textContent = 'Unable to load events.';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const refEl = $('referenceId');
        try {
            const id = localStorage.getItem('lastApplicationId');
            if (refEl && id) refEl.textContent = id;
        } catch (err) {
            // ignore storage errors
        }

        fetchEvents();
    });
})();
