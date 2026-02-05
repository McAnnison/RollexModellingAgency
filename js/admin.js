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

    const state = {
        applications: [],
        unsubscribe: null,
        unsubscribeEvents: null,
        user: null,
        isAdmin: false,
        selected: null,
    };

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

    function setEventNotice(message) {
        const notice = $('eventNotice');
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
            const date = value.toDate ? value.toDate() : new Date(value);
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

        const search = normalizedText($('searchInput')?.value);
        const status = $('statusFilter')?.value || '';

        const filtered = state.applications.filter((app) => {
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

        filtered.forEach((app) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-black/5 hover:bg-black/5 transition-colors';

            row.innerHTML = `
                <td class="py-4 pr-4 font-semibold">${app.fullName || '—'}</td>
                <td class="py-4 pr-4">${app.email || '—'}</td>
                <td class="py-4 pr-4 capitalize">${app.status || 'submitted'}</td>
                <td class="py-4 pr-4">${formatDate(app.createdAt)}</td>
                <td class="py-4 pr-4">
                    <button class="text-[11px] uppercase tracking-widest font-semibold underline">View</button>
                </td>
            `;

            row.querySelector('button')?.addEventListener('click', () => openDetail(app));
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

    function renderEvents(events) {
        const body = $('eventsBody');
        if (!body) return;
        body.innerHTML = '';

        if (!events.length) {
            body.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-sm opacity-60">No events posted yet.</td></tr>';
            return;
        }

        events.forEach((evt) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-black/5';
            const timeText = evt.time ? formatDate(evt.time) : '—';
            const imageLabel = evt.imagePath ? 'View' : '—';
            row.innerHTML = `
                <td class="py-4 pr-4 font-semibold">${evt.title || '—'}</td>
                <td class="py-4 pr-4">${timeText}</td>
                <td class="py-4 pr-4">${evt.location || '—'}</td>
                <td class="py-4 pr-4">${evt.venue || '—'}</td>
                <td class="py-4 pr-4">
                    <button class="text-[11px] uppercase tracking-widest font-semibold underline" ${evt.imagePath ? '' : 'disabled'}>
                        ${imageLabel}
                    </button>
                </td>
            `;

            const btn = row.querySelector('button');
            if (btn && evt.imagePath) {
                btn.addEventListener('click', () => openStorageFile(evt.imagePath));
            }
            body.appendChild(row);
        });
    }

    function toggleEventForm(showForm) {
        const form = $('eventForm');
        if (!form) return;
        if (showForm) {
            show(form, 'block');
        } else {
            hide(form);
            $('eventTitle').value = '';
            $('eventLocation').value = '';
            $('eventTime').value = '';
            $('eventVenue').value = '';
            $('eventImage').value = '';
            setEventNotice('');
        }
    }

    async function uploadEventImage(eventId, file) {
        if (!file) return null;
        ensureFirebase();
        const storage = firebase.storage();
        const ext = (file.name || '').split('.').pop() || 'jpg';
        const path = `events/${eventId}/cover.${ext}`;
        const ref = storage.ref().child(path);
        await ref.put(file, { contentType: file.type || 'image/jpeg' });
        return path;
    }

    async function createEvent() {
        if (!state.isAdmin || !state.user) {
            setEventNotice('Admin access required.');
            return;
        }

        const title = $('eventTitle')?.value?.trim();
        const location = $('eventLocation')?.value?.trim();
        const timeInput = $('eventTime')?.value;
        const venue = $('eventVenue')?.value?.trim();
        const imageFile = $('eventImage')?.files?.[0] || null;

        if (!title || !location || !timeInput || !venue) {
            setEventNotice('Please fill in all fields.');
            return;
        }

        setEventNotice('');

        try {
            ensureFirebase();
            const db = firebase.firestore();
            const docRef = await db.collection('trainingEvents').add({
                title,
                location,
                venue,
                time: firebase.firestore.Timestamp.fromDate(new Date(timeInput)),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: state.user.uid,
                imagePath: null,
            });

            let imagePath = null;
            if (imageFile) {
                imagePath = await uploadEventImage(docRef.id, imageFile);
                await docRef.update({ imagePath });
            }

            toggleEventForm(false);
        } catch (err) {
            setEventNotice('Unable to publish event.');
        }
    }

    function openDetail(app) {
        state.selected = app;
        const drawer = $('detailDrawer');
        if (!drawer) return;

        $('detailTitle').textContent = app.fullName || 'Applicant';
        $('detailEmail').textContent = app.email ? `Email: ${app.email}` : 'Email: —';
        $('detailPhone').textContent = app.phone ? `Phone: ${app.phone}` : 'Phone: —';
        $('detailInstagram').textContent = app.instagram ? `Instagram: ${app.instagram}` : 'Instagram: —';

        $('detailHeight').textContent = app.heightCm ? `Height: ${app.heightCm} cm` : 'Height: —';
        $('detailWaist').textContent = app.waistCm ? `Waist: ${app.waistCm} cm` : 'Waist: —';
        $('detailShoe').textContent = app.shoeSizeEU ? `Shoe: EU ${app.shoeSizeEU}` : 'Shoe: —';
        $('detailEye').textContent = app.eyeColor ? `Eye: ${app.eyeColor}` : 'Eye: —';

        const statusSelect = $('detailStatus');
        if (statusSelect) statusSelect.value = app.status || 'submitted';

        const uploads = $('detailUploads');
        if (uploads) {
            uploads.innerHTML = '';
            const uploadItems = app.uploads || {};
            ['headshot', 'runway', 'fullBody'].forEach((key) => {
                const item = uploadItems[key];
                const label = key === 'fullBody' ? 'Full Body' : key.charAt(0).toUpperCase() + key.slice(1);
                const button = document.createElement('button');
                button.className = 'px-3 py-2 rounded-full border border-black/15 text-[11px] uppercase tracking-widest font-semibold focus-ring';
                button.textContent = item ? `Open ${label}` : `${label} missing`;
                button.disabled = !item;
                if (item) {
                    button.addEventListener('click', () => openStorageFile(item.path));
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

    async function openStorageFile(path) {
        if (!path) return;
        try {
            ensureFirebase();
            const storage = firebase.storage();
            const url = await storage.ref().child(path).getDownloadURL();
            window.open(url, '_blank');
        } catch (err) {
            setNotice('Unable to open upload. Ensure you are signed in as admin.');
        }
    }

    async function updateStatus(newStatus) {
        if (!state.selected || !state.selected.id) return;
        try {
            ensureFirebase();
            const db = firebase.firestore();
            await db.collection('applications').doc(state.selected.id).update({ status: newStatus });
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
        return `RM-${out}`;
    }

    async function createCashCode() {
        if (!state.isAdmin || !state.user) {
            setCashNotice('Admin access required.');
            return;
        }
        try {
            ensureFirebase();
            const db = firebase.firestore();
            const code = generateCode();
            const amountValue = Number($('cashAmount')?.value || 0) || null;

            await db.collection('paymentCodes').doc(code).set({
                code,
                amount: amountValue,
                currency: 'NGN',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: state.user.uid,
                used: false,
            });

            const output = $('generatedCashCode');
            if (output) output.textContent = `Code: ${code}`;
            setCashNotice('');
        } catch (err) {
            setCashNotice('Unable to generate code.');
        }
    }

    function attachListeners() {
        $('searchInput')?.addEventListener('input', renderTable);
        $('statusFilter')?.addEventListener('change', renderTable);
        $('detailClose')?.addEventListener('click', closeDetail);
        $('detailDrawer')?.addEventListener('click', (e) => {
            if (e.target === $('detailDrawer')) closeDetail();
        });

        $('detailStatus')?.addEventListener('change', (e) => {
            updateStatus(e.target.value);
        });

        $('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            setNotice('');
            const email = $('adminEmail')?.value || '';
            const password = $('adminPassword')?.value || '';
            try {
                ensureFirebase();
                await firebase.auth().signInWithEmailAndPassword(email, password);
            } catch (err) {
                setNotice('Sign in failed. Check credentials.');
            }
        });

        $('signOutBtn')?.addEventListener('click', async () => {
            try {
                ensureFirebase();
                await firebase.auth().signOut();
            } catch (err) {
                setNotice('Sign out failed.');
            }
        });

        $('generateCashCodeBtn')?.addEventListener('click', createCashCode);
        $('newEventBtn')?.addEventListener('click', () => toggleEventForm(true));
        $('cancelEventBtn')?.addEventListener('click', () => toggleEventForm(false));
        $('saveEventBtn')?.addEventListener('click', createEvent);
    }

    function subscribeApplications() {
        if (state.unsubscribe) state.unsubscribe();
        state.unsubscribe = null;

        if (!state.isAdmin) {
            state.applications = [];
            renderTable();
            setLoading(false);
            return;
        }

        setLoading(true);
        ensureFirebase();
        const db = firebase.firestore();
        state.unsubscribe = db.collection('applications').orderBy('createdAt', 'desc').limit(100)
            .onSnapshot((snap) => {
                state.applications = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setLoading(false);
                renderTable();
            }, () => {
                setLoading(false);
                setNotice('Unable to load applications.');
            });
    }

    function subscribeEvents() {
        if (state.unsubscribeEvents) state.unsubscribeEvents();
        state.unsubscribeEvents = null;

        if (!state.isAdmin) {
            renderEvents([]);
            return;
        }

        ensureFirebase();
        const db = firebase.firestore();
        state.unsubscribeEvents = db.collection('trainingEvents').orderBy('time', 'asc').limit(50)
            .onSnapshot((snap) => {
                const events = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                renderEvents(events);
            }, () => {
                renderEvents([]);
                setEventNotice('Unable to load events.');
            });
    }

    async function handleAuthState(user) {
        state.user = user || null;
        const signedInPanel = $('signedInPanel');
        const loginForm = $('loginForm');
        const signedInEmail = $('signedInEmail');

        if (!user) {
            state.isAdmin = false;
            if (signedInPanel) hide(signedInPanel);
            if (loginForm) show(loginForm, 'block');
            if (signedInEmail) signedInEmail.textContent = '';
            setNotice('Sign in with an admin account to view submissions.');
            subscribeApplications();
            return;
        }

        const token = await user.getIdTokenResult(true);
        state.isAdmin = token?.claims?.admin === true;

        if (signedInEmail) signedInEmail.textContent = user.email || '';
        if (signedInPanel) show(signedInPanel, 'block');
        if (loginForm) hide(loginForm);

        if (!state.isAdmin) {
            setNotice('This account does not have admin access.');
        } else {
            setNotice('');
        }

        subscribeApplications();
        subscribeEvents();
    }

    document.addEventListener('DOMContentLoaded', () => {
        try {
            ensureFirebase();
            attachListeners();
            firebase.auth().onAuthStateChanged(handleAuthState);
        } catch (err) {
            setNotice('Firebase initialization failed.');
        }
    });
})();
