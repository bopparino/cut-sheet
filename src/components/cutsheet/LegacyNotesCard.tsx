import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Admin-only, screen-only window into formOnly.legacyNotes — every Access
// value the import preserved that has no box on the new form ("Legacy —
// col: value" lines, SL-flag notes, retired-size quantities). These lines
// used to be completely invisible: stored on the sheet, rendered nowhere,
// so every "the import is missing X" investigation started from zero.
// Deliberately NOT rendered for non-admin users (Kimmie read printed
// "Legacy —" lines as corrupted data) and never part of any print packet —
// the print routes render their own components and don't touch this card.
export function LegacyNotesCard({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Legacy import data
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {notes.length} value{notes.length === 1 ? "" : "s"} · admin-only · never prints
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Values carried over from Access that have no box on this form
          </summary>
          <ul className="font-mono-data mt-3 max-h-72 space-y-1 overflow-y-auto rounded-md border bg-secondary/50 p-3 text-xs">
            {notes.map((n, i) => (
              <li key={i} className="truncate" title={n}>
                {n}
              </li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
