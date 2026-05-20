"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAttachment, uploadAttachment } from "@/lib/actions";

type Photo = { id: number; filename: string };

type Props = {
  cutsheetId: number;
  photos: Photo[];
  className?: string;
};

// Photo input lives inside the main cutsheet <form> but has no `name`, so it
// never gets included in FormData submitted by the parent Save button. Upload
// and delete go through Server Actions invoked from this component directly;
// each calls revalidatePath, which re-renders the page server-side. Edits in
// other uncontrolled inputs survive because React keeps defaultValue stable
// after mount.
export function PhotosCard({ cutsheetId, photos, className }: Props) {
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

  const remove = (id: number) => {
    if (!confirm("Remove this photo?")) return;
    startTransition(async () => {
      try {
        await deleteAttachment(cutsheetId, id);
        toast.success("Photo removed.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Photos</CardTitle>
        <Button asChild size="sm" disabled={isPending}>
          <label className="cursor-pointer">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={(e) => upload(e.target.files)}
              disabled={isPending}
              className="sr-only"
            />
            {isPending ? "Uploading…" : "+ Add Photos"}
          </label>
        </Button>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photos attached yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo) => (
              <figure
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/attachment/${photo.id}`}
                  alt={photo.filename}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(photo.id)}
                  disabled={isPending}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 disabled:opacity-50 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Remove ${photo.filename}`}
                >
                  ×
                </button>
                <figcaption className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-[10px] text-white">
                  {photo.filename}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          PNG / JPEG / WebP / GIF · 8 MB max each
        </p>
      </CardContent>
    </Card>
  );
}
