import type { CSSProperties, ReactNode } from "react";

// The cut-sheet print layouts (blank pad master + filled sheet) were drawn
// box-for-box for an 11×17 page. The shop now prints on US Legal (8.5×14), so
// rather than re-laying-out the dense grids we scale each 11×17 page down to
// fit the Legal printable area. One source of truth for the scale factor and
// page geometry, used by FilledCutSheet and the blank pad masters.
//
// Geometry: @page is 8.5×14 with 0.25in margins → 8.0in × 13.5in printable.
// The source layout fills ~10.5in wide (11in − 0.25in margins). 8.0 / 10.5 =
// 0.762, and a 16.5in-tall source page scales to ~12.6in, inside the 13.5in
// printable height.

export const LEGAL_PAGE_CSS = "@page { size: 8.5in 14in; margin: 0.25in; }";

const SCALE = 0.762;
const SOURCE_WIDTH_IN = 10.5;

const PAGE_STYLE: CSSProperties = {
  width: "8in",
  height: "13.5in",
  overflow: "hidden",
};
const INNER_STYLE: CSSProperties = {
  width: `${SOURCE_WIDTH_IN}in`,
  transform: `scale(${SCALE})`,
  transformOrigin: "top left",
};

export function LegalScalePage({ children }: { children: ReactNode }) {
  return (
    <div style={PAGE_STYLE} className="break-after-page last:break-after-auto">
      <div style={INNER_STYLE}>{children}</div>
    </div>
  );
}
