"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

const BOX = [2, 4, 4] as const; // Width, Height, Depth

function WireframeCube() {
  return (
    <mesh>
      <boxGeometry args={BOX} />
      <meshBasicMaterial wireframe color="#ffffff" />
    </mesh>
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

export const Scene = () => {
  return (
    <Canvas style={{ height: "100vh", width: "100vw" }} camera={{ position: [0, 0, 15] }}>
      <OrbitControls />
      <WireframeCube />
      <SlicingPlanes edge="x" box={BOX} sections={4} color="#ff0000" />
      <SlicingPlanes edge="y" box={BOX} sections={6} color="#00ff00" />
      <SlicingPlanes edge="z" box={BOX} sections={6} color="#0000ff" />
    </Canvas>
  );
};
