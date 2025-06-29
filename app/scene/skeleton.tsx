"use client";

import { Bone } from './bone';
import { Vec3 } from './grid';
import { BONE_CONNECTIONS } from './constants';

interface SkeletonProps {
  joints: Record<string, Vec3>;
  boneColor?: string;
  boneRadius?: number;
}

export function Skeleton({ joints, boneColor = '#cccccc', boneRadius = 0.05 }: SkeletonProps) {
  return (
    <>
      {BONE_CONNECTIONS.map(([startJoint, endJoint], index) => {
        const start = joints[startJoint];
        const end = joints[endJoint];
        
        if (!start || !end) return null;
        
        return (
          <Bone
            key={`bone-${index}`}
            start={start}
            end={end}
            color={boneColor}
            radius={boneRadius}
          />
        );
      })}
    </>
  );
}