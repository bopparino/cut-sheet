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
- **Roof jacks** (confirmed July 2026, via 2129 N Troy St): "730" is the
  6" roof jack model and BLACK/BLK is finish, not a product. Sheet Metal
  lines like `6" 730 ROOF JACK` / `730 BLACK ROOF JACKS` land in the Fans
  box Roof J 6/8/10 by size (730 alone = 6"). Off-size jacks stay in Misc.
- **3¼" × 115" stack duct** (confirmed July 2026): the Access columns
  `3x8x115 / 3x10x115 / 3x12x115 / 3x14x115 Duct` become Custom Duct rows —
  qty N, 3.25 wide × H high × 115 long (the "3" prefix is the same 3¼ the
  60" list maps). 770 values across the corpus were hiding in legacy notes.
- **Mid Atlantic wall caps** (confirmed July 2026): unspecified lines are
  the default product = METAL (the box's left column); an explicit
  "W/SCREEN" goes to Screen (plastic, right column). Sizes 4"/6" only;
  anything else stays in Misc.
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

## Shop-walk decisions (July 2026 — via Laron and the crew; vocabulary CLOSED)

Every former open question, answered. Misc-text outcomes below are the
DECIDED home, not a fallback:

- **Insulated flex, unmarked** — R8. The shop only started using R4 a few
  months ago; "a job always had R8 unless specified" (Laron). Confirms the
  columns→R8 / typed-R-4-lines→R4 rule.
- **Air Bear / media cabinets** — NOT a filter rack; a distinct filter
  cabinet product with no box on the form. Stays as Misc text.
- **Broan ZB110 / ZB110L** — that product today IS the PTE 511 RK
  (L = with light). Lines fold into the existing Fans rows: ZB110 →
  PTE 511, ZB110L → PTEL 511. "PTE511RK"/"PTEL511RK" text lines too.
- **AE80 (every spelling) and A000HF** — the standard 4" fan → AE 80-4 row.
- **SIG110** — → SIG 80-110 row.
- **W×H "WEC" / "W/EC"** — per-order custom box; Misc text is its home.
- **Aprilaire 1410 / 1210 cabinets** — Misc text is their home.
- **Bare "FRESH AIR" (no model)** — never mapped to a model; stays text.
- **"BY PASS" dampers** — a different product (bypass has a damper blade;
  a round volume damper has four quadrants). Stays text.
- **B-vent CCF text ("12/12", "1-1-1")** — old habit; the printed
  "B-Vent CCF — …" Misc line is the correct home.
- **3" TP / BT dryer boxes** — dead product; deliberately dropped.

## Still open (not import questions)

- AsBuilts reviewer initials (1,825 values in legacy notes) — worth a real
  field on the form someday?
- The two D.R. Horton drifted keys (219541|1003050, 219613|1003042) —
  ledger reconciliation.

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
