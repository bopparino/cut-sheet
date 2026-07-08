// The fittings catalog. One entry per drawing on the master fittings sheet
// (public/fittings-template.png) - the same sheet Kimmy used to screenshot
// from in MS Paint. Instead of slicing the sheet into 28 files, each entry
// carries its crop box as fractions of the full image; the UI and the print
// page both render the crop with CSS (see fittingCropStyle below), so
// recalibrating a fitting = editing four numbers here.
//
// NAMES AND DIM LABELS ARE A STARTING VOCABULARY. They were derived from the
// drawings, not from the shop's own terms - rename freely (labels are display
// only; `id` and dim `key`s are what saved cutsheets reference, so leave those
// stable once real data exists).

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

const W = { key: "w", label: "W" };
const H = { key: "h", label: "H" };
const L = { key: "l", label: "L" };
const WHL = [W, H, L];

// Template's pixel aspect (width / height); used to keep crops undistorted.
export const TEMPLATE_ASPECT = 13788 / 10592;

export const FITTINGS: FittingDef[] = [
  // ---- Row 1 ----
  { id: "db-hood", label: "DB Hood", box: { x: 0.075, y: 0.08, w: 0.115, h: 0.15 }, dims: WHL },
  { id: "sq-ell", label: "Square Ell", box: { x: 0.225, y: 0.10, w: 0.105, h: 0.14 }, dims: WHL },
  { id: "ell-45", label: "45° Ell", box: { x: 0.39, y: 0.11, w: 0.12, h: 0.13 }, dims: WHL },
  { id: "cas-box", label: "CAS Box", box: { x: 0.555, y: 0.12, w: 0.125, h: 0.12 }, dims: WHL },
  { id: "cas-open", label: "CAS Open Top", box: { x: 0.71, y: 0.105, w: 0.125, h: 0.13 }, dims: WHL },
  // ---- Row 2 ----
  { id: "db-cone", label: "DB Cone", box: { x: 0.09, y: 0.245, w: 0.10, h: 0.13 }, dims: WHL },
  { id: "tee-notch", label: "Notched Tee", box: { x: 0.215, y: 0.26, w: 0.125, h: 0.13 }, dims: [W, H, L, { key: "t", label: "Tap" }] },
  { id: "transition", label: "Transition", box: { x: 0.385, y: 0.26, w: 0.13, h: 0.12 }, dims: [{ key: "in", label: "In" }, { key: "out", label: "Out" }, L] },
  { id: "rnd-to-sq", label: "Round to Square", box: { x: 0.545, y: 0.265, w: 0.11, h: 0.14 }, dims: [{ key: "rnd", label: "Round" }, { key: "sq", label: "Square" }, L] },
  { id: "transfer-grill", label: "Transfer Grill", box: { x: 0.69, y: 0.245, w: 0.15, h: 0.14 }, dims: [W, H] },
  // ---- Row 3 ----
  { id: "vd", label: "Volume Damper (VD)", box: { x: 0.07, y: 0.39, w: 0.12, h: 0.15 }, dims: [W, H] },
  { id: "offset", label: "Offset", box: { x: 0.23, y: 0.41, w: 0.115, h: 0.135 }, dims: [W, H, L, { key: "off", label: "Offset" }] },
  { id: "channel", label: "Channel", box: { x: 0.385, y: 0.41, w: 0.145, h: 0.12 }, dims: WHL },
  { id: "stand", label: "Stand", box: { x: 0.54, y: 0.41, w: 0.165, h: 0.14 }, dims: WHL },
  { id: "curb", label: "Curb", box: { x: 0.70, y: 0.42, w: 0.15, h: 0.11 }, dims: WHL },
  // ---- Row 4 ----
  { id: "clips", label: "Clips", box: { x: 0.065, y: 0.555, w: 0.12, h: 0.145 }, dims: [W, L] },
  { id: "open-square", label: "Open Square", box: { x: 0.235, y: 0.575, w: 0.14, h: 0.17 }, dims: WHL },
  { id: "riser-collar", label: "Riser + Collar", box: { x: 0.385, y: 0.54, w: 0.13, h: 0.135 }, dims: [W, H, L, { key: "c", label: "Collar" }] },
  { id: "v-box", label: "V Box", box: { x: 0.545, y: 0.555, w: 0.125, h: 0.135 }, dims: WHL },
  { id: "z-cleat", label: "Z Cleat", box: { x: 0.685, y: 0.545, w: 0.14, h: 0.14 }, dims: [W, L] },
  // ---- Row 5 ----
  { id: "custom-l-box", label: "Custom L Box", box: { x: 0.05, y: 0.715, w: 0.135, h: 0.205 }, dims: [{ key: "a", label: "A" }, { key: "b", label: "B" }, { key: "c", label: "C" }, { key: "d", label: "D" }, { key: "w", label: "W" }, { key: "dp", label: "Depth" }] },
  { id: "hanging-square", label: "Hanging Square", box: { x: 0.225, y: 0.675, w: 0.135, h: 0.185 }, dims: WHL },
  { id: "cl-hopper", label: "CL Hopper", box: { x: 0.375, y: 0.685, w: 0.155, h: 0.135 }, dims: [{ key: "top", label: "Top" }, { key: "bot", label: "Bottom" }, H] },
  { id: "sleeve", label: "Sleeve", box: { x: 0.55, y: 0.70, w: 0.15, h: 0.17 }, dims: WHL },
  { id: "cl-trapezoid", label: "CL Trapezoid", box: { x: 0.695, y: 0.71, w: 0.17, h: 0.15 }, dims: [{ key: "top", label: "Top" }, { key: "bot", label: "Bottom" }, H] },
  // ---- Row 6 ----
  { id: "end-channel", label: "End Channel", box: { x: 0.325, y: 0.83, w: 0.135, h: 0.14 }, dims: WHL },
  { id: "angle-a", label: "Angle (narrow)", box: { x: 0.495, y: 0.84, w: 0.065, h: 0.13 }, dims: [W, L] },
  { id: "angle-b", label: "Angle (wide)", box: { x: 0.56, y: 0.84, w: 0.075, h: 0.13 }, dims: [W, L] },
];

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
