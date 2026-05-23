import { config } from './config.js';

const format = (level, message, meta = {}) => {
  const payload = { level, message, time: new Date().toISOString(), ...meta };
  return config.isProduction ? JSON.stringify(payload) : `[${payload.time}] ${level.toUpperCase()} ${message}${Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''}`;
};

export const logger = {
  info: (message, meta) => console.log(format('info', message, meta)),
  warn: (message, meta) => console.warn(format('warn', message, meta)),
  error: (message, meta) => console.error(format('error', message, meta)),
};
