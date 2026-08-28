/**
 * Unit tests for pure utility functions extracted from frontend JS modules.
 *
 * The frontend files (js/admin.js, js/api-client.js, js/applicant.js,
 * js/training.js) are IIFEs that rely on DOM APIs.  We test the logic by
 * re-implementing the pure functions here (same source) and verifying their
 * behaviour.  This mirrors the actual code paths inside each module.
 */

'use strict';

// ---------------------------------------------------------------------------
// Functions extracted from js/admin.js
// ---------------------------------------------------------------------------

function getApiBase(apiBaseUrl) {
  return (apiBaseUrl || '').replace(/\/$/, '');
}

function formatDate(value) {
  if (!value) return '\u2014';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '\u2014';
    return date.toLocaleString();
  } catch (err) {
    return '\u2014';
  }
}

function normalizedText(value) {
  return String(value || '').toLowerCase().trim();
}

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return 'RM-' + out;
}

// Functions extracted from js/training.js

function getImageUrl(eventPath, apiBaseUrl) {
  if (!eventPath) return null;
  const base = getApiBase(apiBaseUrl);
  if (!base) return null;
  return base + '/api/events/' + eventPath + '/image';
}

// Functions extracted from js/api-client.js

function generateSecureId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'sess-' + crypto.randomUUID();
  }
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return 'sess-' + Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Tests: getApiBase (shared across admin.js, api-client.js, training.js, applicant.js)
// ---------------------------------------------------------------------------

describe('getApiBase', () => {
  it('returns empty string when no URL is set', () => {
    expect(getApiBase(undefined)).toBe('');
    expect(getApiBase(null)).toBe('');
    expect(getApiBase('')).toBe('');
  });

  it('strips trailing slash', () => {
    expect(getApiBase('http://localhost:3000/')).toBe('http://localhost:3000');
  });

  it('does not strip when there is no trailing slash', () => {
    expect(getApiBase('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('strips multiple trailing slashes one at a time', () => {
    // regex only strips the last slash
    expect(getApiBase('http://example.com//')).toBe('http://example.com/');
  });
});

// ---------------------------------------------------------------------------
// Tests: formatDate (shared across admin.js, applicant.js, training.js)
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  it('returns em-dash for falsy values', () => {
    expect(formatDate(null)).toBe('\u2014');
    expect(formatDate(undefined)).toBe('\u2014');
    expect(formatDate('')).toBe('\u2014');
    expect(formatDate(0)).toBe('\u2014');
  });

  it('returns em-dash for invalid date strings', () => {
    expect(formatDate('not-a-date')).toBe('\u2014');
  });

  it('formats a valid ISO date string', () => {
    const result = formatDate('2025-01-15T12:00:00Z');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('\u2014');
    // Should contain some numeric representation
    expect(result).toMatch(/\d/);
  });

  it('formats a Date object timestamp', () => {
    const ts = new Date('2024-06-01T08:30:00Z').toISOString();
    const result = formatDate(ts);
    expect(result).not.toBe('\u2014');
  });
});

// ---------------------------------------------------------------------------
// Tests: normalizedText (admin.js)
// ---------------------------------------------------------------------------

