const fs = require("fs");
const path = require("path");

function parseEnv(content) {
  const out = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  });
  return out;
}

const envPath = path.join(process.cwd(), ".env");
const outPath = path.join(process.cwd(), "public-config.js");

if (!fs.existsSync(envPath)) {
  console.error(".env not found. Create it first.");
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));

const runtimeConfig = {
  PAYSTACK_PUBLIC_KEY: env.PAYSTACK_PUBLIC_KEY || "",
  FIREBASE_CONFIG: {
    apiKey: env.FIREBASE_API_KEY || "",
    authDomain: env.FIREBASE_AUTH_DOMAIN || "",
    projectId: env.FIREBASE_PROJECT_ID || "",
    storageBucket: env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.FIREBASE_APP_ID || "",
    measurementId: env.FIREBASE_MEASUREMENT_ID || "",
  },
};

const fileContents = `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig, null, 2)};\n`;
fs.writeFileSync(outPath, fileContents, "utf8");

console.log("Wrote public-config.js from .env");
