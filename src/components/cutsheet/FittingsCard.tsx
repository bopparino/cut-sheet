"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FittingLabelEditor } from "@/components/cutsheet/FittingLabelEditor";
import { FittingThumb } from "@/components/cutsheet/FittingThumb";
import { FITTINGS, FITTING_MAP } from "@/lib/fittings";
import { saveFittings } from "@/lib/actions";
import type { FittingRow } from "@/lib/schema";

type Props = {
  cutsheetId: number;
  fittings: FittingRow[];
  className?: string;
};

// The fittings picker: replaces the MS Paint select-copy-paste-annotate ritual.
// Tap drawings in the catalog to add them, then click a picked drawing to open
// it large and place measurements directly on the correct sides (the digitized
// Paint text tool - see FittingLabelEditor). Saves itself (debounced) like the
// attachment cards - it lives outside the big replica form on purpose.
export function FittingsCard({ cutsheetId, fittings, className }: Props) {
  const [rows, setRows] = useState<FittingRow[]>(fittings);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorFor, setEditorFor] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs mirror the latest unsaved state so the unmount cleanup can flush it.
  const pendingRef = useRef<FittingRow[] | null>(null);

  const persist = (next: FittingRow[]) => {
    setRows(next);
    setDirty(true);
    pendingRef.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pendingRef.current = null;
      startTransition(async () => {
        try {
          await saveFittings(cutsheetId, next);
          setDirty(false);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save fittings.");
        }
      });
    }, 600);
  };
  // If the user navigates away inside the debounce window, flush the pending
  // save instead of dropping the edit.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pendingRef.current) void saveFittings(cutsheetId, pendingRef.current);
    },
    [cutsheetId],
  );

  const add = (type: string) => {
    persist([...rows, { type, qty: 1, labels: [], notes: "" }]);
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
        <Button size="sm" variant={pickerOpen ? "secondary" : "default"} onClick={() => setPickerOpen((o) => !o)}>
          <Plus className="mr-1 h-4 w-4" /> {pickerOpen ? "Done Picking" : "Add Fittings"}
        </Button>
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

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No fittings yet. Hit &ldquo;Add Fittings&rdquo; and tap the drawings this house needs -
            they print on the fittings sheet with the sizes you enter here.
          </p>
        ) : (
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
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Qty
                    <input
                      type="number"
                      min={0}
                      value={row.qty}
                      onChange={(e) => update(i, { qty: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })}
                      className="h-8 w-14 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
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
