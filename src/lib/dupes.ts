import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

// Duplicate detection for the legacy import: the corrupted old system (and a
// ledger-key mismatch between the Excel-era and mdb-era imports) produced
// sheets that exist twice. Policy per Austin: FLAG, never delete - a red
// chip on the builder row and on the sheet itself; a human decides.
//
// exact  = every box identical (data normalized: dates/sheet# ignored)
// likely = same builder + house type + prop + lot + zone, but boxes differ

// NO module-level db access here: several route modules import this file, and
// `next build` imports route modules in parallel worker processes while
// collecting page data. A module-load db.exec forces every worker to open and
// migrate the DB concurrently, which is exactly the race db.ts's lazy-open
// design exists to avoid (and what broke the Railway build). The dup_flags
// table is created by the bootstrap in db.ts, on first real connection.

type Parsed = {
  header?: Record<string, string>;
  [k: string]: unknown;
};

function normalizedHash(data: string): string {
  const j = JSON.parse(data) as Parsed;
  const h = { ...(j.header ?? {}) };
  delete h.date;
  delete h.deliveryDate;
  delete h.cutSheetNumber;
  const clone = { ...j, header: h };
  delete (clone as Record<string, unknown>).attachments;
  return createHash("sha1").update(JSON.stringify(clone, Object.keys(clone).sort())).digest("hex");
}

export function scanDuplicates(): { exact: number; likely: number } {
  const rows = db.prepare("SELECT id, data FROM cutsheets WHERE deleted_at IS NULL").all() as {
    id: number;
    data: string;
  }[];

  const byHash = new Map<number, { hash: string; identity: string }>();
  const hashGroups = new Map<string, number[]>();
  const idGroups = new Map<string, number[]>();
  for (const r of rows) {
    const j = JSON.parse(r.data) as Parsed;
    const h = j.header ?? {};
    const hash = normalizedHash(r.data);
    const identity = [h.builder, h.houseType, h.propNumber, h.lot, h.zone]
      .map((v) => (v ?? "").toString().trim().toUpperCase())
      .join("|");
    byHash.set(r.id, { hash, identity });
    (hashGroups.get(hash) ?? hashGroups.set(hash, []).get(hash)!).push(r.id);
    if (identity.replaceAll("|", "") !== "") {
      (idGroups.get(identity) ?? idGroups.set(identity, []).get(identity)!).push(r.id);
    }
  }

  const flags = new Map<number, { kind: "exact" | "likely"; match: number }>();
  for (const ids of hashGroups.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) flags.set(id, { kind: "exact", match: ids.find((x) => x !== id)! });
  }
  for (const ids of idGroups.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      if (!flags.has(id)) flags.set(id, { kind: "likely", match: ids.find((x) => x !== id)! });
    }
  }

  const wipe = db.prepare("DELETE FROM dup_flags");
  const ins = db.prepare("INSERT INTO dup_flags (cutsheet_id, kind, match_id) VALUES (?, ?, ?)");
  db.transaction(() => {
    wipe.run();
    for (const [id, f] of flags) ins.run(id, f.kind, f.match);
  })();

  let exact = 0;
  let likely = 0;
  for (const f of flags.values()) f.kind === "exact" ? exact++ : likely++;
  return { exact, likely };
}

export function getDupMap(): Map<number, "exact" | "likely"> {
  const out = new Map<number, "exact" | "likely">();
  for (const r of db.prepare("SELECT cutsheet_id, kind FROM dup_flags").all() as {
    cutsheet_id: number;
    kind: "exact" | "likely";
  }[]) {
    out.set(r.cutsheet_id, r.kind);
  }
  return out;
}

/** Flag info for one sheet: kind + the sheet it matches. */
export function getDupInfo(id: number): { kind: "exact" | "likely"; matchId: number } | null {
  const r = db.prepare("SELECT kind, match_id FROM dup_flags WHERE cutsheet_id = ?").get(id) as
    | { kind: "exact" | "likely"; match_id: number }
    | undefined;
  return r ? { kind: r.kind, matchId: r.match_id } : null;
}

/** Flagged-sheet counts grouped by the given browse level's value. */
export function getDupCountsForLevel(builder?: string, project?: string): Map<string, number> {
  const B = "COALESCE(TRIM(json_extract(c.data,'$.header.builder')),'')";
  const P = "COALESCE(TRIM(json_extract(c.data,'$.header.project')),'')";
  const HT = "COALESCE(TRIM(json_extract(c.data,'$.header.houseType')),'')";
  let sql: string;
  let args: string[];
  if (builder === undefined) {
    sql = `SELECT UPPER(${B}) AS v, COUNT(*) AS n FROM dup_flags f JOIN cutsheets c ON c.id = f.cutsheet_id GROUP BY v`;
    args = [];
  } else if (project === undefined) {
    sql = `SELECT UPPER(${P}) AS v, COUNT(*) AS n FROM dup_flags f JOIN cutsheets c ON c.id = f.cutsheet_id WHERE ${B} = ? GROUP BY v`;
    args = [builder];
  } else {
    sql = `SELECT UPPER(${HT}) AS v, COUNT(*) AS n FROM dup_flags f JOIN cutsheets c ON c.id = f.cutsheet_id WHERE ${B} = ? AND ${P} = ? GROUP BY v`;
    args = [builder, project];
  }
  const out = new Map<string, number>();
  for (const r of db.prepare(sql).all(...args) as { v: string; n: number }[]) out.set(r.v, r.n);
  return out;
}

/** Ids of sheets that came from the Access import (legacy_imports ledger). */
export function getLegacyIds(): Set<number> {
  try {
    const rows = db.prepare("SELECT cutsheet_id FROM legacy_imports").all() as { cutsheet_id: number }[];
    return new Set(rows.map((r) => r.cutsheet_id));
  } catch {
    return new Set();
  }
}

/** Builder name (as displayed/uppercased) -> flagged sheet count. */
export function getDupBuilderCounts(): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of db
    .prepare(
      `SELECT UPPER(TRIM(COALESCE(json_extract(c.data,'$.header.builder'), ''))) AS b, COUNT(*) AS n
       FROM dup_flags f JOIN cutsheets c ON c.id = f.cutsheet_id
       GROUP BY b`,
    )
    .all() as { b: string; n: number }[]) {
    out.set(r.b, r.n);
  }
  return out;
}
