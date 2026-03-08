// Supabase client integration for this site.
// 1) Create a Supabase project at supabase.com
// 2) Enable Authentication -> Email provider
// 3) Create database tables (see FIREBASE_TO_SUPABASE_MIGRATION.md)
// 4) Enable Storage
// 5) Paste your anon key into window.SUPABASE_CONFIG in supabase-config.js

(function () {
    function assertSupabaseLoaded() {
        if (!window.supabase) {
            throw new Error('Supabase SDK not loaded. Check script tags for supabase-js.');
        }
    }

    async function ensureSignedIn() {
        const { supabase } = window;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) return session.user;

        // Anonymous sign-in (guest users)
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        return data?.user;
    }

    function sanitizeText(value) {
        return String(value ?? '').trim();
    }

    function fileExtensionFromMime(file) {
        const type = (file?.type || '').toLowerCase();
        if (type === 'image/jpeg') return 'jpg';
        if (type === 'image/png') return 'png';
        if (type === 'image/webp') return 'webp';
        if (type === 'video/mp4') return 'mp4';
        if (type === 'video/quicktime') return 'mov';
        // fallback: best-effort from filename
        const name = (file?.name || '').toLowerCase();
        const dot = name.lastIndexOf('.');
        if (dot !== -1 && dot < name.length - 1) return name.slice(dot + 1).replace(/[^a-z0-9]/g, '').slice(0, 6) || 'bin';
        return 'bin';
    }

    async function uploadToStorage(uid, applicationId, kind, file) {
        if (!file) return null;

        const { supabase } = window;
        const ext = fileExtensionFromMime(file);
        const path = `applications/${uid}/${applicationId}/${kind}.${ext}`;
        const fileName = `${kind}.${ext}`;

        const { data, error } = await supabase.storage
            .from('applications')
            .upload(`${uid}/${applicationId}/${fileName}`, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || 'application/octet-stream'
            });

        if (error) {
            console.error('Storage upload error:', error);
            throw error;
        }

        // Store the path; keep reads locked down in policies.
        return {
            path: data.path,
            contentType: file.type || null,
            size: file.size || null,
            name: file.name || null,
        };
    }

    async function submitApplication(payload) {
        assertSupabaseLoaded();
        if (!window.SUPABASE_CONFIG) {
            throw new Error('Missing SUPABASE_CONFIG. Paste your Supabase anon key into window.SUPABASE_CONFIG in supabase-config.js.');
        }

        // Initialize Supabase client if not already initialized
        if (!window.supabaseClient) {
            window.supabaseClient = window.supabase.createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.anonKey
            );
        }

        const supabase = window.supabaseClient;
        const user = await ensureSignedIn();

        const application = {
            uid: user.id,
            full_name: sanitizeText(payload.fullName),
            email: sanitizeText(payload.email),
            phone: sanitizeText(payload.phone),
            instagram: sanitizeText(payload.instagram),
            height_cm: Number(payload.heightCm) || null,
            waist_cm: Number(payload.waistCm) || null,
            shoe_size_eu: sanitizeText(payload.shoeSizeEU),
            eye_color: sanitizeText(payload.eyeColor),
            payment_ref: sanitizeText(payload.paymentRef) || null,
            payment_method: sanitizeText(payload.paymentMethod) || null,
            payment_code: sanitizeText(payload.paymentCode) || null,
            payment_amount: Number(payload.paymentAmount) || null,
            payment_currency: sanitizeText(payload.paymentCurrency) || null,
            payment_status: payload.paymentRef ? "paid" : "pending",
            status: 'submitted',
            uploads: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Create doc first so we have a stable ID for Storage paths.
        const { data: docData, error: docError } = await supabase
            .from('applications')
            .insert([application])
            .select()
            .single();

        if (docError) {
            console.error('Database insert error:', docError);
            throw docError;
        }

        const applicationId = docData.id;

        // Handle file uploads
        const uploads = {
            headshot: await uploadToStorage(user.id, applicationId, 'headshot', payload.files?.headshot || null),
            runway: await uploadToStorage(user.id, applicationId, 'runway', payload.files?.runway || null),
            full_body: await uploadToStorage(user.id, applicationId, 'fullBody', payload.files?.fullBody || null),
        };

        // Update the record with upload paths
        await supabase
            .from('applications')
            .update({ uploads, updated_at: new Date().toISOString() })
            .eq('id', applicationId);

        return { id: applicationId };
    }

    // Export functions to global scope
    window.submitApplicationToSupabase = submitApplication;
    
    // Alias for backward compatibility
    window.submitApplicationToFirebase = function(payload) {
        console.warn('Using deprecated Firebase function. Please update to use submitApplicationToSupabase.');
        return submitApplication(payload);
    };
})();
