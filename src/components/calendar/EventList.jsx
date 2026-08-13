import React from "react";
import { DENS, DEN_MAP } from "@/lib/dens";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2, MapPin, Clock, Calendar } from "lucide-react";
import { formatTimeRange } from "@/lib/timeFormat";
import { formatDateRange } from "@/lib/recurring";

export default function EventList({ events, onEdit, onDelete, onEventClick }) {
  const sorted = [...events].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return (
    <div className="space-y-3">
      {sorted.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No events match your filters.</div>
      )}
      {sorted.map(ev => {
        const dens = ev.dens && ev.dens.length ? ev.dens : ["leaders"];
        return (
          <div
            key={ev.id}
            className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow print:break-inside-avoid print:shadow-none print:border-border"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base cursor-pointer hover:underline" onClick={() => onEventClick(ev)}>
                    {ev.name}
                  </h3>
                  <div className="flex flex-wrap gap-1 print:gap-0.5">
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
                  {(ev.start_time || ev.end_time) && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeRange(ev.start_time, ev.end_time)}
                    </span>
                  )}
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
              <div className="flex gap-1 print:hidden">
                <button onClick={() => onEdit(ev)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(ev)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
