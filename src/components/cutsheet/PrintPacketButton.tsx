"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { flushPendingSaves } from "@/lib/print-flush";
import { printPdfInDialog } from "@/lib/print-client";

type Props = {
  cutsheetId: number;
  kind: "foreman" | "shop";
  label: string;
  primary?: boolean;
  // When both are set, the sheet form is saved before the packet is built.
  // Without this, edits made since the last explicit Save (the S/L dropdown
  // was the reported case) print stale - the packet renders from the DB.
  formId?: string;
  saveAction?: (formData: FormData) => Promise<void>;
};

// Opens the browser's print dialog on a packet PDF instead of downloading it
// (Kimmie was cleaning packet files out of Downloads after every print). The
// PDF is fetched as a blob and printed from a hidden iframe - works in Edge
// and Chrome. Every packet page is Legal (8.5x14), so it prints correctly
// from any browser on any printer with Legal loaded; the user just picks the
// destination printer (Clinton / Seaford / desk) in the dialog.
export function PrintPacketButton({ cutsheetId, kind, label, primary = false, formId, saveAction }: Props) {
  const [busy, setBusy] = useState(false);

  const print = async () => {
    setBusy(true);
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
      await printPdfInDialog(`/api/pdf/${cutsheetId}/packet?kind=${kind}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Printing failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={print}
      disabled={busy}
      className={
        primary
          ? "btn-glow inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          : "inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
      }
    >
      <Printer className="h-4 w-4" /> {busy ? "Preparing…" : label}
    </button>
  );
}
