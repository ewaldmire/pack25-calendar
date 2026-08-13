import { base44 } from "@/api/base44Client";
import { DEMO_MODE } from "@/lib/demoMode";
import { Event as MockEvent } from "@/lib/mockEvents";

// Swaps the real Base44 entity for the local mock in demo mode, so callers
// don't need to know which backend is in use.
export const Event = DEMO_MODE ? MockEvent : base44.entities.Event;
