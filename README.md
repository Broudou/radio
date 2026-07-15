# Radio

A self-hosted internet radio platform. Icecast + Liquidsoap stream a
pre-uploaded MP3 library according to playlists and a scheduling agenda
managed from an admin panel — there is no live broadcasting. A minimal
public page plays the stream directly from Icecast.

## Features

- Public page: play/pause/stop, live now-playing metadata, station status
- Admin panel (JWT-authenticated): MP3 library management, playlists with
  reorderable track lists, and a scheduling agenda with concrete
  start/end datetime slots
- Uploaded tracks are validated server-side (magic bytes, not just the file
  extension) and their duration is always derived from the audio itself
- Liquidsoap configuration and playlist files are generated automatically
  whenever the library, playlists, or schedule change — track-level edits
  hot-reload without interrupting playback; structural changes (new/removed
  playlist, schedule changes) trigger a brief, controlled Liquidsoap restart

## Stack

- Frontend: Svelte 5.1.0 + Vite 5.4.2 (plain SPA, hash-based routing, no SvelteKit)
- Backend: Node.js + Express
- Database: MongoDB (Mongoose)
- Auth: JWT (httpOnly cookie) + bcrypt
- Streaming: Icecast + Liquidsoap
- Deployment: Ubuntu 24.04 LTS, systemd + PM2, no Docker

## Architecture

```
server.js            Express entrypoint — serves the built SPA, /uploads,
                      and mounts the /api/* routers
src/
  config/env.js       Reads and validates process.env once
  db.js               Mongoose connection singleton
  models/             User, Track, Playlist, Schedule
  middleware/
    requireAuth.js    JWT cookie guard for protected /api/* routes
  routes/              Express routers (thin — delegate to controllers)
  controllers/         Request handling + validation
  services/
    authService.js         JWT sign/verify, bcrypt hash/compare, cookies
    mp3Metadata.js          Magic-byte validation + duration/tag extraction
    liquidsoapService.js    .liq/.m3u templating, regeneration, restart
    icecastStatusService.js Icecast status-json.xsl proxy + cache
  upload/multer.js      Multipart upload handling (memory storage)
uploads/               MP3s and cover images (gitignored, created at deploy)
liquidsoap/            Generated radio.liq + per-playlist .m3u files (gitignored)
scripts/
  seed-admin.mjs        Create/update the admin user
  backup.sh              Mongo + uploads backup, meant for cron
web/                    Vite + Svelte 5 SPA (its own package.json)
  src/
    routes/             Home.svelte (public), admin/AdminApp.svelte (admin shell)
    lib/
      api.js             fetch wrapper (credentials: 'include')
      state/             Svelte 5 runes-based shared state (auth, player)
      components/
        public/          Player, NowPlaying, StatusBadge
        admin/            Login, Dashboard, track/playlist/schedule CRUD UI
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for local setup and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for a full Ubuntu 24.04 production
deployment guide (Node, MongoDB, Icecast, Liquidsoap, Nginx, SSL, firewall).
[docs/BACKUP.md](docs/BACKUP.md) covers backups and the update procedure.

## How the Liquidsoap integration works

Each enabled `Playlist` becomes a `playlist()` source in a generated
`radio.liq`, reading a per-playlist `.m3u` file. A `switch()` picks between
those sources using literal Unix-timestamp predicates derived from
`Schedule` entries, falling back to a designated default playlist whenever
no schedule entry covers the current time.

- **Track-level changes** (add/remove/reorder a track, edit a track's
  title/artist) only rewrite the affected `.m3u` file(s). Liquidsoap watches
  those files (`reload_mode="watch"`) and hot-reloads them — no restart, no
  interruption.
- **Structural changes** (a playlist created/deleted/enabled-toggled/set as
  default, or any schedule entry created/updated/deleted) regenerate the
  whole `radio.liq` and trigger a scoped `sudo systemctl restart liquidsoap`
  — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the sudoers setup this
  requires in production. In development, set `LIQUIDSOAP_RESTART_ENABLED=false`
  (the default) to skip the actual restart while still exercising the file
  generation logic.

## License

Private project.
