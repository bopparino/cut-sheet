"use client";

// Debounced autosavers (the Fittings card) can hold edits in a timer window
// when the user hits Print - the packet would render from the DB without
// them. Savers register a flush here; PrintPacketButton awaits flushAll()
// before building the PDF, so what's on screen is always what prints.

const flushers = new Set<() => Promise<void>>();

export function registerPrintFlush(fn: () => Promise<void>): () => void {
  flushers.add(fn);
  return () => flushers.delete(fn);
}

export async function flushPendingSaves(): Promise<void> {
  await Promise.all([...flushers].map((fn) => fn()));
}
