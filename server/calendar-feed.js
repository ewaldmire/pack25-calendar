import ical from "ical-generator";
import { pool } from "./db.js";
import { DENS, DEN_MAP } from "../src/lib/dens.js";

const TIMEZONE = process.env.PACK_TIMEZONE || "America/Chicago";
const validDens = DENS.map((d) => d.value);

// ical-generator's TZID date formatting calls the Date's *local* getters
// (getHours(), getDate(), etc — driven by the Node process's own OS
// timezone), not a real IANA conversion of the instant — it just prints
// those numbers under whatever TZID string you gave it. So this only comes
// out correct if the process's local timezone is pinned to UTC (done in
// server/index.js via `process.env.TZ = "UTC"`), which makes getHours() ==
// getUTCHours() and lets us build dates by treating the raw YYYY-MM-DD /
// HH:MM strings as literal UTC components.
function dateAtMidnightUTC(dateStr, offsetDays = 0) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + offsetDays));
}

function wallClockDateTime(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

export function registerCalendarFeed(app) {
  app.get("/calendar.ics", async (req, res) => {
    const requestedDens = typeof req.query.dens === "string"
      ? req.query.dens.split(",").map((d) => d.trim()).filter((d) => validDens.includes(d))
      : [];

    // `&&` is Postgres's array-overlap operator — matches the frontend's
    // `ev.dens.some(d => selectedDens.includes(d))` filter exactly,
    // including excluding events with an empty dens array.
    const result = requestedDens.length > 0
      ? await pool.query("SELECT * FROM events WHERE dens && $1::text[] ORDER BY date ASC", [requestedDens])
      : await pool.query("SELECT * FROM events ORDER BY date ASC");

    const calendarName = requestedDens.length > 0
      ? `Pack 25 Calendar — ${requestedDens.map((d) => DEN_MAP[d]?.label || d).join(", ")}`
      : "Pack 25 Calendar";
    const calendar = ical({ name: calendarName, timezone: TIMEZONE, ttl: 60 * 60 });

    for (const row of result.rows) {
      const isAllDay = !row.start_time;
      const eventData = {
        id: `${row.id}@pack25calendar`,
        sequence: row.sequence,
        timezone: TIMEZONE,
        summary: row.name,
        location: row.location || undefined,
        description: row.details || undefined,
        lastModified: row.updated_at,
      };

      if (isAllDay) {
        eventData.allDay = true;
        eventData.start = dateAtMidnightUTC(row.date);
        // ICS all-day DTEND is exclusive, so the day after the last day.
        eventData.end = dateAtMidnightUTC(row.end_date || row.date, 1);
      } else {
        eventData.start = wallClockDateTime(row.date, row.start_time);
        eventData.end = row.end_time
          ? wallClockDateTime(row.end_date || row.date, row.end_time)
          : new Date(eventData.start.getTime() + 60 * 60 * 1000); // default 1h duration
      }

      calendar.createEvent(eventData);
    }

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="pack25-calendar.ics"');
    res.send(calendar.toString());
  });
}
