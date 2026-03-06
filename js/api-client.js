// MongoDB REST API client for Rolex Modelling Agency.
// Replaces the previous Firebase client integration.
//
// Configuration:
//   Set window.API_BASE_URL to the URL of the backend server before including this script.
//   e.g. window.API_BASE_URL = "http://localhost:3000";

(function () {
    function getApiBase() {
        return (window.API_BASE_URL || '').replace(/\/$/, '');
    }

    function getSessionId() {
        try {
            let id = localStorage.getItem('rollex_session_id');
            if (!id) {
                id = 'sess-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
                localStorage.setItem('rollex_session_id', id);
            }
            return id;
        } catch (e) {
            return 'sess-' + Math.random().toString(36).slice(2);
        }
    }

    function fileExtensionFromMime(file) {
        const type = (file && file.type || '').toLowerCase();
        if (type === 'image/jpeg') return 'jpg';
        if (type === 'image/png') return 'png';
        if (type === 'image/webp') return 'webp';
        if (type === 'video/mp4') return 'mp4';
        if (type === 'video/quicktime') return 'mov';
        const name = (file && file.name || '').toLowerCase();
        const dot = name.lastIndexOf('.');
        if (dot !== -1 && dot < name.length - 1) return name.slice(dot + 1).replace(/[^a-z0-9]/g, '').slice(0, 6) || 'bin';
        return 'bin';
    }

    async function submitApplication(payload) {
        const base = getApiBase();
        if (!base) {
            throw new Error('Missing API_BASE_URL. Set window.API_BASE_URL to the backend server URL.');
        }

        const sessionId = getSessionId();

        const form = new FormData();
        form.append('sessionId', sessionId);
        form.append('fullName', String(payload.fullName || '').trim());
        form.append('email', String(payload.email || '').trim());
        form.append('phone', String(payload.phone || '').trim());
        form.append('instagram', String(payload.instagram || '').trim());
        form.append('heightCm', String(Number(payload.heightCm) || ''));
        form.append('waistCm', String(Number(payload.waistCm) || ''));
        form.append('shoeSizeEU', String(payload.shoeSizeEU || '').trim());
        form.append('eyeColor', String(payload.eyeColor || '').trim());
        form.append('paymentRef', String(payload.paymentRef || '').trim());
        form.append('paymentMethod', String(payload.paymentMethod || '').trim());
        form.append('paymentCode', String(payload.paymentCode || '').trim());
        form.append('paymentAmount', String(Number(payload.paymentAmount) || ''));
        form.append('paymentCurrency', String(payload.paymentCurrency || '').trim());
        form.append('userAgent', navigator.userAgent);

        if (payload.files) {
            if (payload.files.headshot) form.append('headshot', payload.files.headshot);
            if (payload.files.runway) form.append('runway', payload.files.runway);
            if (payload.files.fullBody) form.append('fullBody', payload.files.fullBody);
        }

        const res = await fetch(base + '/api/applications', {
            method: 'POST',
            body: form,
        });

        if (!res.ok) {
            let msg = 'Submission failed.';
            try { msg = (await res.json()).error || msg; } catch (e) { /* ignore */ }
            throw new Error(msg);
        }

        const data = await res.json();
        return { id: data.id, sessionId };
    }

    async function redeemCashCode(code) {
        const base = getApiBase();
        if (!base) throw new Error('Missing API_BASE_URL.');

        const sessionId = getSessionId();

        const res = await fetch(base + '/api/payment-codes/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: String(code || '').trim().toUpperCase(), sessionId }),
        });

        if (!res.ok) {
            let msg = 'Invalid or already used code.';
            try {
                const body = await res.json();
                msg = body.error || msg;
            } catch (e) { /* ignore */ }
            throw new Error(msg);
        }

        return res.json();
    }

    window.submitApplicationToAPI = submitApplication;
    window.redeemCashCodeAPI = redeemCashCode;
    window.getSessionId = getSessionId;
})();
