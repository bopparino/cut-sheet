# Legacy Import Mapping — Decisions Ledger

This file is the single place where every "where does Access data go?"
decision lives. If a value from the old .mdb files seems missing, start
here, then run the audit (below) — do not start from the .mdb archaeology.

**The guarantee:** the importer's proxy audit forces every data-bearing
column into exactly one of these outcomes, or it prints a warning naming
the column. Nothing is dropped without a rule you can read on this page.

| Outcome | Meaning | Where you see it |
|---|---|---|
| Mapped to a box | Value lands in a real field on the new form | The form / printed sheet |
| Printed misc text | Line in the sheet's Miscellaneous box | The form / printed sheet + Custom ticket |
| Legacy notes | Preserved verbatim, no box exists | **Admin-only** "Legacy import data" card on the sheet page; never prints |
| Form default — dropped | A value repeated on ≥90% of a source's rows (non-empty) is Access echoing its form, not data | Nowhere, on purpose |
| Deliberately dropped | Product/field confirmed dead with the shop | Nowhere, on purpose |
| ⚠ Warning | Anything else with data | Importer output — read it every run |

## Locked decisions

- **Access form labels lie — trust data, not labels.** `BlueFlashingP300`
  is the P400 (4") row (verified July 2026). The insulated-flex columns are
  the R-8 product: across 6,660 Sheet Metal lines, zero say "R-8" (it's the
  unlabeled default) while 154 hand-note "R-4 flex" for the exception.
  Columns → R8 row; parsed "R-4 flex" lines → R4 row.
- **Sheet Metal Lines 1–12** = the old form's Miscellaneous box. Lines that
  *unambiguously* name an item with a real box are placed into it (R-4 flex,
  8126/8145 fresh-air dampers, round volume dampers, W×H AA/BM dampers
  (≤6 rows), blue flashing sizes → P400/600/800/1000, bubble wrap).
  Everything else prints as Misc text — a wrong box is worse than a text line.
- **B-vent CCF** is half-used as free text ("12/12", "1-1-1"). Numbers go to
  the CCF box; text prints as a "B-Vent CCF — …" Misc line. Meaning of the
  text values: open question for Kimmie.
- **Retired products** (48"/100" duct, 10' insulated flex, 3"/4" screen
  caps, Furn-Conn, BV-Tee sizes) print as Misc lines so a reprint matches
  what the shop originally built. Only the 2004–07 Server library has data
  in these; inert for 2023-era files.
- **Deliberately dropped:** `Angles` (not on the new sheet; shop confirmed
  dead, July 2026). `CD 1–12 DB` duct-board flags (DuctBoard retired; the
  entire corpus holds only "N"/"#" — not one "Y" in 39,642 values).
- **Form-default rule:** ≥90% identical **non-empty** value in a source =
  Access form default, dropped (e.g. `3/4/6 Inch Wall Cap = 1` everywhere).
  A 90%-empty column is sparse *data*, never a default (fixed July 2026 —
  the old rule silently ate 174 real minority values).
- **Empty Access artifact rows** (no builder, house type, project, or lot)
  are skipped whole; their leftover form residue does not count as data.
- **Hidden ≠ lost:** every no-home value is stored on the sheet as
  `formOnly.legacyNotes` and visible to admins on the sheet page. It never
  prints (Kimmie read printed "Legacy —" lines as corrupted data).
- **Not this importer's job:** fittings drawings (separate
  `scripts/extract-drawings.py` pipeline), the Server 2004–07 library
  (1,538 sheets, deliberately not imported), the retired DuctBoard table
  (the converter doesn't extract it).

## Open questions (the remaining ~7,200 misc text lines)

Counts from the July 2026 corpus; each becomes a one-line parser addition
once answered:

- Air Bear / media cabinets (~800 lines) — same thing as the Filter Racks
  box (16x25 / 20x25 / L-Box)?
- Broan ZB110/ZB110L (~470) — no box exists on the form; add one?
- AE80 (~250) / SIG110 (~120) — fold every spelling into the existing
  AE80-4 / SIG80-110 fan rows?
- A000HF fans (49) — what is this product?
- W×H "WEC" / "W/EC" (~60) — wall end cap = End Caps row?
- 4"/6" Mid Atlantic (~70) — lines never say metal vs screen; which default?
- Roof jacks ("730", "BLK") — map to Roof J 6/8/10? Which sizes?
- Aprilaire 1410/1210 cabinets — F/A box only knows 8126/8145.
- Bare "FRESH AIR" (36) — default to 8126?
- "BY PASS" dampers (28) — bypass ≠ volume damper; kept as text on purpose.
- B-vent CCF text values — what does "12/12" mean to the shop?
- AsBuilts reviewer initials (1,825 values in legacy notes) — worth a real
  field on the form?

## Running the audit

Every emit can self-document what it did:

```bash
node --no-experimental-strip-types --import tsx scripts/import-legacy.mts \
  legacy-tables/*.json --emit bundle.json --audit-report report.json
```

The report classifies every column with data counts and samples. Warnings
print for (a) unmapped columns with data on imported rows and (b) text
found in numerically-consumed columns (imports as 0). Warnings never block
an emit (decided July 2026) — so **read them** before pushing.
