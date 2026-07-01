"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAttachment, uploadAttachment } from "@/lib/actions";

export type AttachmentItem = {
  id: number;
  filename: string;
  mime: string;
  size: number;
  kind: "image" | "document";
};

type Props = {
  cutsheetId: number;
  attachments: AttachmentItem[];
  className?: string;
};

// One unified attachments surface for the cutsheet. Accepts ANY file type and
// any number of files - built for the 15-20 fittings drawn per cutsheet (MS
// Paint exports) plus the occasional PDF/spec doc. Image attachments render as
// thumbnails (and feed the printed fittings page); everything else renders as a
// file tile. Upload/delete go through Server Actions that revalidate the page.
export function AttachmentsCard({ cutsheetId, attachments, className }: Props) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      startTransition(async () => {
        try {
          await uploadAttachment(cutsheetId, fd);
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

  const imageCount = attachments.filter((a) => a.kind === "image").length;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Attachments
          {attachments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {attachments.length} file{attachments.length === 1 ? "" : "s"}
              {imageCount > 0 ? ` · ${imageCount} fitting${imageCount === 1 ? "" : "s"}` : ""}
            </span>
          )}
        </CardTitle>
        <Button asChild size="sm" disabled={isPending}>
          <label className="cursor-pointer">
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={(e) => upload(e.target.files)}
              disabled={isPending}
              className="sr-only"
            />
            {isPending ? "Uploading…" : "+ Add files"}
          </label>
        </Button>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No attachments yet. Add fitting drawings, photos, or documents — any file type.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {attachments.map((a) =>
              a.kind === "image" ? (
                <figure
                  key={a.id}
                  className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/attachment/${a.id}`}
                    alt={a.filename}
                    className="h-full w-full object-contain bg-white"
                  />
                  <RemoveButton onClick={() => remove(a.id, a.filename)} disabled={isPending} label={a.filename} />
                  <figcaption className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-[10px] text-white">
                    {a.filename}
                  </figcaption>
                </figure>
              ) : (
                <a
                  key={a.id}
                  href={`/api/attachment/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-md border bg-card p-3 text-center hover:bg-accent"
                >
                  <FileText className="h-7 w-7 text-muted-foreground" />
                  <span className="line-clamp-2 break-all text-[11px] font-medium text-foreground">{a.filename}</span>
                  <span className="text-[10px] text-muted-foreground">{formatBytes(a.size)}</span>
                  <RemoveButton
                    onClick={(e) => {
                      e.preventDefault();
                      remove(a.id, a.filename);
                    }}
                    disabled={isPending}
                    label={a.filename}
                  />
                </a>
              ),
            )}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Any file type · 25 MB max each · images print on the fittings page
        </p>
      </CardContent>
    </Card>
  );
}

function RemoveButton({
  onClick,
  disabled,
  label,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 disabled:opacity-50 group-hover:opacity-100 focus-visible:opacity-100"
      aria-label={`Remove ${label}`}
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
