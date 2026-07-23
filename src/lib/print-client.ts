"use client";

// Fetch a PDF and hand it to the browser's print dialog from a hidden iframe
// instead of downloading it (Kimmie was cleaning packet files out of Downloads
// after every print). Works in Edge and Chrome. Module-level refs: only one
// print happens at a time, and the previous iframe/object-URL are reclaimed on
// the next call.

let frame: HTMLIFrameElement | null = null;
let objectUrl: string | null = null;

export async function printPdfInDialog(pdfUrl: string): Promise<void> {
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`Could not build the packet (${res.status})`);
  const blob = await res.blob();

  // Replace any iframe left from a previous print.
  if (frame) frame.remove();
  if (objectUrl) URL.revokeObjectURL(objectUrl);

  const url = URL.createObjectURL(blob);
  const el = document.createElement("iframe");
  el.style.position = "fixed";
  el.style.right = "0";
  el.style.bottom = "0";
  el.style.width = "0";
  el.style.height = "0";
  el.style.border = "0";
  el.src = url;
  await new Promise<void>((resolve, reject) => {
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Could not load the packet for printing"));
    document.body.appendChild(el);
  });
  frame = el;
  objectUrl = url;
  // Give the embedded PDF viewer a beat to finish rendering before the
  // print call, then hand off to the browser's print dialog.
  await new Promise((r) => setTimeout(r, 300));
  el.contentWindow?.focus();
  el.contentWindow?.print();
}
