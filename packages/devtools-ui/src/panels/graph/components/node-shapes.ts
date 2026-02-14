/**
 * SVG path generators for 17 node shapes.
 *
 * Each function returns an SVG path data string for the given dimensions.
 *
 * @packageDocumentation
 */

import type { LibraryAdapterKind } from "../types.js";

/**
 * Rounded rectangle (default shape).
 */
function roundedRect(w: number, h: number, r: number): string {
  const x = -w / 2;
  const y = -h / 2;
  return (
    `M ${x + r} ${y} ` +
    `H ${x + w - r} ` +
    `Q ${x + w} ${y} ${x + w} ${y + r} ` +
    `V ${y + h - r} ` +
    `Q ${x + w} ${y + h} ${x + w - r} ${y + h} ` +
    `H ${x + r} ` +
    `Q ${x} ${y + h} ${x} ${y + h - r} ` +
    `V ${y + r} ` +
    `Q ${x} ${y} ${x + r} ${y} Z`
  );
}

/**
 * Circle shape.
 */
function circle(w: number, h: number): string {
  const rx = w / 2;
  const ry = h / 2;
  return `M 0 ${-ry} ` + `A ${rx} ${ry} 0 1 1 0 ${ry} ` + `A ${rx} ${ry} 0 1 1 0 ${-ry} Z`;
}

/**
 * Diamond shape.
 */
function diamond(w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  return `M 0 ${-hh} L ${hw} 0 L 0 ${hh} L ${-hw} 0 Z`;
}

/**
 * Hexagon shape.
 */
function hexagon(w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  const indent = w * 0.2;
  return (
    `M ${-hw + indent} ${-hh} ` +
    `L ${hw - indent} ${-hh} ` +
    `L ${hw} 0 ` +
    `L ${hw - indent} ${hh} ` +
    `L ${-hw + indent} ${hh} ` +
    `L ${-hw} 0 Z`
  );
}

/**
 * Octagon shape.
 */
function octagon(w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  const clip = Math.min(w, h) * 0.2;
  return (
    `M ${-hw + clip} ${-hh} ` +
    `L ${hw - clip} ${-hh} ` +
    `L ${hw} ${-hh + clip} ` +
    `L ${hw} ${hh - clip} ` +
    `L ${hw - clip} ${hh} ` +
    `L ${-hw + clip} ${hh} ` +
    `L ${-hw} ${hh - clip} ` +
    `L ${-hw} ${-hh + clip} Z`
  );
}

/**
 * Parallelogram shape — slanted rectangle.
 */
function parallelogram(w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  const skew = w * 0.12;
  return (
    `M ${-hw + skew} ${-hh} ` +
    `L ${hw + skew} ${-hh} ` +
    `L ${hw - skew} ${hh} ` +
    `L ${-hw - skew} ${hh} Z`
  );
}

/**
 * Pentagon shape — house-like with a pointed top-right.
 */
function pentagon(w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  const indent = w * 0.15;
  return (
    `M ${-hw} ${-hh} ` +
    `L ${hw - indent} ${-hh} ` +
    `L ${hw} 0 ` +
    `L ${hw - indent} ${hh} ` +
    `L ${-hw} ${hh} Z`
  );
}

/**
 * Stadium (pill) shape — rectangle with fully-rounded left/right ends.
 */
function stadium(w: number, h: number): string {
  const r = h / 2;
  const x = -w / 2;
  const y = -h / 2;
  const straight = w - h; // length of the straight segment
  return (
    `M ${x + r} ${y} ` +
    `H ${x + r + straight} ` +
    `A ${r} ${r} 0 0 1 ${x + r + straight} ${y + h} ` +
    `H ${x + r} ` +
    `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
  );
}

/**
 * Rectangle with slight rounding (for effect adapters).
 */
function rect(w: number, h: number): string {
  const x = -w / 2;
  const y = -h / 2;
  return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
}

/**
 * Badge letter for a library kind.
 */
function getLibraryBadgeLetter(kind: LibraryAdapterKind): string {
  switch (kind.library) {
    case "store":
      if (kind.kind === "atom") return "A";
      if (
        kind.kind === "derived" ||
        kind.kind === "async-derived" ||
        kind.kind === "linked-derived"
      )
        return "D";
      if (kind.kind === "effect") return "E";
      return "S";
    case "query":
      if (kind.kind === "mutation") return "M";
      if (kind.kind === "streamed-query") return "~";
      return "Q";
    case "saga":
      return "Sg";
    case "flow":
      return "Fl";
    case "logger":
      return "L";
    case "tracing":
      return "T";
    case "core":
      return "";
  }
}

/**
 * Get the SVG path data for a node based on its library kind.
 */
function getNodeShapePath(
  kind: LibraryAdapterKind | undefined,
  w: number,
  h: number,
  r = 6
): string {
  if (kind === undefined) return roundedRect(w, h, r);

  switch (kind.library) {
    case "store":
      switch (kind.kind) {
        case "atom":
          return circle(w, h);
        case "derived":
          return diamond(w, h);
        case "async-derived":
          return diamond(w, h);
        case "linked-derived":
          return diamond(w, h);
        case "effect":
          return rect(w, h);
        default:
          return roundedRect(w, h, r);
      }
    case "query":
      return stadium(w, h);
    case "saga":
      return hexagon(w, h);
    case "flow":
      return octagon(w, h);
    case "logger":
      return pentagon(w, h);
    case "tracing":
      return parallelogram(w, h);
    case "core":
      return roundedRect(w, h, r);
  }
}

/**
 * Whether to render a dashed outline for the shape.
 */
function isDashedShape(kind: LibraryAdapterKind | undefined): boolean {
  if (kind === undefined) return false;
  return kind.library === "store" && kind.kind === "async-derived";
}

export {
  roundedRect,
  circle,
  diamond,
  hexagon,
  octagon,
  parallelogram,
  pentagon,
  stadium,
  rect,
  getNodeShapePath,
  getLibraryBadgeLetter,
  isDashedShape,
};
