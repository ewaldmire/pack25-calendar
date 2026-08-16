import { parseISO, format } from "date-fns";

// Dens are keyed by the cohort's graduation year (e.g. "2037"), not rank
// name — a real den is a stable group of specific kids that advances one
// rank per year (Lion -> Tiger -> Wolf -> Bear -> Webelos -> AOL over
// kindergarten through 5th grade), and a parent's saved subscription URL
// has to keep matching their kid's events every year without them ever
// touching it again. The rank name/color shown anywhere is *computed* from
// (graduation year, a reference date) — never stored — so the underlying
// identity never changes even as the displayed rank does.
const RANK_LABELS = ["Lions", "Tigers", "Wolves", "Bears", "Webelos", "Arrow of Light"];
const RANK_COLORS = [
  { color: "#EAB308", bg: "#FEF9C3", text: "#854D0E" }, // Lions
  { color: "#F97316", bg: "#FFEDD5", text: "#9A3412" }, // Tigers
  { color: "#EF4444", bg: "#FEE2E2", text: "#991B1B" }, // Wolves
  { color: "#3B82F6", bg: "#DBEAFE", text: "#1E40AF" }, // Bears
  { color: "#22C55E", bg: "#DCFCE7", text: "#166534" }, // Webelos
  { color: "#78350F", bg: "#F3E8DA", text: "#451A03" }, // Arrow of Light
];

export const LEADERS = { value: "leaders", label: "Leaders", color: "#404040", bg: "#E5E5E5", text: "#262626", rank: -1 };

// Ranks roll over June 1 each year (matches the pack's real crossover-
// ceremony timing, not the fall program start) — June 1 itself is already
// the first day of the advanced rank. Uses .getMonth() (0-indexed, June=5)
// consistently; a 1-indexed month token here would shift every den by a
// year for half the calendar.
const CUTOVER_MONTH = 5;

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

// Native date inputs fire onChange with incomplete values while the user
// is still typing (same gotcha as Home.jsx's formatListDate) — fall back
// to today rather than let a partial or implausible string cascade into
// an out-of-range roster and break every caller (getActiveKidDens builds
// a 6-entry array from this, so one bad date can't just silently break a
// single lookup the way an out-of-range getDenInfo call safely can).
function resolveReferenceDate(referenceDate) {
  if (!referenceDate || !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) return todayStr();
  const year = Number(referenceDate.slice(0, 4));
  return year >= 1990 && year <= 2100 ? referenceDate : todayStr();
}

function packYear(dateStr) {
  const d = parseISO(dateStr);
  return d.getMonth() >= CUTOVER_MONTH ? d.getFullYear() : d.getFullYear() - 1;
}

// Lion (kindergarten) is 13 pack-years before 12th-grade graduation.
function lionYearFor(gradYear) {
  return gradYear - 13;
}

// Accepts "leaders" or a 4-digit graduation year. The range (2020-2099) is
// generous runway with no future migration ever needed as new grad years
// appear — shared by server-side Zod validation and the ICS feed's
// query-string whitelist, so there's exactly one place that defines "what's
// a valid den value."
export function isValidDenValue(v) {
  return v === "leaders" || /^20[2-9][0-9]$/.test(v);
}

// Rank label/color for a den value, as of referenceDate (defaults to
// today). Returns null if the value is invalid, or if that cohort isn't an
// active pack den on referenceDate (not yet joined, or already crossed
// over) — callers already treat an unrecognized den as "no badge," so this
// fits the existing convention rather than introducing a new one.
export function getDenInfo(value, referenceDate) {
  if (value === "leaders") return LEADERS;
  if (!isValidDenValue(value)) return null;
  const gradYear = Number(value);
  const offset = packYear(resolveReferenceDate(referenceDate)) - lionYearFor(gradYear);
  if (offset < 0 || offset > 5) return null;
  return { value, label: RANK_LABELS[offset], ...RANK_COLORS[offset], rank: offset };
}

