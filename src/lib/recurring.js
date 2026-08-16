import { addDays, addWeeks, addMonths, differenceInCalendarDays, parseISO, eachDayOfInterval, isWithinInterval, format } from "date-fns";

// toISOString() would convert to UTC before slicing the date — only
// correct by coincidence west of UTC (e.g. Chicago), since local midnight
// shifted forward stays on the same UTC calendar day. format() reads the
// Date's local getters directly, which is correct regardless of offset.
const toDateStr = (d) => format(d, "yyyy-MM-dd");

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th"];

/**
 * Describes which occurrence of a weekday a date falls on, e.g. "2nd Monday".
 * @param {string} dateStr - ISO date (YYYY-MM-DD)
 */
export function ordinalWeekdayLabel(dateStr) {
  if (!dateStr) return "";
  const d = parseISO(dateStr);
  const nth = Math.ceil(d.getDate() / 7);
  return `${ORDINALS[nth - 1] || `${nth}th`} ${WEEKDAY_NAMES[d.getDay()]}`;
}

// Returns the date of the nth (1-5) given weekday in a month, or null if
// that month doesn't have one (e.g. no 5th Monday).
function getNthWeekdayOfMonth(year, month, weekday, nth) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const day = 1 + ((7 + weekday - firstWeekday) % 7) + (nth - 1) * 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return day > daysInMonth ? null : new Date(year, month, day);
}

/**
 * Generate all occurrence dates for a recurring event.
 * @param {string} startDateStr - ISO date (YYYY-MM-DD)
 * @param {"weekly"|"monthly"|"monthly_weekday"} type - "monthly_weekday" repeats
 *   on the same nth-weekday-of-month as startDateStr, e.g. every 2nd Monday.
 * @param {number} interval - every N weeks/months
 * @param {string} endDateStr - ISO date (YYYY-MM-DD)
 * @returns {string[]} array of ISO date strings (including the start date)
 */
export function generateRecurrenceDates(startDateStr, type, interval, endDateStr) {
  if (!startDateStr || !endDateStr) return [startDateStr];
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);
  if (end < start) return [startDateStr];

  if (type === "monthly_weekday") {
    const weekday = start.getDay();
    const nth = Math.ceil(start.getDate() / 7);
    const dates = [];
    let year = start.getFullYear();
    let month = start.getMonth();
    let guard = 0;

    while (new Date(year, month, 1) <= end && guard < 500) {
      const occurrence = getNthWeekdayOfMonth(year, month, weekday, nth);
      if (occurrence && occurrence >= start && occurrence <= end) {
        dates.push(toDateStr(occurrence));
      }
      month += interval;
      year += Math.floor(month / 12);
      month = ((month % 12) + 12) % 12;
      guard++;
    }
    return dates.length ? dates : [startDateStr];
  }

  const dates = [];
  let current = start;
  let guard = 0;

  while (current <= end && guard < 500) {
    dates.push(toDateStr(current));
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
  return eachDayOfInterval({ start, end }).map(toDateStr);
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
