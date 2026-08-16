import React from "react";
import { DEN_MAP, getEventDens, hasAllKidDens } from "@/lib/dens";
import { Pencil, Trash2, MapPin, Clock, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatTimeRange } from "@/lib/timeFormat";
import { formatDateRange } from "@/lib/recurring";

// Compact for a printed reference sheet — no weekday/year, since those
// take real estate a binder page doesn't have to spare.
function printDateRange(dateStr, endDateStr) {
  const start = parseISO(dateStr);
  if (!endDateStr || endDateStr === dateStr) return format(start, "EEE M/d");
  return `${format(start, "M/d")}–${format(parseISO(endDateStr), "M/d")}`;
}

// One den per line rather than comma-joined — with a fixed-width column,
// a single 7-den event otherwise forces every row's Dens column just as
// wide, stealing space from Event/Location that need it more. Each line
// keeps a small color dot (den name text stays legible on its own for
// black & white printers, color is a bonus for anyone printing in color).
//
// "All Dens" gets Leaders' real (dark) color to make the common case bold,
// while an individual "Leaders" line is muted light grey — Leaders isn't
// really a den, so it's de-emphasized rather than using up its own slot
// in the visual hierarchy.
const MUTED_DEN_COLOR = "#D1D5DB";

function printDensList(dens) {
  if (hasAllKidDens(dens)) {
    return [{ label: "All Dens", color: DEN_MAP.leaders.color }];
  }
  return dens.map(d => ({
    label: DEN_MAP[d]?.label || d,
    color: d === "leaders" ? MUTED_DEN_COLOR : DEN_MAP[d]?.color,
  }));
}

export default function EventList({ events, onEdit, onDelete, onEventClick, canEdit }) {
  const sorted = [...events].sort((a, b) => {
    const dateCmp = (a.date || "").localeCompare(b.date || "");
    if (dateCmp !== 0) return dateCmp;
    // All-day events (no start_time) sort before timed events on the same day.
    return (a.start_time || "").localeCompare(b.start_time || "");
  });

  return (
    <div>
      {sorted.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No events match your filters.</div>
      )}

      {/* Compact printed reference sheet — a full-year list at ~7 cards/page
          isn't usable as a binder printout, so print gets its own dense
          table instead of scaled-down versions of the on-screen cards. */}
      {sorted.length > 0 && (
        <table className="hidden print:table w-full table-fixed border-collapse text-[10px] leading-tight">
          <colgroup>
            <col style={{ width: "60px" }} />
            <col style={{ width: "105px" }} />
            <col style={{ width: "255px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "210px" }} />
          </colgroup>
          <thead>
            <tr className="border-b-2 border-foreground font-semibold text-left">
              <th className="py-1 pr-2">Date</th>
              <th className="py-1 pr-2">Time</th>
              <th className="py-1 pr-2">Event</th>
              <th className="py-1 pr-2">Dens</th>
              <th className="py-1">Location</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(ev => {
              const dens = getEventDens(ev);
              return (
                <tr key={ev.id} className="border-b border-border print:break-inside-avoid align-top">
                  <td className="py-1 pr-2">{printDateRange(ev.date, ev.end_date)}</td>
                  <td className="py-1 pr-2">
                    {ev.start_time || ev.end_time ? formatTimeRange(ev.start_time, ev.end_time) : "All Day"}
                  </td>
                  <td className="py-1 pr-2 font-medium">
                    {ev.name}
                    {ev.details && <div className="font-normal text-muted-foreground">{ev.details}</div>}
                  </td>
                  <td className="py-1 pr-2">
                    {printDensList(dens).map((d, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span>{d.label}</span>
                      </div>
                    ))}
                  </td>
                  <td className="py-1">{ev.location}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="space-y-3 print:hidden">
      {sorted.map(ev => {
        const dens = getEventDens(ev);
        return (
          <div
            key={ev.id}
            className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base cursor-pointer hover:underline" onClick={() => onEventClick(ev)}>
                    {ev.name}
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {dens.map(d => {
                      const info = DEN_MAP[d];
                      if (!info) return null;
                      return (
                        <span key={d} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: info.bg, color: info.text }}>
                          {info.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {ev.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateRange(ev.date, ev.end_date)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {ev.start_time || ev.end_time ? formatTimeRange(ev.start_time, ev.end_time) : "All Day"}
                  </span>
                  {ev.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {ev.location}
                    </span>
                  )}
                </div>
                {ev.details && (
                  <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">{ev.details}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <button onClick={() => onEdit(ev)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(ev)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
