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

const IDENTITY_FIELDS = ["builder", "houseType", "propNumber", "lot", "zone"] as const;

// The five header fields that make two sheets "the same house sheet". Kept as
// an array (not a pre-joined string) so SQL candidate lookups can match field
// by field - a literal "|" typed into a box can't smear two fields together.
function identityParts(j: Parsed): string[] {
  const h = j.header ?? {};
  return IDENTITY_FIELDS.map((k) => (h[k] ?? "").toString().trim().toUpperCase());
}

// Deep key-sorted copy so hashing is stable regardless of key order.
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) out[k] = canonical((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}

function normalizedHash(data: string): string {
  const j = JSON.parse(data) as Parsed;
  const h = { ...(j.header ?? {}) };
  delete h.date;
  delete h.deliveryDate;
  delete h.cutSheetNumber;
  const clone = { ...j, header: h };
  delete (clone as Record<string, unknown>).attachments;
  // NOTE (Aug 2026 fix): this used to be JSON.stringify(clone, keys-array),
  // but a replacer ARRAY filters nested objects to those same top-level key
  // names - so none of the actual box values made it into the hash and
  // "exact" was effectively "same name + same shape". Canonicalizing the
  // whole tree makes exact mean what it always claimed: every box identical.
  return createHash("sha1").update(JSON.stringify(canonical(clone))).digest("hex");
}

// Active "not a duplicate" judgments: sheet id -> the normalized content hash
// the human was looking at when they cleared the flag. A dismissal only holds
// while the sheet still IS that content - once it's edited, the sheet earns
// its way back into dup detection at the next scan.
function loadDismissals(): Map<number, string> {
  const out = new Map<number, string>();
  for (const r of db.prepare("SELECT cutsheet_id, content_hash FROM dup_dismissals").all() as {
    cutsheet_id: number;
    content_hash: string;
  }[]) {
    out.set(r.cutsheet_id, r.content_hash);
  }
  return out;
}

export function scanDuplicates(): { exact: number; likely: number } {
  const rows = db.prepare("SELECT id, data FROM cutsheets WHERE deleted_at IS NULL").all() as {
    id: number;
    data: string;
  }[];

  const dismissals = loadDismissals();
  const expiredDismissals: number[] = [];

  const hashGroups = new Map<string, number[]>();
  const idGroups = new Map<string, number[]>();
  for (const r of rows) {
    const j = JSON.parse(r.data) as Parsed;
    const hash = normalizedHash(r.data);
    // A human vouched for this sheet ("not a duplicate") and it hasn't changed
    // since - it sits out of dup detection entirely, in both directions.
    const vouched = dismissals.get(r.id);
    if (vouched !== undefined) {
      if (vouched === hash) continue;
      expiredDismissals.push(r.id); // content changed since the judgment - it lapses
    }
    const identity = identityParts(j).join("|");
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
  const dropDismissal = db.prepare("DELETE FROM dup_dismissals WHERE cutsheet_id = ?");
  db.transaction(() => {
    wipe.run();
    for (const [id, f] of flags) ins.run(id, f.kind, f.match);
    for (const id of expiredDismissals) dropDismissal.run(id);
  })();

  let exact = 0;
  let likely = 0;
  for (const f of flags.values()) f.kind === "exact" ? exact++ : likely++;
  return { exact, likely };
}

// ----- Targeted re-check on save/delete ---------------------------------------
//
// The full scan above is the only thing that CREATES flags, and it only runs
// when an admin asks (after imports). What was missing was the other half of
// the lifecycle: fixing or deleting a duplicate left the flag sitting there
// until the next scan (Kimmie, Aug 2026). recheckDupFlags is that other half -
// it runs after every save/delete and re-evaluates only the flags that could
// have been affected. Policy: flags only ever CLEAR, downgrade, or re-point
// here - never appear. Creating flags on save would throw a scary banner at
// every fresh clone (Kimmie's clone-then-edit ritual autosaves before the new
// lot number is typed, so the clone still matches its source at that moment).

// Live sheets sharing all five identity fields with the given values.
const CANDIDATE_SQL = `
  SELECT id, data FROM cutsheets
  WHERE deleted_at IS NULL AND id != ?
    AND UPPER(TRIM(COALESCE(json_extract(data, '$.header.builder'), ''))) = ?
    AND UPPER(TRIM(COALESCE(json_extract(data, '$.header.houseType'), ''))) = ?
    AND UPPER(TRIM(COALESCE(json_extract(data, '$.header.propNumber'), ''))) = ?
    AND UPPER(TRIM(COALESCE(json_extract(data, '$.header.lot'), ''))) = ?
    AND UPPER(TRIM(COALESCE(json_extract(data, '$.header.zone'), ''))) = ?
`;

// What flag (if any) the sheet deserves right now, by the same rules the full
// scan uses: exact = another live sheet with the same normalized content
// (which forces the same identity, so the identity query finds it too);
// likely = another live sheet with the same non-empty identity. Vouched-for
// sheets don't count as partners.
function findDupMatch(
  id: number,
  parts: string[],
  myHash: string,
  dismissals: Map<number, string>,
): { kind: "exact" | "likely"; matchId: number } | null {
  const candidates = db.prepare(CANDIDATE_SQL).all(id, ...parts) as { id: number; data: string }[];
  let exactId: number | null = null;
  const likelyIds: number[] = [];
  for (const c of candidates) {
    const cHash = normalizedHash(c.data);
    if (dismissals.get(c.id) === cHash) continue; // vouched-for - not a partner
    // Re-confirm identity in JS: SQLite TRIM only strips spaces while the scan
    // trims all whitespace, so the SQL match is treated as a pre-filter.
    if (identityParts(JSON.parse(c.data) as Parsed).join("|") !== parts.join("|")) continue;
    likelyIds.push(c.id);
    if (exactId === null && cHash === myHash) exactId = c.id;
  }
  if (exactId !== null) return { kind: "exact", matchId: exactId };
  if (parts.join("") !== "" && likelyIds.length > 0) return { kind: "likely", matchId: likelyIds[0] };
  return null;
}

/**
 * Re-evaluate duplicate flags after the given sheets changed (edit, delete,
 * or dismissal). Touches the changed sheets plus everything flagged against
 * them; clears flags that no longer hold, downgrades exact -> likely when the
 * boxes now differ, re-points stale match ids. Never creates a flag - that
 * stays the admin re-scan's job. Synchronous (better-sqlite3), call after the
 * write that changed the data.
 */
export function recheckDupFlags(changedIds: number[]): void {
  if (changedIds.length === 0) return;
  const flagFor = db.prepare("SELECT kind, match_id FROM dup_flags WHERE cutsheet_id = ?");
  const pointingAt = db.prepare("SELECT cutsheet_id FROM dup_flags WHERE match_id = ?");

  const affected = new Set<number>();
  for (const id of changedIds) {
    affected.add(id);
    const f = flagFor.get(id) as { match_id: number } | undefined;
    if (f) affected.add(f.match_id);
    for (const r of pointingAt.all(id) as { cutsheet_id: number }[]) affected.add(r.cutsheet_id);
  }

  const getSheet = db.prepare("SELECT data FROM cutsheets WHERE id = ? AND deleted_at IS NULL");
  const del = db.prepare("DELETE FROM dup_flags WHERE cutsheet_id = ?");
  const upd = db.prepare("UPDATE dup_flags SET kind = ?, match_id = ? WHERE cutsheet_id = ?");
  const dismissals = loadDismissals();

  for (const id of affected) {
    const existing = flagFor.get(id) as { kind: "exact" | "likely"; match_id: number } | undefined;
    if (!existing) continue; // never create here
    const row = getSheet.get(id) as { data: string } | undefined;
    if (!row) {
      del.run(id); // sheet deleted - its flag goes with it
      continue;
    }
    const myHash = normalizedHash(row.data);
    if (dismissals.get(id) === myHash) {
      del.run(id); // vouched-for sheet shouldn't carry a flag
      continue;
    }
    const parts = identityParts(JSON.parse(row.data) as Parsed);
    const found = findDupMatch(id, parts, myHash, dismissals);
    if (!found) del.run(id);
    else if (found.kind !== existing.kind || found.matchId !== existing.match_id) {
      upd.run(found.kind, found.matchId, id);
    }
  }
}

/**
 * Human judgment: "these sheets are supposed to both exist." Records a
 * dismissal pinned to the sheet's current content (so a future re-scan
 * respects it until the sheet changes), clears the sheet's flag, and
 * re-evaluates the partners that were flagged against it - a pair's other
 * half clears too unless it still matches a third sheet.
 */
export function dismissDupFlag(id: number, userId: number | null): void {
  const partners = new Set<number>();
  const f = db.prepare("SELECT match_id FROM dup_flags WHERE cutsheet_id = ?").get(id) as
    | { match_id: number }
    | undefined;
  if (f) partners.add(f.match_id);
  for (const r of db.prepare("SELECT cutsheet_id FROM dup_flags WHERE match_id = ?").all(id) as {
    cutsheet_id: number;
  }[]) {
    partners.add(r.cutsheet_id);
  }

  const row = db.prepare("SELECT data FROM cutsheets WHERE id = ? AND deleted_at IS NULL").get(id) as
    | { data: string }
    | undefined;
  db.transaction(() => {
    if (row) {
      db.prepare(
        `INSERT INTO dup_dismissals (cutsheet_id, content_hash, dismissed_by)
         VALUES (?, ?, ?)
         ON CONFLICT(cutsheet_id) DO UPDATE SET
           content_hash = excluded.content_hash,
           dismissed_by = excluded.dismissed_by,
           dismissed_at = datetime('now')`,
      ).run(id, normalizedHash(row.data), userId);
    }
    db.prepare("DELETE FROM dup_flags WHERE cutsheet_id = ?").run(id);
  })();
  recheckDupFlags([...partners]);
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
  // deleted_at guard: flags on soft-deleted sheets are cleared by
  // recheckDupFlags at delete time, but belt-and-braces for rows that predate
  // that behavior - a trashed sheet should never inflate a chip count.
  if (builder === undefined) {
    sql = `SELECT UPPER(${B}) AS v, COUNT(*) AS n FROM dup_flags f JOIN cutsheets c ON c.id = f.cutsheet_id WHERE c.deleted_at IS NULL GROUP BY v`;
    args = [];
  } else if (project === undefined) {
    sql = `SELECT UPPER(${P}) AS v, COUNT(*) AS n FROM dup_flags f JOIN cutsheets c ON c.id = f.cutsheet_id WHERE c.deleted_at IS NULL AND ${B} = ? GROUP BY v`;
    args = [builder];
  } else {
    sql = `SELECT UPPER(${HT}) AS v, COUNT(*) AS n FROM dup_flags f JOIN cutsheets c ON c.id = f.cutsheet_id WHERE c.deleted_at IS NULL AND ${B} = ? AND ${P} = ? GROUP BY v`;
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
       WHERE c.deleted_at IS NULL
       GROUP BY b`,
    )
    .all() as { b: string; n: number }[]) {
    out.set(r.b, r.n);
  }
  return out;
}
