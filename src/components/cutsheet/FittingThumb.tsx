import { fittingAspect, fittingCropStyle, type FittingDef } from "@/lib/fittings";

// One fitting drawing, cropped out of the master template sheet with CSS.
// Pure render (no hooks) so both the client picker card and the server print
// page can use it. Sizing: give the outer div a width/height via className;
// the crop "contains" inside it (container-query units pick the limiting
// axis) so wide and tall fittings both fit without distortion or clipping.
//
// `children` render INSIDE the drawing box (position: relative), so anything
// absolutely positioned with fractional left/top lands on the same spot on
// the drawing everywhere it's rendered - the label editor and the print page
// share coordinates through this.
//
// `zoom` < 1 shrinks the drawing inside its box, leaving a gutter so labels
// anchored at the drawing's edges (they center on their point, so half the
// text overhangs) still land inside this component's overflow-hidden bounds.
export function FittingThumb({
  def,
  className,
  children,
  zoom = 1,
}: {
  def: FittingDef;
  className?: string;
  children?: React.ReactNode;
  zoom?: number;
}) {
  const aspect = fittingAspect(def);
  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-white ${className ?? ""}`}
      style={{ containerType: "size" }}
    >
      <div
        style={{
          ...fittingCropStyle(def),
          aspectRatio: String(aspect),
          width: `calc(min(100cqw, 100cqh * ${aspect}) * ${zoom})`,
          position: "relative",
        }}
        role="img"
        aria-label={def.label}
      >
        {children}
      </div>
    </div>
  );
}
