/**
 * Unit tests for tools/generate-config.js
 *
 * The script reads a .env file and writes a public-config.js file.
 * We test the parseEnv logic and the output generation logic.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ---------------------------------------------------------------------------
// parseEnv extracted from tools/generate-config.js for unit testing
// ---------------------------------------------------------------------------

function parseEnv(content) {
  const out = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  });
  return out;
}

// Mirrors the config generation logic from tools/generate-config.js
function buildRuntimeConfig(env) {
  return {
    PAYSTACK_PUBLIC_KEY: env.PAYSTACK_PUBLIC_KEY || '',
    FIREBASE_CONFIG: {
      apiKey: env.FIREBASE_API_KEY || '',
      authDomain: env.FIREBASE_AUTH_DOMAIN || '',
      projectId: env.FIREBASE_PROJECT_ID || '',
      storageBucket: env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.FIREBASE_APP_ID || '',
      measurementId: env.FIREBASE_MEASUREMENT_ID || '',
    },
  };
}

describe('parseEnv', () => {
  it('parses simple key=value pairs', () => {
    const input = 'FOO=bar\nBAZ=qux';
    expect(parseEnv(input)).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('ignores empty lines', () => {
    const input = '\nFOO=bar\n\nBAZ=qux\n';
    expect(parseEnv(input)).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('ignores comment lines', () => {
    const input = '# this is a comment\nFOO=bar\n# another comment';
    expect(parseEnv(input)).toEqual({ FOO: 'bar' });
  });

  it('handles values with equals signs', () => {
    const input = 'URL=https://example.com?a=1&b=2';
    expect(parseEnv(input)).toEqual({ URL: 'https://example.com?a=1&b=2' });
  });

  it('handles empty values', () => {
    const input = 'EMPTY=';
    expect(parseEnv(input)).toEqual({ EMPTY: '' });
  });

  it('trims keys and values', () => {
    const input = '  KEY  =  value  ';
    expect(parseEnv(input)).toEqual({ KEY: 'value' });
  });

  it('skips lines without =', () => {
    const input = 'NO_EQUALS\nGOOD=yes';
    expect(parseEnv(input)).toEqual({ GOOD: 'yes' });
  });

  it('handles Windows line endings', () => {
    const input = 'A=1\r\nB=2\r\n';
    expect(parseEnv(input)).toEqual({ A: '1', B: '2' });
  });

  it('returns empty object for empty input', () => {
    expect(parseEnv('')).toEqual({});
  });

  it('returns empty object for comments-only input', () => {
    expect(parseEnv('# only comments\n# here')).toEqual({});
  });
});

describe('buildRuntimeConfig', () => {
  it('populates all fields from env', () => {
    const env = {
      PAYSTACK_PUBLIC_KEY: 'pk_test_123',
      FIREBASE_API_KEY: 'AIza123',
      FIREBASE_AUTH_DOMAIN: 'app.firebaseapp.com',
      FIREBASE_PROJECT_ID: 'my-project',
      FIREBASE_STORAGE_BUCKET: 'my-project.appspot.com',
      FIREBASE_MESSAGING_SENDER_ID: '12345',
      FIREBASE_APP_ID: '1:12345:web:abc',
      FIREBASE_MEASUREMENT_ID: 'G-XYZ',
    };
    const config = buildRuntimeConfig(env);
    expect(config.PAYSTACK_PUBLIC_KEY).toBe('pk_test_123');
    expect(config.FIREBASE_CONFIG.apiKey).toBe('AIza123');
    expect(config.FIREBASE_CONFIG.projectId).toBe('my-project');
    expect(config.FIREBASE_CONFIG.storageBucket).toBe('my-project.appspot.com');
    expect(config.FIREBASE_CONFIG.measurementId).toBe('G-XYZ');
  });

  it('uses empty strings for missing env values', () => {
    const config = buildRuntimeConfig({});
    expect(config.PAYSTACK_PUBLIC_KEY).toBe('');
    expect(config.FIREBASE_CONFIG.apiKey).toBe('');
    expect(config.FIREBASE_CONFIG.projectId).toBe('');
    expect(config.FIREBASE_CONFIG.appId).toBe('');
  });

  it('generates valid window assignment string', () => {
    const env = { PAYSTACK_PUBLIC_KEY: 'pk_test_456' };
    const config = buildRuntimeConfig(env);
    const output = `window.RUNTIME_CONFIG = ${JSON.stringify(config, null, 2)};\n`;
    expect(output).toContain('window.RUNTIME_CONFIG');
    expect(output).toContain('pk_test_456');
    // Verify JSON is valid by parsing
    const jsonPart = output.replace('window.RUNTIME_CONFIG = ', '').replace(';\n', '');
    expect(() => JSON.parse(jsonPart)).not.toThrow();
  });
});

describe('generate-config.js end-to-end', () => {
  const tmpDir = path.join(__dirname, '..', '.test-tmp-config');

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces a valid public-config.js file', () => {
    const envContent = [
      'PAYSTACK_PUBLIC_KEY=pk_live_abc',
      'FIREBASE_API_KEY=AIzaSyTest',
      'FIREBASE_PROJECT_ID=test-proj',
    ].join('\n');

    fs.writeFileSync(path.join(tmpDir, '.env'), envContent);

    // Run the script in its own process using the tmp dir as cwd
    const scriptPath = path.join(__dirname, '..', 'tools', 'generate-config.js');
    execFileSync('node', [scriptPath], { cwd: tmpDir, stdio: 'pipe' });

    const output = fs.readFileSync(path.join(tmpDir, 'public-config.js'), 'utf8');
    expect(output).toContain('window.RUNTIME_CONFIG');
    expect(output).toContain('pk_live_abc');
    expect(output).toContain('AIzaSyTest');
    expect(output).toContain('test-proj');

    // Parse and verify structure
    const jsonStr = output.replace('window.RUNTIME_CONFIG = ', '').replace(';\n', '');
    const parsed = JSON.parse(jsonStr);
    expect(parsed.PAYSTACK_PUBLIC_KEY).toBe('pk_live_abc');
    expect(parsed.FIREBASE_CONFIG.apiKey).toBe('AIzaSyTest');
    expect(parsed.FIREBASE_CONFIG.projectId).toBe('test-proj');
    expect(parsed.FIREBASE_CONFIG.authDomain).toBe('');
  });

  it('exits with error when .env is missing', () => {
    const emptyDir = path.join(tmpDir, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });

    expect(() => {
      const scriptPath = path.join(__dirname, '..', 'tools', 'generate-config.js');
      execFileSync('node', [scriptPath], {
        cwd: emptyDir,
        stdio: 'pipe',
      });
    }).toThrow();
  });
});
