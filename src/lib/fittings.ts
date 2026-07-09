// The fittings catalog. One entry per drawing, one image file per fitting at
// public/fittings/f<N>.png (500x500, white background, hand-trimmed by Austin
// in Photoshop from the shop's master sheet). To improve a drawing, overwrite
// its file - nothing here needs to change. Fittings 27 and 28 from the master
// sheet were one fitting all along (two views sharing one QTY block), so the
// catalog is 28: f27 is the merged angle pair, f28 is the plate.
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
  // width / height of the image file. All current files are 500x500 squares;
  // per-def so a non-square drawing can join later without breaking layout.
  aspect: number;
};

export const FITTING_COUNT = 28;

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
