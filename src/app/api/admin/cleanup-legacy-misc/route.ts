import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-time repair for sheets that exist ONLY in the Excel-era import (Kimmy
// deleted them from Access before the mdb re-import, so --update can't reach
// them): their Custom-ticket Miscellaneous still carries the "Legacy —" spam.
// This moves those lines to formOnly.legacyNotes, and converts the one line
// that was real data all along — "Legacy — CustomFan1: N" is the paper form's
// standard 4" fan box (AE80) — into formOnly.fans.AE80_4.

export async function POST() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") return new NextResponse("admin only", { status: 403 });

  const rows = db.prepare("SELECT id, data FROM cutsheets WHERE data LIKE '%Legacy —%'").all() as {
    id: number;
    data: string;
  }[];
  const update = db.prepare("UPDATE cutsheets SET data = ? WHERE id = ?");

  let cleaned = 0;
  let fansRecovered = 0;
  db.transaction(() => {
    for (const r of rows) {
      const j = JSON.parse(r.data) as {
        custom?: { miscellaneous?: string[] };
        formOnly?: { fans?: Record<string, number>; legacyNotes?: string[] };
      };
      const misc = j.custom?.miscellaneous ?? [];
      const legacy = misc.filter((x) => x.startsWith("Legacy —"));
      if (!legacy.length) continue;
      const keep = misc.filter((x) => !x.startsWith("Legacy —"));
      const notes: string[] = j.formOnly?.legacyNotes ?? [];
      for (const line of legacy) {
        const fan = line.match(/^Legacy — CustomFan1: (\d+(?:\.\d+)?)$/);
        if (fan && j.formOnly?.fans) {
          j.formOnly.fans.AE80_4 = (j.formOnly.fans.AE80_4 ?? 0) + Number(fan[1]);
          fansRecovered++;
        } else {
          notes.push(line);
        }
      }
      if (j.custom) j.custom.miscellaneous = keep;
      if (j.formOnly) j.formOnly.legacyNotes = notes;
      update.run(JSON.stringify(j), r.id);
      cleaned++;
    }
  })();

  return NextResponse.json({ cleaned, fansRecovered });
}
