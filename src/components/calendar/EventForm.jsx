import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { getActiveKidDens, hasAllKidDens, LEADERS } from "@/lib/dens";
import { ordinalWeekdayLabel } from "@/lib/recurring";
import { cn } from "@/lib/utils";

const DEFAULT_LOCATION = "Lincoln Trail Cafeteria";
const DEFAULT_START_TIME = "18:30"; // 6:30 PM — most pack events are evening
const DEFAULT_END_TIME = "19:30"; // 7:30 PM
const LEADERS_DEN = LEADERS;

export default function EventForm({ open, onOpenChange, onSave, editingEvent }) {
  const [form, setForm] = useState({
    name: "", date: "", end_date: "", start_time: "", end_time: "", location: "", details: "", dens: [],
    recurrence_type: "none", recurrence_interval: 1, recurrence_end_date: ""
  });
  const [saving, setSaving] = useState(false);
  const [densError, setDensError] = useState(false);
  const [recurrenceEndDateError, setRecurrenceEndDateError] = useState(false);
  const [allDay, setAllDay] = useState(false);

  useEffect(() => {
    setDensError(false);
    setRecurrenceEndDateError(false);
    if (editingEvent) {
      setForm({
        name: editingEvent.name || "",
        date: editingEvent.date ? editingEvent.date.slice(0, 10) : "",
        end_date: editingEvent.end_date ? editingEvent.end_date.slice(0, 10) : "",
        start_time: editingEvent.start_time || "",
        end_time: editingEvent.end_time || "",
        location: editingEvent.location || "",
        details: editingEvent.details || "",
        dens: editingEvent.dens || [],
        recurrence_type: "none", recurrence_interval: 1, recurrence_end_date: ""
      });
      setAllDay(!editingEvent.start_time);
    } else {
      setForm({ name: "", date: "", end_date: "", start_time: DEFAULT_START_TIME, end_time: DEFAULT_END_TIME, location: DEFAULT_LOCATION, details: "", dens: [], recurrence_type: "none", recurrence_interval: 1, recurrence_end_date: "" });
      setAllDay(false);
    }
  }, [editingEvent, open]);

  const handleAllDayChange = (checked) => {
    setAllDay(checked);
    setForm(f => ({
      ...f,
      start_time: checked ? "" : DEFAULT_START_TIME,
      end_time: checked ? "" : DEFAULT_END_TIME,
    }));
  };

  const toggleDen = (den) => {
    setForm(f => {
      if (den === "leaders") {
        // Leaders Only is exclusive — selecting it clears any kid dens.
        return { ...f, dens: f.dens.includes("leaders") ? [] : ["leaders"] };
      }
      // Selecting a kid den always drops Leaders Only, if present.
      const withoutLeaders = f.dens.filter(d => d !== "leaders");
      return {
        ...f,
        dens: withoutLeaders.includes(den)
          ? withoutLeaders.filter(d => d !== den)
          : [...withoutLeaders, den]
      };
    });
    setDensError(false);
  };

  // The active kid-den roster is computed relative to this event's own
  // date, not today — so scheduling a meeting for after an upcoming June 1
  // crossover already shows the post-crossover roster. All three of these
  // (picker, "All Dens" shortcut, and its lit-up state) must share the same
  // reference date, or the button can visibly disagree with what's checked.
  const activeKidDens = getActiveKidDens(form.date || undefined);

  // Values already on this event that aren't part of the picker above —
  // a cohort already graduated out, or (like inviting next fall's
  // incoming Lions to a summer event) not yet joined as of this date.
  // Editing used to just make these silently disappear from the form
  // while leaving them saved underneath, which is exactly how a stray den
  // ends up on an event with nobody around who could see or remove it —
  // show them instead, so a leader can see and deliberately keep or clear
  // whatever's actually stored.
  const activeValues = new Set(activeKidDens.map(d => d.value));
  const staleDens = form.dens.filter(d => d !== "leaders" && !activeValues.has(d));

  const selectAllKidDens = () => {
    setForm(f => ({ ...f, dens: [...activeKidDens.map(d => d.value), ...staleDens] }));
    setDensError(false);
  };

  const allKidDensSelected = hasAllKidDens(form.dens, form.date || undefined);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.date) return;
    if (form.dens.length === 0) {
      setDensError(true);
      return;
    }
    if (form.recurrence_type !== "none" && !form.recurrence_end_date) {
      setRecurrenceEndDateError(true);
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Pack Meeting" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="date">Start Date *</Label>
              <Input id="date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="space-y-2 min-w-0">
              <Label htmlFor="end_date">End Date (multi-day)</Label>
              <Input id="end_date" type="date" value={form.end_date || ""} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <Checkbox checked={allDay} onCheckedChange={(checked) => handleAllDayChange(!!checked)} />
            <span className="text-sm">All Day</span>
          </label>
          {!allDay && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="start_time">Start Time</Label>
                <Input id="start_time" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="end_time">End Time</Label>
                <Input id="end_time" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
          )}
          {!editingEvent && (
            <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="recurrence_type">Repeat</Label>
                <select
                  id="recurrence_type"
                  value={form.recurrence_type}
                  onChange={e => setForm({ ...form, recurrence_type: e.target.value })}
                  className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="none">Does not repeat</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly (same date)</option>
                  <option value="monthly_weekday">
                    {form.date ? `Monthly on the ${ordinalWeekdayLabel(form.date)}` : "Monthly (day of week)"}
                  </option>
                </select>
              </div>
              {form.recurrence_type !== "none" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="recurrence_interval">Every</Label>
                    <select
                      id="recurrence_interval"
                      value={form.recurrence_interval}
                      onChange={e => setForm({ ...form, recurrence_interval: parseInt(e.target.value) })}
                      className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {[1,2,3,4].map(n => (
                        <option key={n} value={n}>{form.recurrence_type === "weekly" ? `${n} week${n>1?"s":""}` : `${n} month${n>1?"s":""}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="recurrence_end_date">Ends On *</Label>
                    <Input
                      id="recurrence_end_date"
                      type="date"
                      value={form.recurrence_end_date}
                      onChange={e => { setForm({ ...form, recurrence_end_date: e.target.value }); setRecurrenceEndDateError(false); }}
                    />
                    {recurrenceEndDateError && (
                      <p className="text-sm text-destructive">An end date is required for a repeating event.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Lincoln Trail Cafeteria" />
          </div>
          <div className="space-y-2">
            <Label>Assign to Dens *</Label>
            <button
              type="button"
              onClick={selectAllKidDens}
              className={cn(
                "w-full text-sm font-medium rounded-lg border px-3 py-2 transition-colors",
                allKidDensSelected ? "bg-foreground text-background border-foreground" : "border-border hover:bg-accent"
              )}
            >
              All Dens
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeKidDens.map(d => (
                <label key={d.value} className="flex items-center gap-2 min-w-0 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-accent transition-colors">
                  <Checkbox
                    checked={form.dens.includes(d.value)}
                    onCheckedChange={() => toggleDen(d.value)}
                  />
                  <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm min-w-0">{d.label}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 min-w-0 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-accent transition-colors">
              <Checkbox
                checked={form.dens.includes("leaders")}
                onCheckedChange={() => toggleDen("leaders")}
              />
              <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: LEADERS_DEN.color }} />
              <span className="text-sm min-w-0">Leaders Only</span>
            </label>
            {staleDens.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  Also assigned — not part of the pack's regular roster on this date (already graduated, or not yet joined):
                </p>
                {staleDens.map(d => (
                  <label key={d} className="flex items-center gap-2 min-w-0 rounded-lg border border-dashed border-muted-foreground/40 px-3 py-2 cursor-pointer hover:bg-accent transition-colors">
                    <Checkbox checked onCheckedChange={() => toggleDen(d)} />
                    <span className="text-sm min-w-0 text-muted-foreground">Class of {d}</span>
                  </label>
                ))}
              </div>
            )}
            {densError && (
              <p className="text-sm text-destructive">Select at least one den.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">Details</Label>
            <Textarea id="details" value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} rows={3} placeholder="What to bring, agenda, notes..." />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Event"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
