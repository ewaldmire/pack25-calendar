import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";

// ical-generator's TZID formatting depends on the process's local timezone
// getters (see server/calendar-feed.js) — pin it to UTC so the .ics feed is
// correct regardless of the deployment environment's default OS timezone.
process.env.TZ = "UTC";
import { initDb } from "./db.js";
import { registerAuthRoutes } from "./auth.js";
import { registerEventRoutes } from "./events.js";
import { registerCalendarFeed } from "./calendar-feed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
const PORT = process.env.PORT || 3000;

const app = express();
// Sits behind Traefik, so trust its X-Forwarded-For for req.ip (needed for
// the login rate limiter in server/auth.js to key on the real client IP
// instead of Traefik's).
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json());

registerAuthRoutes(app);
registerEventRoutes(app);
registerCalendarFeed(app);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  express.static(distDir, {
    index: false,
    setHeaders: (res, filePath) => {
      res.setHeader(
        "Cache-Control",
        filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable"
      );
    },
  })
);

// SPA fallback — /api and /calendar.ics are already handled above, so only
// unmatched frontend routes reach here.
app.get("*", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`pack25-calendar server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
