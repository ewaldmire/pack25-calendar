import crypto from "node:crypto";
import { z } from "zod";
import { pool } from "./db.js";
import { requireAuth } from "./auth.js";
import { DENS } from "../src/lib/dens.js";

const validDens = DENS.map((d) => d.value);

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const optionalDateString = z.union([dateString, z.literal("")]).optional().default("");
const optionalText = z.string().optional().default("");

const eventSchema = z.object({
  name: z.string().min(1),
  date: dateString,
  end_date: optionalDateString,
  start_time: optionalText,
  end_time: optionalText,
  location: optionalText,
  details: optionalText,
  dens: z.array(z.enum(validDens)).min(1, "Select at least one den"),
});

// .partial() re-wraps each field in an outer ZodOptional, so an absent key
// parses to undefined rather than falling through to the inner .default("") —
// that's what lets the update route tell "field omitted" apart from "field
// cleared to empty string".
const eventUpdateSchema = eventSchema.partial();

const UPDATABLE_FIELDS = ["name", "date", "end_date", "start_time", "end_time", "location", "details", "dens"];

function rowToEvent(row) {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    end_date: row.end_date || "",
    start_time: row.start_time || "",
    end_time: row.end_time || "",
    location: row.location || "",
    details: row.details || "",
    dens: row.dens || [],
  };
}

async function insertEvent(data) {
  const id = crypto.randomUUID();
  const result = await pool.query(
    `INSERT INTO events (id, name, date, end_date, start_time, end_time, location, details, dens)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [id, data.name, data.date, data.end_date || null, data.start_time, data.end_time, data.location, data.details, data.dens]
  );
  return rowToEvent(result.rows[0]);
}

export function registerEventRoutes(app) {
  app.get("/api/events", async (req, res) => {
    const result = await pool.query("SELECT * FROM events ORDER BY date ASC");
    res.json(result.rows.map(rowToEvent));
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid event", details: parsed.error.flatten() });
    }
    res.status(201).json(await insertEvent(parsed.data));
  });

  app.post("/api/events/bulk", requireAuth, async (req, res) => {
    const records = req.body?.records;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "records must be a non-empty array" });
    }
    if (records.length > 5000) {
      return res.status(400).json({ error: "Too many records in one batch (max 5000)" });
    }
    const parsedRecords = [];
    for (const record of records) {
      const parsed = eventSchema.safeParse(record);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid event in batch", details: parsed.error.flatten() });
      }
      parsedRecords.push(parsed.data);
    }
    const created = [];
    for (const data of parsedRecords) {
      created.push(await insertEvent(data));
    }
    res.status(201).json(created);
  });

  app.put("/api/events/:id", requireAuth, async (req, res) => {
    const parsed = eventUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid event", details: parsed.error.flatten() });
    }
    const data = parsed.data;
    const fields = [];
    const values = [];
    let i = 1;
    for (const key of UPDATABLE_FIELDS) {
      if (data[key] === undefined) continue;
      fields.push(`${key} = $${i}`);
      values.push(key === "end_date" ? data[key] || null : data[key]);
      i++;
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    fields.push("sequence = sequence + 1", "updated_at = now()");
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE events SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(rowToEvent(result.rows[0]));
  });

  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    const result = await pool.query("DELETE FROM events WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ success: true });
  });
}
