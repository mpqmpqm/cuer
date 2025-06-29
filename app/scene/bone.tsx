"use client";

import { useRef } from 'react';
import * as THREE from 'three';
import { Vec3 } from './grid';

interface BoneProps {
  start: Vec3;
  end: Vec3;
  color?: string;
  radius?: number;
}

export function Bone({ start, end, color = '#888888', radius = 0.05 }: BoneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate bone position, rotation, and length
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  
  // Get the midpoint for positioning
  const midpoint = startVec.clone().add(endVec).multiplyScalar(0.5);
  
  // Calculate length
  const length = startVec.distanceTo(endVec);
  
  // Calculate rotation
  const direction = endVec.clone().sub(startVec).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
  
  return (
    <mesh
      ref={meshRef}
      position={midpoint}
      quaternion={quaternion}
    >
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}