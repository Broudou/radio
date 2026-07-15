import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './src/config/env.js';
import { connectDB } from './src/db.js';
import { requireAuth } from './src/middleware/requireAuth.js';

import authRoutes from './src/routes/auth.routes.js';
import tracksRoutes from './src/routes/tracks.routes.js';
import playlistsRoutes from './src/routes/playlists.routes.js';
import scheduleRoutes from './src/routes/schedule.routes.js';
import statusRoutes from './src/routes/status.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await connectDB();

const app = express();

// Only needed in dev, where the Vite dev server runs on a different origin
// than the API and needs to send/receive the auth cookie. In production the
// built SPA is served from this same origin, so cross-origin credentialed
// requests never happen.
app.use(cors({ origin: config.frontendOrigin, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(config.uploadDir));

app.use('/api/auth', authRoutes);
app.use('/api/tracks', requireAuth, tracksRoutes);
app.use('/api/playlists', requireAuth, playlistsRoutes);
app.use('/api/schedule', requireAuth, scheduleRoutes);
app.use('/api/status', statusRoutes);

// The Svelte SPA runs its router in hash mode, so the server never needs an
// SPA-fallback route — only `/` is ever requested for HTML.
app.use(express.static(path.join(__dirname, 'web', 'dist')));

app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File exceeds the maximum allowed size' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(config.port, () => {
  console.log(`Radio backend listening on port ${config.port}`);
});
