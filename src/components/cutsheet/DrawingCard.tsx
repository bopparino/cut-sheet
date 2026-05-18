"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveDrawing } from "@/lib/actions";

type Tool = "pen" | "eraser";

type Props = {
  cutsheetId: number;
  drawing?: { id: number };
};

// Internal pixel size of the saved PNG. The canvas display is responsive via
// CSS — we map screen coords to this internal grid in getPoint() so the
// stroke quality stays consistent regardless of how the box is laid out.
const CANVAS_W = 1500;
const CANVAS_H = 1000;
const PEN_WIDTH = 3;
const ERASER_WIDTH = 24;

export function DrawingCard({ cutsheetId, drawing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  // Mount-time: paint a white background and, if a drawing already exists for
  // this cutsheet, fetch it and stamp it onto the canvas so the user can
  // extend rather than start from scratch.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (drawing?.id) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = `/api/attachment/${drawing.id}`;
    }
  }, [drawing?.id]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    lastPoint.current = getPoint(e);
    // Draw a single dot so taps register without needing movement.
    drawSegment(lastPoint.current, lastPoint.current);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const pt = getPoint(e);
    drawSegment(lastPoint.current ?? pt, pt);
    lastPoint.current = pt;
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = tool === "pen" ? PEN_WIDTH : ERASER_WIDTH;
    // Eraser paints white because the canvas's own background is white — that
    // way the saved PNG renders identically on any viewer regardless of how
    // it handles transparency.
    ctx.strokeStyle = tool === "pen" ? "#000" : "#fff";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setStatus("Canvas cleared. Click Save to update the stored drawing.");
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus("Couldn't capture canvas.");
        return;
      }
      const fd = new FormData();
      fd.append("file", blob, "drawing.png");
      setStatus("Saving…");
      startTransition(async () => {
        try {
          await saveDrawing(cutsheetId, fd);
          setStatus("Saved.");
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err));
        }
      });
    }, "image/png");
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus("Couldn't capture canvas for download.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cutsheet-${cutsheetId}-drawing.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke after a tick so Safari has time to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Drawing</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <ToolButton active={tool === "pen"} onClick={() => setTool("pen")}>
            Pen
          </ToolButton>
          <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")}>
            Eraser
          </ToolButton>
          <Button type="button" variant="outline" size="sm" onClick={clear}>
            Clear
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={download}>
            Download PNG
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="aspect-[3/2] w-full touch-none rounded-md border bg-white"
          style={{ cursor: tool === "pen" ? "crosshair" : "cell" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{status ?? "Click Save to persist · Download PNG for a local copy."}</span>
          <span>{CANVAS_W} × {CANVAS_H} px</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
