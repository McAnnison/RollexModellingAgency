// Shared DOM & API utilities used across multiple pages.
// Include this script before page-specific scripts.

(function () {
    'use strict';

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

    function formatDate(value) {
        if (!value) return '\u2014';
        try {
            var date = new Date(value);
            if (Number.isNaN(date.getTime())) return '\u2014';
            return date.toLocaleString();
        } catch (err) {
            return '\u2014';
        }
    }

    function createNotice(elementId) {
        return function setNotice(message) {
            var notice = $(elementId);
            if (!notice) return;
            if (!message) {
                hide(notice);
                notice.textContent = '';
            } else {
                notice.textContent = message;
                show(notice, 'block');
            }
        };
    }

    function createLoader(elementId, loadingText) {
        return function setLoading(isLoading) {
            var loader = $(elementId);
            if (!loader) return;
            if (isLoading) {
                loader.textContent = loadingText || 'Loading\u2026';
                show(loader, 'block');
            } else {
                hide(loader);
            }
        };
    }

    function generateSecureId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return 'sess-' + crypto.randomUUID();
        }
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            var arr = new Uint8Array(16);
            crypto.getRandomValues(arr);
            return 'sess-' + Array.from(arr, function (b) {
                return b.toString(16).padStart(2, '0');
            }).join('');
        }
        return 'sess-' + Date.now().toString(36) + '-' + (Math.random() * 0xffffffff | 0).toString(36);
    }

    function getSessionId() {
        try {
            var id = localStorage.getItem('rollex_session_id');
            if (!id) {
                id = generateSecureId();
                localStorage.setItem('rollex_session_id', id);
            }
            return id;
        } catch (e) {
            return generateSecureId();
        }
    }

    function generateCode() {
        var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var out = '';
        for (var i = 0; i < 8; i += 1) {
            out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }
        return 'RM-' + out;
    }

    window.RollexUtils = {
        getApiBase: getApiBase,
        $: $,
        show: show,
        hide: hide,
        formatDate: formatDate,
        createNotice: createNotice,
        createLoader: createLoader,
        generateSecureId: generateSecureId,
        getSessionId: getSessionId,
        generateCode: generateCode,
    };
})();
