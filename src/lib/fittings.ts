// The fittings catalog. One entry per drawing, one image file per fitting at
// public/fittings/f<N>.png (800x800, white background). To improve a drawing,
// overwrite its file - nothing here needs to change. The current files were
// auto-cut from the shop's master sheet ("FITTING PAGE - FINAL.bmp"); they are
// placeholders awaiting the hand-trimmed Photoshop versions.
//
// Names are "Fitting N" on purpose: there is no industry-standard name for
// these - every shop guy calls them something different - so the drawing IS
// the name. Measurements are click-placed labels stored on each picked row
// (see FittingLabelSchema) - the catalog only supplies the artwork.

import type { CSSProperties } from "react";

export type FittingDef = {
  id: string;
  label: string;
  src: string;
  // width / height of the image file. All current files are 800x800 squares;
  // per-def so a non-square drawing can join later without breaking layout.
  aspect: number;
};

export const FITTING_COUNT = 29;

export const FITTINGS: FittingDef[] = Array.from({ length: FITTING_COUNT }, (_, i) => ({
  id: `f${i + 1}`,
  label: `Fitting ${i + 1}`,
  src: `/fittings/f${i + 1}.png`,
  aspect: 1,
}));

export const FITTING_MAP = new Map(FITTINGS.map((f) => [f.id, f]));

// CSS for the drawing box: give the element this style plus the aspect ratio
// from fittingAspect() and the drawing fills it edge to edge, so fractional
// label coordinates land on the same spot everywhere it renders.
export function fittingCropStyle(def: FittingDef): CSSProperties {
  return {
    backgroundImage: `url(${def.src})`,
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
  };
}

export function fittingAspect(def: FittingDef): number {
  return def.aspect;
}
