"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImagePlus, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FittingLabelEditor } from "@/components/cutsheet/FittingLabelEditor";
import { FittingThumb } from "@/components/cutsheet/FittingThumb";
import { FITTINGS, FITTING_MAP, expandFittingRows } from "@/lib/fittings";
import { saveFittings, uploadAttachment, deleteAttachment } from "@/lib/actions";
import { registerPrintFlush } from "@/lib/print-flush";
import type { FittingRow } from "@/lib/schema";

export type DrawingItem = {
  id: number;
  filename: string;
  size: number;
};

type Props = {
  cutsheetId: number;
  fittings: FittingRow[];
  // The sheet's kind='image' attachments. Every one of these prints at the
  // end of the fittings page (same rows the legacy Access drawings use), so
  // they're surfaced HERE - Kimmie's custom Paint drawings belong to the
  // fittings section in her head, not to a generic Attachments bucket.
  drawings: DrawingItem[];
  className?: string;
};

// The fittings picker: replaces the MS Paint select-copy-paste-annotate ritual.
// Tap drawings in the catalog to add them, then click a picked drawing to open
// it large and place measurements directly on the correct sides (the digitized
// Paint text tool - see FittingLabelEditor). Saves itself (debounced) like the
// attachment cards - it lives outside the big replica form on purpose.
// Custom one-off fittings still drawn in Paint upload via "Add Drawing" and
// print on the fittings page after the picked catalog fittings.
export function FittingsCard({ cutsheetId, fittings, drawings, className }: Props) {
  // No Qty column since Aug 2026: one row per fitting to build. Legacy rows
  // saved with qty 2+ expand into duplicate rows here (see expandFittingRows).
  const [rows, setRows] = useState<FittingRow[]>(() => expandFittingRows(fittings));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorFor, setEditorFor] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Custom drawings: Paint (or anything) images upload as plain image
  // attachments - the same rows the fittings print page already tiles - so
  // the server needs nothing new. Mirrors PlansCard's upload pattern.
  const uploadDrawings = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      startUpload(async () => {
        try {
          await uploadAttachment(cutsheetId, fd);
          toast.success(`${file.name} added to the fittings page.`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : String(err));
        }
      });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeDrawing = (id: number, filename: string) => {
    if (!confirm(`Remove ${filename} from the fittings page?`)) return;
    startUpload(async () => {
      try {
        await deleteAttachment(cutsheetId, id);
        toast.success(`${filename} removed.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    });
  };

  // pendingRef holds an un-fired (still-debounced) edit; inFlightRef holds a
  // save that has already dispatched. A flush must await BOTH - the debounce
  // clears pendingRef the moment it fires the save, so awaiting only pendingRef
  // would miss an in-flight save and let Print render stale fittings.
  const pendingRef = useRef<FittingRow[] | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const runSave = (toSave: FittingRow[]): Promise<void> => {
    const p = saveFittings(cutsheetId, toSave)
      .then(() => {
        setDirty(false);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not save fittings.");
      });
    inFlightRef.current = p;
    // Clear the marker once settled, but only if a newer save hasn't replaced
    // it. Chained separately so `p` is assigned before this references it.
    void p.finally(() => {
      if (inFlightRef.current === p) inFlightRef.current = null;
    });
    return p;
  };

  const persist = (next: FittingRow[]) => {
    setRows(next);
    setDirty(true);
    pendingRef.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const toSave = pendingRef.current;
      pendingRef.current = null;
      if (toSave) startTransition(() => runSave(toSave));
    }, 600);
  };

  // Flush an un-fired debounce AND any in-flight save, so the DB reflects the
  // latest edit before the caller (Print, unmount) proceeds.
  const flush = async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) await runSave(pending);
    await inFlightRef.current;
  };

  // Latest-value ref so the mount-only effects below always call the current
  // flush closure (which captures the live cutsheetId) without re-registering.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  // Print flushes before rendering the packet; unmount flushes so navigating
  // away inside the debounce window doesn't drop the edit.
  useEffect(() => registerPrintFlush(() => flushRef.current()), []);
  useEffect(() => () => void flushRef.current(), []);

  const add = (type: string) => {
    persist([...rows, { type, qty: 1, sl: false, labels: [], notes: "" }]);
  };
  const update = (i: number, patch: Partial<FittingRow>) => {
    persist(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const remove = (i: number) => {
    persist(rows.filter((_, idx) => idx !== i));
  };

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Fittings
          {rows.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {rows.length} picked
            </span>
          )}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {dirty || isPending ? "Saving…" : ""}
          </span>
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <Button asChild size="sm" variant="outline" disabled={isUploading}>
            <label className="cursor-pointer" title="Upload a custom drawing (Paint file, photo of a sketch, any image) — it prints on the fittings page">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.bmp,.gif,.webp"
                multiple
                onChange={(e) => uploadDrawings(e.target.files)}
                disabled={isUploading}
                className="sr-only"
              />
              <ImagePlus className="mr-1 h-4 w-4" />
              {isUploading ? "Uploading…" : "Add Drawing"}
            </label>
          </Button>
          <Button size="sm" variant={pickerOpen ? "secondary" : "default"} onClick={() => setPickerOpen((o) => !o)}>
            <Plus className="mr-1 h-4 w-4" /> {pickerOpen ? "Done Picking" : "Add Fittings"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pickerOpen && (
          <div className="rounded-md border bg-secondary/40 p-2">
            <p className="mb-2 px-1 text-xs text-muted-foreground">
              Tap a drawing to add it to this cutsheet - tap again for another of the same kind.
            </p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
              {FITTINGS.map((def) => {
                const n = counts.get(def.id) ?? 0;
                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => add(def.id)}
                    className={`relative flex flex-col items-center gap-1 rounded-md border p-1.5 text-center transition-colors hover:border-primary hover:bg-background ${n > 0 ? "border-primary/60 bg-background" : "border-transparent"}`}
                  >
                    {n > 0 && (
                      <span className="absolute right-1 top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {n}
                      </span>
                    )}
                    <FittingThumb def={def} className="aspect-square w-full rounded" />
                    <span className="text-[10px] leading-tight text-muted-foreground">{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {rows.length === 0 && drawings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No fittings yet. Hit &ldquo;Add Fittings&rdquo; and tap the drawings this house needs -
            they print on the fittings sheet with the sizes you enter here. For a custom one-off,
            draw it in Paint (or snap a picture) and hit &ldquo;Add Drawing&rdquo; - it prints on
            the fittings page too.
          </p>
        ) : rows.length === 0 ? null : (
          <ul className="divide-y rounded-md border">
            {rows.map((row, i) => {
              const def = FITTING_MAP.get(row.type);
              if (!def) return null;
              return (
                <li key={i} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setEditorFor(i)}
                    className="shrink-0 rounded border transition-shadow hover:ring-2 hover:ring-primary"
                    aria-label={`Place measurements on ${def.label}`}
                  >
                    <FittingThumb def={def} className="h-16 w-16 rounded" />
                  </button>
                  <div className="w-24 shrink-0">
                    <div className="text-sm font-semibold">{def.label}</div>
                  </div>
                  <label
                    className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
                    title="Sound lined — prints as SL YES/NO on the fittings sheet"
                  >
                    SL
                    <input
                      type="checkbox"
                      checked={row.sl}
                      onChange={(e) => update(i, { sl: e.target.checked })}
                      className="h-4 w-4 accent-primary"
                    />
                  </label>
                  <Button
                    size="sm"
                    variant={row.labels.length > 0 ? "secondary" : "outline"}
                    onClick={() => setEditorFor(i)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    {row.labels.length > 0
                      ? `${row.labels.length} size${row.labels.length === 1 ? "" : "s"} placed`
                      : "Place sizes"}
                  </Button>
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) => update(i, { notes: e.target.value })}
                    placeholder="Notes"
                    className="h-8 min-w-32 flex-1 rounded-md border border-input bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${def.label}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {drawings.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Custom drawings · print at the end of the fittings page
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {drawings.map((dr) => (
                <div key={dr.id} className="group relative rounded-md border bg-white p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/attachment/${dr.id}`}
                    alt={dr.filename}
                    className="aspect-square w-full rounded object-contain"
                  />
                  <p className="mt-1 truncate px-0.5 text-[10px] text-muted-foreground" title={dr.filename}>
                    {dr.filename}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeDrawing(dr.id, dr.filename)}
                    disabled={isUploading}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${dr.filename}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      {editorFor !== null && rows[editorFor] && FITTING_MAP.get(rows[editorFor].type) && (
        <FittingLabelEditor
          def={FITTING_MAP.get(rows[editorFor].type)!}
          labels={rows[editorFor].labels}
          onChange={(labels) => update(editorFor, { labels })}
          onClose={() => setEditorFor(null)}
        />
      )}
    </Card>
  );
}
