import React, { useMemo } from "react";
import { getActiveKidDensForRange, LEADERS } from "@/lib/dens";
import { cn } from "@/lib/utils";

const LEADERS_DEN = LEADERS;

export default function FilterBar({ selectedKidDens, onToggleDen, showLeaders, onToggleLeaders, onClear, onAll, rangeStart, rangeEnd }) {
  // The viewed range (List view's from/to dates, or the Calendar view's
  // current month) can straddle a June 1 crossover — a den's rank can
  // genuinely differ between the two ends of the range, so a single label
  // can't honestly represent the whole thing. getActiveKidDensForRange
  // returns a split label/color pair for any den that advances mid-range;
  // toggling a split button still selects/clears its one underlying value,
  // same as any other den button.
  const kidDens = useMemo(() => getActiveKidDensForRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  // "All Dens" reflects the 6 (or, mid-crossover, up to 7) currently-shown
  // kid dens only. Leaders is a fully separate visibility toggle for
  // leaders-only events (see Home.jsx's filteredEvents) — it never factors
  // into this, and its own button below lights purely off showLeaders,
  // independent of kid-den selection.
  const allSelected = selectedKidDens.length === 0 || kidDens.every(d => selectedKidDens.includes(d.value));

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
      {kidDens.map(d => {
        const active = allSelected || selectedKidDens.includes(d.value);
        const stages = d.stages; // present when the viewed range spans one or more crossovers for this den
        return (
          <button
            key={d.value}
            onClick={() => onToggleDen(d.value)}
            title={`Class of ${d.value}`}
            className={cn(
              "flex items-center rounded-full text-sm font-medium border transition-all overflow-hidden",
              stages ? "gap-0" : "gap-1.5 px-3 py-1.5",
              // A multi-color chain has no single tint of its own to stand
              // out against the page background the way a one-color button
              // does, so it keeps a plain dark outline regardless of
              // selection state instead of going borderless when active.
              stages ? "border-black/40" : active ? "border-transparent" : "bg-background border-border hover:border-foreground/30"
            )}
            style={!stages && active ? { backgroundColor: d.bg, color: d.text, borderColor: d.color } : {}}
          >
            {stages ? stages.map((s, i) => (
              // Each stage is its own self-contained, square-edged chip
              // (background + text on the same element, not a CSS gradient
              // behind the whole row — a gradient assumes every segment is
              // the same width, but "Lions" and "Arrow of Light" aren't, so
              // a label routinely landed on a neighboring segment's color).
              // Rounding lives only on the outer button (via overflow-
              // hidden clipping the first/last chip's outer corner) — a
              // rounded corner on every chip made one button read as
              // several separate pills glued together.
              <span
                key={i}
                className={cn(
                  "flex items-center gap-1 py-1.5",
                  i === 0 ? "pl-3 pr-2" : i === stages.length - 1 ? "pl-2 pr-3" : "px-2"
                )}
                style={active ? { backgroundColor: s.bg, color: s.text } : {}}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
            )) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.label}
              </>
            )}
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
