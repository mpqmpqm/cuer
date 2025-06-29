"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { FC } from "react";
import { DoubleSide } from "three";
import { BOX, SECTIONS, Vec3 } from "./grid";
import { Skeleton } from "./skeleton";
import { JOINT_NAMES } from "./constants";

// Function to create 6 boundary planes for the cube
export function BoundaryPlanes({
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
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -depth / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={DoubleSide}
        />
      </mesh>

      {/* Top and Bottom (Y axis boundaries) */}
      <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, -height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={DoubleSide}
        />
      </mesh>

      {/* Left and Right (X axis boundaries) */}
      <mesh position={[width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[-width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent
          side={DoubleSide}
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
            side={DoubleSide}
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
            side={DoubleSide}
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
            side={DoubleSide}
          />
        </mesh>
      );
    }
  }

  return <>{planes}</>;
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

export const Scene: FC<{
  points: Array<Vec3>;
  colors: Array<string>;
}> = ({ points = [], colors = [] }) => {
  // Convert points array back to object for skeleton
  const jointsObject = Object.fromEntries(
    JOINT_NAMES.map((name, index) => [name, points[index]])
  );

  return (
    <Canvas style={{ height: "100%", width: "100%" }} camera={{ position: [0, 0, 15] }}>
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

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

      {/* Plot points */}
      {points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={colors[index % colors.length]} />
        </mesh>
      ))}

      {/* Add skeleton */}
      <Skeleton joints={jointsObject} />

      {/* Axes helper (optional) */}
      <axesHelper args={[5]} />
    </Canvas>
  );
};
