(function () {
    function ensureFirebase() {
        if (!window.firebase) {
            throw new Error('Firebase SDK not loaded.');
        }
        if (!window.FIREBASE_CONFIG) {
            throw new Error('Missing FIREBASE_CONFIG.');
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(window.FIREBASE_CONFIG);
        }
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
            const date = value.toDate ? value.toDate() : new Date(value);
            if (Number.isNaN(date.getTime())) return '—';
            return date.toLocaleString();
        } catch (err) {
            return '—';
        }
    }

    async function getImageUrl(path) {
        if (!path) return null;
        const storage = firebase.storage();
        return storage.ref().child(path).getDownloadURL();
    }

    async function renderEvents(events) {
        const list = $('eventsList');
        if (!list) return;
        list.innerHTML = '';

        if (!events.length) {
            list.innerHTML = '<div class="text-sm opacity-60">No training events yet.</div>';
            return;
        }

        const urls = await Promise.all(events.map((evt) => getImageUrl(evt.imagePath).catch(() => null)));

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
            ensureFirebase();
        } catch (err) {
            if (loading) loading.textContent = 'Unable to load events.';
            return;
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) {
                try {
                    await firebase.auth().signInAnonymously();
                } catch (err) {
                    if (loading) loading.textContent = 'Unable to sign in.';
                }
                return;
            }

            const db = firebase.firestore();
            db.collection('trainingEvents').orderBy('time', 'asc').onSnapshot(async (snap) => {
                if (loading) hide(loading);
                const events = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                await renderEvents(events);
            }, () => {
                if (loading) loading.textContent = 'Unable to load events.';
            });
        });
    });
})();
