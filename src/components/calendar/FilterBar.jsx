import React from "react";
import { DENS } from "@/lib/dens";
import { cn } from "@/lib/utils";

export default function FilterBar({ selectedDens, onToggleDen, onClear, onAll }) {
  const allSelected = selectedDens.length === 0;

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
      {DENS.map(d => {
        const active = selectedDens.includes(d.value);
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
      {selectedDens.length > 0 && (
        <button onClick={onClear} className="text-sm text-muted-foreground hover:text-foreground underline ml-1">
          Clear
        </button>
      )}
    </div>
  );
}
