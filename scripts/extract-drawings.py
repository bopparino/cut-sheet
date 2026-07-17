#!/usr/bin/env python3
"""Extract the fittings whiteboard drawings (OLE-embedded BMPs) from Access
cut-sheet libraries, convert to PNG, and emit a manifest keyed like the
legacy_imports ledger (propNumber|CutSheet#|BUILDER).

Usage:
  python3 scripts/extract-drawings.py <file.mdb>... --out <dir> [--attach-db <sqlite>]

--out gets one PNG per non-blank drawing plus manifest.json:
  [{key, label, file, sha1}]  where label is the attachment filename.
--attach-db additionally upserts them into that DB's attachments table
(delete-then-insert per cutsheet+filename, so re-runs refresh in place).

Blank canvases are dropped: the Access whiteboard template has ~573 non-white
bytes (a stray underline); every real drawing measured >= ~3450. Threshold 1000.

Needs mdbtools + macOS sips (BMP->PNG).
"""
import csv, hashlib, json, os, sqlite3, subprocess, sys, tempfile

COLS = (("Fittings", "Sheet Metal Fittings (Access).png"),
        ("DB Fittings", "Duct Board Fittings (Access).png"))

argv = sys.argv[1:]
def take(flag):
    if flag in argv:
        i = argv.index(flag)
        v = argv[i + 1]
        del argv[i:i + 2]
        return v
    return None

out_dir = take("--out")
attach_db = take("--attach-db")
mdbs = argv
if not out_dir or not mdbs:
    print(__doc__, file=sys.stderr)
    sys.exit(1)
os.makedirs(out_dir, exist_ok=True)
csv.field_size_limit(sys.maxsize)

def bmp_from_ole(hexstr):
    if not hexstr:
        return None
    blob = bytes.fromhex(hexstr)
    i = 0
    while (i := blob.find(b"BM", i)) != -1:
        if i + 18 < len(blob):
            declared = int.from_bytes(blob[i+2:i+6], "little")
            dib = int.from_bytes(blob[i+14:i+18], "little")
            if 54 <= declared <= len(blob) - i and dib in (12, 40, 52, 56, 108, 124):
                return blob[i:i+declared]
        i += 2
    return None

def is_blank(bmp):
    off = int.from_bytes(bmp[10:14], "little")
    px = bmp[off:]
    return len(px) - px.count(0xFF) < 1000

manifest = []
seen_content = {}  # sha1 -> file (identical drawings from cloned sheets share one PNG)
blanks = extracted = 0
for mdb in mdbs:
    proc = subprocess.Popen(
        ["mdb-export", "-b", "hex", mdb, "tbl_Cut_Sheet_Library_Header"],
        stdout=subprocess.PIPE, text=True)
    for row in csv.DictReader(proc.stdout):
        prop = (row.get("property_number") or "").strip()
        sheet = (row.get("Cut Sheet #") or "").strip()
        builder = (row.get("Builder") or "").strip().upper()
        if not prop or not sheet:
            continue
        key = f"{prop}|{sheet}|{builder}"
        for col, label in COLS:
            bmp = bmp_from_ole(row.get(col) or "")
            if bmp is None:
                continue
            if is_blank(bmp):
                blanks += 1
                continue
            sha = hashlib.sha1(bmp).hexdigest()
            fname = seen_content.get(sha)
            if fname is None:
                fname = f"{sha[:16]}.png"
                with tempfile.NamedTemporaryFile(suffix=".bmp", delete=False) as tf:
                    tf.write(bmp)
                subprocess.run(["sips", "-s", "format", "png", tf.name,
                                "--out", os.path.join(out_dir, fname)],
                               check=True, capture_output=True)
                os.unlink(tf.name)
                seen_content[sha] = fname
            manifest.append({"key": key, "label": label, "file": fname, "sha1": sha})
            extracted += 1
    proc.wait()
    print(f"{os.path.basename(mdb)}: running total {extracted} drawings, {blanks} blanks dropped")

json.dump(manifest, open(os.path.join(out_dir, "manifest.json"), "w"), indent=1)
print(f"\n{extracted} drawings ({len(seen_content)} unique images), {blanks} blank canvases dropped")

if attach_db:
    db = sqlite3.connect(attach_db)
    ledger = {}
    for k, cid in db.execute("SELECT key, cutsheet_id FROM legacy_imports"):
        ledger[k] = cid
    attached = unmatched = 0
    for m in manifest:
        cid = ledger.get(m["key"])
        if cid is None:
            unmatched += 1
            continue
        png = open(os.path.join(out_dir, m["file"]), "rb").read()
        db.execute("DELETE FROM attachments WHERE cutsheet_id=? AND filename=?", (cid, m["label"]))
        db.execute("INSERT INTO attachments (cutsheet_id, kind, filename, mime, size, blob) VALUES (?, 'image', ?, 'image/png', ?, ?)",
                   (cid, m["label"], len(png), png))
        attached += 1
    db.commit()
    print(f"attached {attached} to {attach_db} ({unmatched} keys not in ledger)")
