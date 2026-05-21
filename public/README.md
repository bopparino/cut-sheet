# Static assets

## fittings-template.png

Page 2 of the blank cutsheet pad (`/print/blank`, `/api/pdf/blank`) embeds
this file as the fittings artwork. **The image must exist here before the
blank pad PDF will render correctly.**

To produce it:

1. Open `Fittings.pdf` in any PDF reader (Preview on macOS, Adobe Reader,
   etc.).
2. Export / Save As → PNG. Set DPI to **300** so it stays crisp at Tabloid
   11×17 print size — lower DPI will pixelate.
3. Save the resulting file as **`public/fittings-template.png`** (this
   directory).

The existing template already has "QTY:" and "SL?: N/Y" labels printed on
every fitting, so no overlay is needed. Crews write quantities and circle
the SL option directly on the printed pad.

If you want to swap the fittings sheet later, replace this PNG with the
new artwork and the next build picks it up automatically.
