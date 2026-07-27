"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAttachment, uploadPlan } from "@/lib/actions";

export type PlanItem = {
  id: number;
  filename: string;
  size: number;
};

type Props = {
  cutsheetId: number;
  plans: PlanItem[];
  className?: string;
};

// House plans: PDF or image uploads (BMP/PNG/JPG convert to PDF server-side).
// Stored as kind='plan' and appended to the print packet normalized to
// portrait Legal (8.5x14) like every other packet page.
// Kept separate from the Attachments (fittings/photos/docs) section so the two
// upload paths and print destinations stay distinct.
export function PlansCard({ cutsheetId, plans, className }: Props) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      startTransition(async () => {
        try {
          await uploadPlan(cutsheetId, fd);
          toast.success(`${file.name} uploaded.`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : String(err));
        }
      });
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (id: number, filename: string) => {
    if (!confirm(`Remove ${filename}?`)) return;
    startTransition(async () => {
      try {
        await deleteAttachment(cutsheetId, id);
        toast.success(`${filename} removed.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Plans
          {plans.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {plans.length} file{plans.length === 1 ? "" : "s"}
            </span>
          )}
        </CardTitle>
        <Button asChild size="sm" disabled={isPending}>
          <label className="cursor-pointer">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf,image/bmp,.bmp,image/png,.png,image/jpeg,.jpg,.jpeg"
              multiple
              onChange={(e) => upload(e.target.files)}
              disabled={isPending}
              className="sr-only"
            />
            {isPending ? "Uploading…" : "+ Add Plans"}
          </label>
        </Button>
      </CardHeader>
      <CardContent>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No plans yet. Add house plans (PDF, BMP, PNG, or JPG) — they print on 8.5×14 in the foreman packet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <a
                  href={`/api/attachment/${p.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:underline"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{p.filename}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(p.size)}</span>
                </a>
                <button
                  type="button"
                  onClick={() => remove(p.id, p.filename)}
                  disabled={isPending}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  aria-label={`Remove ${p.filename}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">PDF, BMP, PNG, or JPG · 50 MB max each · printed on 8.5×14</p>
      </CardContent>
    </Card>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
