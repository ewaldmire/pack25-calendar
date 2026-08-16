import React from "react";
import { KID_DENS, DEN_MAP, hasAllKidDens } from "@/lib/dens";
import { cn } from "@/lib/utils";

const LEADERS_DEN = DEN_MAP.leaders;

export default function FilterBar({ selectedKidDens, onToggleDen, showLeaders, onToggleLeaders, onClear, onAll }) {
  // "All Dens" reflects the 6 real kid dens only. Leaders is a fully
  // separate visibility toggle for leaders-only events (see Home.jsx's
  // filteredEvents) — it never factors into this, and its own button below
  // lights purely off showLeaders, independent of kid-den selection.
  const allSelected = selectedKidDens.length === 0 || hasAllKidDens(selectedKidDens);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onAll}
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
          allSelected
            ? "bg-foreground text-background border-foreground"
            : "bg-background text-foreground border-border hover:border-foreground/40"
        )}
      >
        All Dens
      </button>
      <button
        onClick={onToggleLeaders}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
          showLeaders ? "border-transparent" : "bg-background border-border hover:border-foreground/30"
        )}
        style={showLeaders ? { backgroundColor: LEADERS_DEN.bg, color: LEADERS_DEN.text, borderColor: LEADERS_DEN.color } : {}}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LEADERS_DEN.color }} />
        Leaders
      </button>
      {KID_DENS.map(d => {
        const active = allSelected || selectedKidDens.includes(d.value);
        return (
          <button
            key={d.value}
            onClick={() => onToggleDen(d.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
              active ? "border-transparent" : "bg-background border-border hover:border-foreground/30"
            )}
            style={active ? { backgroundColor: d.bg, color: d.text, borderColor: d.color } : {}}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            {d.label}
          </button>
        );
      })}
      {(selectedKidDens.length > 0 || !showLeaders) && (
        <button onClick={onClear} className="text-sm text-muted-foreground hover:text-foreground underline ml-1">
          Clear
        </button>
      )}
    </div>
  );
}
