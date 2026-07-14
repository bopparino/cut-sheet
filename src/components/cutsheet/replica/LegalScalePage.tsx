import type { CSSProperties, ReactNode } from "react";

// The cut-sheet print layouts (blank pad master + filled sheet) were drawn
// box-for-box for an 11×17 page. The shop now prints on US Legal (8.5×14), so
// rather than re-laying-out the dense grids we scale each 11×17 page down to
// fit the Legal printable area. One source of truth for the scale factor and
// page geometry, used by FilledCutSheet and the blank pad masters.
//
// Geometry: @page is 8.5×14 with 0.25in margins → 8.0in × 13.5in printable.
// The source layout fills ~10.5in wide (11in − 0.25in margins). 8.0 / 10.5 =
// 0.762. Source pages declare min-h-[17.65in] — the full height budget
// (13.45in page box ÷ 0.762) — so their flex spacers ground footers at the
// true bottom of the Legal sheet instead of leaving a dead strip.

// Page breaks go BEFORE each page after the first (sibling selector), never
// after the last. The old `break-after` + `last:break-after-auto` approach
// broke in production: Next injects <script> tags at the end of <body>, so
// the final sheet is never :last-child, the trailing break fired, and every
// PDF grew a blank page.
export const LEGAL_PAGE_CSS =
  "@page { size: 8.5in 14in; margin: 0.25in; } .legal-page + .legal-page { break-before: page; }";

const SCALE = 0.762;
const SOURCE_WIDTH_IN = 10.5;

const PAGE_STYLE: CSSProperties = {
  width: "8in",
  // A hair under the 13.5in printable height: at exactly printable height,
  // Chromium's fragmentation spills a zero-content sliver onto an extra blank
  // page. Content only fills ~12.6in, so the shave clips nothing.
  height: "13.45in",
  overflow: "hidden",
};
const INNER_STYLE: CSSProperties = {
  width: `${SOURCE_WIDTH_IN}in`,
  transform: `scale(${SCALE})`,
  transformOrigin: "top left",
};

export function LegalScalePage({ children }: { children: ReactNode }) {
  return (
    <div style={PAGE_STYLE} className="legal-page">
      <div style={INNER_STYLE}>{children}</div>
    </div>
  );
}
