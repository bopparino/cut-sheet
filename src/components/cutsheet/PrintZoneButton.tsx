"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Printer } from "lucide-react";
import { flushPendingSaves } from "@/lib/print-flush";
import { printPdfInDialog } from "@/lib/print-client";

type Props = {
  cutsheetId: number;
  // Distinct zones across the house's sheets, already sorted. The button only
  // renders when the server found a vetted house (see replica page).
  zones: string[];
  // When both are set, the sheet form is saved before the packet is built, so
  // unsaved edits never print stale (same contract as PrintPacketButton).
  formId?: string;
  saveAction?: (formData: FormData) => Promise<void>;
};

// "Print Zone": the couldn't-get-permits workflow. Prints ONE zone's cut
// sheets + fittings with pick tickets consolidated over just that zone's
// sheets, so the shop can build a single zone without pulling material for
// the whole house. Zone picking is a small popover so the button row keeps
// the same rhythm as the two packet buttons.
export function PrintZoneButton({ cutsheetId, zones, formId, saveAction }: Props) {
  const [open, setOpen] = useState(false);
  const [busyZone, setBusyZone] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (zones.length === 0) return null;

  const printZone = async (zone: string) => {
    setBusyZone(zone);
    try {
      // What's on screen is what prints: flush the sheet form and any
      // debounced autosaves first, and abort the print if a save fails.
      if (formId && saveAction) {
        const form = document.getElementById(formId);
        if (form instanceof HTMLFormElement) {
          await saveAction(new FormData(form));
        }
      }
      await flushPendingSaves();
      await printPdfInDialog(
        `/api/pdf/${cutsheetId}/packet?kind=shop&zone=${encodeURIComponent(zone)}`,
      );
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Printing failed.");
    } finally {
      setBusyZone(null);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busyZone !== null}
        className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
      >
        <Printer className="h-4 w-4" /> {busyZone ? `Zone ${busyZone}…` : "Print Zone"}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 min-w-44 rounded-lg border border-border bg-background p-1 shadow-lg">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Print one zone only
          </p>
          {zones.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => printZone(z)}
              disabled={busyZone !== null}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-secondary disabled:opacity-60"
            >
              <Printer className="h-3.5 w-3.5 opacity-70" />
              Zone {z}
              {busyZone === z ? <span className="ml-auto text-xs text-muted-foreground">Preparing…</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
