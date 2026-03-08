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

        const search = normalizedText($('searchInput')?.value);
        const status = $('statusFilter')?.value || '';

        const filtered = state.applications.filter((app) => {
            const matchesSearch = !search ||
                normalizedText(app.full_name).includes(search) ||
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
                <td class="py-4 pr-4 font-semibold">${app.full_name || '—'}</td>
                <td class="py-4 pr-4">${app.email || '—'}</td>
                <td class="py-4 pr-4 capitalize">${app.status || 'submitted'}</td>
                <td class="py-4 pr-4">${formatDate(app.created_at)}</td>
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
            const imageLabel = evt.image_path ? 'View' : '—';
            row.innerHTML = `
                <td class="py-4 pr-4 font-semibold">${evt.title || '—'}</td>
                <td class="py-4 pr-4">${timeText}</td>
                <td class="py-4 pr-4">${evt.location || '—'}</td>
                <td class="py-4 pr-4">${evt.venue || '—'}</td>
                <td class="py-4 pr-4">
                    <button class="text-[11px] uppercase tracking-widest font-semibold underline" ${evt.image_path ? '' : 'disabled'}>
                        ${imageLabel}
                    </button>
                </td>
            `;

            const btn = row.querySelector('button');
            if (btn && evt.image_path) {
                btn.addEventListener('click', () => openStorageFile(evt.image_path));
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
        const supabase = ensureSupabase();
        const ext = (file.name || '').split('.').pop() || 'jpg';
        const fileName = `cover.${ext}`;
        
        const { data, error } = await supabase.storage
            .from('events')
            .upload(`${eventId}/${fileName}`, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type || 'image/jpeg'
            });

        if (error) {
            console.error('Storage upload error:', error);
            throw error;
        }

        return data.path;
    }

    async function createEvent() {
        if (!state.isAdmin || !state.user) {
            setEventNotice('Admin access required.');
            return;
        }

        const supabase = ensureSupabase();
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
            const { data: docData, error: docError } = await supabase
                .from('training_events')
                .insert([{
                    title,
                    location,
                    venue,
                    time: new Date(timeInput).toISOString(),
                    created_by: state.user.id,
                    image_path: null
                }])
                .select()
                .single();

            if (docError) throw docError;

            let imagePath = null;
            if (imageFile) {
                imagePath = await uploadEventImage(docData.id, imageFile);
                await supabase
                    .from('training_events')
                    .update({ image_path: imagePath })
                    .eq('id', docData.id);
            }

            toggleEventForm(false);
        } catch (err) {
            console.error('Create event error:', err);
            setEventNotice('Unable to publish event.');
        }
    }

    function openDetail(app) {
        state.selected = app;
        const drawer = $('detailDrawer');
        if (!drawer) return;

        $('detailTitle').textContent = app.full_name || 'Applicant';
        $('detailEmail').textContent = app.email ? `Email: ${app.email}` : 'Email: —';
        $('detailPhone').textContent = app.phone ? `Phone: ${app.phone}` : 'Phone: —';
        $('detailInstagram').textContent = app.instagram ? `Instagram: ${app.instagram}` : 'Instagram: —';

        $('detailHeight').textContent = app.height_cm ? `Height: ${app.height_cm} cm` : 'Height: —';
        $('detailWaist').textContent = app.waist_cm ? `Waist: ${app.waist_cm} cm` : 'Waist: —';
        $('detailShoe').textContent = app.shoe_size_eu ? `Shoe: EU ${app.shoe_size_eu}` : 'Shoe: —';
        $('detailEye').textContent = app.eye_color ? `Eye: ${app.eye_color}` : 'Eye: —';

        const statusSelect = $('detailStatus');
        if (statusSelect) statusSelect.value = app.status || 'submitted';

        const uploads = $('detailUploads');
        if (uploads) {
            uploads.innerHTML = '';
            const uploadItems = app.uploads || {};
            ['headshot', 'runway', 'full_body'].forEach((key) => {
                const item = uploadItems[key];
                const label = key === 'full_body' ? 'Full Body' : key.charAt(0).toUpperCase() + key.slice(1);
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
            const supabase = ensureSupabase();
            const { data, error } = supabase.storage
                .from('applications')
                .getPublicUrl(path);
            
            if (error) throw error;
            
            window.open(data.publicUrl, '_blank');
        } catch (err) {
            console.error('Storage error:', err);
            setNotice('Unable to open upload. Ensure you are signed in as admin.');
        }
    }

    async function updateStatus(newStatus) {
        if (!state.selected || !state.selected.id) return;
        try {
            const supabase = ensureSupabase();
            await supabase
                .from('applications')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', state.selected.id);
        } catch (err) {
            console.error('Update error:', err);
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
            const supabase = ensureSupabase();
            const code = generateCode();
            const amountValue = Number($('cashAmount')?.value || 0) || null;

            const { error } = await supabase
                .from('payment_codes')
                .insert([{
                    code,
                    amount: amountValue,
                    currency: 'NGN',
                    used: false,
                    created_by: state.user.id
                }]);

            if (error) throw error;

            const output = $('generatedCashCode');
            if (output) output.textContent = `Code: ${code}`;
            setCashNotice('');
        } catch (err) {
            console.error('Create code error:', err);
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
                const supabase = ensureSupabase();
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
            } catch (err) {
                console.error('Login error:', err);
                setNotice('Sign in failed. Check credentials.');
            }
        });

        $('signOutBtn')?.addEventListener('click', async () => {
            try {
                const supabase = ensureSupabase();
                await supabase.auth.signOut();
            } catch (err) {
                console.error('Sign out error:', err);
                setNotice('Sign out failed.');
            }
        });

        $('generateCashCodeBtn')?.addEventListener('click', createCashCode);
        $('newEventBtn')?.addEventListener('click', () => toggleEventForm(true));
        $('cancelEventBtn')?.addEventListener('click', () => toggleEventForm(false));
        $('saveEventBtn')?.addEventListener('click', createEvent);
    }

    function subscribeApplications() {
        if (state.unsubscribe) {
            state.unsubscribe();
            state.unsubscribe = null;
        }

        if (!state.isAdmin) {
            state.applications = [];
            renderTable();
            setLoading(false);
            return;
        }

        setLoading(true);
        const supabase = ensureSupabase();
        
        state.unsubscribe = supabase
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)
            .then(({ data, error }) => {
                setLoading(false);
                if (error) {
                    console.error('Load applications error:', error);
                    setNotice('Unable to load applications.');
                    return;
                }
                state.applications = data || [];
                renderTable();
            });
    }

    function subscribeEvents() {
        if (state.unsubscribeEvents) {
            state.unsubscribeEvents();
            state.unsubscribeEvents = null;
        }

        if (!state.isAdmin) {
            renderEvents([]);
            return;
        }

        const supabase = ensureSupabase();
        
        state.unsubscribeEvents = supabase
            .from('training_events')
            .select('*')
            .order('time', { ascending: true })
            .limit(50)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Load events error:', error);
                    setEventNotice('Unable to load events.');
                    return;
                }
                renderEvents(data || []);
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

        // Check if user is admin (using user metadata)
        const { data: roleData } = await window.supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .single();
        
        state.isAdmin = !!roleData;

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
            ensureSupabase();
            attachListeners();
            window.supabaseClient.auth.onAuthStateChanged(handleAuthState);
        } catch (err) {
            console.error('Init error:', err);
            setNotice('Supabase initialization failed.');
        }
    });
})();
