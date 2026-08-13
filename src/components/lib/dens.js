export const DENS = [
  { value: "lions", label: "Lions", color: "#F59E0B", bg: "#FEF3C7", text: "#92400E" },
  { value: "tigers", label: "Tigers", color: "#F97316", bg: "#FFEDD5", text: "#9A3412" },
  { value: "wolves", label: "Wolves", color: "#6366F1", bg: "#E0E7FF", text: "#3730A3" },
  { value: "bears", label: "Bears", color: "#7C3AED", bg: "#EDE9FE", text: "#5B21B6" },
  { value: "webelos", label: "Webelos", color: "#0EA5E9", bg: "#E0F2FE", text: "#075985" },
  { value: "aols", label: "AOLs", color: "#10B981", bg: "#D1FAE5", text: "#065F46" },
  { value: "leaders", label: "Leaders", color: "#475569", bg: "#F1F5F9", text: "#334155" },
];

export const DEN_MAP = Object.fromEntries(DENS.map(d => [d.value, d]));

export function densForEvent(event) {
  if (!event.dens || event.dens.length === 0) return [DEN_MAP.leaders];
  return event.dens.map(d => DEN_MAP[d]).filter(Boolean);
}
