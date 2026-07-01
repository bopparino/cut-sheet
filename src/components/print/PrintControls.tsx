"use client";

import { useEffect } from "react";

// Drives the combined print view. On load it waits for every <img> (the fitting
// drawings) to finish, then opens the browser print dialog — the user picks the
// shop's network printer ("Send to Shop") or a local printer / Save-as-PDF
// ("Print Here"). A screen-only toolbar (hidden in the actual print) offers a
// manual re-print if the dialog was dismissed.
export function PrintControls({ title }: { title: string }) {
  useEffect(() => {
    const pending = Array.from(document.images).filter((img) => !img.complete);
    if (pending.length === 0) {
      window.print();
      return;
    }
    let remaining = pending.length;
    const onDone = () => {
      if (--remaining <= 0) window.print();
    };
    pending.forEach((img) => {
      img.addEventListener("load", onDone);
      img.addEventListener("error", onDone);
    });
    return () => {
      pending.forEach((img) => {
        img.removeEventListener("load", onDone);
        img.removeEventListener("error", onDone);
      });
    };
  }, []);

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-neutral-300 bg-neutral-100 px-4 py-2 text-sm print:hidden">
      <div className="min-w-0">
        <span className="font-semibold text-neutral-800">{title}</span>
        <span className="ml-2 text-neutral-500">
          Choose your printer in the dialog — the shop printer to send it there, or a local
          printer / Save as PDF to keep a copy.
        </span>
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="shrink-0 rounded bg-neutral-900 px-3 py-1.5 font-semibold text-white hover:bg-neutral-700"
      >
        Print
      </button>
    </div>
  );
}
