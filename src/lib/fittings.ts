// The fittings catalog. One entry per drawing on the master fittings sheet
// (public/fittings-template.png, converted from the shop's "FITTING PAGE -
// FINAL.bmp") - the same sheet Kimmy used to screenshot from in MS Paint.
// Instead of slicing the sheet into files, each entry carries its crop box as
// fractions of the full image; the UI and the print page both render the crop
// with CSS (see fittingCropStyle below), so recalibrating a fitting = editing
// four numbers here.
//
// Names are "Fitting N" on purpose: there is no industry-standard name for
// these - every shop guy calls them something different - so the drawing IS
// the name. Measurements are one free-text field per pick (same as writing
// them on the drawing in Paint). If per-side fields are ever wanted, give a
// fitting its own dims list; the card and the print page render whatever is
// declared here.

import type { CSSProperties } from "react";

export type FittingDim = { key: string; label: string };

export type FittingDef = {
  id: string;
  label: string;
  // Crop box on fittings-template.png, all values fractions [0..1] of the
  // full image (x/y = top-left corner).
  box: { x: number; y: number; w: number; h: number };
  dims: FittingDim[];
};

const SIZE: FittingDim[] = [{ key: "size", label: "Measurements" }];

// Template's pixel aspect (width / height); used to keep crops undistorted.
export const TEMPLATE_ASPECT = 1038 / 825;

const BOXES: [number, number, number, number][] = [
  // ---- Row 1 ----
  [0.045, 0.04, 0.105, 0.09],   // 1 DB hood
  [0.19, 0.035, 0.14, 0.135],   // 2 square ell
  [0.395, 0.055, 0.16, 0.15],   // 3 45° ell
  [0.61, 0.06, 0.135, 0.11],    // 4 CAS box
  [0.80, 0.045, 0.13, 0.11],    // 5 CAS open top
  // ---- Row 2 ----
  [0.07, 0.205, 0.10, 0.12],    // 6 DB cone
  [0.215, 0.215, 0.15, 0.14],   // 7 notched tee
  [0.41, 0.21, 0.165, 0.125],   // 8 transition
  [0.61, 0.215, 0.16, 0.175],   // 9 round to square
  [0.81, 0.235, 0.135, 0.105],  // 10 transfer grill
  // ---- Row 3 ----
  [0.05, 0.385, 0.115, 0.125],  // 11 volume damper (VD)
  [0.225, 0.40, 0.135, 0.13],   // 12 offset
  [0.43, 0.42, 0.145, 0.075],   // 13 channel
  [0.60, 0.39, 0.165, 0.11],    // 14 stand
  [0.81, 0.415, 0.13, 0.075],   // 15 curb
  // ---- Row 4 ----
  [0.075, 0.565, 0.095, 0.115], // 16 clips
  [0.27, 0.56, 0.105, 0.185],   // 17 open square
  [0.43, 0.555, 0.15, 0.09],    // 18 riser + collar
  [0.655, 0.57, 0.09, 0.085],   // 19 V box
  [0.82, 0.54, 0.13, 0.135],    // 20 Z cleat
  // ---- Row 5 ----
  [0.04, 0.73, 0.17, 0.18],   // 21 L box
  [0.275, 0.70, 0.11, 0.125],   // 22 hanging square
  [0.445, 0.70, 0.13, 0.12],    // 23 CL hopper
  [0.655, 0.72, 0.13, 0.125],   // 24 sleeve
  [0.83, 0.73, 0.13, 0.11],     // 25 CL trapezoid
  // ---- Row 6 ----
  [0.36, 0.85, 0.14, 0.125],    // 26 end channel
  [0.555, 0.85, 0.055, 0.115],  // 27 angle (narrow)
  [0.625, 0.855, 0.06, 0.11],   // 28 angle (wide)
  [0.75, 0.895, 0.105, 0.075],  // 29 plate with hole
];

export const FITTINGS: FittingDef[] = BOXES.map(([x, y, w, h], i) => ({
  id: `f${i + 1}`,
  label: `Fitting ${i + 1}`,
  box: { x, y, w, h },
  dims: SIZE,
}));

export const FITTING_MAP = new Map(FITTINGS.map((f) => [f.id, f]));

// CSS background-crop for a fitting: give the element this style plus the
// aspect ratio from fittingAspect() and the drawing fills it, undistorted, at
// the template's full resolution (matters for print).
export function fittingCropStyle(def: FittingDef): CSSProperties {
  const { x, y, w, h } = def.box;
  return {
    backgroundImage: "url(/fittings-template.png)",
    backgroundSize: `${100 / w}% ${100 / h}%`,
    backgroundPosition: `${w >= 1 ? 0 : (x / (1 - w)) * 100}% ${h >= 1 ? 0 : (y / (1 - h)) * 100}%`,
    backgroundRepeat: "no-repeat",
  };
}

// width / height of the cropped region in real pixels.
export function fittingAspect(def: FittingDef): number {
  return (def.box.w / def.box.h) * TEMPLATE_ASPECT;
}
