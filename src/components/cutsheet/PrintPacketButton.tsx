"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";

// Opens the browser's print dialog on the packet PDF instead of downloading
// it (Kimmie was cleaning packet files out of Downloads after every print).
// The PDF is fetched as a blob and printed from a hidden iframe - works in
// Edge and Chrome. Uses the ?paper=legal packet: browser print dialogs force
// one paper size for the whole document, so the flattened 8.5x14 variant is
// the one that prints correctly here.
export function PrintPacketButton({ cutsheetId }: { cutsheetId: number }) {
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const print = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/pdf/${cutsheetId}/packet?paper=legal`);
      if (!res.ok) throw new Error(`Could not build the packet (${res.status})`);
      const blob = await res.blob();

      // Replace any iframe left from a previous print.
      if (frameRef.current) frameRef.current.remove();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);

      const url = URL.createObjectURL(blob);
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.src = url;
      await new Promise<void>((resolve, reject) => {
        frame.onload = () => resolve();
        frame.onerror = () => reject(new Error("Could not load the packet for printing"));
        document.body.appendChild(frame);
      });
      frameRef.current = frame;
      urlRef.current = url;
      // Give the embedded PDF viewer a beat to finish rendering before the
      // print call, then hand off to the browser's print dialog.
      await new Promise((r) => setTimeout(r, 300));
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
    >
      <Printer className="h-4 w-4" /> {busy ? "Preparing…" : "Print"}
    </button>
  );
}
