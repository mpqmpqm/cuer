import { Line, OrbitControls, Sphere } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

/* -------------------------------------------------------------------------
 *  Types
 * -------------------------------------------------------------------------*/

/** 3‑tuple representing xyz cartesian coordinates */
export type Vec3 = [number, number, number];

/** Enumeration of every joint in the default humanoid rig */
export const JOINTS = [
  "head",
  "neck",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "spine",
  "pelvis",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
] as const;

export type JointName = (typeof JOINTS)[number];

/** Edge connecting two joints */
export type Bone = readonly [JointName, JointName];

/* -------------------------------------------------------------------------
 *  Configuration & Defaults
 * -------------------------------------------------------------------------*/

/** Default T‑pose like skeleton */
const DEFAULT_SKELETON: Record<JointName, Vec3> = {
  head: [0, 1.6, 0],
  neck: [0, 1.4, 0],
  leftShoulder: [-0.3, 1.2, 0],
  rightShoulder: [0.3, 1.2, 0],
  leftElbow: [-0.5, 0.8, 0],
  rightElbow: [0.5, 0.8, 0],
  leftWrist: [-0.6, 0.4, 0],
  rightWrist: [0.6, 0.4, 0],
  spine: [0, 0.8, 0],
  pelvis: [0, 0, 0],
  leftHip: [-0.15, -0.1, 0],
  rightHip: [0.15, -0.1, 0],
  leftKnee: [-0.15, -0.6, 0],
  rightKnee: [0.15, -0.6, 0],
  leftAnkle: [-0.15, -1.2, 0],
  rightAnkle: [0.15, -1.2, 0],
};

/** Skeleton graph (bone list) */
const BONES: Bone[] = [
  ["head", "neck"],
  ["neck", "spine"],
  ["neck", "leftShoulder"],
  ["neck", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["spine", "pelvis"],
  ["pelvis", "leftHip"],
  ["pelvis", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
] as const;

/** Parent‑child hierarchy used for FABRIK‑style IK */
const HIERARCHY: Record<JointName, { parent: JointName | null; children: JointName[] }> =
  {
    pelvis: { parent: null, children: ["spine", "leftHip", "rightHip"] },
    spine: { parent: "pelvis", children: ["neck"] },
    neck: { parent: "spine", children: ["head", "leftShoulder", "rightShoulder"] },
    head: { parent: "neck", children: [] },
    leftShoulder: { parent: "neck", children: ["leftElbow"] },
    leftElbow: { parent: "leftShoulder", children: ["leftWrist"] },
    leftWrist: { parent: "leftElbow", children: [] },
    rightShoulder: { parent: "neck", children: ["rightElbow"] },
    rightElbow: { parent: "rightShoulder", children: ["rightWrist"] },
    rightWrist: { parent: "rightElbow", children: [] },
    leftHip: { parent: "pelvis", children: ["leftKnee"] },
    leftKnee: { parent: "leftHip", children: ["leftAnkle"] },
    leftAnkle: { parent: "leftKnee", children: [] },
    rightHip: { parent: "pelvis", children: ["rightKnee"] },
    rightKnee: { parent: "rightHip", children: ["rightAnkle"] },
    rightAnkle: { parent: "rightKnee", children: [] },
  };

/* -------------------------------------------------------------------------
 *  Utilities
 * -------------------------------------------------------------------------*/

const vec3 = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s],
  len: ([x, y, z]: Vec3): number => Math.sqrt(x * x + y * y + z * z),
  norm: (v: Vec3): Vec3 => {
    const l = vec3.len(v);
    return l === 0 ? [0, 0, 0] : vec3.mul(v, 1 / l);
  },
};

/** Measure distance between two joints */
const dist = (a: Vec3, b: Vec3) => vec3.len(vec3.sub(a, b));

/* -------------------------------------------------------------------------
 *  Context to expose skeleton state to descendant components
 * -------------------------------------------------------------------------*/
interface SkeletonContextValue {
  joints: Record<JointName, Vec3>;
  moveJoint: (joint: JointName, position: Vec3) => void;
}

const SkeletonContext = createContext<SkeletonContextValue | null>(null);

export const useSkeleton = () => {
  const ctx = useContext(SkeletonContext);
  if (!ctx) throw new Error("useSkeleton must be used inside <SkeletonProvider />");
  return ctx;
};

/* -------------------------------------------------------------------------
 *  Provider implementing basic FABRIK‑style IK with bone‑length preservation
 * -------------------------------------------------------------------------*/

interface SkeletonProviderProps {
  children: React.ReactNode;
  initialPose?: Partial<Record<JointName, Vec3>>;
  iterations?: number;
}

