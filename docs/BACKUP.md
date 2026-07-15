# Backup & Update Strategy

## What needs backing up

1. **MongoDB** (`radio` database) — all Track/Playlist/Schedule/User
   documents. This is small (metadata only) and backs up quickly.
2. **`uploads/`** — the actual MP3 files and cover images. This can be
   large and grows over time; back it up incrementally, not as a full copy
   each time.

Nothing under `liquidsoap/` needs backing up — `radio.liq` and the `.m3u`
files are entirely regenerated from MongoDB + `uploads/` on the next
structural change (or by restarting the app, which you'd do after a
restore anyway).

## Automated nightly backup

`scripts/backup.sh` is a standalone shell script (not part of the Node app)
meant to run via cron:

```bash
crontab -e
# Add:
0 3 * * * /opt/radio/scripts/backup.sh >> /var/log/radio-backup.log 2>&1
```

It:
1. `mongodump`s the `radio` database into `~/backups/radio/<date>/mongo/`.
2. `rsync -a --delete`s `uploads/` into `~/backups/radio/latest-uploads/` —
   incremental, so a growing MP3 library isn't fully re-copied every night.
3. Prunes dated mongo-dump directories older than 14 days.

Set `RADIO_BACKUP_ROOT` in the environment (or edit the script) to change
the backup destination. Copying the backup root off-box (a second disk, a
remote host via `rsync`/`scp`, object storage, etc.) is recommended once
you've decided where — that's a one-line addition to the script, left as a
deploy-time detail since it depends on what you have available.

## Restoring

```bash
# Stop the app first so nothing writes to Mongo/uploads mid-restore
pm2 stop radio-backend

mongorestore --db=radio --drop ~/backups/radio/<date>/mongo/radio
rsync -a ~/backups/radio/latest-uploads/ /opt/radio/uploads/

pm2 start radio-backend
```

After a restore, make any playlist/schedule change from the admin panel (or
just toggle a playlist's enabled state and back) to force a fresh
`radio.liq`/`.m3u` regeneration and Liquidsoap restart against the restored
data — this isn't strictly required since the next real change will do it
anyway, but it confirms the restore is playable immediately.

## Updating the app

See [DEPLOYMENT.md](DEPLOYMENT.md#updating-the-app):

```bash
cd /opt/radio
git pull
npm install
npm run build
pm2 restart radio-backend
```

Take a backup (`./scripts/backup.sh`) before any update that changes
Mongoose schemas, in case a migration is needed and needs to be rolled back.
