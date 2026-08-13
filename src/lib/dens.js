export const DENS = [
  { value: "lions", label: "Lions", color: "#EAB308", bg: "#FEF9C3", text: "#854D0E" },
  { value: "tigers", label: "Tigers", color: "#F97316", bg: "#FFEDD5", text: "#9A3412" },
  { value: "wolves", label: "Wolves", color: "#EF4444", bg: "#FEE2E2", text: "#991B1B" },
  { value: "bears", label: "Bears", color: "#3B82F6", bg: "#DBEAFE", text: "#1E40AF" },
  { value: "webelos", label: "Webelos", color: "#22C55E", bg: "#DCFCE7", text: "#166534" },
  { value: "aols", label: "Arrow of Light", color: "#78350F", bg: "#F3E8DA", text: "#451A03" },
  { value: "leaders", label: "Leaders", color: "#404040", bg: "#E5E5E5", text: "#262626" },
];

export const DEN_MAP = Object.fromEntries(DENS.map(d => [d.value, d]));

export function densForEvent(event) {
  if (!event.dens || event.dens.length === 0) return [DEN_MAP.leaders];
  return event.dens.map(d => DEN_MAP[d]).filter(Boolean);
}
