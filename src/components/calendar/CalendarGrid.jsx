import React from "react";
import { DEN_MAP, MULTI_DEN_STYLE } from "@/lib/dens";
import { formatTime } from "@/lib/timeFormat";
import { getEventDates } from "@/lib/recurring";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarGrid({ events, monthDate, onEventClick, onDayClick }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsByDay = {};
  events.forEach(ev => {
    const dates = getEventDates(ev);
    dates.forEach(key => {
      if (!eventsByDay[key]) eventsByDay[key] = [];
      eventsByDay[key].push(ev);
    });
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card print:border-0">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 print:bg-transparent">
        {WEEKDAYS.map(d => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-[96px] border-b border-r border-border bg-muted/20 print:bg-transparent print:border-0" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = eventsByDay[dateStr] || [];
          const isToday = dateStr === todayStr;
          return (
            <div
              key={i}
              onClick={() => onDayClick && onDayClick(dateStr)}
              className={cn(
                "min-h-[96px] border-b border-r border-border p-1.5 flex flex-col gap-1 cursor-pointer hover:bg-accent/40 transition-colors print:cursor-default print:hover:bg-transparent",
                i % 7 === 6 && "border-r-0"
              )}
            >
              <div className={cn(
                "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                isToday ? "bg-gold text-foreground" : "text-muted-foreground"
              )}>
                {day}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                {dayEvents.slice(0, 3).map(ev => {
                  const dens = ev.dens && ev.dens.length ? ev.dens : ["leaders"];
                  const firstDen = DEN_MAP[dens[0]] || DEN_MAP.leaders;
                  const pillStyle = dens.length > 1
                    ? MULTI_DEN_STYLE
                    : { backgroundColor: firstDen.bg, color: firstDen.text };
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      className="text-left text-[11px] leading-tight px-1.5 py-1 rounded truncate font-medium print:py-0.5"
                      style={pillStyle}
                      title={ev.name}
                    >
                      {ev.start_time && <span className="opacity-70 mr-1 print:hidden">{formatTime(ev.start_time)}</span>}
                      {!ev.start_time && !ev.end_time && <span className="opacity-70 mr-1 print:hidden">All Day</span>}
                      {ev.name}
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1.5">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
