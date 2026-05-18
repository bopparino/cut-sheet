import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeaderFields } from "@/components/cutsheet/HeaderFields";
import { createCutsheet } from "@/server/actions";

export default function NewCutsheetPage() {
  return (
    <form action={createCutsheet} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">New Cutsheet</h1>
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
    </form>
  );
}
