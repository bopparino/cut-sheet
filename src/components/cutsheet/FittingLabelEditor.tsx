"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FittingThumb } from "@/components/cutsheet/FittingThumb";
import type { FittingDef } from "@/lib/fittings";
import type { FittingLabel } from "@/lib/schema";

type Props = {
  def: FittingDef;
  labels: FittingLabel[];
  onChange: (labels: FittingLabel[]) => void;
  onClose: () => void;
};

// The digitized Paint text tool: the fitting drawing, large, in a popup.
// Click a spot -> a text box appears there -> type the measurement. Drag a
// label to move it, click it to re-edit, x (or empty text) to remove. The
// x/y fractions saved here are reproduced 1:1 on the printed fittings sheet,
// so WHERE Kimmie puts a number is exactly where the shop reads it.
export function FittingLabelEditor({ def, labels, onChange, onClose }: Props) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const drag = useRef<{ index: number; moved: boolean } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editing === null) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, onClose]);

  const commitDraft = () => {
    if (editing === null) return;
    const text = draft.trim();
    onChange(
      text
        ? labels.map((l, i) => (i === editing ? { ...l, text } : l))
        : labels.filter((_, i) => i !== editing),
    );
    setEditing(null);
    setDraft("");
  };

  const addAt = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return; // clicks on labels handle themselves
    commitDraft();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    onChange([...labels, { x, y, text: "" }]);
    setEditing(labels.length);
    setDraft("");
  };

  const startDrag = (index: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
    if (editing !== null) return;
    e.preventDefault();
    drag.current = { index, moved: false };
    const layer = e.currentTarget.parentElement!;
    const rect = layer.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      drag.current.moved = true;
      const x = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      onChange(labels.map((l, i) => (i === index ? { ...l, x, y } : l)));
    };
    const up = () => {
      if (drag.current && !drag.current.moved) {
        setEditing(index);
        setDraft(labels[index].text);
      }
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          commitDraft();
          onClose();
        }
      }}
    >
      <div className="w-full max-w-3xl rounded-xl border border-border bg-background p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">{def.label} - place the measurements</h2>
            <p className="text-xs text-muted-foreground">
              Click a spot on the drawing and type the size. Drag a number to move it, click it to
              change it.
            </p>
          </div>
          <Button size="sm" onClick={() => { commitDraft(); onClose(); }}>
            Done
          </Button>
        </div>
        <FittingThumb def={def} className="h-[min(60vh,520px)] w-full rounded-md border">
          <div className="absolute inset-0 cursor-crosshair" onClick={addAt}>
            {labels.map((l, i) =>
              editing === i ? (
                <input
                  key={i}
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitDraft}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitDraft();
                    if (e.key === "Escape") {
                      setEditing(null);
                      setDraft("");
                      if (!labels[i].text) onChange(labels.filter((_, j) => j !== i));
                    }
                  }}
                  style={{
                    left: `${l.x * 100}%`,
                    top: `${l.y * 100}%`,
                    width: `${Math.max(draft.length + 2, 6)}ch`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded border border-primary bg-white px-1 py-0.5 text-base font-bold text-black shadow outline-none"
                  placeholder="size"
                />
              ) : (
                <span
                  key={i}
                  onPointerDown={startDrag(i)}
                  style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%` }}
                  className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none whitespace-nowrap rounded bg-white/85 px-1 py-0.5 text-base font-bold text-black ring-1 ring-transparent hover:ring-primary"
                >
                  {l.text}
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(labels.filter((_, j) => j !== i));
                    }}
                    className="absolute -right-2 -top-2 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                    aria-label="Remove measurement"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ),
            )}
          </div>
        </FittingThumb>
      </div>
    </div>
  );
}
