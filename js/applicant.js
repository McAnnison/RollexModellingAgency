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
            const date = value.toDate ? value.toDate() : new Date(value);
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
                <td class="py-4 pr-4">${formatDate(app.createdAt)}</td>
            `;
            body.appendChild(row);
        });
    }

    function subscribeApplications(uid) {
        ensureFirebase();
        const db = firebase.firestore();
        setLoading(true);

        return db.collection('applications')
            .where('uid', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .onSnapshot((snap) => {
                const apps = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setLoading(false);
                render(apps);
            }, () => {
                setLoading(false);
                setNotice('Unable to load submissions.');
            });
    }

    document.addEventListener('DOMContentLoaded', () => {
        try {
            ensureFirebase();
        } catch (err) {
            setNotice('Firebase initialization failed.');
            return;
        }

        let unsubscribe = null;

        $('refreshBtn')?.addEventListener('click', () => {
            if (unsubscribe) unsubscribe();
            const user = firebase.auth().currentUser;
            if (user) {
                unsubscribe = subscribeApplications(user.uid);
            }
        });

        firebase.auth().onAuthStateChanged(async (user) => {
            setNotice('');

            if (!user) {
                try {
                    await firebase.auth().signInAnonymously();
                } catch (err) {
                    setNotice('Sign-in failed. Please retry.');
                }
                return;
            }

            if (unsubscribe) unsubscribe();
            unsubscribe = subscribeApplications(user.uid);
        });
    });
})();