const SkeletonProvider: React.FC<SkeletonProviderProps> = ({
  children,
  initialPose,
  iterations = 3,
}) => {
  // Merge custom pose with default
  const [joints, setJoints] = useState<Record<JointName, Vec3>>({
    ...DEFAULT_SKELETON,
    ...initialPose,
  });

  // Pre‑compute bone lengths once
  const boneLengths = useMemo(() => {
    const lengths: Record<string, number> = {};
    BONES.forEach(([a, b]) => {
      lengths[`${a}-${b}`] = dist(DEFAULT_SKELETON[a], DEFAULT_SKELETON[b]);
      lengths[`${b}-${a}`] = lengths[`${a}-${b}`]; // bidirectional lookup
    });
    return lengths;
  }, []);

  /** FABRIK constraint solver */
  const solve = (moved: JointName, draft: Record<JointName, Vec3>) => {
    for (let i = 0; i < iterations; i++) {
      // Forward: parents follow child chain
      let current: JointName | null = moved;
      while (current && HIERARCHY[current].parent) {
        const parent = HIERARCHY[current].parent!;
        const length = boneLengths[`${current}-${parent}`];
        const dir = vec3.norm(vec3.sub(draft[parent], draft[current]));
        draft[parent] = vec3.add(draft[current], vec3.mul(dir, length));
        current = parent;
      }
      // Backward: children pushed from roots
      const pushChildren = (joint: JointName) => {
        HIERARCHY[joint].children.forEach((child) => {
          const length = boneLengths[`${joint}-${child}`];
          const dir = vec3.norm(vec3.sub(draft[child], draft[joint]));
          draft[child] = vec3.add(draft[joint], vec3.mul(dir, length));
          pushChildren(child);
        });
      };
      // roots = joints with no parent
      JOINTS.filter((j) => !HIERARCHY[j].parent).forEach(pushChildren);
    }
  };

  /** Public API to move a joint */
  const moveJoint = (joint: JointName, position: Vec3) => {
    setJoints((prev) => {
      const draft: Record<JointName, Vec3> = { ...prev, [joint]: position };
      solve(joint, draft);
      return draft;
    });
  };

  const value = useMemo(() => ({ joints, moveJoint }), [joints]);

  return <SkeletonContext.Provider value={value}>{children}</SkeletonContext.Provider>;
};

/* -------------------------------------------------------------------------
 *  Components
 * -------------------------------------------------------------------------*/

/** Color palette to visually group body regions */
const REGION_COLOR: Partial<Record<JointName, string>> = {
  head: "#f94144",
  neck: "#f8961e",
  spine: "#f3722c",
  pelvis: "#90be6d",
  leftShoulder: "#577590",
  rightShoulder: "#577590",
  leftHip: "#43aa8b",
  rightHip: "#43aa8b",
};

interface JointProps {
  name: JointName;
  radius?: number;
}

const Joint: React.FC<JointProps> = ({ name, radius = 0.05 }) => {
  const ref = useRef<THREE.Mesh>(null!);
  const { joints, moveJoint } = useSkeleton();
  const { camera, mouse, raycaster } = useThree();
  const [dragging, setDragging] = useState(false);

  // Drag handling – project pointer onto xy‑plane (z=0)
  useFrame(() => {
    if (dragging) {
      raycaster.setFromCamera(mouse, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const pt = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, pt);
      moveJoint(name, [pt.x, pt.y, pt.z]);
    }
  });

  const onPointerDown = (e: THREE.Event) => {
    e.stopPropagation();
    setDragging(true);
  };

  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  return (
    <Sphere
      ref={ref}
      args={[radius, 16, 16]}
      position={joints[name]}
      onPointerDown={onPointerDown}
    >
      <meshStandardMaterial
        color={dragging ? "#ff6b6b" : REGION_COLOR[name] ?? "#4ecdc4"}
        emissive={dragging ? "#ff6b6b" : "#000"}
        emissiveIntensity={dragging ? 0.3 : 0}
      />
    </Sphere>
  );
};

/** Renders all bones as lines */
const BoneLines: React.FC = () => {
  const { joints } = useSkeleton();
  return (
    <>
      {BONES.map(([a, b], idx) => (
        <Line key={idx} points={[joints[a], joints[b]]} color="#95a5a6" lineWidth={2} />
      ))}
    </>
  );
};

/** Higher‑level skeleton component */
const Skeleton: React.FC = () => (
  <SkeletonProvider>
    <BoneLines />
    {JOINTS.map((j) => (
      <Joint key={j} name={j} />
    ))}
  </SkeletonProvider>
);

/* -------------------------------------------------------------------------
 *  Scene
 * -------------------------------------------------------------------------*/

export const RagdollScene: React.FC = () => (
  <div style={{ width: "100vw", height: "100vh" }}>
    <Canvas camera={{ position: [0, 0, 3], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <OrbitControls enableZoom enableRotate={false} />
      <Skeleton />
      <gridHelper args={[10, 10, "#303030", "#303030"]} rotation={[Math.PI / 2, 0, 0]} />
    </Canvas>
  </div>
);

export default RagdollScene;
