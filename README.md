# Pack 25 Calendar

A self-hosted event calendar for a Cub Scout pack: a filterable calendar/list view by den,
a shared "leader" login for adding/editing/deleting events, and a public iCalendar (.ics)
feed families can subscribe to from their phone's calendar app.

There are two ways this app runs:

- **Self-hosted** — a single Node/Express server that serves the built frontend and a
  REST API backed by Postgres. This is the real deployment target.
- **Static demo** (`VITE_DEMO_MODE=true`) — no backend at all; data lives in the
  browser's `localStorage`. This is what's deployed to GitHub Pages
  (`.github/workflows/deploy-pages.yml`) as a public, no-login preview.

## Local development (frontend only, against demo data)

```bash
npm install
npm run dev
```

This runs the Vite dev server. Without `VITE_DEMO_MODE=true` set, `eventsClient.js` will
try to talk to a backend at `/api/*`, which won't exist unless you're also running
`npm run start:server` (see below). To develop the frontend in isolation against the
local mock data instead:

```bash
VITE_DEMO_MODE=true npm run dev
```

## Running the self-hosted app locally

You need a Postgres instance. With [podman](https://podman.io) (Docker works the same way):

```bash
podman run --name pack25-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

Set the required environment variables (see `.env.example`) and build + run:

```bash
cp .env.example .env
# edit .env: set DATABASE_URL, SESSION_SECRET, LEADER_PASSWORD_HASH

npm install
npm run build          # builds the frontend into dist/
export $(cat .env | xargs)
npm run start:server   # serves dist/ + the API on $PORT (default 3000)
```

Open `http://localhost:3000`.

### Generating `LEADER_PASSWORD_HASH`

The app uses one shared password for all pack leaders (not per-user accounts). Generate a
bcrypt hash of your chosen password and put it in `.env`:

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'your-password-here'
```

### Calendar subscription feed

`GET /calendar.ics` returns a live iCalendar feed of all events — no login required. The
in-app "Subscribe" button links to it (`webcal://` for one-tap iOS subscribe, and a plain
URL to paste into Google Calendar's "From URL" option on Android/desktop).

## Backups

`scripts/backup.sh` pulls every event from the public `GET /api/events` endpoint and
saves it as a timestamped JSON file — no login or server access required, so it can run
from any box with outbound HTTPS (handy for keeping an off-site copy independent of the
VPS/Postgres itself).

```bash
./scripts/backup.sh /path/to/backups
# -> Saved 21 events to /path/to/backups/pack25-events-20260813-175240.json
```

Point it at a different deployment with `PACK25_URL=https://... ./scripts/backup.sh`.
For scheduled backups, add it to cron, e.g. daily at 3am:

```cron
0 3 * * * /path/to/scripts/backup.sh /path/to/backups
```

### Spinning up a disposable dev environment for a test restore

To verify a backup actually restores cleanly, run the real published image against a
throwaway local Postgres — no source checkout or build required, just Docker Hub:

```bash
podman run --name pack25-test-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16-alpine

LEADER_HASH=$(node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'testpass123')

podman run --name pack25-test-app --network host \
  -e DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres \
  -e SESSION_SECRET=test-secret \
  -e LEADER_PASSWORD_HASH="$LEADER_HASH" \
  -e PORT=3000 \
  -e NODE_ENV=development \
  -d docker.io/esw4/pack25-calendar:latest
```

Open `http://localhost:3000` — it should load with an empty calendar (leader password
is `testpass123`). Continue with the restore steps below to load a backup into it.

Tear it down when you're done:

```bash
podman rm -f pack25-test-app pack25-test-pg
```

### Restoring from a backup

Backup files are a plain JSON array in the same shape `GET /api/events` returns. To
restore them into a **fresh/empty** database via the API:

```bash
# Set this to whichever instance you're restoring into — the disposable dev
# container above (http://localhost:3000) for a test restore, or the real
# deployment for an actual disaster-recovery restore. The login cookie is
# scoped to whatever host you log into, so both commands below must target
# the SAME url — logging into localhost and then posting to production (or
# vice versa) will fail with "Authentication required", not restore anything.
TARGET_URL=http://localhost:3000

# 1. Log in as a leader and save the session cookie
curl -c cookies.txt -X POST "$TARGET_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"password":"YOUR_LEADER_PASSWORD"}'

# 2. Wrap the backup array in {"records": [...]} and restore it in one batch
curl -b cookies.txt -X POST "$TARGET_URL/api/events/bulk" \
  -H 'Content-Type: application/json' \
  --data "$(jq -n --slurpfile e pack25-events-20260813-175240.json '{records: $e[0]}')"
```

`POST /api/events/bulk` always assigns each event a brand-new id — it does not use the
`id` field in the backup file. That's fine for restoring into an empty database, but
running it against a database that already has data will create duplicates rather than
overwrite anything.

## Building the container image

```bash
podman build -t pack25-calendar .
podman run -p 3000:3000 --env-file .env pack25-calendar
```

The `Dockerfile` is a multi-stage build: it builds the frontend, then copies `dist/` and
`server/` into a Node runtime image. Deployment onto Postgres + this image (e.g. on an
OKD/OpenShift cluster) is a separate, later step — this repo currently only produces the
image.

## Environment variables

See `.env.example`. In short: `DATABASE_URL` (Postgres connection string),
`SESSION_SECRET` (random string used to sign leader session cookies),
`LEADER_PASSWORD_HASH` (bcrypt hash from above), `PACK_TIMEZONE` (IANA zone name for
timed events in the .ics feed — defaults to `America/Chicago`), `PORT` (default `3000`).

## Other scripts

- `npm run lint` / `npm run lint:fix`
- `npm run typecheck`
- `npm run preview` — preview a production build locally (frontend only, no API)

## Android wrapper app (dev/testing only)

`android/` is a minimal WebView wrapper ("Pack 25 Calendar") that just loads a
hardcoded server URL — currently your laptop's LAN IP running the podman dev
container (`android/app/src/main/res/values/strings.xml`, `server_url`). It's
for sideloading onto a phone during local development, not a real distributable
app: no signing, no Play Store metadata, cleartext HTTP allowed app-wide.

Push to `main` with changes under `android/` (or trigger manually) to run
`.github/workflows/android-apk.yml`, which builds a debug APK, versioned by
build datetime (so each build looks like a newer update to Android), and
publishes it two ways:

- As a workflow run artifact (manual download).
- As the asset on a rolling GitHub **pre-release** tagged `dev` — the tag and
  release get overwritten on every build, so there's always exactly one
  "latest" dev build to grab.

### Tracking it with [Obtainium](https://github.com/ImranR98/Obtainium)

In Obtainium, "Add App" → paste this repo's URL
(`https://github.com/ewaldmire/pack25-calendar`) → it should auto-detect the
GitHub source. In that app's settings, turn on **"Include prereleases"** —
the `dev` release is marked as a prerelease on purpose, so Obtainium won't
see it otherwise. From then on, Obtainium will offer a reinstall whenever a
new dev build lands (each one carries a newer, datetime-derived version).

If your laptop's IP changes, update `server_url` and push again to rebuild.
