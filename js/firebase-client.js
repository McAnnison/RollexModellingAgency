// Firebase client integration for this site.
// 1) Create a Firebase project
// 2) Enable Authentication -> Anonymous
// 3) Create Firestore database
// 4) Enable Storage
// 5) Paste your web app config into window.FIREBASE_CONFIG in index.html

(function () {
    function assertFirebaseLoaded() {
        if (!window.firebase) {
            throw new Error('Firebase SDK not loaded. Check script tags for firebase-app-compat, auth, firestore, storage.');
        }
    }

    async function ensureSignedIn() {
        const auth = firebase.auth();
        if (auth.currentUser) return auth.currentUser;

        // Anonymous auth keeps writes rate-limited by rules and lets Storage rules key off UID.
        const result = await auth.signInAnonymously();
        return result.user;
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

        const storage = firebase.storage();
        const ext = fileExtensionFromMime(file);
        const path = `applications/${uid}/${applicationId}/${kind}.${ext}`;
        const ref = storage.ref().child(path);

        await ref.put(file, { contentType: file.type || 'application/octet-stream' });

        // Store the path; keep reads locked down in rules.
        return {
            path,
            contentType: file.type || null,
            size: file.size || null,
            name: file.name || null,
        };
    }

    async function submitApplication(payload) {
        assertFirebaseLoaded();
        if (!window.FIREBASE_CONFIG) {
            throw new Error('Missing FIREBASE_CONFIG. Paste your Firebase web config into window.FIREBASE_CONFIG in index.html.');
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(window.FIREBASE_CONFIG);
        }

        const user = await ensureSignedIn();
        const db = firebase.firestore();

        const application = {
            uid: user.uid,
            fullName: sanitizeText(payload.fullName),
            email: sanitizeText(payload.email),
            phone: sanitizeText(payload.phone),
            instagram: sanitizeText(payload.instagram),
            heightCm: Number(payload.heightCm) || null,
            waistCm: Number(payload.waistCm) || null,
            shoeSizeEU: sanitizeText(payload.shoeSizeEU),
            eyeColor: sanitizeText(payload.eyeColor),
            paymentRef: sanitizeText(payload.paymentRef) || null,
            paymentMethod: sanitizeText(payload.paymentMethod) || null,
            paymentCode: sanitizeText(payload.paymentCode) || null,
            paymentAmount: Number(payload.paymentAmount) || null,
            paymentCurrency: sanitizeText(payload.paymentCurrency) || null,
            paymentStatus: payload.paymentRef ? "paid" : "pending",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'submitted',
            uploads: null,
            userAgent: navigator.userAgent,
        };

        // Create doc first so we have a stable ID for Storage paths.
        const docRef = await db.collection('applications').add(application);

        const uploads = {
            headshot: await uploadToStorage(user.uid, docRef.id, 'headshot', payload.files?.headshot || null),
            runway: await uploadToStorage(user.uid, docRef.id, 'runway', payload.files?.runway || null),
            fullBody: await uploadToStorage(user.uid, docRef.id, 'fullBody', payload.files?.fullBody || null),
        };

        await docRef.update({ uploads });

        return { id: docRef.id };
    }

    window.submitApplicationToFirebase = submitApplication;
})();
