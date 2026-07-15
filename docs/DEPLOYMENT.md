# Production Deployment (Ubuntu 24.04 LTS, no Docker)

This app is fully standalone — its own MongoDB database, its own Node
process/port, its own Nginx server block, its own Liquidsoap/Icecast
instance. It does not assume or depend on any other application on the box.

## 1. Package installs

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MongoDB 7
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod

# PM2 (process manager for the Node app)
sudo npm install -g pm2

# Nginx
sudo apt install -y nginx

# Icecast2
sudo apt install -y icecast2
# debconf will prompt for hostname/source password/admin password during
# install — accept placeholders, then edit /etc/icecast2/icecast.xml
# properly afterwards (see §3 below).

# Liquidsoap
sudo apt install -y liquidsoap
# Check the version:
liquidsoap --version
# If it's older than 2.2, or radio.liq fails to start with a "function not
# found" error, install a current .deb built for Ubuntu noble from
# Savonet's official releases instead:
# https://github.com/savonet/liquidsoap/releases
```

## 2. Clone and configure the app

```bash
cd /opt   # or ~ — pick a location and stay consistent below
sudo git clone <this-repo-url> radio
sudo chown -R $USER:$USER radio
cd radio

cp .env.example .env
nano .env
```

Fill in at minimum:
```env
MONGODB_URI=mongodb://localhost:27017/radio
JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
PORT=4322
UPLOAD_DIR=/opt/radio/uploads
LIQUIDSOAP_DIR=/opt/radio/liquidsoap
ICECAST_SOURCE_PASSWORD=<match icecast.xml's <source-password> below>
STATION_NAME=Your Station Name
STATION_PUBLIC_URL=https://radio.yourdomain.com
LIQUIDSOAP_RESTART_ENABLED=true
```

```bash
mkdir -p uploads/tracks uploads/covers liquidsoap/playlists
npm install
npm run build
node scripts/seed-admin.mjs admin@yourdomain.com yourpassword
```

## 3. Icecast (`/etc/icecast2/icecast.xml`)

Key settings:
```xml
<icecast>
  <admin>you@yourdomain.com</admin>
  <authentication>
    <source-password>CHANGE_ME_SOURCE_PW</source-password>
    <relay-password>CHANGE_ME_RELAY_PW</relay-password>
    <admin-user>admin</admin-user>
    <admin-password>CHANGE_ME_ADMIN_PW</admin-password>
  </authentication>
  <hostname>radio.yourdomain.com</hostname>
  <listen-socket>
    <port>8000</port>
    <bind-address>127.0.0.1</bind-address>  <!-- not publicly exposed, see §7 -->
  </listen-socket>
  <mount type="normal">
    <mount-name>/stream</mount-name>
    <max-listeners>200</max-listeners>
  </mount>
</icecast>
```

`source-password` must match `ICECAST_SOURCE_PASSWORD` in `.env` — it's
interpolated into the generated `radio.liq` at generation time only, never
committed to git.

```bash
sudo systemctl enable --now icecast2
```

## 4. Liquidsoap systemd unit

Runs as the **same non-root user** that runs the PM2 Node process (not the
package's default `liquidsoap` system account) — this avoids cross-user
file-permission issues on `uploads/tracks/` and `liquidsoap/`, a deliberate
simplification for a single-purpose VPS.

`/etc/systemd/system/liquidsoap.service`:
```ini
[Unit]
Description=Liquidsoap radio automation for radio.yourdomain.com
After=network.target sound.target

[Service]
Type=simple
User=<deployuser>
Group=<deployuser>
WorkingDirectory=/opt/radio/liquidsoap
ExecStart=/usr/bin/liquidsoap /opt/radio/liquidsoap/radio.liq
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable liquidsoap
# Don't start it yet — radio.liq doesn't exist until the app generates it
# once you've created a default playlist with at least one track (§6).
```

## 5. Sudoers — scoped Liquidsoap restart

The app regenerates `radio.liq`/the `.m3u` files itself (no privilege
needed, same user owns those files) and then needs to restart the
Liquidsoap service for structural changes. Grant exactly that, nothing more:

```bash
sudo visudo -f /etc/sudoers.d/radio-liquidsoap
```
Contents (confirm the real path first with `which systemctl` — usually
`/usr/bin/systemctl` on Ubuntu 24.04):
```
<deployuser> ALL=(root) NOPASSWD: /usr/bin/systemctl restart liquidsoap
```
```bash
sudo chmod 0440 /etc/sudoers.d/radio-liquidsoap
sudo visudo -c   # validates syntax
```

This is one fully-qualified command with a fixed literal argument — no
wildcards, no shell, `restart` only (not stop/start/enable/disable). The
app invokes it via `execFile('sudo', [...])`, never a shell string, so
there's no injection surface; this sudoers line is the only privilege
escalation in the entire app.

## 6. Start the Node app

```bash
cd /opt/radio
pm2 start server.js --name radio-backend
pm2 save
pm2 startup   # follow the printed command to enable on boot
```

Now sign in to the admin panel (once Nginx is up, see §7) and:
1. Create a playlist, upload at least one MP3 into it.
2. Mark it as the default playlist.

This triggers the app's first `regenerateAndRestart()`, which writes
`radio.liq` and starts Liquidsoap for the first time (via the sudoers rule
above — no need to manually `systemctl start liquidsoap`).

## 7. Nginx (`/etc/nginx/sites-available/radio`)

Icecast listens only on `127.0.0.1:8000` — not public. Nginx terminates
TLS and reverse-proxies both the app and the `/stream` mount under the same
HTTPS origin. (This is required, not just tidy: a browser `<audio>` element
on an `https://` page can't load an `http://` stream URL as mixed content.
Nginx does the TLS termination; Express never touches stream bytes — the
proxy is a raw byte pass-through at the network layer.)

```nginx
server {
    listen 80;
    server_name radio.yourdomain.com;

    client_max_body_size 100M;   # room for MP3 uploads through the admin API

    location /stream {
        proxy_pass http://127.0.0.1:8000/stream;
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }

    location / {
        proxy_pass http://localhost:4322;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/radio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d radio.yourdomain.com
```
Certbot rewrites the block to add the standard 80→443 redirect and
`ssl_certificate`/`ssl_certificate_key` lines; `location /stream` and
`location /` move under the `listen 443 ssl;` server block unchanged.

Verify auto-renewal:
```bash
sudo certbot renew --dry-run
```

## 8. Firewall (UFW)

```bash
sudo ufw allow 'Nginx Full'   # 80 + 443 only
```
Do **not** open 8000 (Icecast), 4322 (Node), or 27017 (MongoDB) externally —
all three stay bound to `127.0.0.1` and are only reached through Nginx or
localhost-to-localhost calls.

## Updating the app

```bash
cd /opt/radio
git pull
npm install
npm run build
pm2 restart radio-backend
```
A code update does not itself restart Liquidsoap — that only happens via
the app's own structural-change flow, or manually
(`sudo systemctl restart liquidsoap`) if you changed the `.liq` template
logic itself and want it applied immediately rather than waiting for the
next structural change.

See [BACKUP.md](BACKUP.md) for backups.
