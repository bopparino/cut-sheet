#!/usr/bin/env python3
"""Convert an Access .mdb cut-sheet library into the pre-converted-JSON shape
scripts/import-legacy.mts accepts: { [tableName]: { headers, rows } }.

Usage: python3 scripts/mdb-to-tables.py <file.mdb> [more.mdb ...] --out <dir>

Needs mdbtools (brew install mdbtools). Binary (OLE) columns are stripped -
the whiteboard drawings ride a separate path (scripts/extract-drawings.py).
Dates are exported ISO so the importer's day()/stamp() helpers read them the
same as the old Excel exports.
"""
import csv, io, json, os, subprocess, sys

TABLES = ["Header", "Custom_Duct", "Stock_Duct", "PreFab"]  # DuctBoard is retired

args = [a for a in sys.argv[1:] if a != "--out"]
if "--out" in sys.argv:
    out_dir = sys.argv[sys.argv.index("--out") + 1]
    args.remove(out_dir)
else:
    print("usage: mdb-to-tables.py <file.mdb>... --out <dir>", file=sys.stderr)
    sys.exit(1)
os.makedirs(out_dir, exist_ok=True)
csv.field_size_limit(sys.maxsize)

for mdb in args:
    name = os.path.splitext(os.path.basename(mdb))[0]
    listed = subprocess.run(["mdb-tables", "-1", mdb], capture_output=True, text=True, check=True).stdout.split("\n")
    tables = {}
    for t in TABLES:
        full = f"tbl_Cut_Sheet_Library_{t}"
        if full not in listed:
            continue
        raw = subprocess.run(
            ["mdb-export", "-b", "strip", "-D", "%Y-%m-%d %H:%M:%S", mdb, full],
            capture_output=True, text=True, check=True).stdout
        rows = list(csv.DictReader(io.StringIO(raw)))
        headers = list(rows[0].keys()) if rows else []
        tables[t] = {"headers": headers, "rows": rows}
    path = os.path.join(out_dir, f"{name}.json")
    json.dump(tables, open(path, "w"))
    counts = ", ".join(f"{t}:{len(v['rows'])}" for t, v in tables.items())
    print(f"{name}: {counts} -> {path}")