// Stable Lion -> AOL display order for a list of den values on one event —
// the stored array order is just whatever order they were checked/
// inserted in, which carries no meaning. Values that aren't part of the
// active roster on referenceDate (already graduated, or not yet joined as
// of this date — a leader can deliberately invite either) sort after
// everything with an active rank, most-recently-graduated first.
export function sortDenValues(values, referenceDate) {
  return [...values].sort((a, b) => {
    const rankA = getDenInfo(a, referenceDate)?.rank ?? 99;
    const rankB = getDenInfo(b, referenceDate)?.rank ?? 99;
    return rankA - rankB || Number(b) - Number(a);
  });
}

// The 6 currently-active kid-den keys (graduation-year strings) as of
// referenceDate (defaults to today) — used to populate den pickers/filters.
export function getActiveKidDens(referenceDate) {
  const refDate = resolveReferenceDate(referenceDate);
  const n = packYear(refDate);
  return RANK_LABELS.map((_, offset) => getDenInfo(String(n + 13 - offset), refDate));
}

// Same active kid dens as getActiveKidDens, but aware that a viewed date
// range can span one or more June 1 crossovers: a den's own rank keeps
// advancing across the range, so a single label can't honestly represent
// the whole thing. For each grad-year value active at any point across the
// range, this walks every pack-year from fromDate to toDate and records
// the full chronological sequence of ranks that cohort actually held —
// not just a direct start/end comparison, which for a wide range would
// either skip the ranks in between (misrepresenting a multi-year climb as
// one step) or show two different cohorts that happen to share a label at
// each end as identical, indistinguishable buttons. An entry with more
// than one stage carries a `stages` array (in chronological order); this
// is purely a rendering choice, not extra selectable values — toggling it
// still selects/clears the one underlying value.
export function getActiveKidDensForRange(fromDate, toDate) {
  const fromPackYear = packYear(resolveReferenceDate(fromDate));
  const toPackYear = packYear(resolveReferenceDate(toDate));

  const stagesByValue = new Map();
  for (let p = fromPackYear; p <= toPackYear; p++) {
    for (let offset = 0; offset <= 5; offset++) {
      const value = String(p + 13 - offset);
      if (!stagesByValue.has(value)) stagesByValue.set(value, []);
      stagesByValue.get(value).push({ label: RANK_LABELS[offset], ...RANK_COLORS[offset] });
    }
  }

  // No "New X" marking — whether a cohort's Lion year happens to land
  // exactly on the range's start date or one pack-year later is an
  // arbitrary technicality, not something meaningful to call out: two
  // cohorts that each complete their full run inside the range read
  // identically either way, so marking only one of them "new" was
  // confusing more than it clarified. Every entry just shows the ranks it
  // actually held during the dates being viewed, full stop.
  const merged = [...stagesByValue.entries()].map(([value, stages]) => {
    const first = stages[0];
    const entry = { value, label: first.label, color: first.color, bg: first.bg, text: first.text };
    if (stages.length > 1) entry.stages = stages;
    return entry;
  });

  // Left-to-right reading order matches the traditional Lion -> AOL flow:
  // higher graduation year (more years left in the pack) comes first.
  merged.sort((a, b) => Number(b.value) - Number(a.value));
  return merged;
}

// Cub Scouting's own blue-and-gold, used for events tied to more than one
// den so the calendar isn't misleadingly colored as if it belonged to
// whichever den happens to be first in the list.
export const MULTI_DEN_STYLE = {
  background: "linear-gradient(135deg, #D9E6F5 50%, #FCEEC0 50%)",
  color: "#1E293B",
};

// An event with no dens saved is treated as Leaders-only everywhere in the
// app — this is the one place that convention is defined.
export function getEventDens(event) {
  return event.dens && event.dens.length ? event.dens : ["leaders"];
}

// True when a den list (a saved event's dens, or the view screens'
// selectedKidDens filter) covers all 6 currently-active kid dens as of
// referenceDate (defaults to today). Used to decide whether something
// should collapse to "All Dens" in the UI/print output.
export function hasAllKidDens(dens, referenceDate) {
  return getActiveKidDens(referenceDate).every(d => d && dens.includes(d.value));
}
