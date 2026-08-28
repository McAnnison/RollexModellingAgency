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
  API_BASE_URL: env.API_BASE_URL || "http://localhost:3000",
};

const fileContents = `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig, null, 2)};\n`;
fs.writeFileSync(outPath, fileContents, "utf8");

console.log("Wrote public-config.js from .env");
