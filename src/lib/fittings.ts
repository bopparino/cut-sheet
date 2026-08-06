// The fittings catalog. One entry per drawing, one image file per fitting at
// public/fittings/f<N>.png (800x800, white background — redrawn set supplied
// by the shop July 2026, replacing the original 500x500 Photoshop trims). To
// improve a drawing, overwrite its file - nothing here needs to change.
// Numbering matches the shop's CURRENT 29-drawing master sheet 1:1. The old
// catalog was 28: the 2026 master added a plain-box drawing at position 26,
// shifting the tail (old f26 latch-box -> f27, old f27 merged angle pair ->
// f28, old f28 plate -> f29); migration v10 in db.ts renumbered the picked
// fittings on existing sheets to match. f28 is still the merged angle pair
// (two views sharing one QTY block).
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
