import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeaderFields } from "@/components/cutsheet/HeaderFields";
import { CutsheetForm } from "@/components/cutsheet/CutsheetForm";
import { createCutsheet } from "@/lib/actions";

export default function NewCutsheetPage() {
  return (
    <CutsheetForm action={createCutsheet} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          name="name"
          aria-label="Cutsheet name"
          placeholder="Untitled cutsheet"
          className="-mx-1 w-full max-w-xl rounded bg-transparent px-1 text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 focus-visible:bg-accent/50"
        />
        <Button type="submit">Create</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Header</CardTitle>
        </CardHeader>
        <CardContent>
          <HeaderFields />
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Fill in any header fields you have now — the rest of the sections become editable after
        the cutsheet is created.
      </p>
    </CutsheetForm>
  );
}
