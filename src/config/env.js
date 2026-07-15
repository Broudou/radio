import 'dotenv/config';
import path from 'node:path';
import os from 'node:os';

function expandHome(p) {
  if (!p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

export const config = Object.freeze({
  mongodbUri: required('MONGODB_URI'),
  jwtSecret,
  port: Number(process.env.PORT) || 4322,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',

  uploadDir: path.resolve(expandHome(process.env.UPLOAD_DIR || './uploads')),
  maxTrackUploadBytes: (Number(process.env.MAX_TRACK_UPLOAD_MB) || 50) * 1024 * 1024,
  maxCoverUploadBytes: (Number(process.env.MAX_COVER_UPLOAD_MB) || 5) * 1024 * 1024,

  liquidsoapDir: path.resolve(expandHome(process.env.LIQUIDSOAP_DIR || './liquidsoap')),
  icecastSourcePassword: process.env.ICECAST_SOURCE_PASSWORD || '',
  icecastHost: process.env.ICECAST_HOST || 'localhost',
  icecastPort: Number(process.env.ICECAST_PORT) || 8000,
  icecastMount: process.env.ICECAST_MOUNT || '/stream',
  icecastStatusUrl: process.env.ICECAST_STATUS_URL || 'http://127.0.0.1:8000/status-json.xsl',

  stationName: process.env.STATION_NAME || 'My Radio',
  stationDescription: process.env.STATION_DESCRIPTION || 'A self-hosted internet radio station',
  stationGenre: process.env.STATION_GENRE || 'Various',
  stationPublicUrl: process.env.STATION_PUBLIC_URL || 'http://localhost',

  liquidsoapRestartEnabled: process.env.LIQUIDSOAP_RESTART_ENABLED === 'true',
});
