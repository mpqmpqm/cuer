"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

const BOX: [number, number, number] = [3, 6, 5]; // Width, Height, Depth
const SECTIONS: [number, number, number] = [4, 6, 4]; // X, Y, Z sections

type AxisInfo = {
  domain: [number, number];
  step: number;
};

type AxisInfoResult = {
  x: AxisInfo;
  y: AxisInfo;
  z: AxisInfo;
};

function calculateAxisInfo(
  box: [number, number, number],
  sections: [number, number, number]
): AxisInfoResult {
  const [width, height, depth] = box;
  const [xSections, ySections, zSections] = sections;

  return {
    x: {
      domain: [-width / 2, width / 2],
      step: width / xSections,
    },
    y: {
      domain: [-height / 2, height / 2],
      step: height / ySections,
    },
    z: {
      domain: [-depth / 2, depth / 2],
      step: depth / zSections,
    },
  };
}

// Function to create 6 boundary planes for the cube
function BoundaryPlanes({
  dimensions,
  color = "#666666",
  opacity = 0.1,
}: {
  dimensions: [number, number, number];
  color?: string;
  opacity?: number;
}) {
  const [width, height, depth] = dimensions;

  return (
    <>
      {/* Front and Back (Z axis boundaries) */}
      <mesh position={[0, 0, depth / 2]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -depth / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Top and Bottom (Y axis boundaries) */}
      <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left and Right (X axis boundaries) */}
      <mesh position={[width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

function createSlicingPlanes(
  dimensions: [number, number, number],
  axis: "x" | "y" | "z",
  sections: number,
  planeColor: string = "#ff0000",
  opacity: number = 0.2
) {
  const [width, height, depth] = dimensions;
  const planes = [];

  for (let i = 1; i < sections; i++) {
    const ratio = i / sections;

    if (axis === "x") {
      // X-axis planes (YZ planes)
      const slicePosition = -width / 2 + width * ratio;
      planes.push(
        <mesh
          key={`x-plane-${i}`}
          position={[slicePosition, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[depth, height]} />
          <meshBasicMaterial
            color={planeColor}
            opacity={opacity}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    } else if (axis === "y") {
      // Y-axis planes (XZ planes)
      const slicePosition = -height / 2 + height * ratio;
      planes.push(
        <mesh
          key={`y-plane-${i}`}
          position={[0, slicePosition, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[width, depth]} />
          <meshBasicMaterial
            color={planeColor}
            opacity={opacity}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    } else if (axis === "z") {
      // Z-axis planes (XY planes)
      const slicePosition = -depth / 2 + depth * ratio;
      planes.push(
        <mesh key={`z-plane-${i}`} position={[0, 0, slicePosition]} rotation={[0, 0, 0]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            color={planeColor}
            opacity={opacity}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    }
  }

  return <>{planes}</>;
}

// Function to calculate all plane positions for a given axis
function getPlanePositions(
  dimension: number,
  sections: number,
  axis: "x" | "y" | "z"
): number[] {
  const positions: number[] = [];

  // Add boundary positions
  positions.push(-dimension / 2);
  positions.push(dimension / 2);

  // Add internal plane positions
  for (let i = 1; i < sections; i++) {
    const ratio = i / sections;
    const position = -dimension / 2 + dimension * ratio;
    positions.push(position);
  }

  // Sort positions to ensure correct order
  return positions.sort((a, b) => a - b);
}

// Function to calculate all intersection points
function calculateIntersectionPoints(
  dimensions: [number, number, number],
  sections: [number, number, number]
): THREE.Vector3[] {
  const [width, height, depth] = dimensions;
  const [sectionsX, sectionsY, sectionsZ] = sections;

  const xPositions = getPlanePositions(width, sectionsX, "x");
  const yPositions = getPlanePositions(height, sectionsY, "y");
  const zPositions = getPlanePositions(depth, sectionsZ, "z");

  const intersectionPoints: THREE.Vector3[] = [];

  // Generate all combinations of x, y, z positions
  for (const x of xPositions) {
    for (const y of yPositions) {
      for (const z of zPositions) {
        intersectionPoints.push(new THREE.Vector3(x, y, z));
      }
    }
  }

  return intersectionPoints;
}

function SlicingPlanes({
  edge,
  box,
  sections,
  color = "#ff0000",
  opacity = 0.5,
}: {
  edge: "x" | "y" | "z";
  box: [number, number, number];
  sections: number;
  color?: string;
  opacity?: number;
}) {
  return createSlicingPlanes(box, edge, sections, color, opacity);
}

// Component to render spheres at intersection points
function IntersectionPoints({
  dimensions,
  sections,
  sphereRadius = 0.05,
  sphereColor = "#ffff00",
}: {
  dimensions: [number, number, number];
  sections: [number, number, number];
  sphereRadius?: number;
  sphereColor?: string;
}) {
  const intersectionPoints = useMemo(
    () => calculateIntersectionPoints(dimensions, sections),
    [dimensions, sections]
  );

  return (
    <>
      {intersectionPoints.map((point, index) => (
        <mesh key={`intersection-${index}`} position={point}>
          <sphereGeometry args={[sphereRadius, 16, 16]} />
          <meshBasicMaterial color={sphereColor} />
        </mesh>
      ))}
    </>
  );
}

// Function to get valid positions for a specific axis
function getValidPositions(dimension: number, sections: number): number[] {
  const positions: number[] = [];

  // Add boundary positions
  positions.push(-dimension / 2);
  positions.push(dimension / 2);

  // Add internal positions
  for (let i = 1; i < sections; i++) {
    const ratio = i / sections;
    const position = -dimension / 2 + dimension * ratio;
    positions.push(position);
  }

  return positions.sort((a, b) => a - b);
}

// Function to validate if a coordinate is at a valid grid intersection
function isValidGridPosition(
  x: number,
  y: number,
  z: number,
  box: [number, number, number],
  sections: [number, number, number],
  tolerance: number = 0.0001
): boolean {
  const [width, height, depth] = box;
  const [xSections, ySections, zSections] = sections;

  const validXPositions = getValidPositions(width, xSections);
  const validYPositions = getValidPositions(height, ySections);
  const validZPositions = getValidPositions(depth, zSections);

  const isValidX = validXPositions.some((pos) => Math.abs(pos - x) < tolerance);
  const isValidY = validYPositions.some((pos) => Math.abs(pos - y) < tolerance);
  const isValidZ = validZPositions.some((pos) => Math.abs(pos - z) < tolerance);

  return isValidX && isValidY && isValidZ;
}

interface DidYouMeanResult {
  x?: { invalid: number; closest: number[] };
  y?: { invalid: number; closest: number[] };
  z?: { invalid: number; closest: number[] };
  closestValidPoint: [number, number, number];
  isValid: boolean;
}

function findClosestValues(value: number, validPoints: number[], maxCount = 2): number[] {
  const sorted = [...validPoints].sort(
    (a, b) => Math.abs(a - value) - Math.abs(b - value)
  );
  return sorted.slice(0, Math.min(maxCount, sorted.length));
}

function didYouMean(
  x: number,
  y: number,
  z: number,
  box: [number, number, number],
  sections: [number, number, number]
): DidYouMeanResult {
  const [width, height, depth] = box;
  const [xSections, ySections, zSections] = sections;

  const validX = getValidPositions(width, xSections);
  const validY = getValidPositions(height, ySections);
  const validZ = getValidPositions(depth, zSections);

  const isXValid = validX.some((pos) => Math.abs(pos - x) < 0.001);
  const isYValid = validY.some((pos) => Math.abs(pos - y) < 0.001);
  const isZValid = validZ.some((pos) => Math.abs(pos - z) < 0.001);

  if (isXValid && isYValid && isZValid) {
    return {
      isValid: true,
      closestValidPoint: [x, y, z],
    };
  }

  const result: DidYouMeanResult = {
    isValid: false,
    closestValidPoint: [
      isXValid
        ? x
        : validX.reduce((closest, point) =>
            Math.abs(point - x) < Math.abs(closest - x) ? point : closest
          ),
      isYValid
        ? y
        : validY.reduce((closest, point) =>
            Math.abs(point - y) < Math.abs(closest - y) ? point : closest
          ),
      isZValid
        ? z
        : validZ.reduce((closest, point) =>
            Math.abs(point - z) < Math.abs(closest - z) ? point : closest
          ),
    ],
  };

  if (!isXValid) {
    result.x = {
      invalid: x,
      closest: findClosestValues(x, validX),
    };
  }

  if (!isYValid) {
    result.y = {
      invalid: y,
      closest: findClosestValues(y, validY),
    };
  }

  if (!isZValid) {
    result.z = {
      invalid: z,
      closest: findClosestValues(z, validZ),
    };
  }

  return result;
}

function formatDidYouMeanResult(result: DidYouMeanResult): string {
  if (result.isValid) {
    return "✅ Coordinates are valid!";
  }

  let output = "❌ Invalid coordinates detected:\n";

  if (result.x) {
    output += `🔴 X: ${result.x.invalid} → closest: [${result.x.closest.join(", ")}]\n`;
  }

  if (result.y) {
    output += `🟢 Y: ${result.y.invalid} → closest: [${result.y.closest.join(", ")}]\n`;
  }

  if (result.z) {
    output += `🔵 Z: ${result.z.invalid} → closest: [${result.z.closest.join(", ")}]\n`;
  }

  output += `💡 Suggested: (${result.closestValidPoint.join(", ")})`;

  return output;
}

// PlotPoint component that validates coordinates and renders a sphere
function PlotPoint({
  x,
  y,
  z,
  color = "#ff00ff",
  radius = 0.08,
}: {
  x: number;
  y: number;
  z: number;
  color?: string;
  radius?: number;
}) {
  return null;
  // Check if coordinates are valid
  const isValid = isValidGridPosition(x, y, z, BOX, SECTIONS);

  if (!isValid) {
    const suggestion = didYouMean(x, y, z, BOX, SECTIONS);
    console.log(formatDidYouMeanResult(suggestion));
  }

  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// Debug component to show valid positions for each axis
function ValidPositionsDebug({
  box,
  sections,
}: {
  box: [number, number, number];
  sections: [number, number, number];
}) {
  const [width, height, depth] = box;
  const [xSections, ySections, zSections] = sections;

  const xPositions = getValidPositions(width, xSections);
  const yPositions = getValidPositions(height, ySections);
  const zPositions = getValidPositions(depth, zSections);

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "15px",
        borderRadius: "8px",
        fontFamily: "monospace",
        fontSize: "12px",
        maxWidth: "300px",
        zIndex: 1000,
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", color: "#fff", fontSize: "14px" }}>
        Valid Grid Positions
      </h3>

      <div style={{ marginBottom: "8px" }}>
        <strong style={{ color: "#ff6666" }}>X-axis ({xPositions.length} points):</strong>
        <div style={{ color: "#ffcccc", marginLeft: "10px" }}>
          [{xPositions.map((p) => p.toFixed(2)).join(", ")}]
        </div>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <strong style={{ color: "#66ff66" }}>Y-axis ({yPositions.length} points):</strong>
        <div style={{ color: "#ccffcc", marginLeft: "10px" }}>
          [{yPositions.map((p) => p.toFixed(2)).join(", ")}]
        </div>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <strong style={{ color: "#6666ff" }}>Z-axis ({zPositions.length} points):</strong>
        <div style={{ color: "#ccccff", marginLeft: "10px" }}>
          [{zPositions.map((p) => p.toFixed(2)).join(", ")}]
        </div>
      </div>

      <div
        style={{
          marginTop: "10px",
          padding: "8px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "4px",
          fontSize: "11px",
        }}
      >
        <strong>Total intersections:</strong>{" "}
        {xPositions.length * yPositions.length * zPositions.length}
      </div>
    </div>
  );
}

export const Scene = () => {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Canvas
        style={{ height: "100vh", width: "100vw" }}
        camera={{ position: [0, 0, 15] }}
      >
        <OrbitControls />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />

        {/* Boundary planes */}
        {/* <BoundaryPlanes dimensions={BOX} color="#ffffff" opacity={0.1} /> */}

        {/* Internal slicing planes */}
        <SlicingPlanes
          edge="x"
          box={BOX}
          sections={SECTIONS[0]}
          color="#ff0000"
          opacity={0.1}
        />
        <SlicingPlanes
          edge="y"
          box={BOX}
          sections={SECTIONS[1]}
          color="#00ff00"
          opacity={0.1}
        />
        <SlicingPlanes
          edge="z"
          box={BOX}
          sections={SECTIONS[2]}
          color="#0000ff"
          opacity={0.1}
        />

        {/* Intersection points */}
        <IntersectionPoints
          dimensions={BOX}
          sections={SECTIONS}
          sphereRadius={0.05}
          sphereColor="#ffff00"
        />

        {/* Test PlotPoint with valid coordinates */}
        <PlotPoint x={0} y={0} z={0} color="#ff00ff" />
        <PlotPoint x={-1.5} y={3} z={2.5} color="#00ffff" />
        <PlotPoint x={0.75} y={-2} z={-1.25} color="green" />

        {/* Test PlotPoint with invalid coordinates to see didYouMean suggestions */}
        <PlotPoint x={0.75} y={0} z={0} color="orange" />
        <PlotPoint x={0} y={1} z={1.25} color="purple" />
        <PlotPoint x={1.5} y={1} z={0} color="cyan" />

        {/* Axes helper (optional) */}
        <axesHelper args={[5]} />
      </Canvas>

      {/* Floating debug info */}
      <ValidPositionsDebug box={BOX} sections={SECTIONS} />
    </div>
  );
};
