import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function UploadEvents({ open, onOpenChange, onImported }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("importEvents", { file_url });
      const count = res.data?.created ?? 0;
      toast({ title: `${count} events imported`, description: "Your document was parsed and events added to the calendar." });
      setFile(null);
      onOpenChange(false);
      onImported();
    } catch (err) {
      toast({ variant: "destructive", title: "Import failed", description: err?.response?.data?.error || err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Import Events from Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a PDF or Word document containing your event list. The system will read each event's name, date, time, location, details, and dens, then add them all to the calendar.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-8 cursor-pointer hover:border-foreground/40 transition-colors">
            {file ? (
              <span className="text-sm font-medium">{file.name}</span>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to choose a PDF or .docx file</span>
              </>
            )}
            <input
              type="file"
              accept=".docx,.doc,.txt,.pdf"
              className="hidden"
              onChange={e => setFile(e.target.files[0])}
            />
          </label>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" disabled={busy}>Cancel</Button></DialogClose>
          <Button onClick={handleUpload} disabled={!file || busy}>
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</> : "Import Events"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
