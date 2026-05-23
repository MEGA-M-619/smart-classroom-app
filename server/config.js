import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function loadEnvFile(fileName) {
  const file = path.join(rootDir, fileName);
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const toList = (value) => (value || '').split(',').map((item) => item.trim()).filter(Boolean);
const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const defaultJwt = 'smartclass-dev-secret-change-in-production';
const jwtSecret = process.env.JWT_SECRET || defaultJwt;

if (isProduction && jwtSecret === defaultJwt) {
  throw new Error('JWT_SECRET must be set to a strong secret in production.');
}

export const config = {
  env,
  isProduction,
  rootDir,
  host: process.env.HOST || '0.0.0.0',
  port: toNumber(process.env.PORT, 3001),
  publicUrl: process.env.PUBLIC_URL || '',
  allowedOrigins: toList(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databasePath: process.env.DATABASE_PATH || (process.env.VERCEL ? '/tmp/smartclass.db' : path.join(__dirname, 'data', 'smartclass.db')),
  uploadDir: process.env.UPLOAD_DIR || (process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads')),
  maxUploadMb: toNumber(process.env.MAX_UPLOAD_MB, 25),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 300),
  seedOnEmpty: process.env.SEED_ON_EMPTY !== 'false',
};
