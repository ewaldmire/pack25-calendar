import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Event } from "@/api/eventsClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { format, addDays, parseISO } from "date-fns";
import { Plus, Calendar as CalendarIcon, List, Printer, ChevronLeft, ChevronRight, Loader2, CalendarPlus, LogIn, LogOut } from "lucide-react";
import cubScoutsLogo from "@/assets/cub-scouts-logo.png";

import EventForm from "@/components/calendar/EventForm";
import EventList from "@/components/calendar/EventList";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import FilterBar from "@/components/calendar/FilterBar";
import EventModal from "@/components/calendar/EventModal";
import LoginDialog from "@/components/calendar/LoginDialog";
import SubscribeDialog from "@/components/calendar/SubscribeDialog";
import { cn } from "@/lib/utils";
import { KID_DENS, getEventDens } from "@/lib/dens";
import { generateRecurrenceDates } from "@/lib/recurring";
import { useAuth } from "@/lib/AuthContext";
import { DEMO_MODE } from "@/lib/demoMode";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selectedKidDens, setSelectedKidDens] = useState([]);
  // Leaders isn't a den — it's a separate visibility toggle for
  // leaders-only events, not another entry in the kid-den OR-filter
  // (which would otherwise hide every kid-den event the moment it's on).
  const [showLeaders, setShowLeaders] = useState(true);
  const [monthDate, setMonthDate] = useState(new Date());
  const [listFrom, setListFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [listTo, setListTo] = useState(() => format(addDays(new Date(), 90), "yyyy-MM-dd"));
  const [formOpen, setFormOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [modalEvent, setModalEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, logout } = useAuth();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Event.list();
      setEvents(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Could not load events", description: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const kidDens = getEventDens(ev).filter(d => d !== "leaders");
      // Leaders-only events are governed entirely by the showLeaders
      // toggle, independent of whatever kid dens are selected.
      if (kidDens.length === 0) return showLeaders;
      return selectedKidDens.length === 0 || kidDens.some(d => selectedKidDens.includes(d));
    });
  }, [events, selectedKidDens, showLeaders]);

  const monthEvents = useMemo(() => {
    if (view !== "calendar") return filteredEvents;
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    return filteredEvents.filter(ev => {
      if (!ev.date) return false;
      const d = new Date(ev.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [filteredEvents, monthDate, view]);

  const listEvents = useMemo(() => {
    return filteredEvents.filter(ev => {
      const end = ev.end_date || ev.date;
      return end >= listFrom && ev.date <= listTo;
    });
  }, [filteredEvents, listFrom, listTo]);

  // Explicit den list for the ICS subscribe link, mirroring whatever's
  // currently being viewed. Default (nothing restricted) stays an empty
  // array so the feed omits ?dens= entirely, same as before this toggle
  // existed. Turning Leaders off with no kid-den restriction has to spell
  // out all 6 kid dens explicitly — the feed has no other way to say
  // "everything except Leaders".
  const subscribeDens = useMemo(() => {
    const noKidRestriction = selectedKidDens.length === 0;
    if (noKidRestriction && showLeaders) return [];
    const kidPart = noKidRestriction ? KID_DENS.map(d => d.value) : selectedKidDens;
    return showLeaders ? [...kidPart, "leaders"] : kidPart;
  }, [selectedKidDens, showLeaders]);

  // Native date inputs fire onChange with incomplete values while the user
  // is still typing (e.g. after only the month digits), so this must
  // tolerate anything short of a full yyyy-MM-dd string instead of crashing
  // on parseISO.
  const formatListDate = (dateStr) =>
    /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? format(parseISO(dateStr), "MMM d, yyyy") : dateStr;

  const toggleDen = (den) => {
    setSelectedKidDens(prev => prev.includes(den) ? prev.filter(d => d !== den) : [...prev, den]);
  };

  const handleSave = async (form) => {
    const { recurrence_type, recurrence_interval, recurrence_end_date, ...base } = form;
    const cleanBase = {
      name: base.name, date: base.date, end_date: base.end_date || "", start_time: base.start_time, end_time: base.end_time,
      location: base.location, details: base.details, dens: base.dens
    };
    if (editingEvent) {
      await Event.update(editingEvent.id, cleanBase);
      toast({ title: "Event updated" });
    } else if (recurrence_type !== "none" && recurrence_end_date) {
      const dates = generateRecurrenceDates(base.date, recurrence_type, recurrence_interval || 1, recurrence_end_date);
      const records = dates.map(d => ({ ...cleanBase, date: d }));
      await Event.bulkCreate(records);
      toast({ title: `${dates.length} recurring events added` });
    } else {
      await Event.create(cleanBase);
      toast({ title: "Event added" });
    }
    setEditingEvent(null);
    await loadEvents();
  };

  const handleEdit = (ev) => { setEditingEvent(ev); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await Event.delete(deleteTarget.id);
      toast({ title: "Event deleted" });
      setDeleteTarget(null);
      await loadEvents();
    } catch (err) {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const openNew = () => { setEditingEvent(null); setFormOpen(true); };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-primary print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src={cubScoutsLogo}
              alt="Pack 25 Mahomet"
              className="w-9 h-9 rounded-lg object-contain shadow-sm"
            />
            <h1 className="font-bold text-base sm:text-lg leading-tight text-primary-foreground">Pack 25 Mahomet</h1>
          </div>
          <div className="flex items-center gap-2">
            {!DEMO_MODE && !isAuthenticated && (
              <Button variant="outline" size="sm" onClick={() => setSubscribeOpen(true)} className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                <CalendarPlus className="w-4 h-4 mr-1.5" /> Subscribe
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
            {isAuthenticated ? (
              <>
                <Button size="sm" onClick={openNew} className="bg-gold text-primary hover:bg-gold/90">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Event
                </Button>
                {!DEMO_MODE && (
                  <Button variant="ghost" size="sm" onClick={logout} className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                    <LogOut className="w-4 h-4 mr-1.5" /> Log Out
                  </Button>
                )}
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setLoginOpen(true)} className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                <LogIn className="w-4 h-4 mr-1.5" /> Leader Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {/* Print-only header */}
        <div className="hidden print:flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Pack 25 Mahomet</h1>
            <p className="text-sm text-muted-foreground">
              {view === "calendar"
                ? format(monthDate, "MMMM yyyy")
                : `${formatListDate(listFrom)} – ${formatListDate(listTo)}`}
            </p>
          </div>
          <img src={cubScoutsLogo} alt="Pack 25 Mahomet" className="w-12 h-12 object-contain" />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 print:hidden">
          {/* "All Dens" only resets the kid-den selection — Leaders is a
              separate axis and must be untouched by it. "Clear" is the
              full reset back to the true default (both axes). */}
          <FilterBar
            selectedKidDens={selectedKidDens}
            onToggleDen={toggleDen}
            showLeaders={showLeaders}
            onToggleLeaders={() => setShowLeaders(s => !s)}
            onAll={() => setSelectedKidDens([])}
            onClear={() => { setSelectedKidDens([]); setShowLeaders(true); }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {view === "calendar" ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-lg font-semibold w-44 text-center">{format(monthDate, "MMMM yyyy")}</h2>
                <Button variant="ghost" size="icon" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="sm" className="ml-1" onClick={() => setMonthDate(new Date())}>Today</Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <Input
                  type="date"
                  value={listFrom}
                  max={listTo}
                  onChange={e => setListFrom(e.target.value)}
                  className="w-auto"
                  aria-label="From date"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  value={listTo}
                  min={listFrom}
                  onChange={e => setListTo(e.target.value)}
                  className="w-auto"
                  aria-label="To date"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setView("list")}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors", view === "list" ? "bg-foreground text-background" : "hover:bg-accent")}
                >
                  <List className="w-4 h-4" /> List
                </button>
                <button
                  onClick={() => setView("calendar")}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-border", view === "calendar" ? "bg-foreground text-background" : "hover:bg-accent")}
                >
                  <CalendarIcon className="w-4 h-4" /> Calendar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : view === "calendar" ? (
            <CalendarGrid
              events={monthEvents}
              monthDate={monthDate}
              onEventClick={setModalEvent}
              onDayClick={isAuthenticated ? (dateStr) => { setEditingEvent(null); setFormOpen(true); } : undefined}
            />
          ) : (
            <EventList
              events={listEvents}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
              onEventClick={setModalEvent}
              canEdit={isAuthenticated}
            />
          )}
        </div>
      </main>

      <EventForm open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingEvent(null); }} onSave={handleSave} editingEvent={editingEvent} />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} selectedDens={subscribeDens} />
      <EventModal event={modalEvent} onOpenChange={setModalEvent} onEdit={handleEdit} onDelete={setDeleteTarget} canEdit={isAuthenticated} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove "{deleteTarget?.name}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
