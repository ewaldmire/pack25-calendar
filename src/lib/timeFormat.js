/**
 * Format a stored time string (HH:MM 24h) into a 12-hour AM/PM display.
 * Central Time (CST/CDT) is the user's local timezone; since times are stored
 * as plain wall-clock strings with no timezone offset, we simply format them
 * for display in the Central Time convention.
 * @param {string} time - "HH:MM" or empty
 * @returns {string} e.g. "6:30 PM"
 */
export function formatTime(time) {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return time;
  const m = mStr || "00";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

/**
 * Format a time range for display.
 * @param {string} start
 * @param {string} end
 * @returns {string} e.g. "6:30 PM – 7:30 PM"
 */
export function formatTimeRange(start, end) {
  return [start, end].filter(Boolean).map(formatTime).join(" – ");
}
