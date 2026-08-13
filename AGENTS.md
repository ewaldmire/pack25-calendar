# AGENTS.md

## Project Context

This is a self-hosted Cub Scout pack calendar (originally scaffolded by Base44, since
migrated off it entirely — there is no Base44 dependency or hosted backend anymore).
Treat it as user-owned application code, keep changes focused on the user's request, and
preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and the deployment story.

## Key Files

- `src/`: frontend application source (React + Vite).
- `src/api/eventsClient.js`: swaps between the self-hosted REST API, and a
  `localStorage`-backed mock used only for the static GitHub Pages demo build
  (`VITE_DEMO_MODE=true`).
- `src/lib/AuthContext.jsx`: shared "leader" password auth (session cookie), not per-user
  accounts.
- `server/`: the self-hosted Express + Postgres backend (API routes, auth, the
  `/calendar.ics` subscription feed, and static serving of the built frontend).
- `vite.config.js`: Vite config.
- `Dockerfile`: multi-stage build (frontend build → Node runtime serving `dist/` + API).
- `.env.local` / `.env`: local-only environment values; never commit secrets.

## Working Notes

- `npm run dev` — frontend dev server. Add `VITE_DEMO_MODE=true` to develop against the
  local mock data with no backend running.
- `npm run start:server` — runs the self-hosted Express server (needs `dist/` built and
  Postgres reachable via `DATABASE_URL`; see `README.md`).
- `npm run build` — production frontend build. The GitHub Pages workflow builds with
  `VITE_DEMO_MODE=true` and `VITE_BASE_PATH=/pack25-calendar/`; the self-hosted build uses
  neither (served from `/`).
- Run the relevant checks from `package.json` (`lint`, `typecheck`) before finishing code
  changes.
