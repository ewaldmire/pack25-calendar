import { addDays, format } from "date-fns";

// In-memory + localStorage-backed stand-in for the events API, used in
// demo mode so the calendar has something to show with no backend.
const STORAGE_KEY = "pack25_demo_events";

const iso = (date) => format(date, "yyyy-MM-dd");

const buildSeedEvents = () => {
  const today = new Date();
  return [
    { name: "Pack Meeting", date: iso(addDays(today, 2)), start_time: "18:00", end_time: "19:30", location: "Community Center", details: "Monthly all-pack meeting with awards.", dens: ["lions", "tigers", "wolves", "bears", "webelos", "aols"] },
    { name: "Lions Den Meeting", date: iso(addDays(today, 4)), start_time: "17:30", end_time: "18:30", location: "School Cafeteria", details: "Weekly den meeting.", dens: ["lions"] },
    { name: "Leader Planning Meeting", date: iso(addDays(today, 5)), start_time: "19:00", end_time: "20:00", location: "Leader's House", details: "Plan next quarter's activities.", dens: ["leaders"] },
    { name: "Webelos Den Meeting", date: iso(addDays(today, 6)), start_time: "18:30", end_time: "19:30", location: "School Cafeteria", details: "", dens: ["webelos"] },
    { name: "Tigers Nature Hike", date: iso(addDays(today, 8)), start_time: "09:00", end_time: "11:00", location: "Riverside Trailhead", details: "Bring water and closed-toe shoes.", dens: ["tigers"] },
    { name: "Popcorn Kickoff", date: iso(addDays(today, 10)), start_time: "10:00", end_time: "12:00", location: "Park Pavilion", details: "Kick off the fall popcorn sale.", dens: ["lions", "tigers", "wolves", "bears", "webelos", "aols"] },
    { name: "Bears Service Project", date: iso(addDays(today, 12)), start_time: "09:00", end_time: "11:30", location: "Town Park", details: "Trail cleanup with the Bears den.", dens: ["bears"] },
    { name: "Fall Campout Weekend", date: iso(addDays(today, 14)), end_date: iso(addDays(today, 16)), start_time: "16:00", end_time: "", location: "Camp Wildwood", details: "Overnight campout, all dens welcome.", dens: ["lions", "tigers", "wolves", "bears", "webelos", "aols"] },
    { name: "Pinewood Derby", date: iso(addDays(today, 21)), start_time: "09:00", end_time: "13:00", location: "School Gym", details: "Bring your finished cars by 8:45am for check-in.", dens: ["lions", "tigers", "wolves", "bears", "webelos", "aols"] },
    { name: "AOL Bridging Ceremony", date: iso(addDays(today, 30)), start_time: "18:00", end_time: "19:00", location: "Community Center", details: "Celebrating our Arrow of Light scouts.", dens: ["aols", "webelos"] },
  ].map((event, index) => ({ id: `seed-${index}`, ...event }));
};

const canUseStorage = typeof window !== "undefined" && !!window.localStorage;

const readStore = () => {
  if (!canUseStorage) return buildSeedEvents();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = buildSeedEvents();
    writeStore(seeded);
    return seeded;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const seeded = buildSeedEvents();
    writeStore(seeded);
    return seeded;
  }
};

const writeStore = (events) => {
  if (!canUseStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};

const makeId = () => `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const Event = {
  async list() {
    return readStore();
  },
  async create(data) {
    const events = readStore();
    const record = { id: makeId(), ...data };
    writeStore([...events, record]);
    return record;
  },
  async bulkCreate(records) {
    const events = readStore();
    const created = records.map((record) => ({ id: makeId(), ...record }));
    writeStore([...events, ...created]);
    return created;
  },
  async update(id, data) {
    const events = readStore();
    const index = events.findIndex((event) => event.id === id);
    if (index === -1) throw new Error("Event not found");
    const updated = { ...events[index], ...data };
    const next = [...events];
    next[index] = updated;
    writeStore(next);
    return updated;
  },
  async delete(id) {
    writeStore(readStore().filter((event) => event.id !== id));
    return { success: true };
  },
};
