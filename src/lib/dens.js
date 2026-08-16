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

// Leaders isn't a den of kids — a real den meeting always has its leaders
// there too. "All Dens" and its lit-up state always mean these 6, never
// Leaders, regardless of whether it's also selected.
export const KID_DENS = DENS.filter(d => d.value !== "leaders");

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
// selectedKidDens filter) covers all 6 kid dens. Used to decide whether
// something should collapse to "All Dens" in the UI/print output.
export function hasAllKidDens(dens) {
  return KID_DENS.every(d => dens.includes(d.value));
}
