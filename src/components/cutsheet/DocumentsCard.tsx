"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAttachment, uploadDocument } from "@/lib/actions";

type Document = { id: number; filename: string; size: number; mime: string };

type Props = {
  cutsheetId: number;
  documents: Document[];
};

// Mirror of PhotosCard but rendered as a filename list — docs don't have
// natural thumbnails. The /api/attachment route serves them inline with their
// stored mime, so clicking the name opens PDFs in-tab and downloads
// non-renderable formats (Word, Excel, etc.) the way the user expects.
export function DocumentsCard({ cutsheetId, documents }: Props) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      startTransition(async () => {
        try {
          await uploadDocument(cutsheetId, fd);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Documents</CardTitle>
        <Button asChild size="sm" disabled={isPending}>
          <label className="cursor-pointer">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv"
              multiple
              onChange={(e) => upload(e.target.files)}
              disabled={isPending}
              className="sr-only"
            />
            {isPending ? "Uploading…" : "+ Add Documents"}
          </label>
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents attached yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <a
                  href={`/api/attachment/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:underline"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.filename}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBytes(doc.size)}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => remove(doc.id, doc.filename)}
                  disabled={isPending}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  aria-label={`Remove ${doc.filename}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          PDF / Word / Excel / PowerPoint / TXT / CSV · 25 MB max each
        </p>
      </CardContent>
    </Card>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
