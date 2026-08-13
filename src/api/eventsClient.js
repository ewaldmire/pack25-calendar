import { DEMO_MODE } from "@/lib/demoMode";
import { Event as MockEvent } from "@/lib/mockEvents";

async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Talks to the self-hosted Express API (server/events.js) — same origin as
// the app itself, so the auth session cookie is sent automatically.
const BackendEvent = {
  list: () => request("/api/events"),
  create: (data) => request("/api/events", { method: "POST", body: JSON.stringify(data) }),
  bulkCreate: (records) => request("/api/events/bulk", { method: "POST", body: JSON.stringify({ records }) }),
  update: (id, data) => request(`/api/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => request(`/api/events/${id}`, { method: "DELETE" }),
};

export const Event = DEMO_MODE ? MockEvent : BackendEvent;
