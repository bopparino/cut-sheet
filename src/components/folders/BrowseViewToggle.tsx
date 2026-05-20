"use client";

import { LayoutGrid, List } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

// URL-state toggle: ?view=grid or ?view=list. Bookmarkable. Defaults to grid.
export function BrowseViewToggle({ value }: { value: "grid" | "list" }) {
  const router = useRouter();
  const params = useSearchParams();

  const setView = (next: "grid" | "list") => {
    const usp = new URLSearchParams(params.toString());
    if (next === "grid") usp.delete("view");
    else usp.set("view", "list");
    const qs = usp.toString();
    router.replace(qs ? `?${qs}` : "?");
  };

  return (
    <div className="inline-flex rounded-md border bg-background p-0.5">
      <Button
        type="button"
        variant={value === "grid" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2"
        onClick={() => setView("grid")}
        aria-pressed={value === "grid"}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={value === "list" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2"
        onClick={() => setView("list")}
        aria-pressed={value === "list"}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
