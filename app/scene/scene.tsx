"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { FC } from "react";
import { SlicingPlanes } from "./geometry";
import { BOX, SECTIONS, Vec3 } from "./grid";

export const Scene: FC<{
  points: Array<Vec3>;
  colors: Array<string>;
}> = ({ points = [], colors = [] }) => {
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
        opacity={0}
      />
      <SlicingPlanes
        edge="y"
        box={BOX}
        sections={SECTIONS[1]}
        color="#00ff00"
        opacity={0}
      />
      <SlicingPlanes
        edge="z"
        box={BOX}
        sections={SECTIONS[2]}
        color="#0000ff"
        opacity={0}
      />

      {/* Intersection points */}
      {/* <IntersectionPoints
        dimensions={BOX}
        sections={SECTIONS}
        sphereRadius={0.05}
        sphereColor="#ffff00"
      /> */}

      {/* Plot points */}
      {points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={colors[index % colors.length]} />
        </mesh>
      ))}

      {/* Axes helper (optional) */}
      {/* <axesHelper args={[5]} /> */}
    </Canvas>
  );
};
