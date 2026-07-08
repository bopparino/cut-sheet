import { fittingAspect, fittingCropStyle, type FittingDef } from "@/lib/fittings";

// One fitting drawing, cropped out of the master template sheet with CSS.
// Pure render (no hooks) so both the client picker card and the server print
// page can use it. Sizing: give the outer div a width/height via className;
// the crop "contains" inside it (container-query units pick the limiting
// axis) so wide and tall fittings both fit without distortion or clipping.
export function FittingThumb({ def, className }: { def: FittingDef; className?: string }) {
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
          width: `min(100cqw, calc(100cqh * ${aspect}))`,
        }}
        role="img"
        aria-label={def.label}
      />
    </div>
  );
}
