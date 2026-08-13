import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DEN_MAP } from "@/lib/dens";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, MapPin, Pencil, Trash2 } from "lucide-react";
import { formatTimeRange } from "@/lib/timeFormat";
import { formatDateRange } from "@/lib/recurring";

export default function EventModal({ event, onOpenChange, onEdit, onDelete }) {
  if (!event) return null;
  const dens = event.dens && event.dens.length ? event.dens : ["leaders"];

  return (
    <Dialog open={!!event} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{event.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {dens.map(d => {
              const info = DEN_MAP[d];
              if (!info) return null;
              return (
                <span key={d} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: info.bg, color: info.text }}>
                  {info.label}
                </span>
              );
            })}
          </div>
          <div className="space-y-2 text-sm">
            {event.date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" /> {formatDateRange(event.date, event.end_date)}
              </div>
            )}
            {(event.start_time || event.end_time) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" /> {formatTimeRange(event.start_time, event.end_time)}
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" /> {event.location}
              </div>
            )}
          </div>
          {event.details && (
            <div className="pt-2 border-t border-border">
              <p className="text-sm whitespace-pre-wrap text-foreground/85">{event.details}</p>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" size="sm" onClick={() => { onOpenChange(false); onDelete(event); }}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            <Button size="sm" onClick={() => { onOpenChange(false); onEdit(event); }}>
              <Pencil className="w-4 h-4 mr-1.5" /> Edit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