describe('normalizedText', () => {
  it('lowercases and trims text', () => {
    expect(normalizedText('  Hello World  ')).toBe('hello world');
  });

  it('handles null/undefined', () => {
    expect(normalizedText(null)).toBe('');
    expect(normalizedText(undefined)).toBe('');
  });

  it('converts numbers to string', () => {
    expect(normalizedText(42)).toBe('42');
  });

  it('handles empty string', () => {
    expect(normalizedText('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Tests: generateCode (admin.js, functions/index.js)
// ---------------------------------------------------------------------------

describe('generateCode', () => {
  it('returns a string starting with RM-', () => {
    const code = generateCode();
    expect(code.startsWith('RM-')).toBe(true);
  });

  it('produces an 11-character code (RM- + 8 chars)', () => {
    const code = generateCode();
    expect(code.length).toBe(11);
  });

  it('only contains valid alphabet characters after prefix', () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      const suffix = code.slice(3);
      for (const ch of suffix) {
        expect(alphabet).toContain(ch);
      }
    }
  });

  it('does not include ambiguous characters (0, O, 1, I)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      const suffix = code.slice(3);
      expect(suffix).not.toMatch(/[0OI1]/);
    }
  });

  it('generates different codes on subsequent calls', () => {
    const codes = new Set();
    for (let i = 0; i < 20; i++) {
      codes.add(generateCode());
    }
    // Extremely unlikely to get duplicates in 20 runs
    expect(codes.size).toBeGreaterThan(15);
  });
});

// ---------------------------------------------------------------------------
// Tests: getImageUrl (training.js)
// ---------------------------------------------------------------------------

describe('getImageUrl', () => {
  it('returns null when path is falsy', () => {
    expect(getImageUrl(null, 'http://localhost:3000')).toBeNull();
    expect(getImageUrl('', 'http://localhost:3000')).toBeNull();
  });

  it('returns null when base URL is not set', () => {
    expect(getImageUrl('some/path', '')).toBeNull();
    expect(getImageUrl('some/path', null)).toBeNull();
  });

  it('constructs the correct image URL', () => {
    const url = getImageUrl('event-123', 'http://localhost:3000');
    expect(url).toBe('http://localhost:3000/api/events/event-123/image');
  });
});

// ---------------------------------------------------------------------------
// Tests: generateSecureId (api-client.js)
// ---------------------------------------------------------------------------

describe('generateSecureId', () => {
  it('returns a string starting with sess-', () => {
    const id = generateSecureId();
    expect(id.startsWith('sess-')).toBe(true);
  });

  it('generates unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 20; i++) {
      ids.add(generateSecureId());
    }
    expect(ids.size).toBe(20);
  });

  it('produces a sufficiently long ID', () => {
    const id = generateSecureId();
    // sess- prefix + UUID (36 chars) or hex string (32 chars)
    expect(id.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Tests: filter logic from admin.js renderTable
// ---------------------------------------------------------------------------

describe('application filtering logic (admin.js)', () => {
  const apps = [
    { fullName: 'Jane Doe', email: 'jane@test.com', status: 'submitted' },
    { fullName: 'John Smith', email: 'john@test.com', status: 'approved' },
    { fullName: 'Alice Brown', email: 'alice@test.com', status: 'submitted' },
  ];

  function filterApps(applications, search, status) {
    const normalizedSearch = normalizedText(search);
    return applications.filter(function (app) {
      const matchesSearch = !normalizedSearch ||
        normalizedText(app.fullName).includes(normalizedSearch) ||
        normalizedText(app.email).includes(normalizedSearch);
      const matchesStatus = !status || app.status === status;
      return matchesSearch && matchesStatus;
    });
  }

  it('returns all apps when no filters applied', () => {
    expect(filterApps(apps, '', '')).toHaveLength(3);
  });

  it('filters by search text on fullName', () => {
    expect(filterApps(apps, 'jane', '')).toHaveLength(1);
    expect(filterApps(apps, 'jane', '')[0].fullName).toBe('Jane Doe');
  });

  it('filters by search text on email', () => {
    expect(filterApps(apps, 'john@', '')).toHaveLength(1);
  });

  it('filters by status', () => {
    expect(filterApps(apps, '', 'submitted')).toHaveLength(2);
    expect(filterApps(apps, '', 'approved')).toHaveLength(1);
  });

  it('combines search and status filters', () => {
    expect(filterApps(apps, 'alice', 'submitted')).toHaveLength(1);
    expect(filterApps(apps, 'jane', 'approved')).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    expect(filterApps(apps, 'JANE', '')).toHaveLength(1);
    expect(filterApps(apps, 'Jane Doe', '')).toHaveLength(1);
  });
});
