// src/grid.ts

/**
 * A simple Vec3 tuple for 3D coordinates and dimensions.
 */
export type Vec3 = [number, number, number];
export const isVec3 = (v: unknown): v is Vec3 =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number");

/**
 * The overall dimensions of the grid box: [width, height, depth].
 */
export const BOX: Vec3 = [3, 6, 5];

/**
 * The number of subdivisions (sections) along each axis: [xSections, ySections, zSections].
 */
export const SECTIONS: Vec3 = [4, 6, 4];

/**
 * Domain and step information for a single axis.
 */
export interface AxisInfo {
  domain: [number, number];
  step: number;
}

/**
 * Computed axis info for x, y, and z axes.
 */
export interface AxisInfoResult {
  x: AxisInfo;
  y: AxisInfo;
  z: AxisInfo;
}

/**
 * Computes the domain (min, max) and step size for each axis
 * given the box dimensions and section counts.
 */
export function calculateAxisInfo(box: Vec3, sections: Vec3): AxisInfoResult {
  const [width, height, depth] = box;
  const [xSections, ySections, zSections] = sections;

  return {
    x: { domain: [-width / 2, width / 2], step: width / xSections },
    y: { domain: [-height / 2, height / 2], step: height / ySections },
    z: { domain: [-depth / 2, depth / 2], step: depth / zSections },
  };
}

export function calculateAxisJSONSchema(
  model: "openai" | "claude",
  box: Vec3 = BOX,
  sections: Vec3 = SECTIONS
) {
  const [width, height, depth] = box;
  const [xSections, ySections, zSections] = sections;

  switch (model) {
    case "openai":
      return {
        x: {
          type: "number",
          enum: generatePositions(width, xSections),
        },
        y: {
          type: "number",
          enum: generatePositions(height, ySections),
        },
        z: {
          type: "number",
          enum: generatePositions(depth, zSections),
        },
      };
    case "claude":
      return {
        x: {
          type: "number",
          minimum: -width / 2,
          maximum: width / 2,
          multipleOf: width / xSections,
        },
        y: {
          type: "number",
          minimum: -height / 2,
          maximum: height / 2,
          multipleOf: height / ySections,
        },
        z: {
          type: "number",
          minimum: -depth / 2,
          maximum: depth / 2,
          multipleOf: depth / zSections,
        },
      };
  }
}

/**
 * Generates sorted positions along one axis, including boundary and internal split points.
 */
export function generatePositions(dimension: number, sections: number): number[] {
  const positions: number[] = [];
  const half = dimension / 2;

  // boundaries
  positions.push(-half, half);

  // internal splits
  for (let i = 1; i < sections; i++) {
    positions.push(-half + (dimension * i) / sections);
  }

  return positions.sort((a, b) => a - b);
}

export const X_POSITIONS = generatePositions(BOX[0], SECTIONS[0]);
export const Y_POSITIONS = generatePositions(BOX[1], SECTIONS[1]);
export const Z_POSITIONS = generatePositions(BOX[2], SECTIONS[2]);

/**
 * Calculates all grid intersection points as Vec3 tuples.
 */
export function calculateIntersectionPoints(box: Vec3, sections: Vec3): Vec3[] {
  const [xDim, yDim, zDim] = box;
  const [xSec, ySec, zSec] = sections;

  const xs = generatePositions(xDim, xSec);
  const ys = generatePositions(yDim, ySec);
  const zs = generatePositions(zDim, zSec);

  const points: Vec3[] = [];
  for (const x of xs) {
    for (const y of ys) {
      for (const z of zs) {
        points.push([x, y, z]);
      }
    }
  }
  return points;
}

/**
 * Checks if a single value is within tolerance of any valid positions.
 */
function isValueValid(value: number, valid: number[], tolerance: number): boolean {
  return valid.some((v) => Math.abs(v - value) <= tolerance);
}

/**
 * Determines if the given (x,y,z) lies precisely on a grid intersection,
 * within an optional tolerance.
 */
export function isValidGridPosition(
  x: number,
  y: number,
  z: number,
  box: Vec3 = BOX,
  sections: Vec3 = SECTIONS,
  tolerance = 1e-6
): boolean {
  const [xSec, ySec, zSec] = sections;
  const validX = generatePositions(box[0], xSec);
  const validY = generatePositions(box[1], ySec);
  const validZ = generatePositions(box[2], zSec);

  return (
    isValueValid(x, validX, tolerance) &&
    isValueValid(y, validY, tolerance) &&
    isValueValid(z, validZ, tolerance)
  );
}

/**
 * Structure for suggestion results when coordinates are invalid.
 */
export interface DidYouMeanResult {
  isValid: boolean;
  closestValidPoint: Vec3;
  x?: { invalid: number; closest: number[] };
  y?: { invalid: number; closest: number[] };
  z?: { invalid: number; closest: number[] };
}

/**
 * Finds the nearest few values to a target within a sorted list.
 */
function findClosest(target: number, valid: number[], maxCount = 2): number[] {
  return [...valid]
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target))
    .slice(0, maxCount);
}

/**
 * Provides suggestions for out-of-grid coordinates,
 * returning the closest valid grid point and axis-specific hints.
 */
export function didYouMean(
  x: number,
  y: number,
  z: number,
  box: Vec3 = BOX,
  sections: Vec3 = SECTIONS,
  tolerance = 1e-6
): DidYouMeanResult {
  const [xSec, ySec, zSec] = sections;
  const validX = generatePositions(box[0], xSec);
  const validY = generatePositions(box[1], ySec);
  const validZ = generatePositions(box[2], zSec);

  const isXValid = isValueValid(x, validX, tolerance);
  const isYValid = isValueValid(y, validY, tolerance);
  const isZValid = isValueValid(z, validZ, tolerance);

  if (isXValid && isYValid && isZValid) {
    return { isValid: true, closestValidPoint: [x, y, z] };
  }

  const suggestion: DidYouMeanResult = {
    isValid: false,
    closestValidPoint: [
      isXValid ? x : findClosest(x, validX, 1)[0],
      isYValid ? y : findClosest(y, validY, 1)[0],
      isZValid ? z : findClosest(z, validZ, 1)[0],
    ],
  };

  if (!isXValid) suggestion.x = { invalid: x, closest: findClosest(x, validX) };
  if (!isYValid) suggestion.y = { invalid: y, closest: findClosest(y, validY) };
  if (!isZValid) suggestion.z = { invalid: z, closest: findClosest(z, validZ) };

  return suggestion;
}

/**
 * Formats the DidYouMeanResult into a human-readable string.
 */
export function formatDidYouMeanResult(result: DidYouMeanResult): string {
  if (result.isValid) {
    return `✅ Coordinates are valid!`;
  }

  const lines: string[] = [`❌ Invalid coordinates detected:`];

  if (result.x) {
    lines.push(`🔴 X: ${result.x.invalid} → closest: [${result.x.closest.join(", ")}]`);
  }
  if (result.y) {
    lines.push(`🟢 Y: ${result.y.invalid} → closest: [${result.y.closest.join(", ")}]`);
  }
  if (result.z) {
    lines.push(`🔵 Z: ${result.z.invalid} → closest: [${result.z.closest.join(", ")}]`);
  }

  lines.push(`💡 Suggested: (${result.closestValidPoint.join(", ")})`);

  return lines.join("\n");
}
