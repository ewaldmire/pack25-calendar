import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { DENS } from "@/lib/dens";
import { ordinalWeekdayLabel } from "@/lib/recurring";

const DEFAULT_LOCATION = "Lincoln Trail Cafeteria";
const DEFAULT_START_TIME = "18:30"; // 6:30 PM — most pack events are evening
const DEFAULT_END_TIME = "19:30"; // 7:30 PM

export default function EventForm({ open, onOpenChange, onSave, editingEvent }) {
  const [form, setForm] = useState({
    name: "", date: "", end_date: "", start_time: "", end_time: "", location: "", details: "", dens: [],
    recurrence_type: "none", recurrence_interval: 1, recurrence_end_date: ""
  });
  const [saving, setSaving] = useState(false);
  const [densError, setDensError] = useState(false);

  useEffect(() => {
    setDensError(false);
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
    } else {
      setForm({ name: "", date: "", end_date: "", start_time: DEFAULT_START_TIME, end_time: DEFAULT_END_TIME, location: DEFAULT_LOCATION, details: "", dens: [], recurrence_type: "none", recurrence_interval: 1, recurrence_end_date: "" });
    }
  }, [editingEvent, open]);

  const toggleDen = (den) => {
    setForm(f => ({
      ...f,
      dens: f.dens.includes(den)
        ? f.dens.filter(d => d !== den)
        : [...f.dens, den]
    }));
    setDensError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.date) return;
    if (form.dens.length === 0) {
      setDensError(true);
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
                    <Label htmlFor="recurrence_end_date">Ends On</Label>
                    <Input id="recurrence_end_date" type="date" value={form.recurrence_end_date} onChange={e => setForm({ ...form, recurrence_end_date: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}
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
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Lincoln Trail Cafeteria" />
          </div>
          <div className="space-y-2">
            <Label>Assign to Dens *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DENS.map(d => (
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
