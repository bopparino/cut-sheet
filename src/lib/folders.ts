import "server-only";
import { db } from "@/lib/db";

export type FolderNode = {
  id: number;
  name: string;
  parent_id: number | null;
};

export type FolderWithPath = FolderNode & {
  // "Acme Builders / Lot 42" - names joined from root to this folder.
  path: string;
  depth: number;
};

export function listAllFolders(): FolderNode[] {
  return db
    .prepare<[], FolderNode>(
      "SELECT id, name, parent_id FROM folders ORDER BY name COLLATE NOCASE ASC",
    )
    .all();
}

// Builds full paths via the parent chain, so a folder named "Lot 42" inside
// "Acme Builders" inside "A" reports path "A / Acme Builders / Lot 42".
export function withPaths(folders: FolderNode[]): FolderWithPath[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  return folders.map((f) => {
    const parts: string[] = [];
    let cur: FolderNode | undefined = f;
    let depth = 0;
    while (cur) {
      parts.unshift(cur.name);
      depth++;
      cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
    }
    return { ...f, path: parts.join(" / "), depth: depth - 1 };
  });
}

// Cutsheets per folder counting the entire subtree, not just direct children
// - a letter folder like IMPORTS/K holds its sheets inside builder subfolders
// and would otherwise display "0 cutsheets". One grouped query plus a JS
// rollup over the parent chain; trivial at this scale.
export function subtreeCutsheetCounts(): Map<number, number> {
  const folders = listAllFolders();
  const byId = new Map(folders.map((f) => [f.id, f]));
  const direct = db
    .prepare<[], { folder_id: number; n: number }>(
      `SELECT folder_id, COUNT(*) AS n FROM cutsheets
       WHERE deleted_at IS NULL AND folder_id IS NOT NULL
       GROUP BY folder_id`,
    )
    .all();
  const counts = new Map<number, number>(folders.map((f) => [f.id, 0]));
  for (const { folder_id, n } of direct) {
    let cur: FolderNode | undefined = byId.get(folder_id);
    while (cur) {
      counts.set(cur.id, (counts.get(cur.id) ?? 0) + n);
      cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
    }
  }
  return counts;
}

// Walks up from candidate looking for the source - used to reject moves that
// would parent a folder under one of its own descendants (which would create
// a cycle that ON DELETE CASCADE could not safely traverse).
export function isDescendantOrSelf(
  folders: FolderNode[],
  candidateId: number,
  sourceId: number,
): boolean {
  const byId = new Map(folders.map((f) => [f.id, f]));
  let cur: FolderNode | undefined = byId.get(candidateId);
  while (cur) {
    if (cur.id === sourceId) return true;
    cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
  }
  return false;
}

// Trace from leaf back to root for breadcrumb rendering.
export function ancestorChain(folders: FolderNode[], id: number): FolderNode[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const chain: FolderNode[] = [];
  let cur: FolderNode | undefined = byId.get(id);
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
  }
  return chain;
}
