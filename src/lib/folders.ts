import "server-only";
import { db } from "@/lib/db";

export type FolderNode = {
  id: number;
  name: string;
  parent_id: number | null;
};

export type FolderWithPath = FolderNode & {
  // "Acme Builders / Lot 42" — names joined from root to this folder.
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

// Walks up from candidate looking for the source — used to reject moves that
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
