import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Copy, CalendarPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DEN_MAP } from "@/lib/dens";

export default function SubscribeDialog({ open, onOpenChange, selectedDens = [] }) {
  const { toast } = useToast();
  const query = selectedDens.length > 0 ? `?dens=${selectedDens.map(encodeURIComponent).join(",")}` : "";
  const feedPath = `/calendar.ics${query}`;
  const httpsUrl = typeof window !== "undefined" ? `${window.location.origin}${feedPath}` : feedPath;
  const webcalUrl = httpsUrl.replace(/^https?:/, "webcal:");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      toast({ title: "Link copied" });
    } catch {
      toast({ variant: "destructive", title: "Couldn't copy link", description: httpsUrl });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Subscribe to the Calendar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Subscribing adds pack events to your phone's calendar app automatically —
            new and updated events show up without anyone re-importing anything.
          </p>

          {selectedDens.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>Only events for:</span>
              {selectedDens.map((d) => (
                <span
                  key={d}
                  className="font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: DEN_MAP[d]?.bg, color: DEN_MAP[d]?.text }}
                >
                  {DEN_MAP[d]?.label || d}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="font-medium">iPhone (Apple Calendar)</p>
            <Button asChild className="w-full">
              <a href={webcalUrl}>
                <CalendarPlus className="w-4 h-4 mr-1.5" /> Tap to Subscribe
              </a>
            </Button>
          </div>

          <div className="space-y-2">
            <p className="font-medium">Android / Google Calendar</p>
            <p className="text-muted-foreground">
              On a computer, open Google Calendar → Settings → Add calendar →
              "From URL", and paste the link below. It will then sync to your phone.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs">
                {httpsUrl}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copyLink} className="shrink-0">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
