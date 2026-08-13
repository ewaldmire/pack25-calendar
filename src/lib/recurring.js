import { addDays, addWeeks, addMonths, differenceInCalendarDays, parseISO, eachDayOfInterval, isWithinInterval } from "date-fns";

/**
 * Generate all occurrence dates for a recurring event.
 * @param {string} startDateStr - ISO date (YYYY-MM-DD)
 * @param {"weekly"|"monthly"} type
 * @param {number} interval - every N weeks/months
 * @param {string} endDateStr - ISO date (YYYY-MM-DD)
 * @returns {string[]} array of ISO date strings (including the start date)
 */
export function generateRecurrenceDates(startDateStr, type, interval, endDateStr) {
  if (!startDateStr || !endDateStr) return [startDateStr];
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);
  if (end < start) return [startDateStr];

  const dates = [];
  let current = start;
  let guard = 0;

  while (current <= end && guard < 500) {
    dates.push(current.toISOString().slice(0, 10));
    current = type === "weekly" ? addWeeks(current, interval) : addMonths(current, interval);
    guard++;
  }
  return dates;
}

/**
 * Returns all dates an event appears on (handles single-day and multi-day).
 * @param {object} event
 * @returns {string[]} ISO date strings (YYYY-MM-DD)
 */
export function getEventDates(event) {
  if (!event.date) return [];
  const start = parseISO(event.date.slice(0, 10));
  if (!event.end_date) return [event.date.slice(0, 10)];
  const end = parseISO(event.end_date.slice(0, 10));
  if (end <= start) return [event.date.slice(0, 10)];
  return eachDayOfInterval({ start, end }).map(d => d.toISOString().slice(0, 10));
}

/**
 * Format a date range for display.
 * @param {string} startDateStr
 * @param {string} endDateStr
 * @returns {string} e.g. "Aug 5 – Aug 7, 2026" or "Aug 5, 2026"
 */
export function formatDateRange(startDateStr, endDateStr) {
  if (!startDateStr) return "";
  const start = parseISO(startDateStr.slice(0, 10));
  if (!endDateStr) return start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const end = parseISO(endDateStr.slice(0, 10));
  if (end.getTime() === start.getTime()) {
    return start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = sameYear
    ? start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const endFmt = end.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return `${startFmt} – ${endFmt}`;
}
