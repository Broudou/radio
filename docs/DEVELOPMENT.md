# Development

## Prerequisites

- Node.js 20+
- A local MongoDB instance (`mongod` running on the default port, or a
  connection string to any reachable MongoDB)
- Icecast + Liquidsoap are **not required** for day-to-day backend/frontend
  work — see "Running without Icecast/Liquidsoap" below. Install them
  locally only when you want to hear the actual stream end-to-end.

## Setup

```bash
git clone <this-repo-url> radio
cd radio

cp .env.example .env
# Edit .env — at minimum set JWT_SECRET (32+ chars) and MONGODB_URI
# if your local MongoDB isn't on the default mongodb://localhost:27017

npm install
npm --prefix web install

mkdir -p uploads/tracks uploads/covers liquidsoap/playlists

node scripts/seed-admin.mjs dev@example.com devpassword
```

## Running

Two dev servers, in separate terminals:

```bash
# Terminal 1 — Express API on :4322
npm run dev

# Terminal 2 — Vite dev server on :5173, proxies /api and /uploads to :4322
npm --prefix web run dev
```

Visit `http://localhost:5173` for the public page, `http://localhost:5173/#/admin`
for the admin panel (sign in with the credentials from `seed-admin.mjs`).

`npm run dev:watch` restarts the API automatically on file changes
(`node --watch server.js`).

## Running without Icecast/Liquidsoap

By default (`LIQUIDSOAP_RESTART_ENABLED=false` in `.env.example`), the app
still generates `radio.liq` and the per-playlist `.m3u` files on every
change — you can inspect them under `liquidsoap/` — but skips the actual
`sudo systemctl restart liquidsoap` call and just logs that it would have
restarted. This lets you exercise the full playlist/schedule/track CRUD
flow, including the Liquidsoap file generation, without installing
Liquidsoap locally.

The public page's "now playing" status will show `down` (no Icecast to poll)
unless you also run Icecast + Liquidsoap locally.

## Running the full stack locally (optional)

If you want to hear the actual stream:

1. Install Icecast and Liquidsoap locally (see
   [DEPLOYMENT.md](DEPLOYMENT.md) §"Package installs" for the apt commands —
   they work the same on a dev machine).
2. Configure a local `icecast.xml` with a `source-password` matching
   `ICECAST_SOURCE_PASSWORD` in your `.env`.
3. Start Icecast, then start Liquidsoap manually against the generated
   config: `liquidsoap liquidsoap/radio.liq` (once at least one enabled,
   non-empty default playlist exists — create a playlist, add a track, and
   mark it default from the admin panel first).
4. Set `LIQUIDSOAP_RESTART_ENABLED=true` and run Liquidsoap under a process
   supervisor of your choice if you want structural changes to auto-restart
   it — otherwise just re-run `liquidsoap liquidsoap/radio.liq` manually
   after structural changes during local testing.

## Project scripts

| Command | Where | What |
|---|---|---|
| `npm run dev` | root | Start the Express API |
| `npm run dev:watch` | root | Start the API with `--watch` |
| `npm run build` | root | Build the Svelte SPA into `web/dist` |
| `npm run seed-admin -- <email> <password>` | root | Create/update the admin user |
| `npm run dev` | `web/` | Start the Vite dev server |
| `npm run build` | `web/` | Build the SPA (same as root `npm run build`) |

## Code layout

See the "Architecture" section in the root [README.md](../README.md).
